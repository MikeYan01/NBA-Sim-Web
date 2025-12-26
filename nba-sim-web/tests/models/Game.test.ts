/**
 * Game Module Tests
 *
 * Tests for the Game simulation module.
 * Task T048: Unit test Game class: quarter flow, clock management
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { Team } from '../../src/models/Team'
import { Player, PlayerCSVRow } from '../../src/models/Player'
import {
    hostGame,
    generateBoxScore,
    type GameResult,
} from '../../src/models/Game'
import { Language, PlayerType, RotationType, Position, POSITIONS } from '../../src/models/types'
import { SeededRandom } from '../../src/utils/SeededRandom'
import { setCommentsForTesting } from '../../src/services/CommentLoader'
import * as ResourceLoader from '../../src/services/ResourceLoader'

// Mock the ResourceLoader
vi.mock('../../src/services/ResourceLoader', () => ({
    loadCSV: vi.fn(),
}))

// =============================================================================
// MOCK COMMENTS DATA
// =============================================================================

/**
 * Comprehensive mock comments data for testing.
 */
const mockCommentsData = {
    jumpBall: {
        win: ['Jump ball won'],
        lose: ['Jump ball lost'],
        intro: ['Jump ball starts'],
        preparation: ['Players ready'],
        teamResult: ['{team} wins the tip'],
    },
    shotChoice: {
        close: ['Goes for close range'],
        mid: ['Goes for mid range'],
        three: ['Goes for three'],
    },
    shotPosition: {
        left: ['From the left'],
        right: ['From the right'],
        center: ['From the center'],
    },
    ball: {
        fast: ['Fast break'],
        general: ['{player} has the ball'],
    },
    steal: {
        general: ['{player} steals it'],
    },
    block: {
        general: ['{player} blocks the shot'],
    },
    rebound: {
        offensive: ['Offensive rebound'],
        defensive: ['Defensive rebound'],
    },
    turnover: {
        general: ['{player} turns it over'],
    },
    foul: {
        general: ['{player} commits a foul'],
        shooting: ['Shooting foul on {player}'],
    },
    makeShots: {
        close: ['{player} scores'],
        mid: ['{player} hits the mid-range'],
        three: ['{player} drains the three'],
        dunk: ['{player} dunks it'],
        layup: ['{player} lays it in'],
    },
    missShots: {
        close: ['{player} misses'],
        mid: ['{player} misses the mid-range'],
        three: ['{player} misses the three'],
        blocked: ['{player} gets blocked'],
    },
    freeThrow: {
        make: ['{player} makes the free throw'],
        miss: ['{player} misses the free throw'],
    },
    quarter: {
        end: ['End of quarter {quarter}'],
        start: ['Quarter {quarter} begins'],
    },
    game: {
        end: ['Game over'],
        overtime: ['Heading to overtime'],
    },
    outOfBound: {
        general: ['Ball goes out of bounds'],
    },
    assist: {
        general: ['Assisted by {player}'],
    },
}

// =============================================================================
// MOCK ROSTER DATA
// =============================================================================

/**
 * Create mock player CSV row data
 */
function createMockPlayerRow(
    englishName: string,
    position: string,
    rotationType: string,
    rating = '85'
): PlayerCSVRow {
    return {
        name: englishName, // Using English name as Chinese name for simplicity
        englishName,
        position,
        playerType: '1', // All-rounded
        rotationType,
        rating,
        insideRating: '80',
        midRating: '80',
        threeRating: '75',
        freeThrowPercent: '75',
        interiorDefense: '70',
        perimeterDefense: '70',
        orbRating: '50',
        drbRating: '65',
        astRating: '70',
        stlRating: '60',
        blkRating: '50',
        layupRating: '80',
        standDunk: '50',
        drivingDunk: '60',
        athleticism: '75',
        durability: '85',
        offConst: '75',
        defConst: '70',
        drawFoul: '60',
    }
}

/**
 * Create a complete mock roster with starters and bench players for all positions.
 */
