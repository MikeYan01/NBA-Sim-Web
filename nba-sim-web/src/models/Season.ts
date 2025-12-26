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
import { hostGame, GameResult, GameRecapData } from './Game'
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
    /** Progress callback */
    onProgress?: (gamesCompleted: number, totalGames: number) => void
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

    constructor(options: SeasonOptions = {}) {
        const seed = options.seed !== undefined ? BigInt(options.seed) : BigInt(Date.now())
        this.random = new SeededRandom(seed)
        this.language = options.language ?? Language.ENGLISH
        this.silentMode = options.silentMode ?? false
        this.onProgress = options.onProgress
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
