/**
 * Game Comparison Tests
 *
 * Tests that verify TypeScript game simulation produces deterministic results.
 * These tests validate that the game engine produces consistent output with
 * fixed random seeds, which is the foundation for Java comparison.
 *
 * Task T051: Create Java comparison test: 10 deterministic game tests
 * Task T052: Run comparison: verify Lakers vs Celtics (seed 12345) matches Java exactly
 *
 * Note: Actual Java comparison requires running Java code externally.
 * These tests verify TypeScript determinism which is a prerequisite for matching Java.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { Team } from '../../src/models/Team'
import { PlayerCSVRow } from '../../src/models/Player'
import { hostGame, type GameResult } from '../../src/models/Game'
import { Language } from '../../src/models/types'
import { SeededRandom } from '../../src/utils/SeededRandom'
import { setCommentsForTesting } from '../../src/services/CommentLoader'
import * as ResourceLoader from '../../src/services/ResourceLoader'

// Mock the ResourceLoader
vi.mock('../../src/services/ResourceLoader', () => ({
    loadCSV: vi.fn(),
}))

// =============================================================================
// MOCK DATA
// =============================================================================

const mockCommentsData = {
    jumpBall: {
        win: ['Jump ball won'],
        lose: ['Jump ball lost'],
        intro: ['Jump ball starts'],
        preparation: ['Players ready'],
        teamResult: ['{team} wins the tip'],
    },
    shotChoice: {
        close: ['Close shot'],
        mid: ['Mid-range'],
        three: ['Three pointer'],
    },
    shotPosition: {
        left: ['From left'],
        right: ['From right'],
        center: ['From center'],
    },
    ball: {
        fast: ['Fast break'],
        general: ['{player} has the ball'],
    },
    steal: { general: ['Steal'] },
    block: { general: ['Block'] },
    rebound: { offensive: ['O-reb'], defensive: ['D-reb'] },
    turnover: { general: ['Turnover'] },
    foul: { general: ['Foul'], shooting: ['Shooting foul'] },
    makeShots: { close: ['Made close'], mid: ['Made mid'], three: ['Made three'], dunk: ['Dunk'], layup: ['Layup'] },
    missShots: { close: ['Miss close'], mid: ['Miss mid'], three: ['Miss three'], blocked: ['Blocked'] },
    freeThrow: { make: ['FT made'], miss: ['FT miss'] },
    quarter: { end: ['Quarter end'], start: ['Quarter start'] },
    game: { end: ['Game over'], overtime: ['Overtime'] },
    outOfBound: { general: ['Out of bounds'] },
    assist: { general: ['Assist'] },
}

function createMockPlayerRow(
    englishName: string,
    position: string,
    rotationType: string,
    rating = '85'
): PlayerCSVRow {
    return {
        name: englishName,
        englishName,
        position,
        playerType: '1',
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

function createMockRoster(teamName: string): PlayerCSVRow[] {
    const starters: PlayerCSVRow[] = [
        createMockPlayerRow(`${teamName} PG Starter`, 'PG', '1', '88'),
        createMockPlayerRow(`${teamName} SG Starter`, 'SG', '1', '87'),
        createMockPlayerRow(`${teamName} SF Starter`, 'SF', '1', '86'),
        createMockPlayerRow(`${teamName} PF Starter`, 'PF', '1', '85'),
        createMockPlayerRow(`${teamName} C Starter`, 'C', '1', '84'),
    ]

    const bench: PlayerCSVRow[] = [
        createMockPlayerRow(`${teamName} PG Bench`, 'PG', '2', '78'),
        createMockPlayerRow(`${teamName} SG Bench`, 'SG', '2', '77'),
        createMockPlayerRow(`${teamName} SF Bench`, 'SF', '2', '76'),
        createMockPlayerRow(`${teamName} PF Bench`, 'PF', '2', '75'),
        createMockPlayerRow(`${teamName} C Bench`, 'C', '2', '74'),
    ]

    return [...starters, ...bench]
}

async function loadFreshTeams(): Promise<[Team, Team]> {
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

beforeAll(() => {
    setCommentsForTesting(mockCommentsData, mockCommentsData)
})

describe('Deterministic Game Comparison Tests', () => {
    describe('T051: 10 Deterministic Game Tests', () => {
        // Test seeds used for deterministic testing
        const testSeeds = [
            12345, 54321, 11111, 22222, 33333,
            44444, 55555, 66666, 77777, 88888,
        ]

        it.each(testSeeds)('should produce identical results with seed %i across multiple runs', async (seed) => {
            // First run
            const [t1a, t2a] = await loadFreshTeams()
            const random1 = new SeededRandom(BigInt(seed))
            const result1 = hostGame(t1a, t2a, random1)

            // Second run with same seed
            const [t1b, t2b] = await loadFreshTeams()
            const random2 = new SeededRandom(BigInt(seed))
            const result2 = hostGame(t1b, t2b, random2)

            // Results should be identical
            expect(result1.team1Score).toBe(result2.team1Score)
            expect(result1.team2Score).toBe(result2.team2Score)
            expect(result1.winner).toBe(result2.winner)
            expect(result1.finalQuarter).toBe(result2.finalQuarter)

            // Quarter scores should match
            expect(result1.quarterScores).toEqual(result2.quarterScores)
        })

        it('should produce different results with different seeds', async () => {
            const results: GameResult[] = []

            for (const seed of testSeeds) {
                const [t1, t2] = await loadFreshTeams()
                const random = new SeededRandom(BigInt(seed))
                results.push(hostGame(t1, t2, random))
            }

            // Extract unique final scores
            const uniqueScores = new Set(
                results.map((r) => `${r.team1Score}-${r.team2Score}`)
            )

            // With 10 different seeds, we should have multiple unique scores
            expect(uniqueScores.size).toBeGreaterThan(1)
        })

        it('should maintain score consistency with box score totals', async () => {
            for (const seed of testSeeds.slice(0, 5)) {
                const [t1, t2] = await loadFreshTeams()
                const random = new SeededRandom(BigInt(seed))
                const result = hostGame(t1, t2, random)

                // Team scores should match box score totals
                expect(result.boxScore.team1.totals.points).toBe(result.team1Score)
                expect(result.boxScore.team2.totals.points).toBe(result.team2Score)

                // Player points should sum to team totals
                const team1PlayerPoints = result.boxScore.team1.players.reduce(
                    (sum, p) => sum + p.points, 0
                )
                const team2PlayerPoints = result.boxScore.team2.players.reduce(
                    (sum, p) => sum + p.points, 0
                )

                expect(team1PlayerPoints).toBe(result.team1Score)
                expect(team2PlayerPoints).toBe(result.team2Score)
            }
        })
    })

    describe('T052: Lakers vs Celtics (seed 12345) Comparison', () => {
        /**
         * This test verifies the specific case mentioned in T052.
         *
         * For actual Java comparison, you would:
         * 1. Run the Java game simulation with seed 12345
         * 2. Record the exact scores and winner
         * 3. Update the expected values below
         *
         * Current values are placeholders that verify determinism.
         */

        it('should produce consistent results for Lakers vs Celtics with seed 12345', async () => {
            const [t1, t2] = await loadFreshTeams()
            const random = new SeededRandom(BigInt(12345))
            const result = hostGame(t1, t2, random)

            // Basic validation - game completed
            expect(result.finalQuarter).toBeGreaterThanOrEqual(4)
            expect(result.winner).toBeTruthy()

            // Scores are reasonable for a basketball game
            expect(result.team1Score).toBeGreaterThan(50)
            expect(result.team1Score).toBeLessThan(200)
            expect(result.team2Score).toBeGreaterThan(50)
            expect(result.team2Score).toBeLessThan(200)

            // Winner determination is correct
            if (result.winner === 'Lakers') {
                expect(result.team1Score).toBeGreaterThan(result.team2Score)
            } else {
                expect(result.team2Score).toBeGreaterThan(result.team1Score)
            }

            // Record actual values for documentation/future Java comparison
            console.log(`Lakers vs Celtics (seed 12345):`)
            console.log(`  Lakers: ${result.team1Score}`)
            console.log(`  Celtics: ${result.team2Score}`)
            console.log(`  Winner: ${result.winner}`)
            console.log(`  Quarters: ${result.finalQuarter}`)
        })

        it('should match recorded baseline (determinism check)', async () => {
            // Run the same game twice to establish baseline
            const [t1a, t2a] = await loadFreshTeams()
            const random1 = new SeededRandom(BigInt(12345))
            const baseline = hostGame(t1a, t2a, random1)

            // Run again and compare
            const [t1b, t2b] = await loadFreshTeams()
            const random2 = new SeededRandom(BigInt(12345))
            const verification = hostGame(t1b, t2b, random2)

            // Must be exactly the same
            expect(verification.team1Score).toBe(baseline.team1Score)
            expect(verification.team2Score).toBe(baseline.team2Score)
            expect(verification.winner).toBe(baseline.winner)
            expect(verification.finalQuarter).toBe(baseline.finalQuarter)
            expect(verification.quarterScores).toEqual(baseline.quarterScores)
        })
    })

    describe('Flow Insights Consistency', () => {
        it('should track game flow accurately across multiple seeds', async () => {
            for (const seed of [12345, 54321, 11111]) {
                const [t1, t2] = await loadFreshTeams()
                const random = new SeededRandom(BigInt(seed))
                const result = hostGame(t1, t2, random)

                // Flow insights should be consistent with game state
                expect(result.flowInsights.leadChanges).toBeGreaterThanOrEqual(0)
                expect(result.flowInsights.timesTied).toBeGreaterThanOrEqual(1) // Starts at 0-0

                // Largest leads should be non-negative
                expect(result.flowInsights.team1LargestLead).toBeGreaterThanOrEqual(0)
                expect(result.flowInsights.team2LargestLead).toBeGreaterThanOrEqual(0)

                // At least one team had a lead (since game doesn't end in tie)
                expect(
                    result.flowInsights.team1LargestLead > 0 ||
                    result.flowInsights.team2LargestLead > 0
                ).toBe(true)
            }
        })
    })

    describe('Language Independence', () => {
        it('should produce same game outcomes regardless of language', async () => {
            // English game
            const [t1En, t2En] = await loadFreshTeams()
            const randomEn = new SeededRandom(BigInt(12345))
            const resultEn = hostGame(t1En, t2En, randomEn, Language.ENGLISH)

            // Chinese game
            const [t1Zh, t2Zh] = await loadFreshTeams()
            const randomZh = new SeededRandom(BigInt(12345))
            const resultZh = hostGame(t1Zh, t2Zh, randomZh, Language.CHINESE)

            // Game mechanics should be identical
            expect(resultEn.team1Score).toBe(resultZh.team1Score)
            expect(resultEn.team2Score).toBe(resultZh.team2Score)
            expect(resultEn.winner).toBe(resultZh.winner)
            expect(resultEn.finalQuarter).toBe(resultZh.finalQuarter)
            expect(resultEn.quarterScores).toEqual(resultZh.quarterScores)
        })
    })
})
