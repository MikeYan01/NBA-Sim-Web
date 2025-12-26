/**
 * Standings Tests
 *
 * Tests for StandingsManager class including:
 * - Win/loss recording
 * - Win percentage calculation
 * - Games back calculation
 * - Conference grouping (East/West)
 * - Sorting and ranking
 *
 * Tasks T061-T062: Test standings calculation and conference grouping
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
    StandingsManager,
    TeamRecord,
    ConferenceStandings,
} from '../../src/models/Standings'
import { Conference, StandingEntry } from '../../src/models/types'
import {
    EAST_TEAMS_EN,
    WEST_TEAMS_EN,
    getTeamConference,
} from '../../src/utils/Constants'

describe('StandingsManager', () => {
    let standings: StandingsManager

    beforeEach(() => {
        standings = new StandingsManager()
    })

    describe('initialization', () => {
        it('should initialize all 30 teams with 0-0 records', () => {
            const allRecords = standings.getAllRecords()
            expect(allRecords).toHaveLength(30)

            for (const record of allRecords) {
                expect(record.wins).toBe(0)
                expect(record.losses).toBe(0)
            }
        })

        it('should assign correct conferences to all teams', () => {
            const eastRecords = standings.getConferenceRecords(Conference.EAST)
            const westRecords = standings.getConferenceRecords(Conference.WEST)

            expect(eastRecords).toHaveLength(15)
            expect(westRecords).toHaveLength(15)

            for (const record of eastRecords) {
                expect(record.conference).toBe(Conference.EAST)
            }

            for (const record of westRecords) {
                expect(record.conference).toBe(Conference.WEST)
            }
        })

        it('should have Celtics in Eastern Conference', () => {
            const record = standings.getTeamRecord('Celtics')
            expect(record).toBeDefined()
            expect(record!.conference).toBe(Conference.EAST)
        })

        it('should have Lakers in Western Conference', () => {
            const record = standings.getTeamRecord('Lakers')
            expect(record).toBeDefined()
            expect(record!.conference).toBe(Conference.WEST)
        })
    })

    describe('recordGame', () => {
        it('should record a win for the winner', () => {
            standings.recordGame('Celtics', 'Lakers')
            const celtics = standings.getTeamRecord('Celtics')
            expect(celtics!.wins).toBe(1)
            expect(celtics!.losses).toBe(0)
        })

        it('should record a loss for the loser', () => {
            standings.recordGame('Celtics', 'Lakers')
            const lakers = standings.getTeamRecord('Lakers')
            expect(lakers!.wins).toBe(0)
            expect(lakers!.losses).toBe(1)
        })

        it('should accumulate multiple games correctly', () => {
            standings.recordGame('Celtics', 'Lakers')
            standings.recordGame('Celtics', 'Warriors')
            standings.recordGame('Warriors', 'Celtics')

            const celtics = standings.getTeamRecord('Celtics')
            expect(celtics!.wins).toBe(2)
            expect(celtics!.losses).toBe(1)
        })

        it('should handle unknown teams gracefully', () => {
            // Should not throw
            standings.recordGame('UnknownTeam', 'Lakers')
            const lakers = standings.getTeamRecord('Lakers')
            expect(lakers!.losses).toBe(1)
        })
    })

    describe('calculateWinPercentage', () => {
        it('should return 0.0 for no games played', () => {
            expect(standings.calculateWinPercentage(0, 0)).toBe(0.0)
        })

        it('should return 1.0 for perfect record', () => {
            expect(standings.calculateWinPercentage(10, 0)).toBe(1.0)
        })

        it('should return 0.0 for winless record', () => {
            expect(standings.calculateWinPercentage(0, 10)).toBe(0.0)
        })

        it('should return 0.5 for even record', () => {
            expect(standings.calculateWinPercentage(5, 5)).toBe(0.5)
        })

        it('should round to 3 decimal places', () => {
            expect(standings.calculateWinPercentage(2, 3)).toBe(0.4) // 2/5 = 0.4
            expect(standings.calculateWinPercentage(1, 3)).toBe(0.25) // 1/4 = 0.25
        })
    })

    describe('calculateGamesBack', () => {
        it('should return 0 for leader', () => {
            const gb = standings.calculateGamesBack(10, 2, 10, 2)
            expect(gb).toBe(0)
        })

        it('should calculate GB correctly for trailing team', () => {
            // Leader: 10-2, Team: 8-4
            // GB = ((10-8) + (4-2)) / 2 = (2 + 2) / 2 = 2
            const gb = standings.calculateGamesBack(10, 2, 8, 4)
            expect(gb).toBe(2)
        })

        it('should handle half games correctly', () => {
            // Leader: 10-2, Team: 9-3
            // GB = ((10-9) + (3-2)) / 2 = (1 + 1) / 2 = 1
            const gb = standings.calculateGamesBack(10, 2, 9, 3)
            expect(gb).toBe(1)

            // Leader: 10-2, Team: 10-3
            // GB = ((10-10) + (3-2)) / 2 = (0 + 1) / 2 = 0.5
            const gb2 = standings.calculateGamesBack(10, 2, 10, 3)
            expect(gb2).toBe(0.5)
        })
    })

    describe('sortByWinPercentage', () => {
        it('should sort records by win percentage descending', () => {
            const records: TeamRecord[] = [
                { teamName: 'Team A', wins: 2, losses: 8, conference: Conference.EAST },
                { teamName: 'Team B', wins: 8, losses: 2, conference: Conference.EAST },
                { teamName: 'Team C', wins: 5, losses: 5, conference: Conference.EAST },
            ]

            const sorted = standings.sortByWinPercentage(records)
            expect(sorted[0].teamName).toBe('Team B')
            expect(sorted[1].teamName).toBe('Team C')
            expect(sorted[2].teamName).toBe('Team A')
        })

        it('should use wins as tiebreaker for same percentage', () => {
            const records: TeamRecord[] = [
                { teamName: 'Team A', wins: 2, losses: 2, conference: Conference.EAST },
                { teamName: 'Team B', wins: 10, losses: 10, conference: Conference.EAST },
            ]

            const sorted = standings.sortByWinPercentage(records)
            expect(sorted[0].teamName).toBe('Team B') // More wins
            expect(sorted[1].teamName).toBe('Team A')
        })
    })

    describe('getConferenceStandings', () => {
        beforeEach(() => {
            // Set up some wins for Eastern Conference teams
            standings.recordGame('Celtics', 'Knicks')
            standings.recordGame('Celtics', 'Heat')
            standings.recordGame('Celtics', 'Nets')
            standings.recordGame('Heat', 'Knicks')
            standings.recordGame('Nets', 'Knicks')
        })

        it('should return 15 teams for each conference', () => {
            const eastStandings = standings.getConferenceStandings(Conference.EAST)
            expect(eastStandings).toHaveLength(15)
        })

        it('should rank teams correctly within conference', () => {
            const eastStandings = standings.getConferenceStandings(Conference.EAST)

            // Celtics should be #1 (3-0)
            expect(eastStandings[0].teamName).toBe('Celtics')
            expect(eastStandings[0].rank).toBe(1)
            expect(eastStandings[0].wins).toBe(3)
            expect(eastStandings[0].losses).toBe(0)
        })

        it('should calculate correct games back', () => {
            const eastStandings = standings.getConferenceStandings(Conference.EAST)

            // Leader (Celtics 3-0) should have 0 GB
            expect(eastStandings[0].gamesBack).toBe(0)

            // Heat (1-1): GB = ((3-1) + (1-0)) / 2 = 1.5
            const heat = eastStandings.find((e) => e.teamName === 'Heat')
            expect(heat!.gamesBack).toBe(1.5)

            // Knicks (0-3): GB = ((3-0) + (3-0)) / 2 = 3
            const knicks = eastStandings.find((e) => e.teamName === 'Knicks')
            expect(knicks!.gamesBack).toBe(3)
        })

        it('should set correct conference for all entries', () => {
            const eastStandings = standings.getConferenceStandings(Conference.EAST)
            for (const entry of eastStandings) {
                expect(entry.conference).toBe(Conference.EAST)
            }

            const westStandings = standings.getConferenceStandings(Conference.WEST)
            for (const entry of westStandings) {
                expect(entry.conference).toBe(Conference.WEST)
            }
        })
    })

    describe('getStandings', () => {
        it('should return both conference standings', () => {
            const allStandings = standings.getStandings()
            expect(allStandings.east).toHaveLength(15)
            expect(allStandings.west).toHaveLength(15)
        })

        it('should maintain independent conference rankings', () => {
            // Add games in both conferences
            standings.recordGame('Celtics', 'Knicks')
            standings.recordGame('Lakers', 'Warriors')

            const allStandings = standings.getStandings()

            // Each conference should have its own #1
            expect(allStandings.east[0].rank).toBe(1)
            expect(allStandings.east[0].teamName).toBe('Celtics')

            expect(allStandings.west[0].rank).toBe(1)
            expect(allStandings.west[0].teamName).toBe('Lakers')
        })
    })

    describe('getCombinedStandings', () => {
        it('should return all 30 teams', () => {
            const combined = standings.getCombinedStandings()
            expect(combined).toHaveLength(30)
        })

        it('should rank across conferences', () => {
            standings.recordGame('Celtics', 'Knicks')
            standings.recordGame('Celtics', 'Heat')
            standings.recordGame('Lakers', 'Warriors')

            const combined = standings.getCombinedStandings()

            // Celtics (2-0) should be ahead of Lakers (1-0)
            expect(combined[0].teamName).toBe('Celtics')
            expect(combined[1].teamName).toBe('Lakers')
        })
    })

    describe('getPlayoffSeeds', () => {
        it('should return top 6 teams from conference', () => {
            const seeds = standings.getPlayoffSeeds(Conference.EAST)
            expect(seeds).toHaveLength(6)

            // Ranks should be 1-6
            for (let i = 0; i < 6; i++) {
                expect(seeds[i].rank).toBe(i + 1)
            }
        })
    })

    describe('getPlayInTeams', () => {
        it('should return seeds 7-10 from conference', () => {
            const playIn = standings.getPlayInTeams(Conference.EAST)
            expect(playIn).toHaveLength(4)

            // Ranks should be 7-10
            expect(playIn[0].rank).toBe(7)
            expect(playIn[1].rank).toBe(8)
            expect(playIn[2].rank).toBe(9)
            expect(playIn[3].rank).toBe(10)
        })
    })

    describe('getLotteryTeams', () => {
        it('should return seeds 11-15 from conference', () => {
            const lottery = standings.getLotteryTeams(Conference.EAST)
            expect(lottery).toHaveLength(5)

            // Ranks should be 11-15
            expect(lottery[0].rank).toBe(11)
            expect(lottery[4].rank).toBe(15)
        })
    })

    describe('getGamesPlayed', () => {
        it('should return 0 for teams with no games', () => {
            expect(standings.getGamesPlayed('Celtics')).toBe(0)
        })

        it('should return correct count after games', () => {
            standings.recordGame('Celtics', 'Lakers')
            standings.recordGame('Celtics', 'Warriors')

            expect(standings.getGamesPlayed('Celtics')).toBe(2)
            expect(standings.getGamesPlayed('Lakers')).toBe(1)
            expect(standings.getGamesPlayed('Warriors')).toBe(1)
        })

        it('should return 0 for unknown team', () => {
            expect(standings.getGamesPlayed('UnknownTeam')).toBe(0)
        })
    })

    describe('isSeasonComplete', () => {
        it('should return false for fresh standings', () => {
            expect(standings.isSeasonComplete()).toBe(false)
        })

        it('should return false with partial games', () => {
            standings.recordGame('Celtics', 'Lakers')
            expect(standings.isSeasonComplete()).toBe(false)
        })
    })

    describe('reset', () => {
        it('should clear all game records', () => {
            standings.recordGame('Celtics', 'Lakers')
            standings.recordGame('Warriors', 'Heat')

            standings.reset()

            const allRecords = standings.getAllRecords()
            for (const record of allRecords) {
                expect(record.wins).toBe(0)
                expect(record.losses).toBe(0)
            }
        })
    })

    describe('formatStandingEntry', () => {
        it('should format leader entry with dash for GB', () => {
            const entry: StandingEntry = {
                rank: 1,
                teamName: 'Celtics',
                wins: 50,
                losses: 10,
                winPercentage: 0.833,
                gamesBack: 0,
                conference: Conference.EAST,
            }

            const formatted = standings.formatStandingEntry(entry)
            expect(formatted).toContain('1.')
            expect(formatted).toContain('Celtics')
            expect(formatted).toContain('50-10')
            expect(formatted).toContain('0.833')
            expect(formatted).toContain('-') // GB dash for leader
        })

        it('should format trailing team with GB value', () => {
            const entry: StandingEntry = {
                rank: 2,
                teamName: 'Heat',
                wins: 45,
                losses: 15,
                winPercentage: 0.75,
                gamesBack: 5,
                conference: Conference.EAST,
            }

            const formatted = standings.formatStandingEntry(entry)
            expect(formatted).toContain('2.')
            expect(formatted).toContain('Heat')
            expect(formatted).toContain('45-15')
            expect(formatted).toContain('5.0')
        })
    })

    describe('toJSON and fromJSON', () => {
        it('should serialize and deserialize standings', () => {
            standings.recordGame('Celtics', 'Lakers')
            standings.recordGame('Warriors', 'Heat')

            const json = standings.toJSON()

            const newStandings = new StandingsManager()
            newStandings.fromJSON(json)

            const celtics = newStandings.getTeamRecord('Celtics')
            expect(celtics!.wins).toBe(1)
            expect(celtics!.losses).toBe(0)

            const lakers = newStandings.getTeamRecord('Lakers')
            expect(lakers!.wins).toBe(0)
            expect(lakers!.losses).toBe(1)
        })
    })

    describe('conference team verification', () => {
        it('should have all Eastern Conference teams correctly assigned', () => {
            for (const team of EAST_TEAMS_EN) {
                const record = standings.getTeamRecord(team)
                expect(record).toBeDefined()
                expect(record!.conference).toBe(Conference.EAST)
            }
        })

        it('should have all Western Conference teams correctly assigned', () => {
            for (const team of WEST_TEAMS_EN) {
                const record = standings.getTeamRecord(team)
                expect(record).toBeDefined()
                expect(record!.conference).toBe(Conference.WEST)
            }
        })

        it('should have exactly 15 teams per conference', () => {
            expect(EAST_TEAMS_EN).toHaveLength(15)
            expect(WEST_TEAMS_EN).toHaveLength(15)
        })
    })
})