function createMockRoster(teamName: string): PlayerCSVRow[] {
    // 5 starters (rotationType '1') - one for each position
    const starters: PlayerCSVRow[] = [
        createMockPlayerRow(`${teamName} PG Starter`, 'PG', '1', '88'),
        createMockPlayerRow(`${teamName} SG Starter`, 'SG', '1', '87'),
        createMockPlayerRow(`${teamName} SF Starter`, 'SF', '1', '86'),
        createMockPlayerRow(`${teamName} PF Starter`, 'PF', '1', '85'),
        createMockPlayerRow(`${teamName} C Starter`, 'C', '1', '84'),
    ]

    // 5 bench players (rotationType '2') - one for each position
    const bench: PlayerCSVRow[] = [
        createMockPlayerRow(`${teamName} PG Bench`, 'PG', '2', '78'),
        createMockPlayerRow(`${teamName} SG Bench`, 'SG', '2', '77'),
        createMockPlayerRow(`${teamName} SF Bench`, 'SF', '2', '76'),
        createMockPlayerRow(`${teamName} PF Bench`, 'PF', '2', '75'),
        createMockPlayerRow(`${teamName} C Bench`, 'C', '2', '74'),
    ]

    return [...starters, ...bench]
}

// =============================================================================
// TEST SETUP
// =============================================================================

