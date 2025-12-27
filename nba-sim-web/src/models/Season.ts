/**
 * Season Module
 *
 * Orchestrates a full NBA season including:
 * - 82-game regular season
 * - Play-in tournament
 * - 4-round playoffs with champion
 *
 * Tasks T067-T068: Full season simulation with silentMode support
 */

import { Team } from './Team'
import { Conference, Language, StandingEntry } from './types'
import { hostGame, hostGameFast, GameResult, GameRecapData } from './Game'
import { SeasonStats } from './SeasonStats'
import { StandingsManager } from './Standings'
import { PlayoffManager, PlayoffBracketResult } from './Playoffs'
import { SeededRandom } from '../utils/SeededRandom'
import { EAST_TEAMS_EN, WEST_TEAMS_EN } from '../utils/Constants'
import { loadSchedule, SeasonSchedule, ScheduleGame } from '../services/ResourceLoader'
import { initComments, isInitialized as isCommentsInitialized } from '../services/CommentLoader'
import { initLocalization, isInitialized as isLocalizationInitialized } from '../services/LocalizationService'

// =============================================================================
// Types and Interfaces
// =============================================================================

/**
 * Season simulation options
 */
export interface SeasonOptions {
    /** Seed for RNG (deterministic results) */
    seed?: number
    /** Silent mode - no commentary output */
    silentMode?: boolean
    /** Language for output */
    language?: Language
    /** Progress callback for regular season */
    onProgress?: (gamesCompleted: number, totalGames: number) => void
    /** Progress callback for playoffs (play-in + playoffs) */
    onPlayoffProgress?: (gamesCompleted: number, totalGames: number, phase: 'playin' | 'playoffs') => void
}

/**
 * Regular season result
 */
export interface RegularSeasonResult {
    /** Final standings for both conferences */
    standings: {
        east: StandingEntry[]
        west: StandingEntry[]
    }
    /** Season statistics */
    stats: SeasonStats
    /** All game results */
    games: GameResult[]
    /** Number of games played */
    gamesPlayed: number
    /** Game recaps grouped by date */
    recaps: GameRecapData[]
}

/**
 * Full season result including playoffs
 */
export interface SeasonResult {
    /** Regular season data */
    regularSeason: RegularSeasonResult
    /** Playoff bracket result */
    playoffs: PlayoffBracketResult
    /** Champion team name */
    champion: string
    /** Finals MVP */
    finalsMVP?: {
        playerName: string
        englishName: string
        teamName: string
    }
}

// =============================================================================
// Season Manager Class
// =============================================================================

/**
 * Manages a full NBA season simulation
 */
export class SeasonManager {
    private random: SeededRandom
    private language: Language
    private silentMode: boolean
    private teams: Map<string, Team> = new Map()
    private standings: StandingsManager
    private stats: SeasonStats
    private onProgress?: (gamesCompleted: number, totalGames: number) => void
    private onPlayoffProgress?: (gamesCompleted: number, totalGames: number, phase: 'playin' | 'playoffs') => void

    constructor(options: SeasonOptions = {}) {
        const seed = options.seed !== undefined ? BigInt(options.seed) : BigInt(Date.now())
        this.random = new SeededRandom(seed)
        this.language = options.language ?? Language.ENGLISH
        this.silentMode = options.silentMode ?? false
        this.onProgress = options.onProgress
        this.onPlayoffProgress = options.onPlayoffProgress
        this.standings = new StandingsManager()
        this.stats = new SeasonStats()
    }

    /**
     * Get the silentMode setting
     */
    get isSilentMode(): boolean {
        return this.silentMode
    }

    /**
     * Get all loaded teams
     */
    getTeams(): Map<string, Team> {
        return this.teams
    }

    /**
     * Load all teams for the season
     */
    async loadAllTeams(): Promise<void> {
        const allTeams = [...EAST_TEAMS_EN, ...WEST_TEAMS_EN]

        for (const teamName of allTeams) {
            if (!this.teams.has(teamName)) {
                const team = await Team.loadFromCSV(teamName)
                this.teams.set(teamName, team)
            }
        }
    }

    /**
     * Get or load a team by name
     */
    async getTeam(teamName: string): Promise<Team> {
        if (this.teams.has(teamName)) {
            return this.teams.get(teamName)!
        }

        const team = await Team.loadFromCSV(teamName)
        this.teams.set(teamName, team)
        return team
    }

