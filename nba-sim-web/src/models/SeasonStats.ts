/**
 * Season Statistics Module
 *
 * Aggregates and tracks player and team statistics across an entire season.
 * Migrated from Java SeasonStats.java with identical stat tracking.
 *
 * Tasks T055-T059: Implement SeasonStats class
 */

import { Player } from './Player'
import { Team } from './Team'
import { Language } from './types'
import { roundDouble } from '../utils/Utilities'
import { translateToChinese } from '../utils/Constants'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Player season totals.
 */
export interface PlayerSeasonTotals {
    games: number
    points: number
    rebounds: number
    offensiveRebounds: number
    defensiveRebounds: number
    assists: number
    steals: number
    blocks: number
    turnovers: number
    doubleDoubles: number
    tripleDoubles: number
    threesMade: number
    threesAttempted: number
    freeThrowsMade: number
    freeThrowsAttempted: number
    shotsMade: number
    shotsAttempted: number
    secondsPlayed: number
    teamName: string
    englishName: string
}

/**
 * Player per-game averages.
 */
export interface PlayerPerGameStats {
    points: number
    rebounds: number
    offensiveRebounds: number
    defensiveRebounds: number
    assists: number
    steals: number
    blocks: number
    threesMade: number
    threesAttempted: number
    freeThrowsMade: number
    freeThrowsAttempted: number
    shotsMade: number
    shotsAttempted: number
    minutesPlayed: number
    fieldGoalPct: number
    threePct: number
    freeThrowPct: number
}

/**
 * Team season totals.
 */
export interface TeamSeasonTotals {
    games: number
    points: number
    pointsAllowed: number
    shotsMade: number
    threesMade: number
    freeThrowsMade: number
    shotsAttempted: number
    threesAttempted: number
    opponentShotsMade: number
    opponentShotsAttempted: number
    opponentThreesMade: number
    opponentThreesAttempted: number
}

/**
 * Team per-game averages.
 */
export interface TeamPerGameStats {
    points: number
    pointsAllowed: number
    shotsMade: number
    threesMade: number
    freeThrowsMade: number
    fieldGoalPct: number
    threePct: number
    opponentFieldGoalPct: number
    opponentThreePct: number
}

/**
 * Stat category for leaderboards.
 */
export type StatCategory =
    | 'points'
    | 'rebounds'
    | 'assists'
    | 'steals'
    | 'blocks'
    | 'turnovers'
    | 'doubleDoubles'
    | 'tripleDoubles'
    | 'threesMade'
    | 'freeThrowsMade'
    | 'minutesPlayed'

/**
 * Leaderboard entry.
 */
export interface LeaderboardEntry {
    name: string
    englishName: string
    teamName: string
    value: number
    perGame: PlayerPerGameStats
}

// =============================================================================
// SEASON STATS CLASS
// =============================================================================

/**
 * SeasonStats class for tracking and aggregating statistics across a season.
 */
export class SeasonStats {
    // Player statistics maps
    private playerTotals: Map<string, PlayerSeasonTotals> = new Map()
    private playerPerGame: Map<string, PlayerPerGameStats> = new Map()

    // Team statistics maps
    private teamTotals: Map<string, TeamSeasonTotals> = new Map()
    private teamPerGame: Map<string, TeamPerGameStats> = new Map()

