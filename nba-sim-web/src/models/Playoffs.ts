/**
 * Playoffs Module
 *
 * Manages NBA playoff bracket including:
 * - Play-in tournament (7-10 seeds)
 * - Best-of-7 playoff series with 2-2-1-1-1 home court format
 * - Conference playoffs (First Round, Semis, Finals)
 * - NBA Finals
 *
 * Tasks T063-T066: Implement playoffs functionality
 */

import { Team } from './Team'
import { Conference } from './types'
import { GameResult, hostGame } from './Game'
import { StandingsManager } from './Standings'
import { SeededRandom } from '../utils/SeededRandom'
import { Language } from './types'
import { roundDouble } from '../utils/Utilities'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Play-in game result.
 */
export interface PlayInGameResult {
    roundName: string
    awayTeam: string
    homeTeam: string
    winner: string
    loser: string
    winnerStatus: string
    loserStatus: string
    gameResult: GameResult
}

/**
 * Play-in tournament results for one conference.
 */
export interface PlayInResult {
    conference: Conference
    games: PlayInGameResult[]
    seed7: string
    seed8: string
}

/**
 * Series MVP data.
 */
export interface SeriesMVP {
    playerName: string
    englishName: string
    teamName: string
    gamesPlayed: number
    avgPoints: number
    avgRebounds: number
    avgAssists: number
    avgSteals: number
    avgBlocks: number
    fgMade: number
    fgAttempted: number
    threeMade: number
    threeAttempted: number
    mvpScore: number
}

/**
 * Player series statistics for MVP calculation.
 */
interface PlayerSeriesStats {
    name: string
    englishName: string
    teamName: string
    gamesPlayed: number
    totalPoints: number
    totalRebounds: number
    totalAssists: number
    totalSteals: number
    totalBlocks: number
    totalFgMade: number
    totalFgAttempted: number
    totalThreeMade: number
    totalThreeAttempted: number
}

/**
 * Playoff series result.
 */
export interface SeriesResult {
    team1: string
    team2: string
    team1Wins: number
    team2Wins: number
    winner: string
    loser: string
    games: GameResult[]
    seriesMVP?: SeriesMVP
}

/**
 * Playoff round result.
 */
export interface PlayoffRoundResult {
    roundName: string
    series: SeriesResult[]
}

/**
 * Full playoff bracket result.
 */
export interface PlayoffBracketResult {
    playIn: {
        west: PlayInResult
        east: PlayInResult
    }
    firstRound: PlayoffRoundResult
    confSemis: PlayoffRoundResult
    confFinals: PlayoffRoundResult
    finals: SeriesResult
    champion: string
    runnerUp: string
    finalsMVP?: SeriesMVP
}

/**
 * Playoff simulation options.
 */