    /**
     * Reset a team for a new game
     */
    private resetTeamForGame(team: Team): void {
        team.resetGameStats()
        // Reset player stats for new game
        for (const player of team.players) {
            player.resetGameStats()
        }
    }

    /**
     * Host a single regular season game
     */
    async hostRegularSeasonGame(
        awayTeamName: string,
        homeTeamName: string,
        gameDate?: string
    ): Promise<GameResult> {
        const awayTeam = await this.getTeam(awayTeamName)
        const homeTeam = await this.getTeam(homeTeamName)

        // Reset teams for new game
        this.resetTeamForGame(awayTeam)
        this.resetTeamForGame(homeTeam)

        // Create a new random for each game using the main random
        const gameSeed = this.random.nextInt(1000000)
        const gameRandom = new SeededRandom(BigInt(gameSeed))

        // Host the game (pass date for recap generation)
        const result = hostGame(awayTeam, homeTeam, gameRandom, this.language, gameDate)

        // Update standings
        const winner = result.winner
        const loser = result.winner === awayTeamName ? homeTeamName : awayTeamName
        this.standings.recordGame(winner, loser)

        // Update recap W/L records after standings update
        if (result.recap) {
            const awayRecord = this.standings.getTeamRecord(awayTeamName)
            const homeRecord = this.standings.getTeamRecord(homeTeamName)
            if (awayRecord) {
                result.recap.awayWins = awayRecord.wins
                result.recap.awayLosses = awayRecord.losses
            }
            if (homeRecord) {
                result.recap.homeWins = homeRecord.wins
                result.recap.homeLosses = homeRecord.losses
            }
        }

        // Update season stats from the game
        this.updateSeasonStats(awayTeam, homeTeam)

        return result
    }

    /**
     * Update season stats from a game result
     */
    private updateSeasonStats(awayTeam: Team, homeTeam: Team): void {
        // Update team stats
        this.stats.updateTeamStats(awayTeam)
        this.stats.updateTeamStats(homeTeam)

        // Update player stats
        for (const player of awayTeam.players) {
            this.stats.updatePlayerStats(player)
        }
        for (const player of homeTeam.players) {
            this.stats.updatePlayerStats(player)
        }
    }

    /**
     * Host the complete 82-game regular season
     */
    async hostRegularSeason(schedule?: SeasonSchedule): Promise<RegularSeasonResult> {
        // Load schedule if not provided
        let games: ScheduleGame[]
        if (!schedule) {
            const loadedSchedule = await loadSchedule()
            games = loadedSchedule.games
        } else {
            games = schedule.games
        }

        const gameResults: GameResult[] = []
        const recaps: GameRecapData[] = []
        const totalGames = games.length

        // Load all teams upfront
        await this.loadAllTeams()

        // Simulate each game
        for (let i = 0; i < games.length; i++) {
            const game = games[i]
            const result = await this.hostRegularSeasonGame(
                game.awayTeam,
                game.homeTeam,
                game.date
            )
            gameResults.push(result)

            // Collect recap if available
            if (result.recap) {
                recaps.push(result.recap)
            }

            // Report progress
            if (this.onProgress) {
                this.onProgress(i + 1, totalGames)
            }
        }

        return {
            standings: {
                east: this.standings.getConferenceStandings(Conference.EAST),
                west: this.standings.getConferenceStandings(Conference.WEST),
            },
            stats: this.stats,
            games: gameResults,
            gamesPlayed: gameResults.length,
            recaps,
        }
    }

    /**
     * Host the complete season including playoffs
     */
    async hostSeason(schedule?: SeasonSchedule): Promise<SeasonResult> {
        // Run regular season
        const regularSeason = await this.hostRegularSeason(schedule)

        // Create playoff manager
        const playoffSeed = this.random.nextInt(1000000)
        const playoffManager = new PlayoffManager({
            seed: playoffSeed,
            silentMode: this.silentMode,
            language: this.language,
            onProgress: this.onPlayoffProgress,
        })

        // Cache all teams for playoffs
        for (const [_, team] of this.teams) {
            playoffManager.cacheTeam(team)
        }

        // Host playoffs - pass the full standings manager
        const playoffs = playoffManager.hostPlayoffs(this.standings, this.teams)

        return {
            regularSeason,
            playoffs,
            champion: playoffs.champion,
            finalsMVP: playoffs.finalsMVP ? {
                playerName: playoffs.finalsMVP.playerName,
                englishName: playoffs.finalsMVP.englishName,
                teamName: playoffs.finalsMVP.teamName,
            } : undefined,
        }
    }

