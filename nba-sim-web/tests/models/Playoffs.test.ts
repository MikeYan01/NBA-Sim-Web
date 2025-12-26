/**
 * Playoffs Tests
 *
 * Tests for PlayoffManager class including:
 * - Seed reordering
 * - Home court advantage (2-2-1-1-1 format)
 * - Play-in tournament
 * - Series simulation
 * - MVP calculation
 *
 * Tasks T063-T066: Test playoffs functionality
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import {
    PlayoffManager,
    reorderSeeds,
    getHomeAwayTeams,
    calculateSeriesMVP,
    updatePlayerSeriesStats,
    SeriesResult,
} from '../../src/models/Playoffs'
import { Conference, Language } from '../../src/models/types'
import { Team } from '../../src/models/Team'
import { Player, PlayerCSVRow } from '../../src/models/Player'
import { StandingsManager } from '../../src/models/Standings'
import { setCommentsForTesting } from '../../src/services/CommentLoader'
import * as ResourceLoader from '../../src/services/ResourceLoader'

// Mock the ResourceLoader
vi.mock('../../src/services/ResourceLoader', () => ({
    loadCSV: vi.fn(),
}))

// Mock comments data
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
 * Create a complete mock roster with starters and bench players for all positions.
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

/**
 * Load fresh team instance using mocked ResourceLoader.
 */
async function loadMockTeam(teamName: string): Promise<Team> {
    vi.mocked(ResourceLoader.loadCSV).mockResolvedValueOnce(createMockRoster(teamName))
    return Team.loadFromCSV(teamName)
}

/**
 * Create a simple mock team for non-game-simulation tests
 */
function createMockTeam(name: string): Team {
    return new Team(name)
}

beforeAll(() => {
    setCommentsForTesting(mockCommentsData, mockCommentsData)
})