export interface PlayoffOptions {
    seed?: number | bigint
    silentMode?: boolean
    language?: Language
    standings?: StandingsManager
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Reorder seeds for playoff matchups: 1v8, 4v5, 2v7, 3v6.
 * This creates the standard playoff bracket.
 *
 * @param seeds Array of 8 team names (index 0 = 1st seed, etc.)
 * @returns Reordered array for matchups [1,8,4,5,2,7,3,6]
 */
export function reorderSeeds(seeds: string[]): string[] {
    const order = [0, 7, 3, 4, 1, 6, 2, 5]
    return order.map((i) => seeds[i])
}

/**
 * Get home and away teams for a playoff game based on 2-2-1-1-1 format.
 * Games 1, 2, 5, 7: Higher seed at home
 * Games 3, 4, 6: Lower seed at home
 *
 * @param team1 First team
 * @param team2 Second team
 * @param gameNumber Game number in series (1-7)
 * @param seedMap Map of team names to seed numbers
 * @returns [awayTeam, homeTeam]
 */
export function getHomeAwayTeams(
    team1: string,
    team2: string,
    gameNumber: number,
    seedMap: Map<string, number>
): [string, string] {
    const team1Seed = seedMap.get(team1) ?? 99
    const team2Seed = seedMap.get(team2) ?? 99

    const higherSeed = team1Seed < team2Seed ? team1 : team2
    const lowerSeed = team1Seed < team2Seed ? team2 : team1

    // 2-2-1-1-1 format
    const higherSeedHome = gameNumber === 1 || gameNumber === 2 || gameNumber === 5 || gameNumber === 7

    return higherSeedHome ? [lowerSeed, higherSeed] : [higherSeed, lowerSeed]
}

/**
 * Calculate series MVP from player statistics.
 * MVP score = 1.0*PPG + 0.5*RPG + 0.7*APG + 0.6*SPG + 0.6*BPG
 * Only players from the winning team are eligible.
 *
 * @param playerStats Map of player stats
 * @param winningTeam Name of the winning team
 * @returns SeriesMVP data or undefined
 */
export function calculateSeriesMVP(
    playerStats: Map<string, PlayerSeriesStats>,
    winningTeam: string
): SeriesMVP | undefined {
    let mvp: SeriesMVP | undefined
    let maxScore = 0

    for (const [, stats] of playerStats) {
        // Only consider players from the winning team
        if (stats.teamName !== winningTeam || stats.gamesPlayed < 1) {
            continue
        }

        const avgPoints = stats.totalPoints / stats.gamesPlayed
        const avgRebounds = stats.totalRebounds / stats.gamesPlayed
        const avgAssists = stats.totalAssists / stats.gamesPlayed
        const avgSteals = stats.totalSteals / stats.gamesPlayed
        const avgBlocks = stats.totalBlocks / stats.gamesPlayed

        // MVP calculation formula
        const mvpScore =
            avgPoints * 1.0 +
            avgRebounds * 0.5 +
            avgAssists * 0.7 +
            avgSteals * 0.6 +
            avgBlocks * 0.6

        if (mvpScore > maxScore) {
            maxScore = mvpScore
            mvp = {
                playerName: stats.name,
                englishName: stats.englishName,
                teamName: stats.teamName,
                gamesPlayed: stats.gamesPlayed,
                avgPoints: roundDouble(avgPoints),
                avgRebounds: roundDouble(avgRebounds),
                avgAssists: roundDouble(avgAssists),
                avgSteals: roundDouble(avgSteals),
                avgBlocks: roundDouble(avgBlocks),
                fgMade: stats.totalFgMade,
                fgAttempted: stats.totalFgAttempted,
                threeMade: stats.totalThreeMade,
                threeAttempted: stats.totalThreeAttempted,
                mvpScore: roundDouble(mvpScore),
            }
        }
    }

    return mvp
}

/**
 * Update player series stats from a game result.
 *
 * @param playerStats Map to update
 * @param gameResult Game result with box score
 */
export function updatePlayerSeriesStats(
    playerStats: Map<string, PlayerSeriesStats>,
    gameResult: GameResult
): void {
    // Process both teams' players
    for (const teamBoxScore of [gameResult.boxScore.team1, gameResult.boxScore.team2]) {
        for (const player of teamBoxScore.players) {
            const existing = playerStats.get(player.name)

            if (existing) {
                existing.gamesPlayed += 1
                existing.totalPoints += player.points
                existing.totalRebounds += player.rebounds
                existing.totalAssists += player.assists
                existing.totalSteals += player.steals
                existing.totalBlocks += player.blocks
                existing.totalFgMade += player.fgMade
                existing.totalFgAttempted += player.fgAttempted
                existing.totalThreeMade += player.threeMade
                existing.totalThreeAttempted += player.threeAttempted
            } else {
                playerStats.set(player.name, {
                    name: player.name,
                    englishName: player.englishName,
                    teamName: teamBoxScore.teamName,
                    gamesPlayed: 1,
                    totalPoints: player.points,
                    totalRebounds: player.rebounds,
                    totalAssists: player.assists,
                    totalSteals: player.steals,
                    totalBlocks: player.blocks,
                    totalFgMade: player.fgMade,
                    totalFgAttempted: player.fgAttempted,
                    totalThreeMade: player.threeMade,
                    totalThreeAttempted: player.threeAttempted,
                })
            }
        }
    }
}

// =============================================================================
// PLAYOFF MANAGER CLASS
// =============================================================================

/**
 * PlayoffManager class for simulating NBA playoffs.
 */
export class PlayoffManager {
    private seedMap: Map<string, number> = new Map()
    private teamCache: Map<string, Team> = new Map()
    private random: SeededRandom
    private _silentMode: boolean
    private language: Language