    /**
     * Get current standings
     */
    getStandings(): StandingsManager {
        return this.standings
    }

    /**
     * Get season stats
     */
    getStats(): SeasonStats {
        return this.stats
    }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Run a complete season simulation and return the champion
 */
export async function runSeason(options: SeasonOptions = {}): Promise<SeasonResult> {
    // Initialize comments and localization before running the season
    if (!isCommentsInitialized()) {
        await initComments()
    }
    if (!isLocalizationInitialized()) {
        await initLocalization()
    }

    const manager = new SeasonManager(options)
    return manager.hostSeason()
}

/**
 * Run just the regular season
 */
export async function runRegularSeason(options: SeasonOptions = {}): Promise<RegularSeasonResult> {
    // Initialize comments and localization before running the season
    if (!isCommentsInitialized()) {
        await initComments()
    }
    if (!isLocalizationInitialized()) {
        await initLocalization()
    }

    const manager = new SeasonManager(options)
    return manager.hostRegularSeason()
}

// =============================================================================
// Fast Season Simulation (for prediction mode)
// =============================================================================

/**
 * Options for fast season simulation
 */
export interface FastSeasonOptions {
    /** Seed for RNG */
    seed?: number
}

/**
 * Run a fast season simulation that only returns the champion.
 * Skips all commentary, box scores, stats tracking, and recaps.
 * Designed for prediction mode where only the champion matters.
 *
 * @param options Fast season options
 * @returns Champion team name
 */
export async function runSeasonFast(options: FastSeasonOptions = {}): Promise<string> {
    const seed = options.seed !== undefined ? BigInt(options.seed) : BigInt(Date.now())
    const random = new SeededRandom(seed)

    // Load all teams
    const teams = new Map<string, Team>()
    const allTeamNames = [...EAST_TEAMS_EN, ...WEST_TEAMS_EN]
    for (const teamName of allTeamNames) {
        const team = await Team.loadFromCSV(teamName)
        teams.set(teamName, team)
    }

    // Load schedule
    const schedule = await loadSchedule()
    const standings = new StandingsManager()

    // Simulate regular season (fast mode)
    for (const game of schedule.games) {
        const awayTeam = teams.get(game.awayTeam)!
        const homeTeam = teams.get(game.homeTeam)!

        // Create a game-specific random
        const gameSeed = random.nextInt(1000000)
        const gameRandom = new SeededRandom(BigInt(gameSeed))

        const winner = hostGameFast(awayTeam, homeTeam, gameRandom, false)
        const loser = winner === game.awayTeam ? game.homeTeam : game.awayTeam
        standings.recordGame(winner, loser)
    }

    // Get playoff seeds
    const eastStandings = standings.getConferenceStandings(Conference.EAST)
    const westStandings = standings.getConferenceStandings(Conference.WEST)

    // Run play-in and playoffs (fast mode)
    const champion = runPlayoffsFast(random, teams, standings, eastStandings, westStandings)

    return champion
}

/**
 * Run play-in and playoffs in fast mode.
 * Returns the champion team name.
 */
function runPlayoffsFast(
    random: SeededRandom,
    teams: Map<string, Team>,
    standings: StandingsManager,
    eastStandings: StandingEntry[],
    westStandings: StandingEntry[]
): string {
    // Helper to run a fast game
    const playGame = (team1Name: string, team2Name: string, isPlayoff: boolean): string => {
        const team1 = teams.get(team1Name)!
        const team2 = teams.get(team2Name)!
        const gameSeed = random.nextInt(1000000)
        const gameRandom = new SeededRandom(BigInt(gameSeed))
        return hostGameFast(team1, team2, gameRandom, isPlayoff)
    }

    // Helper to run a best-of-7 series
    const playSeries = (higherSeed: string, lowerSeed: string): string => {
        let team1Wins = 0
        let team2Wins = 0

        // 2-2-1-1-1 format
        const homeTeams = [higherSeed, higherSeed, lowerSeed, lowerSeed, higherSeed, lowerSeed, higherSeed]

        for (let game = 0; game < 7; game++) {
            const homeTeam = homeTeams[game]
            const awayTeam = homeTeam === higherSeed ? lowerSeed : higherSeed
            const winner = playGame(awayTeam, homeTeam, true)

            if (winner === higherSeed) {
                team1Wins++
            } else {
                team2Wins++
            }

            if (team1Wins === 4) return higherSeed
            if (team2Wins === 4) return lowerSeed
        }

        return team1Wins > team2Wins ? higherSeed : lowerSeed
    }

    // Run play-in for each conference
    const runPlayIn = (conferenceStandings: StandingEntry[]): string[] => {
        const seed7 = conferenceStandings[6].teamName
        const seed8 = conferenceStandings[7].teamName
        const seed9 = conferenceStandings[8].teamName
        const seed10 = conferenceStandings[9].teamName

        // Game 1: 7 vs 8 (winner gets 7th seed)
        const winner7v8 = playGame(seed8, seed7, true)
        const loser7v8 = winner7v8 === seed7 ? seed8 : seed7

        // Game 2: 9 vs 10 (loser eliminated)
        const winner9v10 = playGame(seed10, seed9, true)

        // Game 3: Loser of 7v8 vs Winner of 9v10 (winner gets 8th seed)
        const winner8thSeed = playGame(winner9v10, loser7v8, true)

        return [winner7v8, winner8thSeed]
    }

    // Run play-in
    const [westSeed7, westSeed8] = runPlayIn(westStandings)
    const [eastSeed7, eastSeed8] = runPlayIn(eastStandings)

    // Build playoff brackets
    const getPlayoffTeams = (conferenceStandings: StandingEntry[], seed7: string, seed8: string): string[] => {
        return [
            conferenceStandings[0].teamName, // 1
            conferenceStandings[1].teamName, // 2
            conferenceStandings[2].teamName, // 3
            conferenceStandings[3].teamName, // 4
            conferenceStandings[4].teamName, // 5
            conferenceStandings[5].teamName, // 6
            seed7,                            // 7 (from play-in)
            seed8,                            // 8 (from play-in)
        ]
    }

    const westTeams = getPlayoffTeams(westStandings, westSeed7, westSeed8)
    const eastTeams = getPlayoffTeams(eastStandings, eastSeed7, eastSeed8)

    // First Round (1v8, 4v5, 3v6, 2v7)
    const westR1Winners = [
        playSeries(westTeams[0], westTeams[7]), // 1v8
        playSeries(westTeams[3], westTeams[4]), // 4v5
        playSeries(westTeams[2], westTeams[5]), // 3v6
        playSeries(westTeams[1], westTeams[6]), // 2v7
    ]

    const eastR1Winners = [
        playSeries(eastTeams[0], eastTeams[7]), // 1v8
        playSeries(eastTeams[3], eastTeams[4]), // 4v5
        playSeries(eastTeams[2], eastTeams[5]), // 3v6
        playSeries(eastTeams[1], eastTeams[6]), // 2v7
    ]

    // Conference Semis (1/8 winner vs 4/5 winner, 2/7 winner vs 3/6 winner)
    const westSemiWinners = [
        playSeries(westR1Winners[0], westR1Winners[1]),
        playSeries(westR1Winners[3], westR1Winners[2]),
    ]

    const eastSemiWinners = [
        playSeries(eastR1Winners[0], eastR1Winners[1]),
        playSeries(eastR1Winners[3], eastR1Winners[2]),
    ]

    // Conference Finals
    const westChampion = playSeries(westSemiWinners[0], westSemiWinners[1])
    const eastChampion = playSeries(eastSemiWinners[0], eastSemiWinners[1])

    // NBA Finals (determine higher seed by regular season record)
    const westRecord = standings.getTeamRecord(westChampion)
    const eastRecord = standings.getTeamRecord(eastChampion)
    const westWinPct = westRecord ? westRecord.wins / (westRecord.wins + westRecord.losses) : 0
    const eastWinPct = eastRecord ? eastRecord.wins / (eastRecord.wins + eastRecord.losses) : 0

    const higherSeed = westWinPct >= eastWinPct ? westChampion : eastChampion
    const lowerSeed = westWinPct >= eastWinPct ? eastChampion : westChampion

    return playSeries(higherSeed, lowerSeed)
}
