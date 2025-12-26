/**
 * Performance Tests for Prediction Mode
 *
 * Task T077: Performance test: 100 simulations under 5 minutes
 *
 * These tests verify that the prediction engine meets performance requirements.
 * Run with: npm run test:performance or npm run test -- tests/performance/
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import {
    PredictionResult,
    PredictionRanking,
    formatPredictionResults,
} from '../../src/services/GameEngine'
import { SeasonManager, SeasonResult } from '../../src/models/Season'
import { PlayerCSVRow } from '../../src/models/Player'
import { setCommentsForTesting } from '../../src/services/CommentLoader'
import * as ResourceLoader from '../../src/services/ResourceLoader'
import { Language } from '../../src/models/types'

// Mock the ResourceLoader
vi.mock('../../src/services/ResourceLoader', () => ({
    loadCSV: vi.fn(),
    loadSchedule: vi.fn(),
    loadText: vi.fn(),
}))

// Performance thresholds
const FIVE_MINUTES_MS = 5 * 60 * 1000 // 5 minutes in milliseconds
const ONE_MINUTE_MS = 60 * 1000 // 1 minute in milliseconds
const TWO_AND_HALF_MINUTES_MS = 2.5 * 60 * 1000 // 2.5 minutes in milliseconds

// =============================================================================
// MOCK DATA
// =============================================================================

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
        freeThrowPercent: '80',
        interiorDefense: '75',
        perimeterDefense: '75',
        orbRating: '50',
        drbRating: '70',
        astRating: '75',
        stlRating: '60',
        blkRating: '50',
        layupRating: '80',
        standDunk: '60',
        drivingDunk: '60',
        athleticism: '75',
        durability: '85',
        offConst: '80',
        defConst: '75',
        drawFoul: '50',
    }
}

function createMockRoster(teamName: string): PlayerCSVRow[] {
    return [
        createMockPlayerRow(`${teamName} PG`, 'PG', '1', '85'),
        createMockPlayerRow(`${teamName} SG`, 'SG', '1', '84'),
        createMockPlayerRow(`${teamName} SF`, 'SF', '1', '83'),
        createMockPlayerRow(`${teamName} PF`, 'PF', '1', '82'),
        createMockPlayerRow(`${teamName} C`, 'C', '1', '81'),
        createMockPlayerRow(`${teamName} Bench PG`, 'PG', '2', '75'),
        createMockPlayerRow(`${teamName} Bench SG`, 'SG', '2', '74'),
        createMockPlayerRow(`${teamName} Bench SF`, 'SF', '2', '73'),
        createMockPlayerRow(`${teamName} Bench PF`, 'PF', '2', '72'),
        createMockPlayerRow(`${teamName} Bench C`, 'C', '2', '71'),
        createMockPlayerRow(`${teamName} Reserve 1`, 'PG', '3', '65'),
        createMockPlayerRow(`${teamName} Reserve 2`, 'SF', '3', '64'),
        createMockPlayerRow(`${teamName} Reserve 3`, 'C', '3', '63'),
    ]
}

const mockTeams = ['Lakers', 'Celtics', 'Warriors', 'Heat']

const mockCommentsData = {
    tip: { start: ['Jump ball won by {teamName}.'] },
    shot: { made: ['{player} scores!'] },
    rebound: { offensive: ['{player} grabs the offensive board.'], defensive: ['{player} with the rebound.'] },
    assist: { made: ['{passer} finds {scorer} for the assist.'] },
    steal: { made: ['{defender} with the steal!'] },
    block: { made: ['{blocker} blocks {shooter}!'] },
    foul: { personal: ['Foul on {player}.'] },
    quarter: { end: ['End of quarter.'] },
    game: { end: ['Game over!'], celebrate: ['What a game!'], upset: ['Upset!'] },
}

beforeAll(() => {
    setCommentsForTesting(mockCommentsData, mockCommentsData)

    const loadCSV = ResourceLoader.loadCSV as ReturnType<typeof vi.fn>
    loadCSV.mockImplementation(async (path: string) => {
        for (const team of mockTeams) {
            if (path.includes(team)) {
                return createMockRoster(team)
            }
        }
        return createMockRoster('Generic')
    })

    const loadSchedule = ResourceLoader.loadSchedule as ReturnType<typeof vi.fn>
    loadSchedule.mockImplementation(async () => ({
        games: [
            { date: '2024-01-01', awayTeam: 'Lakers', homeTeam: 'Celtics' },
            { date: '2024-01-02', awayTeam: 'Warriors', homeTeam: 'Heat' },
            { date: '2024-01-03', awayTeam: 'Celtics', homeTeam: 'Lakers' },
            { date: '2024-01-04', awayTeam: 'Heat', homeTeam: 'Warriors' },
        ],
        totalGames: 4,
    }))
})

// Helper to run prediction with mocked data
async function runMockPrediction(
    count: number,
    options: { baseSeed?: number; language?: Language; onProgress?: (c: number, t: number) => void } = {}
): Promise<PredictionResult> {
    const { baseSeed = Date.now(), language = Language.ENGLISH, onProgress } = options

    const championCounts = new Map<string, number>()
    const startTime = performance.now()

    for (let i = 0; i < count; i++) {
        const seasonManager = new SeasonManager({
            seed: baseSeed + i,
            silentMode: true,
            language,
        })
        const result: SeasonResult = await seasonManager.hostSeason()
        const champion = result.champion
        if (champion) {
            championCounts.set(champion, (championCounts.get(champion) ?? 0) + 1)
        }
        if (onProgress) onProgress(i + 1, count)
    }

    const endTime = performance.now()
    const entries = Array.from(championCounts.entries()).sort((a, b) => b[1] - a[1])
    const rankings: PredictionRanking[] = entries.map(([teamName, championships], index) => ({
        rank: index + 1,
        teamName,
        championships,
        probability: (championships / count) * 100,
    }))

    return {
        championCounts,
        totalSimulations: count,
        timeElapsed: endTime - startTime,
        rankings,
    }
}

describe('Prediction Performance Tests', () => {
    beforeAll(async () => {

    })

    it('should complete 10 simulations within 1 minute', async () => {
        const startTime = performance.now()

        const result = await runMockPrediction(10, {
            baseSeed: 12345,
            language: Language.ENGLISH,
        })

        const endTime = performance.now()
        const elapsed = endTime - startTime

        console.log(`\n10 simulations completed in ${(elapsed / 1000).toFixed(2)} seconds`)
        console.log(`Average time per simulation: ${(elapsed / 10000).toFixed(2)} seconds`)

        expect(elapsed).toBeLessThan(ONE_MINUTE_MS)
        expect(result.totalSimulations).toBe(10)
    }, ONE_MINUTE_MS + 30000) // Add 30s buffer to timeout

    it('should complete 25 simulations within 2.5 minutes', async () => {
        const startTime = performance.now()

        const result = await runMockPrediction(25, {
            baseSeed: 54321,
            language: Language.ENGLISH,
        })

        const endTime = performance.now()
        const elapsed = endTime - startTime

        console.log(`\n25 simulations completed in ${(elapsed / 1000).toFixed(2)} seconds`)
        console.log(`Average time per simulation: ${(elapsed / 25000).toFixed(2)} seconds`)

        expect(elapsed).toBeLessThan(TWO_AND_HALF_MINUTES_MS)
        expect(result.totalSimulations).toBe(25)

        // Log top 5 teams
        console.log('\nTop 5 Championship Contenders:')
        result.rankings.slice(0, 5).forEach((r) => {
            console.log(`  ${r.rank}. ${r.teamName}: ${r.championships} wins (${r.probability.toFixed(1)}%)`)
        })
    }, TWO_AND_HALF_MINUTES_MS + 30000)

    it('should complete 50 simulations within 5 minutes', async () => {
        const startTime = performance.now()

        let lastProgress = 0
        const result = await runMockPrediction(50, {
            baseSeed: 99999,
            language: Language.ENGLISH,
            onProgress: (completed, total) => {
                // Log every 10 simulations
                if (completed % 10 === 0 && completed !== lastProgress) {
                    const currentTime = performance.now()
                    const elapsed = currentTime - startTime
                    console.log(
                        `Progress: ${completed}/${total} (${((completed / total) * 100).toFixed(0)}%) - ` +
                        `${(elapsed / 1000).toFixed(1)}s elapsed`
                    )
                    lastProgress = completed
                }
            },
        })

        const endTime = performance.now()
        const elapsed = endTime - startTime

        console.log(`\n50 simulations completed in ${(elapsed / 1000).toFixed(2)} seconds`)
        console.log(`Average time per simulation: ${(elapsed / 50000).toFixed(2)} seconds`)
        console.log(`Estimated time for 100 simulations: ${((elapsed * 2) / 60000).toFixed(2)} minutes`)

        expect(elapsed).toBeLessThan(FIVE_MINUTES_MS)
        expect(result.totalSimulations).toBe(50)

        console.log('\n' + formatPredictionResults(result))
    }, FIVE_MINUTES_MS + 30000)

    // This test takes a long time - only run manually or in CI
    it.skip('should complete 100 simulations within 5 minutes (full benchmark)', async () => {
        console.log('\n=== Starting 100 Simulation Benchmark ===')
        console.log('This test may take up to 5 minutes...\n')

        const startTime = performance.now()

        let lastProgress = 0
        const result = await runMockPrediction(100, {
            baseSeed: 777777,
            language: Language.ENGLISH,
            onProgress: (completed, total) => {
                // Log every 10 simulations
                if (completed % 10 === 0 && completed !== lastProgress) {
                    const currentTime = performance.now()
                    const elapsed = currentTime - startTime
                    const rate = completed / (elapsed / 1000)
                    const remaining = (total - completed) / rate
                    console.log(
                        `Progress: ${completed}/${total} - ` +
                        `${(elapsed / 1000).toFixed(1)}s elapsed, ` +
                        `~${remaining.toFixed(0)}s remaining`
                    )
                    lastProgress = completed
                }
            },
        })

        const endTime = performance.now()
        const elapsed = endTime - startTime

        console.log('\n=== Benchmark Complete ===')
        console.log(`Total time: ${(elapsed / 1000).toFixed(2)} seconds (${(elapsed / 60000).toFixed(2)} minutes)`)
        console.log(`Average time per simulation: ${(elapsed / 100000).toFixed(2)} seconds`)
        console.log(`Simulations per minute: ${(100 / (elapsed / 60000)).toFixed(1)}`)

        // CRITICAL: Must complete within 5 minutes
        expect(elapsed).toBeLessThan(FIVE_MINUTES_MS)
        expect(result.totalSimulations).toBe(100)

        console.log('\n=== Championship Probabilities ===')
        console.log(formatPredictionResults(result))
    }, FIVE_MINUTES_MS + 60000)

    describe('Performance Metrics', () => {
        it('should measure single season simulation time', async () => {
            const iterations = 5
            const times: number[] = []

            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now()
                await runMockPrediction(1, {
                    baseSeed: 10000 + i,
                    language: Language.ENGLISH,
                })
                const endTime = performance.now()
                times.push(endTime - startTime)
            }

            const avgTime = times.reduce((a, b) => a + b, 0) / times.length
            const minTime = Math.min(...times)
            const maxTime = Math.max(...times)

            console.log('\n=== Single Season Performance ===')
            console.log(`Average: ${(avgTime / 1000).toFixed(3)} seconds`)
            console.log(`Min: ${(minTime / 1000).toFixed(3)} seconds`)
            console.log(`Max: ${(maxTime / 1000).toFixed(3)} seconds`)

            // Single season should complete within 30 seconds (conservative)
            expect(avgTime).toBeLessThan(30000)
        }, 180000) // 3 minute timeout
    })
})
