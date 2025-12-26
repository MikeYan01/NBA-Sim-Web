/**
 * Standings Module
 *
 * Manages season standings with W-L-PCT-GB calculations
 * and conference grouping (East/West).
 *
 * Tasks T061-T062: Implement standings calculation and conference grouping
 */

import { Conference, StandingEntry } from './types'
import { getTeamConference, ALL_TEAMS_EN } from '../utils/Constants'
import { roundDouble } from '../utils/Utilities'

// =============================================================================
// TYPES
// =============================================================================

/**
 * Team record for tracking wins and losses.
 */
export interface TeamRecord {
    teamName: string
    wins: number
    losses: number
    conference: Conference
}

/**
 * Conference standings with sorted entries.
 */
export interface ConferenceStandings {
    east: StandingEntry[]
    west: StandingEntry[]
}

// =============================================================================
// STANDINGS MANAGER CLASS
// =============================================================================

/**
 * StandingsManager class for tracking and calculating season standings.
 *
 * Features:
 * - Track wins and losses for all 30 teams
 * - Calculate win percentage (PCT)
 * - Calculate games back (GB) from conference leader
 * - Group teams by conference (East/West)
 * - Sort by win percentage within each conference
 */
export class StandingsManager {
    private records: Map<string, TeamRecord> = new Map()

    /**
     * Create a new StandingsManager.
     * Initializes all 30 teams with 0-0 records.
     */
    constructor() {
        this.initializeTeams()
    }

    /**
     * Initialize all teams with 0-0 records.
     */
    private initializeTeams(): void {
        for (const teamName of ALL_TEAMS_EN) {
            this.records.set(teamName, {
                teamName,
                wins: 0,
                losses: 0,
                conference: getTeamConference(teamName),
            })
        }
    }

    /**
     * Record a game result.
     * Updates wins and losses for both teams.
     *
     * @param winnerName Name of the winning team
     * @param loserName Name of the losing team
     */
    recordGame(winnerName: string, loserName: string): void {
        const winnerRecord = this.records.get(winnerName)
        const loserRecord = this.records.get(loserName)

        if (winnerRecord) {
            winnerRecord.wins += 1
        }

        if (loserRecord) {
            loserRecord.losses += 1
        }
    }

    /**
     * Get the record for a specific team.
     *
     * @param teamName Team name
     * @returns Team record or undefined if not found
     */
    getTeamRecord(teamName: string): TeamRecord | undefined {
        return this.records.get(teamName)
    }

    /**
     * Calculate win percentage.
     *
     * @param wins Number of wins
     * @param losses Number of losses
     * @returns Win percentage (0.0 to 1.0), or 0.0 if no games played
     */
    calculateWinPercentage(wins: number, losses: number): number {
        const totalGames = wins + losses
        if (totalGames === 0) {
            return 0.0
        }
        return roundDouble(wins / totalGames, 3)
    }

    /**
     * Calculate games back from leader.
     * GB = ((Leader Wins - Team Wins) + (Team Losses - Leader Losses)) / 2
     *
     * @param leaderWins Leader's wins
     * @param leaderLosses Leader's losses
     * @param teamWins Team's wins
     * @param teamLosses Team's losses
     * @returns Games back from leader
     */
    calculateGamesBack(
        leaderWins: number,
        leaderLosses: number,
        teamWins: number,
        teamLosses: number
    ): number {
        return ((leaderWins - teamWins) + (teamLosses - leaderLosses)) / 2
    }

    /**
     * Get all team records.
     *
     * @returns Array of all team records
     */
    getAllRecords(): TeamRecord[] {
        return Array.from(this.records.values())
    }

    /**
     * Get records for a specific conference.
     *
     * @param conference Conference to filter by
     * @returns Array of team records in that conference
     */
    getConferenceRecords(conference: Conference): TeamRecord[] {
        return Array.from(this.records.values()).filter(
            (record) => record.conference === conference
        )
    }

    /**
     * Sort records by win percentage (descending).
     * Tiebreaker: more wins first.
     *
     * @param records Array of team records
     * @returns Sorted array
     */
    sortByWinPercentage(records: TeamRecord[]): TeamRecord[] {
        return [...records].sort((a, b) => {
            const pctA = this.calculateWinPercentage(a.wins, a.losses)
            const pctB = this.calculateWinPercentage(b.wins, b.losses)

            // Primary: win percentage (descending)
            if (pctB !== pctA) {
                return pctB - pctA
            }

            // Tiebreaker: more wins first
            return b.wins - a.wins
        })
    }