    /**
     * Update a player's season stats after a game.
     * Only updates if the player has been on the court.
     *
     * @param player Player object with game stats
     */
    updatePlayerStats(player: Player): void {
        if (!player.hasBeenOnCourt) {
            return
        }

        const name = player.name
        const existing = this.playerTotals.get(name)

        // Initialize or update totals
        const totals: PlayerSeasonTotals = existing ?? {
            games: 0,
            points: 0,
            rebounds: 0,
            offensiveRebounds: 0,
            defensiveRebounds: 0,
            assists: 0,
            steals: 0,
            blocks: 0,
            turnovers: 0,
            doubleDoubles: 0,
            tripleDoubles: 0,
            threesMade: 0,
            threesAttempted: 0,
            freeThrowsMade: 0,
            freeThrowsAttempted: 0,
            shotsMade: 0,
            shotsAttempted: 0,
            secondsPlayed: 0,
            teamName: '',
            englishName: '',
        }

        // Check for double-double and triple-double
        const doubleDigitStats = [
            player.score >= 10,
            player.rebound >= 10,
            player.assist >= 10,
            player.steal >= 10,
            player.block >= 10,
        ].filter(Boolean).length

        const isDoubleDouble = doubleDigitStats >= 2
        const isTripleDouble = doubleDigitStats >= 3

        // Update totals
        totals.games += 1
        totals.points += player.score
        totals.rebounds += player.rebound
        totals.offensiveRebounds += player.offensiveRebound
        totals.defensiveRebounds += player.defensiveRebound
        totals.assists += player.assist
        totals.steals += player.steal
        totals.blocks += player.block
        totals.turnovers += player.turnover
        if (isDoubleDouble) totals.doubleDoubles += 1
        if (isTripleDouble) totals.tripleDoubles += 1
        totals.threesMade += player.threeMade
        totals.threesAttempted += player.threeAttempted
        totals.freeThrowsMade += player.freeThrowMade
        totals.freeThrowsAttempted += player.freeThrowAttempted
        totals.shotsMade += player.shotMade
        totals.shotsAttempted += player.shotAttempted
        totals.secondsPlayed += player.secondsPlayed
        totals.teamName = player.teamName
        totals.englishName = player.englishName

        this.playerTotals.set(name, totals)

        // Calculate per-game averages
        const games = totals.games
        const perGame: PlayerPerGameStats = {
            points: roundDouble(totals.points / games),
            rebounds: roundDouble(totals.rebounds / games),
            offensiveRebounds: roundDouble(totals.offensiveRebounds / games),
            defensiveRebounds: roundDouble(totals.defensiveRebounds / games),
            assists: roundDouble(totals.assists / games),
            steals: roundDouble(totals.steals / games),
            blocks: roundDouble(totals.blocks / games),
            threesMade: roundDouble(totals.threesMade / games),
            threesAttempted: roundDouble(totals.threesAttempted / games),
            freeThrowsMade: roundDouble(totals.freeThrowsMade / games),
            freeThrowsAttempted: roundDouble(totals.freeThrowsAttempted / games),
            shotsMade: roundDouble(totals.shotsMade / games),
            shotsAttempted: roundDouble(totals.shotsAttempted / games),
            minutesPlayed: roundDouble(totals.secondsPlayed / 60 / games),
            fieldGoalPct: totals.shotsAttempted > 0
                ? roundDouble(totals.shotsMade / totals.shotsAttempted, 3)
                : 0,
            threePct: totals.threesAttempted > 0
                ? roundDouble(totals.threesMade / totals.threesAttempted, 3)
                : 0,
            freeThrowPct: totals.freeThrowsAttempted > 0
                ? roundDouble(totals.freeThrowsMade / totals.freeThrowsAttempted, 3)
                : 0,
        }

        this.playerPerGame.set(name, perGame)
    }

    /**
     * Update a team's season stats after a game.
     *
     * @param team Team object with game stats
     */
    updateTeamStats(team: Team): void {
        const name = team.name
        const existing = this.teamTotals.get(name)

        // Initialize or update totals
        const totals: TeamSeasonTotals = existing ?? {
            games: 0,
            points: 0,
            pointsAllowed: 0,
            shotsMade: 0,
            threesMade: 0,
            freeThrowsMade: 0,
            shotsAttempted: 0,
            threesAttempted: 0,
            opponentShotsMade: 0,
            opponentShotsAttempted: 0,
            opponentThreesMade: 0,
            opponentThreesAttempted: 0,
        }

        // Update totals
        totals.games += 1
        totals.points += team.totalScore
        totals.pointsAllowed += team.totalScoreAllowed
        totals.shotsMade += team.totalShotMade
        totals.threesMade += team.total3Made
        totals.freeThrowsMade += team.totalFreeMade
        totals.shotsAttempted += team.totalShotAttempted
        totals.threesAttempted += team.total3Attempted
        totals.opponentShotsMade += team.opponentShotMade
        totals.opponentShotsAttempted += team.opponentShotAttempted
        totals.opponentThreesMade += team.opponent3Made
        totals.opponentThreesAttempted += team.opponent3Attempted

        this.teamTotals.set(name, totals)

        // Calculate per-game averages
        const games = totals.games
        const perGame: TeamPerGameStats = {
            points: roundDouble(totals.points / games),
            pointsAllowed: roundDouble(totals.pointsAllowed / games),
            shotsMade: roundDouble(totals.shotsMade / games),
            threesMade: roundDouble(totals.threesMade / games),
            freeThrowsMade: roundDouble(totals.freeThrowsMade / games),
            fieldGoalPct: totals.shotsAttempted > 0
                ? roundDouble(totals.shotsMade / totals.shotsAttempted, 3)
                : 0,
            threePct: totals.threesAttempted > 0
                ? roundDouble(totals.threesMade / totals.threesAttempted, 3)
                : 0,
            opponentFieldGoalPct: totals.opponentShotsAttempted > 0
                ? roundDouble(totals.opponentShotsMade / totals.opponentShotsAttempted, 3)
                : 0,
            opponentThreePct: totals.opponentThreesAttempted > 0
                ? roundDouble(totals.opponentThreesMade / totals.opponentThreesAttempted, 3)
                : 0,
        }

        this.teamPerGame.set(name, perGame)
    }

