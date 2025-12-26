/**
 * SeasonStats Tests
 *
 * Task T060: Unit test SeasonStats: accumulation, per-game averages
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
    SeasonStats,
    type PlayerSeasonTotals,
    type PlayerPerGameStats,
    type TeamSeasonTotals,
    type TeamPerGameStats,
} from '../../src/models/SeasonStats'
import { Player } from '../../src/models/Player'
import { Team } from '../../src/models/Team'
import { Language } from '../../src/models/types'

// =============================================================================
// MOCK DATA HELPERS
// =============================================================================

function createMockPlayer(
    name: string,
    englishName: string,
    teamName: string,
    stats: Partial<{
        score: number
        rebound: number
        offensiveRebound: number
        defensiveRebound: number
        assist: number
        steal: number
        block: number
        threeMade: number
        threeAttempted: number
        freeThrowMade: number
        freeThrowAttempted: number
        shotMade: number
        shotAttempted: number
        secondsPlayed: number
        hasBeenOnCourt: boolean
    }> = {}
): Player {
    const player = {
        name,
        englishName,
        teamName,
        score: stats.score ?? 20,
        rebound: stats.rebound ?? 5,
        offensiveRebound: stats.offensiveRebound ?? 1,
        defensiveRebound: stats.defensiveRebound ?? 4,
        assist: stats.assist ?? 6,
        steal: stats.steal ?? 1,
        block: stats.block ?? 0,
        threeMade: stats.threeMade ?? 2,
        threeAttempted: stats.threeAttempted ?? 5,
        freeThrowMade: stats.freeThrowMade ?? 4,
        freeThrowAttempted: stats.freeThrowAttempted ?? 5,
        shotMade: stats.shotMade ?? 7,
        shotAttempted: stats.shotAttempted ?? 15,
        secondsPlayed: stats.secondsPlayed ?? 1800, // 30 minutes
        hasBeenOnCourt: stats.hasBeenOnCourt ?? true,
    }
    return player as unknown as Player
}

function createMockTeam(
    name: string,
    stats: Partial<{
        totalScore: number
        totalScoreAllowed: number
        totalShotMade: number
        total3Made: number
        totalFreeMade: number
        totalShotAttempted: number
        total3Attempted: number
        opponentShotMade: number
        opponentShotAttempted: number
        opponent3Made: number
        opponent3Attempted: number
    }> = {}
): Team {
    const team = {
        name,
        totalScore: stats.totalScore ?? 110,
        totalScoreAllowed: stats.totalScoreAllowed ?? 105,
        totalShotMade: stats.totalShotMade ?? 40,
        total3Made: stats.total3Made ?? 12,
        totalFreeMade: stats.totalFreeMade ?? 18,
        totalShotAttempted: stats.totalShotAttempted ?? 88,
        total3Attempted: stats.total3Attempted ?? 35,
        opponentShotMade: stats.opponentShotMade ?? 38,
        opponentShotAttempted: stats.opponentShotAttempted ?? 85,
        opponent3Made: stats.opponent3Made ?? 10,
        opponent3Attempted: stats.opponent3Attempted ?? 30,
    }
    return team as unknown as Team
}

// =============================================================================
// TESTS
// =============================================================================

describe('SeasonStats', () => {
    let seasonStats: SeasonStats

    beforeEach(() => {
        seasonStats = new SeasonStats()
    })

    describe('updatePlayerStats', () => {
        it('should track a single game for a player', () => {
            const player = createMockPlayer('测试球员', 'Test Player', 'Lakers', {
                score: 25,
                rebound: 8,
                assist: 7,
            })

            seasonStats.updatePlayerStats(player)

            const totals = seasonStats.getPlayerTotals('测试球员')
            expect(totals).toBeDefined()
            expect(totals!.games).toBe(1)
            expect(totals!.points).toBe(25)
            expect(totals!.rebounds).toBe(8)
            expect(totals!.assists).toBe(7)
            expect(totals!.teamName).toBe('Lakers')
            expect(totals!.englishName).toBe('Test Player')
        })

        it('should accumulate stats across multiple games', () => {
            const player1 = createMockPlayer('球员A', 'Player A', 'Lakers', {
                score: 20, rebound: 5, assist: 10,
            })
            const player2 = createMockPlayer('球员A', 'Player A', 'Lakers', {
                score: 30, rebound: 7, assist: 8,
            })

            seasonStats.updatePlayerStats(player1)
            seasonStats.updatePlayerStats(player2)

            const totals = seasonStats.getPlayerTotals('球员A')
            expect(totals!.games).toBe(2)
            expect(totals!.points).toBe(50) // 20 + 30
            expect(totals!.rebounds).toBe(12) // 5 + 7
            expect(totals!.assists).toBe(18) // 10 + 8
        })

        it('should calculate correct per-game averages', () => {
            // Game 1: 20 points, Game 2: 30 points = 25 PPG
            seasonStats.updatePlayerStats(createMockPlayer('测试', 'Test', 'Lakers', {
                score: 20, rebound: 4, assist: 6, secondsPlayed: 1800,
            }))
            seasonStats.updatePlayerStats(createMockPlayer('测试', 'Test', 'Lakers', {
                score: 30, rebound: 6, assist: 10, secondsPlayed: 2400,
            }))

            const perGame = seasonStats.getPlayerPerGame('测试')
            expect(perGame!.points).toBe(25) // (20 + 30) / 2
            expect(perGame!.rebounds).toBe(5) // (4 + 6) / 2
            expect(perGame!.assists).toBe(8) // (6 + 10) / 2
            expect(perGame!.minutesPlayed).toBe(35) // (30 + 40) / 2
        })

        it('should not track players who did not play', () => {
            const player = createMockPlayer('板凳球员', 'Bench Player', 'Lakers', {
                hasBeenOnCourt: false,
            })

            seasonStats.updatePlayerStats(player)

            expect(seasonStats.getPlayerTotals('板凳球员')).toBeUndefined()
        })

        it('should calculate shooting percentages correctly', () => {
            seasonStats.updatePlayerStats(createMockPlayer('射手', 'Shooter', 'Lakers', {
                shotMade: 8,
                shotAttempted: 16,
                threeMade: 4,
                threeAttempted: 10,
                freeThrowMade: 3,
                freeThrowAttempted: 4,
            }))

            const perGame = seasonStats.getPlayerPerGame('射手')
            expect(perGame!.fieldGoalPct).toBe(0.5) // 8/16
            expect(perGame!.threePct).toBe(0.4) // 4/10
            expect(perGame!.freeThrowPct).toBe(0.75) // 3/4
        })

        it('should handle zero shot attempts gracefully', () => {
            seasonStats.updatePlayerStats(createMockPlayer('零投篮', 'No Shots', 'Lakers', {
                shotMade: 0,
                shotAttempted: 0,
                threeMade: 0,
                threeAttempted: 0,
                freeThrowMade: 0,
                freeThrowAttempted: 0,
            }))

            const perGame = seasonStats.getPlayerPerGame('零投篮')
            expect(perGame!.fieldGoalPct).toBe(0)
            expect(perGame!.threePct).toBe(0)
            expect(perGame!.freeThrowPct).toBe(0)
        })
    })

    describe('updateTeamStats', () => {
        it('should track a single game for a team', () => {
            const team = createMockTeam('Lakers', {
                totalScore: 115,
                totalScoreAllowed: 108,
            })

            seasonStats.updateTeamStats(team)

            const totals = seasonStats.getTeamTotals('Lakers')
            expect(totals).toBeDefined()
            expect(totals!.games).toBe(1)
            expect(totals!.points).toBe(115)
            expect(totals!.pointsAllowed).toBe(108)
        })

        it('should accumulate team stats across multiple games', () => {
            seasonStats.updateTeamStats(createMockTeam('Celtics', { totalScore: 100, totalScoreAllowed: 95 }))
            seasonStats.updateTeamStats(createMockTeam('Celtics', { totalScore: 120, totalScoreAllowed: 110 }))

            const totals = seasonStats.getTeamTotals('Celtics')
            expect(totals!.games).toBe(2)
            expect(totals!.points).toBe(220) // 100 + 120
            expect(totals!.pointsAllowed).toBe(205) // 95 + 110
        })

        it('should calculate correct team per-game averages', () => {
            seasonStats.updateTeamStats(createMockTeam('Warriors', {
                totalScore: 100,
                totalScoreAllowed: 90,
                totalShotMade: 35,
                totalShotAttempted: 80,
            }))
            seasonStats.updateTeamStats(createMockTeam('Warriors', {
                totalScore: 120,
                totalScoreAllowed: 100,
                totalShotMade: 45,
                totalShotAttempted: 88,
            }))

            const perGame = seasonStats.getTeamPerGame('Warriors')
            expect(perGame!.points).toBe(110) // (100 + 120) / 2
            expect(perGame!.pointsAllowed).toBe(95) // (90 + 100) / 2
        })

        it('should calculate team shooting percentages', () => {
            seasonStats.updateTeamStats(createMockTeam('Heat', {
                totalShotMade: 40,
                totalShotAttempted: 80,
                total3Made: 15,
                total3Attempted: 30,
            }))

            const perGame = seasonStats.getTeamPerGame('Heat')
            expect(perGame!.fieldGoalPct).toBe(0.5) // 40/80
            expect(perGame!.threePct).toBe(0.5) // 15/30
        })
    })

    describe('getLeaders', () => {
        beforeEach(() => {
            // Add multiple players with different stats
            seasonStats.updatePlayerStats(createMockPlayer('得分王', 'Scorer', 'Lakers', {
                score: 35, rebound: 5, assist: 5,
            }))
            seasonStats.updatePlayerStats(createMockPlayer('篮板王', 'Rebounder', 'Celtics', {
                score: 12, rebound: 15, assist: 3,
            }))
            seasonStats.updatePlayerStats(createMockPlayer('助攻王', 'Passer', 'Warriors', {
                score: 18, rebound: 4, assist: 12,
            }))
            seasonStats.updatePlayerStats(createMockPlayer('全能王', 'AllRound', 'Heat', {
                score: 25, rebound: 8, assist: 8,
            }))
        })

        it('should return scoring leaders in descending order', () => {
            const leaders = seasonStats.getLeaders('points', 10)

            expect(leaders.length).toBe(4)
            expect(leaders[0].name).toBe('得分王')
            expect(leaders[0].value).toBe(35)
            expect(leaders[1].name).toBe('全能王')
            expect(leaders[1].value).toBe(25)
        })

        it('should return rebound leaders', () => {
            const leaders = seasonStats.getLeaders('rebounds', 10)

            expect(leaders[0].name).toBe('篮板王')
            expect(leaders[0].value).toBe(15)
        })

        it('should return assist leaders', () => {
            const leaders = seasonStats.getLeaders('assists', 10)

            expect(leaders[0].name).toBe('助攻王')
            expect(leaders[0].value).toBe(12)
        })

        it('should limit results to specified number', () => {
            const leaders = seasonStats.getLeaders('points', 2)

            expect(leaders.length).toBe(2)
        })

        it('should include per-game stats in entries', () => {
            const leaders = seasonStats.getLeaders('points', 1)

            expect(leaders[0].perGame).toBeDefined()
            expect(leaders[0].perGame.points).toBe(35)
            expect(leaders[0].perGame.rebounds).toBe(5)
        })

        it('should include team and english name', () => {
            const leaders = seasonStats.getLeaders('points', 1)

            expect(leaders[0].teamName).toBe('Lakers')
            expect(leaders[0].englishName).toBe('Scorer')
        })
    })

    describe('getTeamLeaders', () => {
        beforeEach(() => {
            seasonStats.updateTeamStats(createMockTeam('Lakers', { totalScore: 120, totalScoreAllowed: 100 }))
            seasonStats.updateTeamStats(createMockTeam('Celtics', { totalScore: 110, totalScoreAllowed: 95 }))
            seasonStats.updateTeamStats(createMockTeam('Warriors', { totalScore: 115, totalScoreAllowed: 105 }))
        })

        it('should return teams sorted by points descending', () => {
            const leaders = seasonStats.getTeamLeaders('points', 10)

            expect(leaders[0].name).toBe('Lakers')
            expect(leaders[0].value).toBe(120)
        })

        it('should return teams sorted ascending for defensive stats', () => {
            const leaders = seasonStats.getTeamLeaders('pointsAllowed', 10, true)

            expect(leaders[0].name).toBe('Celtics') // Best defense (95 allowed)
            expect(leaders[0].value).toBe(95)
        })
    })

    describe('formatLeaderboardEntry', () => {
        it('should format entry in English', () => {
            seasonStats.updatePlayerStats(createMockPlayer('测试球员', 'Test Player', 'Lakers', {
                score: 28, rebound: 7, assist: 6, steal: 2, block: 1,
                shotMade: 10, shotAttempted: 18, secondsPlayed: 2160,
            }))

            const leaders = seasonStats.getLeaders('points', 1)
            const formatted = seasonStats.formatLeaderboardEntry(leaders[0], 1, Language.ENGLISH)

            expect(formatted).toContain('1')
            expect(formatted).toContain('(Lakers)')
            expect(formatted).toContain('Test Player')
            expect(formatted).toContain('28PTS')
            expect(formatted).toContain('7REB')
            expect(formatted).toContain('6AST')
        })

        it('should format entry in Chinese', () => {
            seasonStats.updatePlayerStats(createMockPlayer('测试球员', 'Test Player', 'Lakers', {
                score: 28,
            }))

            const leaders = seasonStats.getLeaders('points', 1)
            const formatted = seasonStats.formatLeaderboardEntry(leaders[0], 1, Language.CHINESE)

            expect(formatted).toContain('测试球员')
            expect(formatted).toContain('湖人') // Lakers in Chinese
        })
    })

    describe('clear', () => {
        it('should clear all statistics', () => {
            seasonStats.updatePlayerStats(createMockPlayer('球员', 'Player', 'Lakers'))
            seasonStats.updateTeamStats(createMockTeam('Lakers'))

            seasonStats.clear()

            expect(seasonStats.getAllPlayerNames()).toHaveLength(0)
            expect(seasonStats.getAllTeamNames()).toHaveLength(0)
        })
    })

    describe('getAllPlayerNames / getAllTeamNames', () => {
        it('should return all tracked player names', () => {
            seasonStats.updatePlayerStats(createMockPlayer('球员A', 'Player A', 'Lakers'))
            seasonStats.updatePlayerStats(createMockPlayer('球员B', 'Player B', 'Celtics'))

            const names = seasonStats.getAllPlayerNames()
            expect(names).toContain('球员A')
            expect(names).toContain('球员B')
            expect(names).toHaveLength(2)
        })

        it('should return all tracked team names', () => {
            seasonStats.updateTeamStats(createMockTeam('Lakers'))
            seasonStats.updateTeamStats(createMockTeam('Celtics'))

            const names = seasonStats.getAllTeamNames()
            expect(names).toContain('Lakers')
            expect(names).toContain('Celtics')
            expect(names).toHaveLength(2)
        })
    })
})