    /**
     * Generate standings entries for a conference.
     *
     * @param conference Conference to generate standings for
     * @returns Array of StandingEntry objects sorted by rank
     */
    getConferenceStandings(conference: Conference): StandingEntry[] {
        const conferenceRecords = this.getConferenceRecords(conference)
        const sortedRecords = this.sortByWinPercentage(conferenceRecords)

        if (sortedRecords.length === 0) {
            return []
        }

        // Get leader for GB calculation
        const leader = sortedRecords[0]

        return sortedRecords.map((record, index) => ({
            rank: index + 1,
            teamName: record.teamName,
            wins: record.wins,
            losses: record.losses,
            winPercentage: this.calculateWinPercentage(record.wins, record.losses),
            gamesBack: this.calculateGamesBack(
                leader.wins,
                leader.losses,
                record.wins,
                record.losses
            ),
            conference: record.conference,
        }))
    }

    /**
     * Get full standings grouped by conference.
     *
     * @returns ConferenceStandings with east and west arrays
     */
    getStandings(): ConferenceStandings {
        return {
            east: this.getConferenceStandings(Conference.EAST),
            west: this.getConferenceStandings(Conference.WEST),
        }
    }

    /**
     * Get combined standings (all teams) sorted by win percentage.
     *
     * @returns Array of StandingEntry objects for all 30 teams
     */
    getCombinedStandings(): StandingEntry[] {
        const allRecords = this.getAllRecords()
        const sortedRecords = this.sortByWinPercentage(allRecords)

        if (sortedRecords.length === 0) {
            return []
        }

        // Get leader for GB calculation
        const leader = sortedRecords[0]

        return sortedRecords.map((record, index) => ({
            rank: index + 1,
            teamName: record.teamName,
            wins: record.wins,
            losses: record.losses,
            winPercentage: this.calculateWinPercentage(record.wins, record.losses),
            gamesBack: this.calculateGamesBack(
                leader.wins,
                leader.losses,
                record.wins,
                record.losses
            ),
            conference: record.conference,
        }))
    }

    /**
     * Get playoff seeds (top 6 teams per conference).
     *
     * @param conference Conference to get seeds for
     * @returns Array of top 6 StandingEntry objects
     */
    getPlayoffSeeds(conference: Conference): StandingEntry[] {
        return this.getConferenceStandings(conference).slice(0, 6)
    }

    /**
     * Get play-in teams (7-10 seeds per conference).
     *
     * @param conference Conference to get play-in teams for
     * @returns Array of StandingEntry objects for seeds 7-10
     */
    getPlayInTeams(conference: Conference): StandingEntry[] {
        return this.getConferenceStandings(conference).slice(6, 10)
    }

    /**
     * Get lottery teams (11-15 seeds per conference).
     *
     * @param conference Conference to get lottery teams for
     * @returns Array of StandingEntry objects for seeds 11-15
     */
    getLotteryTeams(conference: Conference): StandingEntry[] {
        return this.getConferenceStandings(conference).slice(10, 15)
    }

    /**
     * Reset all standings to 0-0.
     */
    reset(): void {
        this.initializeTeams()
    }

    /**
     * Get the number of games played by a team.
     *
     * @param teamName Team name
     * @returns Number of games played
     */
    getGamesPlayed(teamName: string): number {
        const record = this.records.get(teamName)
        if (!record) {
            return 0
        }
        return record.wins + record.losses
    }

    /**
     * Check if the regular season is complete (all teams have 82 games).
     *
     * @returns True if all teams have played 82 games
     */
    isSeasonComplete(): boolean {
        for (const record of this.records.values()) {
            if (record.wins + record.losses < 82) {
                return false
            }
        }
        return true
    }

    /**
     * Format standings entry for display.
     *
     * @param entry Standing entry
     * @returns Formatted string "RANK. TEAM W-L PCT GB"
     */
    formatStandingEntry(entry: StandingEntry): string {
        const pct = entry.winPercentage.toFixed(3)
        const gb = entry.gamesBack === 0 ? '-' : entry.gamesBack.toFixed(1)
        return `${entry.rank}. ${entry.teamName.padEnd(15)} ${entry.wins}-${entry.losses} ${pct} ${gb}`
    }

    /**
     * Serialize standings to JSON.
     *
     * @returns JSON-serializable object
     */
    toJSON(): { records: TeamRecord[]; standings: ConferenceStandings } {
        return {
            records: this.getAllRecords(),
            standings: this.getStandings(),
        }
    }

    /**
     * Load standings from JSON.
     *
     * @param data JSON data from toJSON()
     */
    fromJSON(data: { records: TeamRecord[] }): void {
        this.records.clear()
        for (const record of data.records) {
            this.records.set(record.teamName, {
                teamName: record.teamName,
                wins: record.wins,
                losses: record.losses,
                conference: record.conference,
            })
        }
    }
}