    /**
     * Get per-game stats for a player.
     */
    getPlayerPerGame(name: string): PlayerPerGameStats | undefined {
        return this.playerPerGame.get(name)
    }

    /**
     * Get totals for a player.
     */
    getPlayerTotals(name: string): PlayerSeasonTotals | undefined {
        return this.playerTotals.get(name)
    }

    /**
     * Get per-game stats for a team.
     */
    getTeamPerGame(name: string): TeamPerGameStats | undefined {
        return this.teamPerGame.get(name)
    }

    /**
     * Get totals for a team.
     */
    getTeamTotals(name: string): TeamSeasonTotals | undefined {
        return this.teamTotals.get(name)
    }

    /**
     * Get leaders for a given stat category.
     *
     * @param category Stat category to rank by
     * @param limit Maximum number of leaders to return
     * @returns Sorted array of leaderboard entries
     */
    getLeaders(category: StatCategory, limit: number = 10): LeaderboardEntry[] {
        const entries: LeaderboardEntry[] = []

        for (const [name, perGame] of this.playerPerGame) {
            const totals = this.playerTotals.get(name)
            if (!totals) continue

            let value: number
            // For counting stats (double-doubles, triple-doubles), use totals instead of per-game
            const useTotals = category === 'doubleDoubles' || category === 'tripleDoubles'

            switch (category) {
                case 'points':
                    value = perGame.points
                    break
                case 'rebounds':
                    value = perGame.rebounds
                    break
                case 'assists':
                    value = perGame.assists
                    break
                case 'steals':
                    value = perGame.steals
                    break
                case 'blocks':
                    value = perGame.blocks
                    break
                case 'turnovers':
                    value = roundDouble(totals.turnovers / totals.games)
                    break
                case 'doubleDoubles':
                    value = totals.doubleDoubles
                    break
                case 'tripleDoubles':
                    value = totals.tripleDoubles
                    break
                case 'threesMade':
                    value = perGame.threesMade
                    break
                case 'freeThrowsMade':
                    value = perGame.freeThrowsMade
                    break
                case 'minutesPlayed':
                    value = perGame.minutesPlayed
                    break
                default:
                    value = 0
            }

            // For double/triple-doubles, skip players with 0
            if (useTotals && value === 0) continue

            entries.push({
                name,
                englishName: totals.englishName,
                teamName: totals.teamName,
                value,
                perGame,
            })
        }

        // Sort descending by value
        entries.sort((a, b) => b.value - a.value)

        return entries.slice(0, limit)
    }