    constructor(options: PlayoffOptions = {}) {
        this.random = new SeededRandom(BigInt(options.seed ?? Date.now()))
        this._silentMode = options.silentMode ?? false
        this.language = options.language ?? Language.ENGLISH
    }

    /**
     * Check if running in silent mode (no commentary).
     */
    get silentMode(): boolean {
        return this._silentMode
    }

    /**
     * Set team seed for home court advantage.
     *
     * @param teamName Team name
     * @param seed Seed number (1 = highest)
     */
    setSeed(teamName: string, seed: number): void {
        this.seedMap.set(teamName, seed)
    }

    /**
     * Cache a team for reuse.
     *
     * @param team Team object
     */
    cacheTeam(team: Team): void {
        this.teamCache.set(team.name, team)
    }

    /**
     * Get a cached team.
     *
     * @param teamName Team name
     * @returns Cached team or undefined
     */
    getCachedTeam(teamName: string): Team | undefined {
        return this.teamCache.get(teamName)
    }

    /**
     * Host a single playoff game.
     *
     * @param awayTeam Away team
     * @param homeTeam Home team
     * @param gameDate Optional date string for recap (e.g., "Game 1")
     * @returns Game result
     */
    hostPlayoffGame(awayTeam: Team, homeTeam: Team, gameDate?: string): GameResult {
        // hostGame uses the random object directly
        const result = hostGame(awayTeam, homeTeam, this.random, this.language, gameDate)
        return result
    }

    /**
     * Host a best-of-7 series.
     *
     * @param team1 First team (series ordering)
     * @param team2 Second team (series ordering)
     * @param seriesName Name of the series for display
     * @param teams Map of team name to Team objects
     * @returns Series result
     */
    hostSeries(
        team1: string,
        team2: string,
        _seriesName: string,
        teams: Map<string, Team>
    ): SeriesResult {
        let team1Wins = 0
        let team2Wins = 0
        const games: GameResult[] = []
        const playerStats: Map<string, PlayerSeriesStats> = new Map()

        for (let gameNumber = 1; gameNumber <= 7; gameNumber++) {
            // Determine home/away based on 2-2-1-1-1 format
            const [awayName, homeName] = getHomeAwayTeams(
                team1,
                team2,
                gameNumber,
                this.seedMap
            )

            const awayTeam = teams.get(awayName)
            const homeTeam = teams.get(homeName)

            if (!awayTeam || !homeTeam) {
                throw new Error(`Team not found: ${awayName} or ${homeName}`)
            }

            // Reset team stats for the game
            awayTeam.resetGameStats()
            homeTeam.resetGameStats()

            // Create game date label for recap (e.g., "Game 1")
            const gameDate = `Game ${gameNumber}`
            const gameResult = this.hostPlayoffGame(awayTeam, homeTeam, gameDate)
            games.push(gameResult)

            // Update series stats
            updatePlayerSeriesStats(playerStats, gameResult)

            // Update win counts
            if (gameResult.winner === team1) {
                team1Wins++
            } else {
                team2Wins++
            }

            // Check for series winner
            if (team1Wins === 4 || team2Wins === 4) {
                break
            }
        }

        const winner = team1Wins === 4 ? team1 : team2
        const loser = winner === team1 ? team2 : team1

        // Calculate series MVP
        const seriesMVP = calculateSeriesMVP(playerStats, winner)

        return {
            team1,
            team2,
            team1Wins,
            team2Wins,
            winner,
            loser,
            games,
            seriesMVP,
        }
    }