beforeAll(async () => {
    // Initialize mock comments for both languages
    setCommentsForTesting(mockCommentsData, mockCommentsData)
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Load fresh team instances for tests that modify team state.
 * Uses mocked ResourceLoader.loadCSV with generated mock roster data.
 */
async function loadFreshTeams(): Promise<[Team, Team]> {
    // Mock loadCSV to return our generated rosters
    vi.mocked(ResourceLoader.loadCSV)
        .mockResolvedValueOnce(createMockRoster('Lakers'))
        .mockResolvedValueOnce(createMockRoster('Celtics'))

    const t1 = await Team.loadFromCSV('Lakers')
    const t2 = await Team.loadFromCSV('Celtics')
    return [t1, t2]
}

// =============================================================================
// TESTS
// =============================================================================

describe('Game Module', () => {
    describe('hostGame', () => {
        it('should simulate a complete game between two teams', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)

            // Game should have a winner
            expect(result.winner).toBeTruthy()
            expect([t1.name, t2.name]).toContain(result.winner)

            // Scores should be tracked
            expect(result.team1Score).toBeGreaterThanOrEqual(0)
            expect(result.team2Score).toBeGreaterThanOrEqual(0)

            // Winner should have higher score
            if (result.winner === t1.name) {
                expect(result.team1Score).toBeGreaterThan(result.team2Score)
            } else {
                expect(result.team2Score).toBeGreaterThan(result.team1Score)
            }
        })

        it('should produce deterministic results with same seed', async () => {
            const [t1a, t2a] = await loadFreshTeams()
            const random1 = new SeededRandom(BigInt(12345))
            const result1 = hostGame(t1a, t2a, random1)

            const [t1b, t2b] = await loadFreshTeams()
            const random2 = new SeededRandom(BigInt(12345))
            const result2 = hostGame(t1b, t2b, random2)

            // Same seed should produce same results
            expect(result1.team1Score).toBe(result2.team1Score)
            expect(result1.team2Score).toBe(result2.team2Score)
            expect(result1.winner).toBe(result2.winner)
            expect(result1.finalQuarter).toBe(result2.finalQuarter)
        })

        it('should produce different results with different seeds', async () => {
            const results: GameResult[] = []

            for (let seed = 1; seed <= 5; seed++) {
                const [t1, t2] = await loadFreshTeams()
                const random = new SeededRandom(BigInt(seed * 1000))
                results.push(hostGame(t1, t2, random))
            }

            // Not all games should have the same score
            const allSameScore = results.every(
                (r) => r.team1Score === results[0].team1Score && r.team2Score === results[0].team2Score
            )
            expect(allSameScore).toBe(false)
        })

        it('should track quarter scores correctly', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)

            // Should have at least 4 quarters
            expect(result.quarterScores[0].length).toBeGreaterThanOrEqual(4)
            expect(result.quarterScores[1].length).toBeGreaterThanOrEqual(4)

            // Both teams should have same number of quarter scores
            expect(result.quarterScores[0].length).toBe(result.quarterScores[1].length)

            // Quarter scores should be cumulative
            for (let i = 1; i < result.quarterScores[0].length; i++) {
                expect(result.quarterScores[0][i]).toBeGreaterThanOrEqual(result.quarterScores[0][i - 1])
                expect(result.quarterScores[1][i]).toBeGreaterThanOrEqual(result.quarterScores[1][i - 1])
            }

            // Final quarter scores should match total scores
            const lastIdx = result.quarterScores[0].length - 1
            expect(result.quarterScores[0][lastIdx]).toBe(result.team1Score)
            expect(result.quarterScores[1][lastIdx]).toBe(result.team2Score)
        })

        it('should handle different languages', async () => {
            const [t1En, t2En] = await loadFreshTeams()
            const randomEn = new SeededRandom(BigInt(12345))
            const resultEn = hostGame(t1En, t2En, randomEn, Language.ENGLISH)

            const [t1Zh, t2Zh] = await loadFreshTeams()
            const randomZh = new SeededRandom(BigInt(12345))
            const resultZh = hostGame(t1Zh, t2Zh, randomZh, Language.CHINESE)

            // Game results should be the same regardless of language
            expect(resultEn.team1Score).toBe(resultZh.team1Score)
            expect(resultEn.team2Score).toBe(resultZh.team2Score)
        })
    })

    describe('Box Score Generation', () => {
        it('should generate box score for both teams', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)

            expect(result.boxScore.team1.teamName).toBe('Lakers')
            expect(result.boxScore.team2.teamName).toBe('Celtics')
        })

        it('should include all players in box score', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)

            expect(result.boxScore.team1.players.length).toBe(t1.players.length)
            expect(result.boxScore.team2.players.length).toBe(t2.players.length)
        })

        it('should calculate team totals correctly', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)

            // Sum of player points should equal team total
            const team1PlayerPoints = result.boxScore.team1.players.reduce((sum, p) => sum + p.points, 0)
            expect(team1PlayerPoints).toBe(result.boxScore.team1.totals.points)

            // Team total points should match game score
            expect(result.boxScore.team1.totals.points).toBe(result.team1Score)
            expect(result.boxScore.team2.totals.points).toBe(result.team2Score)
        })

        it('should calculate shooting percentages correctly', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)
            const totals = result.boxScore.team1.totals

            // FG percentage check
            if (totals.fgAttempted > 0) {
                const expectedFgPct = (totals.fgMade / totals.fgAttempted) * 100
                expect(totals.fgPct).toBeCloseTo(expectedFgPct, 2)
            }

            // 3PT percentage check
            if (totals.threeAttempted > 0) {
                const expected3Pct = (totals.threeMade / totals.threeAttempted) * 100
                expect(totals.threePct).toBeCloseTo(expected3Pct, 2)
            }

            // FT percentage check
            if (totals.ftAttempted > 0) {
                const expectedFtPct = (totals.ftMade / totals.ftAttempted) * 100
                expect(totals.ftPct).toBeCloseTo(expectedFtPct, 2)
            }
        })
    })

    describe('Game Flow Insights', () => {
        it('should track lead changes', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)

            // Lead changes should be non-negative
            expect(result.flowInsights.leadChanges).toBeGreaterThanOrEqual(0)
        })

        it('should track times tied', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)

            // Times tied should be at least 1 (game starts tied at 0-0)
            expect(result.flowInsights.timesTied).toBeGreaterThanOrEqual(1)
        })

        it('should track largest leads', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)

            // At least one team should have had a lead
            expect(
                result.flowInsights.team1LargestLead > 0 ||
                result.flowInsights.team2LargestLead > 0
            ).toBe(true)
        })
    })

    describe('Play-by-Play Log', () => {
        it('should generate commentary', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)

            // Should have generated commentary
            expect(result.playByPlayLog.length).toBeGreaterThan(0)
        })
    })

    describe('Quarter and Overtime Handling', () => {
        it('should have at least 4 quarters', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))

            const result = hostGame(t1, t2, random)

            // Final quarter should be at least 4
            expect(result.finalQuarter).toBeGreaterThanOrEqual(4)
        })

        it('should never end in a tie', async () => {
            // Run multiple games to ensure no ties
            for (let seed = 1; seed <= 10; seed++) {
                const [t1, t2] = await loadFreshTeams()
                const random = new SeededRandom(BigInt(seed * 1000))

                const result = hostGame(t1, t2, random)

                expect(result.team1Score).not.toBe(result.team2Score)
            }
        })
    })

    describe('generateBoxScore (standalone)', () => {
        it('should generate box score from team objects', async () => {
            const [t1, t2] = await loadFreshTeams()

            // Simulate some stats
            t1.totalScore = 100
            t1.players[0].score = 25
            t1.players[0].shotMade = 10
            t1.players[0].shotAttempted = 20
            t1.players[0].hasBeenOnCourt = true
            t1.players[0].secondsPlayed = 1800

            const boxScore = generateBoxScore(t1, t2, Language.ENGLISH)

            expect(boxScore.team1.teamName).toBe('Lakers')
            expect(boxScore.team1.players[0].points).toBe(25)
            expect(boxScore.team1.players[0].fgMade).toBe(10)
            expect(boxScore.team1.players[0].fgAttempted).toBe(20)
        })
    })
})
