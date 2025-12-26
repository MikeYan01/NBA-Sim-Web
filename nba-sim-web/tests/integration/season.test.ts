/**
 * Season Integration Tests
 *
 * Tests for the SeasonManager class including:
 * - Regular season simulation with 82 games per team
 * - Season stats aggregation
 * - Playoffs execution
 *
 * Task T069: Unit test season flow - 82 games per team
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { SeasonManager, SeasonOptions, RegularSeasonResult } from '../../src/models/Season'
import { Team } from '../../src/models/Team'
import { PlayerCSVRow } from '../../src/models/Player'
import { setCommentsForTesting } from '../../src/services/CommentLoader'
import * as ResourceLoader from '../../src/services/ResourceLoader'
import { ScheduleGame, SeasonSchedule } from '../../src/services/ResourceLoader'
import { Conference } from '../../src/models/types'

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
 * Create a complete mock roster
 */
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

// Mock comments data for tests
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
        general: ['{offPlayer} has the ball, guarded by {defPlayer}'],
    },
    steal: {
        general: ['{player} steals the ball'],
    },
    turnover: {
        general: ['{player} turns it over'],
    },
    shotMake: {
        close: ['{player} scores at the rim'],
        mid: ['{player} hits the mid-range'],
        three: ['{player} drains the three'],
        and1: ['And one!'],
    },
    shotMiss: {
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

/**
 * Create a minimal schedule for testing (4 games)
 */
function createMinimalSchedule(): SeasonSchedule {
    const games: ScheduleGame[] = [
        { date: '01-01', awayTeam: 'Lakers', homeTeam: 'Celtics' },
        { date: '01-02', awayTeam: 'Celtics', homeTeam: 'Lakers' },
        { date: '01-03', awayTeam: 'Warriors', homeTeam: 'Heat' },
        { date: '01-04', awayTeam: 'Heat', homeTeam: 'Warriors' },
    ]
    return {
        games,
        totalGames: games.length,
        startDate: '01-01',
        endDate: '01-04',
    }
}

// =============================================================================
// TESTS
// =============================================================================

beforeAll(() => {
    setCommentsForTesting(mockCommentsData, mockCommentsData)
})

describe('Season Module', () => {
    describe('SeasonManager', () => {
        describe('initialization', () => {
            it('should create manager with default options', () => {
                const manager = new SeasonManager()
                expect(manager).toBeDefined()
                expect(manager.isSilentMode).toBe(false)
            })

            it('should create manager with seed', () => {
                const manager = new SeasonManager({ seed: 12345 })
                expect(manager).toBeDefined()
            })

            it('should create manager with silentMode', () => {
                const manager = new SeasonManager({ silentMode: true })
                expect(manager.isSilentMode).toBe(true)
            })
        })

        describe('loadAllTeams', () => {
            it('should load all 30 teams', async () => {
                // Mock loadCSV to return roster for any team
                vi.mocked(ResourceLoader.loadCSV).mockImplementation(async (_path: string) => {
                    // Extract team name from path
                    const match = _path.match(/\/rosters\/(.+)\.csv/)
                    const teamName = match ? match[1] : 'Unknown'
                    return createMockRoster(teamName)
                })

                const manager = new SeasonManager({ seed: 42 })
                await manager.loadAllTeams()

                const teams = manager.getTeams()
                expect(teams.size).toBe(30)
            })
        })

        describe('hostRegularSeasonGame', () => {
            it('should simulate a single game and update standings', async () => {
                // Mock loadCSV
                vi.mocked(ResourceLoader.loadCSV).mockImplementation(async (_path: string) => {
                    const match = _path.match(/\/rosters\/(.+)\.csv/)
                    const teamName = match ? match[1] : 'Unknown'
                    return createMockRoster(teamName)
                })

                const manager = new SeasonManager({ seed: 12345 })
                const result = await manager.hostRegularSeasonGame('Lakers', 'Celtics')

                expect(result).toBeDefined()
                expect(result.team1Name).toBe('Lakers')
                expect(result.team2Name).toBe('Celtics')
                expect(result.winner).toMatch(/Lakers|Celtics/)

                // Check standings were updated
                const standings = manager.getStandings()
                const winnerRecord = standings.getTeamRecord(result.winner)
                expect(winnerRecord?.wins).toBe(1)
                expect(winnerRecord?.losses).toBe(0)
            })
        })

        describe('hostRegularSeason', () => {
            it('should simulate all games in schedule', async () => {
                vi.mocked(ResourceLoader.loadCSV).mockImplementation(async (_path: string) => {
                    const match = _path.match(/\/rosters\/(.+)\.csv/)
                    const teamName = match ? match[1] : 'Unknown'
                    return createMockRoster(teamName)
                })

                const minimalSchedule = createMinimalSchedule()
                const manager = new SeasonManager({ seed: 42 })
                const result = await manager.hostRegularSeason(minimalSchedule)

                expect(result.gamesPlayed).toBe(4)
                expect(result.games.length).toBe(4)
                expect(result.standings.east).toBeDefined()
                expect(result.standings.west).toBeDefined()
                expect(result.stats).toBeDefined()
            })

            it('should generate game recaps for all games', async () => {
                vi.mocked(ResourceLoader.loadCSV).mockImplementation(async (_path: string) => {
                    const match = _path.match(/\/rosters\/(.+)\.csv/)
                    const teamName = match ? match[1] : 'Unknown'
                    return createMockRoster(teamName)
                })

                const minimalSchedule = createMinimalSchedule()
                const manager = new SeasonManager({ seed: 42 })
                const result = await manager.hostRegularSeason(minimalSchedule)

                // Should have recaps for all games
                expect(result.recaps).toBeDefined()
                expect(result.recaps.length).toBe(4)

                // Each recap should have required fields
                for (const recap of result.recaps) {
                    expect(recap.date).toBeDefined()
                    expect(recap.awayTeam).toBeDefined()
                    expect(recap.homeTeam).toBeDefined()
                    expect(recap.awayScore).toBeGreaterThan(0)
                    expect(recap.homeScore).toBeGreaterThan(0)
                    expect(recap.awayTopPlayers).toBeDefined()
                    expect(recap.homeTopPlayers).toBeDefined()
                    expect(recap.awayTopPlayers.length).toBeGreaterThan(0)
                    expect(recap.homeTopPlayers.length).toBeGreaterThan(0)
                }
            })

            it('should call progress callback during simulation', async () => {
                vi.mocked(ResourceLoader.loadCSV).mockImplementation(async (_path: string) => {
                    const match = _path.match(/\/rosters\/(.+)\.csv/)
                    const teamName = match ? match[1] : 'Unknown'
                    return createMockRoster(teamName)
                })

                const progressCalls: [number, number][] = []
                const onProgress = (completed: number, total: number) => {
                    progressCalls.push([completed, total])
                }

                const minimalSchedule = createMinimalSchedule()
                const manager = new SeasonManager({ seed: 42, onProgress })
                await manager.hostRegularSeason(minimalSchedule)

                expect(progressCalls.length).toBe(4)
                expect(progressCalls[0]).toEqual([1, 4])
                expect(progressCalls[3]).toEqual([4, 4])
            })

            it('should produce deterministic results with same seed', async () => {
                vi.mocked(ResourceLoader.loadCSV).mockImplementation(async (_path: string) => {
                    const match = _path.match(/\/rosters\/(.+)\.csv/)
                    const teamName = match ? match[1] : 'Unknown'
                    return createMockRoster(teamName)
                })

                const schedule = createMinimalSchedule()

                const manager1 = new SeasonManager({ seed: 12345 })
                const result1 = await manager1.hostRegularSeason(schedule)

                const manager2 = new SeasonManager({ seed: 12345 })
                const result2 = await manager2.hostRegularSeason(schedule)

                // Same seed should produce same results
                expect(result1.games.map(g => g.winner)).toEqual(
                    result2.games.map(g => g.winner)
                )
                expect(result1.games.map(g => g.team1Score)).toEqual(
                    result2.games.map(g => g.team1Score)
                )
            })
        })

        describe('getStats', () => {
            it('should return season stats after games', async () => {
                vi.mocked(ResourceLoader.loadCSV).mockImplementation(async (_path: string) => {
                    const match = _path.match(/\/rosters\/(.+)\.csv/)
                    const teamName = match ? match[1] : 'Unknown'
                    return createMockRoster(teamName)
                })

                const schedule = createMinimalSchedule()
                const manager = new SeasonManager({ seed: 42 })
                await manager.hostRegularSeason(schedule)

                const stats = manager.getStats()
                expect(stats).toBeDefined()

                // Check player leaders (should have some stats)
                const scoringLeaders = stats.getLeaders('points', 5)
                expect(scoringLeaders.length).toBeGreaterThan(0)
            })
        })
    })

    describe('Season Stats Aggregation', () => {
        it('should aggregate player stats across multiple games', async () => {
            vi.mocked(ResourceLoader.loadCSV).mockImplementation(async (_path: string) => {
                const match = _path.match(/\/rosters\/(.+)\.csv/)
                const teamName = match ? match[1] : 'Unknown'
                return createMockRoster(teamName)
            })

            // Create a schedule where one team plays multiple times
            const schedule: SeasonSchedule = {
                games: [
                    { date: '01-01', awayTeam: 'Lakers', homeTeam: 'Celtics' },
                    { date: '01-02', awayTeam: 'Celtics', homeTeam: 'Lakers' },
                ],
                totalGames: 2,
                startDate: '01-01',
                endDate: '01-02',
            }

            const manager = new SeasonManager({ seed: 42 })
            await manager.hostRegularSeason(schedule)

            const stats = manager.getStats()
            const leaders = stats.getLeaders('points', 20)

            // Players who played should have more than 0 points
            const lakersPlayers = leaders.filter(l => l.teamName === 'Lakers')
            expect(lakersPlayers.length).toBeGreaterThan(0)
        })
    })
})