    /**
     * Host play-in tournament for one conference.
     * Game 1: 7 vs 8 - Winner gets 7th seed
     * Game 2: 9 vs 10 - Winner advances
     * Game 3: Loser of 7v8 vs Winner of 9v10 - Winner gets 8th seed
     *
     * @param top10 Top 10 teams in conference (0-indexed)
     * @param conference Conference
     * @param teams Map of team names to Team objects
     * @returns Play-in result with final 7th and 8th seeds
     */
    hostPlayIn(
        top10: string[],
        conference: Conference,
        teams: Map<string, Team>
    ): PlayInResult {
        const games: PlayInGameResult[] = []
        const conferencePrefix = conference === Conference.WEST ? 'Western' : 'Eastern'

        // Game 1: 7 vs 8 (7th seed has home court)
        const team7 = top10[6]
        const team8 = top10[7]
        const team7Obj = teams.get(team7)
        const team8Obj = teams.get(team8)

        if (!team7Obj || !team8Obj) {
            throw new Error(`Team not found for play-in: ${team7} or ${team8}`)
        }

        team7Obj.resetGameStats()
        team8Obj.resetGameStats()

        const game1Result = this.hostPlayoffGame(team8Obj, team7Obj, `${conferencePrefix} Play-In 7v8`) // 8 away, 7 home
        const winner7v8 = game1Result.winner
        const loser7v8 = winner7v8 === team7 ? team8 : team7

        games.push({
            roundName: `${conferencePrefix} Play-In 7v8`,
            awayTeam: team8,
            homeTeam: team7,
            winner: winner7v8,
            loser: loser7v8,
            winnerStatus: 'Secured 7th seed',
            loserStatus: 'Advances to final',
            gameResult: game1Result,
        })

        // Game 2: 9 vs 10 (9th seed has home court)
        const team9 = top10[8]
        const team10 = top10[9]
        const team9Obj = teams.get(team9)
        const team10Obj = teams.get(team10)

        if (!team9Obj || !team10Obj) {
            throw new Error(`Team not found for play-in: ${team9} or ${team10}`)
        }

        team9Obj.resetGameStats()
        team10Obj.resetGameStats()

        const game2Result = this.hostPlayoffGame(team10Obj, team9Obj, `${conferencePrefix} Play-In 9v10`) // 10 away, 9 home
        const winner9v10 = game2Result.winner
        const loser9v10 = winner9v10 === team9 ? team10 : team9

        games.push({
            roundName: `${conferencePrefix} Play-In 9v10`,
            awayTeam: team10,
            homeTeam: team9,
            winner: winner9v10,
            loser: loser9v10,
            winnerStatus: 'Advances to final',
            loserStatus: 'Eliminated',
            gameResult: game2Result,
        })

        // Game 3: Loser of 7v8 vs Winner of 9v10 (loser7v8 has home court)
        const loser7v8Obj = teams.get(loser7v8)
        const winner9v10Obj = teams.get(winner9v10)

        if (!loser7v8Obj || !winner9v10Obj) {
            throw new Error(`Team not found for play-in final`)
        }

        loser7v8Obj.resetGameStats()
        winner9v10Obj.resetGameStats()

        const game3Result = this.hostPlayoffGame(winner9v10Obj, loser7v8Obj, `${conferencePrefix} Play-In Final`) // winner9v10 away
        const winner8th = game3Result.winner
        const loser8th = winner8th === loser7v8 ? winner9v10 : loser7v8

        games.push({
            roundName: `${conferencePrefix} Play-In Final`,
            awayTeam: winner9v10,
            homeTeam: loser7v8,
            winner: winner8th,
            loser: loser8th,
            winnerStatus: 'Secured 8th seed',
            loserStatus: 'Eliminated',
            gameResult: game3Result,
        })

        return {
            conference,
            games,
            seed7: winner7v8,
            seed8: winner8th,
        }
    }