    /**
     * Get team leaders for points per game.
     *
     * @param limit Maximum number of teams to return
     * @param ascending If true, sort ascending (for defensive stats)
     * @returns Sorted array of team entries
     */
    getTeamLeaders(
        stat: 'points' | 'pointsAllowed' | 'shotsMade' | 'threesMade' | 'freeThrowsMade' | 'fieldGoalPct' | 'threePct' | 'opponentFieldGoalPct' | 'opponentThreePct',
        limit: number = 10,
        ascending: boolean = false
    ): Array<{ name: string; value: number }> {
        const entries: Array<{ name: string; value: number }> = []

        for (const [name, perGame] of this.teamPerGame) {
            let value: number
            switch (stat) {
                case 'points':
                    value = perGame.points
                    break
                case 'pointsAllowed':
                    value = perGame.pointsAllowed
                    break
                case 'shotsMade':
                    value = perGame.shotsMade
                    break
                case 'threesMade':
                    value = perGame.threesMade
                    break
                case 'freeThrowsMade':
                    value = perGame.freeThrowsMade
                    break
                case 'fieldGoalPct':
                    value = perGame.fieldGoalPct
                    break
                case 'threePct':
                    value = perGame.threePct
                    break
                case 'opponentFieldGoalPct':
                    value = perGame.opponentFieldGoalPct
                    break
                case 'opponentThreePct':
                    value = perGame.opponentThreePct
                    break
                default:
                    value = 0
            }

            entries.push({ name, value })
        }

        // Sort by value
        if (ascending) {
            entries.sort((a, b) => a.value - b.value)
        } else {
            entries.sort((a, b) => b.value - a.value)
        }

        return entries.slice(0, limit)
    }

    /**
     * Get all player names tracked.
     */
    getAllPlayerNames(): string[] {
        return Array.from(this.playerTotals.keys())
    }

    /**
     * Get all team names tracked.
     */
    getAllTeamNames(): string[] {
        return Array.from(this.teamTotals.keys())
    }

    /**
     * Format a leaderboard entry for display.
     *
     * @param entry Leaderboard entry
     * @param rank Rank (1-based)
     * @param language Display language
     * @returns Formatted string
     */
    formatLeaderboardEntry(
        entry: LeaderboardEntry,
        rank: number,
        language: Language = Language.ENGLISH
    ): string {
        const teamDisplay = language === Language.CHINESE
            ? translateToChinese(entry.teamName)
            : entry.teamName
        const playerDisplay = language === Language.ENGLISH
            ? entry.englishName
            : entry.name

        const { perGame } = entry
        const parts: string[] = [
            `${rank}`,
            teamDisplay ? `(${teamDisplay})` : '',
            playerDisplay,
            `${perGame.points}PTS`,
            `${perGame.rebounds}REB`,
            `${perGame.assists}AST`,
            `${perGame.steals}STL`,
            `${perGame.blocks}BLK`,
        ]

        // Add shooting stats
        if (perGame.shotsAttempted > 0) {
            const fgPct = (perGame.fieldGoalPct * 100).toFixed(1)
            parts.push(`FG:${perGame.shotsMade}/${perGame.shotsAttempted} ${fgPct}%`)
        }

        if (perGame.threesAttempted > 0) {
            const threePct = (perGame.threePct * 100).toFixed(1)
            parts.push(`3PT:${perGame.threesMade}/${perGame.threesAttempted} ${threePct}%`)
        }

        parts.push(`${perGame.minutesPlayed.toFixed(1)}MIN`)

        return parts.filter(Boolean).join(' ')
    }

    /**
     * Clear all statistics.
     */
    clear(): void {
        this.playerTotals.clear()
        this.playerPerGame.clear()
        this.teamTotals.clear()
        this.teamPerGame.clear()
    }

    /**
     * Serialize to plain object for Web Worker transfer.
     */
    toJSON(): SeasonStatsData {
        return {
            playerTotals: Object.fromEntries(this.playerTotals),
            playerPerGame: Object.fromEntries(this.playerPerGame),
            teamTotals: Object.fromEntries(this.teamTotals),
            teamPerGame: Object.fromEntries(this.teamPerGame),
        }
    }

    /**
     * Restore from serialized data (Web Worker transfer).
     */
    static fromJSON(data: SeasonStatsData): SeasonStats {
        const stats = new SeasonStats()
        stats.playerTotals = new Map(Object.entries(data.playerTotals))
        stats.playerPerGame = new Map(Object.entries(data.playerPerGame))
        stats.teamTotals = new Map(Object.entries(data.teamTotals))
        stats.teamPerGame = new Map(Object.entries(data.teamPerGame))
        return stats
    }
}

/**
 * Serialized SeasonStats data for Web Worker transfer.
 */
export interface SeasonStatsData {
    playerTotals: Record<string, PlayerSeasonTotals>
    playerPerGame: Record<string, PlayerPerGameStats>
    teamTotals: Record<string, TeamSeasonTotals>
    teamPerGame: Record<string, TeamPerGameStats>
}
