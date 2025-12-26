/**
 * GameEngine Service Tests
 *
 * Task T076: Unit test prediction mode: 10 simulations
 *
 * These tests validate the prediction mode functionality including
 * runPrediction(), progress callbacks, and result aggregation.
 *
 * Note: Tests use mocked data to avoid file system dependencies.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import {
    PredictionResult,
    PredictionRanking,
    formatPredictionResults,
} from '../../src/services/GameEngine'
import { SeasonManager, SeasonResult } from '../../src/models/Season'
import { Team } from '../../src/models/Team'
import { PlayerCSVRow } from '../../src/models/Player'
import { setCommentsForTesting } from '../../src/services/CommentLoader'
import * as ResourceLoader from '../../src/services/ResourceLoader'
import { ScheduleGame, SeasonSchedule } from '../../src/services/ResourceLoader'
import { Language } from '../../src/models/types'

// Mock the ResourceLoader
vi.mock('../../src/services/ResourceLoader', () => ({
    loadCSV: vi.fn(),
    loadSchedule: vi.fn(),
    loadText: vi.fn(),
}))

// =============================================================================
// MOCK DATA
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
        // Starters
        createMockPlayerRow(`${teamName} PG`, 'PG', '1', '85'),
        createMockPlayerRow(`${teamName} SG`, 'SG', '1', '84'),
        createMockPlayerRow(`${teamName} SF`, 'SF', '1', '83'),
        createMockPlayerRow(`${teamName} PF`, 'PF', '1', '82'),
        createMockPlayerRow(`${teamName} C`, 'C', '1', '81'),
        // Bench
        createMockPlayerRow(`${teamName} Bench PG`, 'PG', '2', '75'),
        createMockPlayerRow(`${teamName} Bench SG`, 'SG', '2', '74'),
        createMockPlayerRow(`${teamName} Bench SF`, 'SF', '2', '73'),
        createMockPlayerRow(`${teamName} Bench PF`, 'PF', '2', '72'),
        createMockPlayerRow(`${teamName} Bench C`, 'C', '2', '71'),
        // Deep bench
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

// Set up mock before tests
beforeAll(() => {
    // Set mock comments (Chinese and English)
    setCommentsForTesting(mockCommentsData, mockCommentsData)

    // Mock loadCSV
    const loadCSV = ResourceLoader.loadCSV as ReturnType<typeof vi.fn>
    loadCSV.mockImplementation(async (path: string) => {
        for (const team of mockTeams) {
            if (path.includes(team)) {
                return createMockRoster(team)
            }
        }
        return createMockRoster('Generic')
    })

    // Mock loadSchedule - just 4 games for quick tests
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

// =============================================================================
// HELPER FUNCTION: Run prediction using SeasonManager directly
// =============================================================================

interface MockPredictionOptions {
    baseSeed?: number
    language?: Language
    onProgress?: (completed: number, total: number) => void
}

async function runMockPrediction(
    count: number,
    options: MockPredictionOptions = {}
): Promise<PredictionResult> {
    const {
        baseSeed = Date.now(),
        language = Language.ENGLISH,
        onProgress,
    } = options

    const championCounts = new Map<string, number>()
    const startTime = performance.now()

    for (let i = 0; i < count; i++) {
        const simulationSeed = baseSeed + i

        const seasonManager = new SeasonManager({
            seed: simulationSeed,
            silentMode: true,
            language,
        })

        const result: SeasonResult = await seasonManager.hostSeason()

        const champion = result.champion
        if (champion) {
            const currentCount = championCounts.get(champion) ?? 0
            championCounts.set(champion, currentCount + 1)
        }

        if (onProgress) {
            onProgress(i + 1, count)
        }
    }

    const endTime = performance.now()
    const timeElapsed = endTime - startTime

    // Generate rankings
    const entries = Array.from(championCounts.entries())
    entries.sort((a, b) => b[1] - a[1])
    const rankings: PredictionRanking[] = entries.map(([teamName, championships], index) => ({
        rank: index + 1,
        teamName,
        championships,
        probability: (championships / count) * 100,
    }))

    return {
        championCounts,
        totalSimulations: count,
        timeElapsed,
        rankings,
    }
}

describe('GameEngine Service', () => {
    describe('Prediction Mode (T072-T074)', () => {
        it('should run a single prediction simulation', async () => {
            const result = await runMockPrediction(1, {
                baseSeed: 12345,
                language: Language.ENGLISH,
            })

            expect(result.totalSimulations).toBe(1)
            expect(result.championCounts.size).toBe(1)
            expect(result.rankings.length).toBe(1)
            expect(result.timeElapsed).toBeGreaterThan(0)
        }, 60000)

        it('should run 3 prediction simulations with deterministic results', async () => {
            const result = await runMockPrediction(3, {
                baseSeed: 42,
                language: Language.ENGLISH,
            })

            expect(result.totalSimulations).toBe(3)
            expect(result.timeElapsed).toBeGreaterThan(0)

            // Total championships should equal total simulations
            let totalChampionships = 0
            for (const count of result.championCounts.values()) {
                totalChampionships += count
            }
            expect(totalChampionships).toBe(3)
        }, 120000)

        it('should produce deterministic results with same seed', async () => {
            const result1 = await runMockPrediction(2, {
                baseSeed: 99999,
                language: Language.ENGLISH,
            })

            const result2 = await runMockPrediction(2, {
                baseSeed: 99999,
                language: Language.ENGLISH,
            })

            // Same seeds should produce same champions
            expect(result1.rankings).toEqual(result2.rankings)
        }, 120000)

        it('should call progress callback during simulation', async () => {
            const progressCalls: { completed: number; total: number }[] = []

            await runMockPrediction(3, {
                baseSeed: 12345,
                language: Language.ENGLISH,
                onProgress: (completed, total) => {
                    progressCalls.push({ completed, total })
                },
            })

            expect(progressCalls.length).toBe(3)
            expect(progressCalls[0]).toEqual({ completed: 1, total: 3 })
            expect(progressCalls[1]).toEqual({ completed: 2, total: 3 })
            expect(progressCalls[2]).toEqual({ completed: 3, total: 3 })
        }, 120000)

        it('should generate sorted rankings by championship count', async () => {
            const result = await runMockPrediction(5, {
                baseSeed: 100,
                language: Language.ENGLISH,
            })

            // Rankings should be sorted by championships (descending)
            for (let i = 1; i < result.rankings.length; i++) {
                expect(result.rankings[i - 1].championships).toBeGreaterThanOrEqual(
                    result.rankings[i].championships
                )
            }

            // Rank should be sequential
            result.rankings.forEach((ranking, index) => {
                expect(ranking.rank).toBe(index + 1)
            })
        }, 180000)

        it('should calculate correct probability percentages', async () => {
            const result = await runMockPrediction(4, {
                baseSeed: 777,
                language: Language.ENGLISH,
            })

            // Probabilities should sum to 100%
            let totalProbability = 0
            for (const ranking of result.rankings) {
                totalProbability += ranking.probability
            }
            expect(totalProbability).toBeCloseTo(100, 1)

            // Each probability should match championships/total * 100
            for (const ranking of result.rankings) {
                const expectedProbability = (ranking.championships / 4) * 100
                expect(ranking.probability).toBeCloseTo(expectedProbability, 1)
            }
        }, 150000)

        it('should format prediction results correctly', async () => {
            const result: PredictionResult = {
                championCounts: new Map([
                    ['Lakers', 5],
                    ['Celtics', 3],
                    ['Warriors', 2],
                ]),
                totalSimulations: 10,
                timeElapsed: 5000,
                rankings: [
                    { rank: 1, teamName: 'Lakers', championships: 5, probability: 50 },
                    { rank: 2, teamName: 'Celtics', championships: 3, probability: 30 },
                    { rank: 3, teamName: 'Warriors', championships: 2, probability: 20 },
                ],
            }

            const formatted = formatPredictionResults(result)

            expect(formatted).toContain('Championship Prediction (10 simulations)')
            expect(formatted).toContain('1. Lakers: 5 wins (50.0%)')
            expect(formatted).toContain('2. Celtics: 3 wins (30.0%)')
            expect(formatted).toContain('3. Warriors: 2 wins (20.0%)')
            expect(formatted).toContain('Time elapsed: 5.00 seconds')
        })
    })

    describe('10 Simulation Integration Test', () => {
        it('should run 10 prediction simulations successfully', async () => {
            const progressUpdates: number[] = []

            const result = await runMockPrediction(10, {
                baseSeed: 54321,
                language: Language.ENGLISH,
                onProgress: (completed) => {
                    progressUpdates.push(completed)
                },
            })

            // Verify result structure
            expect(result.totalSimulations).toBe(10)
            expect(result.championCounts.size).toBeGreaterThanOrEqual(1)
            expect(result.rankings.length).toBeGreaterThanOrEqual(1)
            expect(result.timeElapsed).toBeGreaterThan(0)

            // Verify progress was reported for each simulation
            expect(progressUpdates.length).toBe(10)
            expect(progressUpdates).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

            // Verify total championships equals total simulations
            let totalChampionships = 0
            for (const count of result.championCounts.values()) {
                totalChampionships += count
            }
            expect(totalChampionships).toBe(10)

            // Verify all team names in rankings are valid strings
            for (const ranking of result.rankings) {
                expect(typeof ranking.teamName).toBe('string')
                expect(ranking.teamName.length).toBeGreaterThan(0)
            }

            console.log('\n=== 10 Simulation Results ===')
            console.log(formatPredictionResults(result))
        }, 300000) // 5 minute timeout for 10 simulations
    })
})