    /**
     * Host conference playoffs (First Round, Semis, Finals).
     *
     * @param seeds 8 playoff seeds (1-8)
     * @param conference Conference
     * @param teams Map of team names to Team objects
     * @returns Conference champion and round results
     */
    hostConferencePlayoffs(
        seeds: string[],
        conference: Conference,
        teams: Map<string, Team>
    ): {
        champion: string
        firstRound: SeriesResult[]
        semis: SeriesResult[]
        finals: SeriesResult
    } {
        const conferencePrefix = conference === Conference.WEST ? 'Western' : 'Eastern'

        // Set up seed map for home court
        for (let i = 0; i < seeds.length; i++) {
            this.setSeed(seeds[i], i + 1)
        }

        // Reorder seeds for matchups: 1v8, 4v5, 2v7, 3v6
        const orderedSeeds = reorderSeeds(seeds)

        // First Round: 4 series
        const firstRound: SeriesResult[] = []
        for (let i = 0; i < 8; i += 2) {
            const team1 = orderedSeeds[i]
            const team2 = orderedSeeds[i + 1]
            const result = this.hostSeries(
                team1,
                team2,
                `${conferencePrefix} First Round`,
                teams
            )
            firstRound.push(result)
        }

        // Semis: 2 series
        const semiSeeds = firstRound.map((r) => r.winner)
        const semis: SeriesResult[] = []
        for (let i = 0; i < 4; i += 2) {
            const team1 = semiSeeds[i]
            const team2 = semiSeeds[i + 1]
            const result = this.hostSeries(
                team1,
                team2,
                `${conferencePrefix} Semis`,
                teams
            )
            semis.push(result)
        }

        // Conference Finals
        const finalsSeeds = semis.map((r) => r.winner)
        const finals = this.hostSeries(
            finalsSeeds[0],
            finalsSeeds[1],
            `${conferencePrefix} Finals`,
            teams
        )

        return {
            champion: finals.winner,
            firstRound,
            semis,
            finals,
        }
    }

    /**
     * Host full playoffs including play-in and NBA Finals.
     *
     * @param standings StandingsManager with regular season results
     * @param teams Map of team names to Team objects
     * @returns Complete playoff bracket result
     */
    hostPlayoffs(
        standings: StandingsManager,
        teams: Map<string, Team>
    ): PlayoffBracketResult {
        // Get top 10 teams from each conference
        const westStandings = standings.getConferenceStandings(Conference.WEST)
        const eastStandings = standings.getConferenceStandings(Conference.EAST)

        const westTop10 = westStandings.slice(0, 10).map((e) => e.teamName)
        const eastTop10 = eastStandings.slice(0, 10).map((e) => e.teamName)

        // Host play-in tournaments
        const westPlayIn = this.hostPlayIn(westTop10, Conference.WEST, teams)
        const eastPlayIn = this.hostPlayIn(eastTop10, Conference.EAST, teams)

        // Build final 8 seeds for each conference
        const westSeeds = [
            ...westTop10.slice(0, 6),
            westPlayIn.seed7,
            westPlayIn.seed8,
        ]
        const eastSeeds = [
            ...eastTop10.slice(0, 6),
            eastPlayIn.seed7,
            eastPlayIn.seed8,
        ]

        // Host conference playoffs
        const westPlayoffs = this.hostConferencePlayoffs(westSeeds, Conference.WEST, teams)
        const eastPlayoffs = this.hostConferencePlayoffs(eastSeeds, Conference.EAST, teams)

        // Determine NBA Finals home court based on regular season record
        const westChampRecord = standings.getTeamRecord(westPlayoffs.champion)
        const eastChampRecord = standings.getTeamRecord(eastPlayoffs.champion)

        if (westChampRecord && eastChampRecord) {
            const westWinPct = standings.calculateWinPercentage(
                westChampRecord.wins,
                westChampRecord.losses
            )
            const eastWinPct = standings.calculateWinPercentage(
                eastChampRecord.wins,
                eastChampRecord.losses
            )

            if (westWinPct > eastWinPct) {
                this.setSeed(westPlayoffs.champion, 1)
                this.setSeed(eastPlayoffs.champion, 2)
            } else {
                this.setSeed(eastPlayoffs.champion, 1)
                this.setSeed(westPlayoffs.champion, 2)
            }
        }

        // NBA Finals
        const finals = this.hostSeries(
            westPlayoffs.champion,
            eastPlayoffs.champion,
            'NBA Finals',
            teams
        )

        return {
            playIn: {
                west: westPlayIn,
                east: eastPlayIn,
            },
            firstRound: {
                roundName: 'First Round',
                series: [...westPlayoffs.firstRound, ...eastPlayoffs.firstRound],
            },
            confSemis: {
                roundName: 'Conference Semis',
                series: [...westPlayoffs.semis, ...eastPlayoffs.semis],
            },
            confFinals: {
                roundName: 'Conference Finals',
                series: [westPlayoffs.finals, eastPlayoffs.finals],
            },
            finals,
            champion: finals.winner,
            runnerUp: finals.loser,
            finalsMVP: finals.seriesMVP,
        }
    }
}