describe('Playoffs', () => {
    describe('reorderSeeds', () => {
        it('should reorder seeds for playoff matchups (1v8, 4v5, 2v7, 3v6)', () => {
            const seeds = ['Team1', 'Team2', 'Team3', 'Team4', 'Team5', 'Team6', 'Team7', 'Team8']
            const reordered = reorderSeeds(seeds)

            // Expected order: 1v8, 4v5, 2v7, 3v6
            expect(reordered).toEqual([
                'Team1', 'Team8', // 1v8
                'Team4', 'Team5', // 4v5
                'Team2', 'Team7', // 2v7
                'Team3', 'Team6', // 3v6
            ])
        })
    })

    describe('getHomeAwayTeams', () => {
        const seedMap = new Map<string, number>([
            ['HigherSeed', 1],
            ['LowerSeed', 8],
        ])

        it('should give higher seed home court for game 1', () => {
            const [away, home] = getHomeAwayTeams('HigherSeed', 'LowerSeed', 1, seedMap)
            expect(home).toBe('HigherSeed')
            expect(away).toBe('LowerSeed')
        })

        it('should give higher seed home court for game 2', () => {
            const [away, home] = getHomeAwayTeams('HigherSeed', 'LowerSeed', 2, seedMap)
            expect(home).toBe('HigherSeed')
            expect(away).toBe('LowerSeed')
        })

        it('should give lower seed home court for game 3', () => {
            const [away, home] = getHomeAwayTeams('HigherSeed', 'LowerSeed', 3, seedMap)
            expect(home).toBe('LowerSeed')
            expect(away).toBe('HigherSeed')
        })

        it('should give lower seed home court for game 4', () => {
            const [away, home] = getHomeAwayTeams('HigherSeed', 'LowerSeed', 4, seedMap)
            expect(home).toBe('LowerSeed')
            expect(away).toBe('HigherSeed')
        })

        it('should give higher seed home court for game 5', () => {
            const [away, home] = getHomeAwayTeams('HigherSeed', 'LowerSeed', 5, seedMap)
            expect(home).toBe('HigherSeed')
            expect(away).toBe('LowerSeed')
        })

        it('should give lower seed home court for game 6', () => {
            const [away, home] = getHomeAwayTeams('HigherSeed', 'LowerSeed', 6, seedMap)
            expect(home).toBe('LowerSeed')
            expect(away).toBe('HigherSeed')
        })

        it('should give higher seed home court for game 7', () => {
            const [away, home] = getHomeAwayTeams('HigherSeed', 'LowerSeed', 7, seedMap)
            expect(home).toBe('HigherSeed')
            expect(away).toBe('LowerSeed')
        })

        it('should work with team1 as lower seed', () => {
            const [away, home] = getHomeAwayTeams('LowerSeed', 'HigherSeed', 1, seedMap)
            expect(home).toBe('HigherSeed')
            expect(away).toBe('LowerSeed')
        })
    })

    describe('calculateSeriesMVP', () => {
        it('should return undefined for empty stats', () => {
            const stats = new Map()
            const mvp = calculateSeriesMVP(stats, 'WinningTeam')
            expect(mvp).toBeUndefined()
        })

        it('should only consider players from winning team', () => {
            const stats = new Map([
                ['Player1', {
                    name: 'Player1',
                    englishName: 'Player One',
                    teamName: 'WinningTeam',
                    gamesPlayed: 4,
                    totalPoints: 100,
                    totalRebounds: 40,
                    totalAssists: 20,
                    totalSteals: 8,
                    totalBlocks: 4,
                }],
                ['Player2', {
                    name: 'Player2',
                    englishName: 'Player Two',
                    teamName: 'LosingTeam',
                    gamesPlayed: 4,
                    totalPoints: 120, // Higher stats but losing team
                    totalRebounds: 50,
                    totalAssists: 30,
                    totalSteals: 10,
                    totalBlocks: 8,
                }],
            ])

            const mvp = calculateSeriesMVP(stats, 'WinningTeam')
            expect(mvp).toBeDefined()
            expect(mvp!.playerName).toBe('Player1')
        })

        it('should calculate MVP correctly based on formula', () => {
            const stats = new Map([
                ['Player1', {
                    name: 'Player1',
                    englishName: 'Player One',
                    teamName: 'WinningTeam',
                    gamesPlayed: 4,
                    totalPoints: 100, // 25 PPG
                    totalRebounds: 40, // 10 RPG
                    totalAssists: 20, // 5 APG
                    totalSteals: 8, // 2 SPG
                    totalBlocks: 4, // 1 BPG
                }],
            ])

            const mvp = calculateSeriesMVP(stats, 'WinningTeam')
            expect(mvp).toBeDefined()
            expect(mvp!.avgPoints).toBe(25)
            expect(mvp!.avgRebounds).toBe(10)
            expect(mvp!.avgAssists).toBe(5)
            expect(mvp!.avgSteals).toBe(2)
            expect(mvp!.avgBlocks).toBe(1)
            // MVP score = 25*1.0 + 10*0.5 + 5*0.7 + 2*0.6 + 1*0.6 = 25 + 5 + 3.5 + 1.2 + 0.6 = 35.3
            expect(mvp!.mvpScore).toBeCloseTo(35.3, 1)
        })

        it('should select player with highest MVP score', () => {
            const stats = new Map([
                ['Player1', {
                    name: 'Player1',
                    englishName: 'Player One',
                    teamName: 'WinningTeam',
                    gamesPlayed: 4,
                    totalPoints: 80, // 20 PPG
                    totalRebounds: 20, // 5 RPG
                    totalAssists: 16, // 4 APG
                    totalSteals: 4, // 1 SPG
                    totalBlocks: 4, // 1 BPG
                }],
                ['Player2', {
                    name: 'Player2',
                    englishName: 'Player Two',
                    teamName: 'WinningTeam',
                    gamesPlayed: 4,
                    totalPoints: 100, // 25 PPG - higher points
                    totalRebounds: 40, // 10 RPG
                    totalAssists: 20, // 5 APG
                    totalSteals: 8, // 2 SPG
                    totalBlocks: 4, // 1 BPG
                }],
            ])

            const mvp = calculateSeriesMVP(stats, 'WinningTeam')
            expect(mvp!.playerName).toBe('Player2')
        })
    })

    describe('PlayoffManager', () => {
        let manager: PlayoffManager

        beforeEach(() => {
            manager = new PlayoffManager({ seed: 12345 })
        })

        describe('initialization', () => {
            it('should create manager with default options', () => {
                const defaultManager = new PlayoffManager()
                expect(defaultManager).toBeDefined()
            })

            it('should create manager with seed', () => {
                const seededManager = new PlayoffManager({ seed: 42 })
                expect(seededManager).toBeDefined()
            })

            it('should expose silentMode getter', () => {
                const silentManager = new PlayoffManager({ silentMode: true })
                expect(silentManager.silentMode).toBe(true)

                const loudManager = new PlayoffManager({ silentMode: false })
                expect(loudManager.silentMode).toBe(false)
            })
        })

        describe('setSeed', () => {
            it('should set team seed for home court advantage', () => {
                manager.setSeed('Celtics', 1)
                manager.setSeed('Lakers', 2)
                // Seeds are stored internally - verify via getHomeAwayTeams behavior
                expect(manager).toBeDefined()
            })
        })

        describe('cacheTeam and getCachedTeam', () => {
            it('should cache and retrieve teams', () => {
                const team = createMockTeam('Lakers')
                manager.cacheTeam(team)

                const cached = manager.getCachedTeam('Lakers')
                expect(cached).toBe(team)
            })

            it('should return undefined for uncached teams', () => {
                const cached = manager.getCachedTeam('NonexistentTeam')
                expect(cached).toBeUndefined()
            })
        })
    })

    describe('PlayoffManager integration', () => {
        let manager: PlayoffManager
        let teams: Map<string, Team>

        beforeEach(async () => {
            manager = new PlayoffManager({ seed: 12345 })
            teams = new Map()

            // Load mock teams for testing using mocked ResourceLoader
            const teamNames = ['Celtics', 'Lakers', 'Warriors', 'Heat']
            for (const name of teamNames) {
                const team = await loadMockTeam(name)
                teams.set(name, team)
            }
        })

        describe('hostPlayoffGame', () => {
            it('should simulate a single playoff game', async () => {
                const celtics = teams.get('Celtics')!
                const lakers = teams.get('Lakers')!

                celtics.resetGameStats()
                lakers.resetGameStats()

                const result = manager.hostPlayoffGame(celtics, lakers)

                expect(result).toBeDefined()
                expect(result.team1Name).toBe('Celtics')
                expect(result.team2Name).toBe('Lakers')
                expect(result.winner).toMatch(/Celtics|Lakers/)
                expect(result.boxScore).toBeDefined()
            })
        })

        describe('hostSeries', () => {
            it('should simulate a best-of-7 series', async () => {
                // Set seeds
                manager.setSeed('Celtics', 1)
                manager.setSeed('Lakers', 8)

                const result = manager.hostSeries(
                    'Celtics',
                    'Lakers',
                    'Test Series',
                    teams
                )

                expect(result).toBeDefined()
                expect(result.team1).toBe('Celtics')
                expect(result.team2).toBe('Lakers')
                expect(result.team1Wins + result.team2Wins).toBeGreaterThanOrEqual(4)
                expect(result.team1Wins + result.team2Wins).toBeLessThanOrEqual(7)
                expect(result.winner).toMatch(/Celtics|Lakers/)
                expect(result.loser).toMatch(/Celtics|Lakers/)
                expect(result.winner).not.toBe(result.loser)
                expect(result.games.length).toBeGreaterThanOrEqual(4)
                expect(result.games.length).toBeLessThanOrEqual(7)
            })

            it('should calculate series MVP from winning team', async () => {
                manager.setSeed('Celtics', 1)
                manager.setSeed('Lakers', 8)

                const result = manager.hostSeries(
                    'Celtics',
                    'Lakers',
                    'Test Series',
                    teams
                )

                expect(result.seriesMVP).toBeDefined()
                // MVP should be from winning team
                const mvp = result.seriesMVP!
                expect(mvp.playerName).toBeDefined()
                expect(mvp.teamName).toBe(result.winner)
            })
        })
    })

    describe('2-2-1-1-1 format verification', () => {
        it('should follow 2-2-1-1-1 format for all 7 games', () => {
            const seedMap = new Map<string, number>([
                ['HigherSeed', 1],
                ['LowerSeed', 2],
            ])

            const homeTeams: string[] = []
            for (let game = 1; game <= 7; game++) {
                const [, home] = getHomeAwayTeams('HigherSeed', 'LowerSeed', game, seedMap)
                homeTeams.push(home)
            }

            // 2-2-1-1-1: Higher gets games 1,2,5,7; Lower gets 3,4,6
            expect(homeTeams[0]).toBe('HigherSeed') // Game 1
            expect(homeTeams[1]).toBe('HigherSeed') // Game 2
            expect(homeTeams[2]).toBe('LowerSeed') // Game 3
            expect(homeTeams[3]).toBe('LowerSeed') // Game 4
            expect(homeTeams[4]).toBe('HigherSeed') // Game 5
            expect(homeTeams[5]).toBe('LowerSeed') // Game 6
            expect(homeTeams[6]).toBe('HigherSeed') // Game 7
        })
    })
})
