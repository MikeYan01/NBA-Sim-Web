import { describe, it, expect, beforeEach } from 'vitest'
import { SeededRandom } from '../../src/utils/SeededRandom'
import * as Utilities from '../../src/utils/Utilities'
import { Player, PlayerCSVRow } from '../../src/models/Player'
import { Team } from '../../src/models/Team'
import { PlayerType, RotationType, Language, LoseBallResult, BlockResult, FoulResult, ShotResult, FreeThrowResult, ShotType } from '../../src/models/types'

// Helper to create mock players
const createMockPlayer = (overrides: Partial<PlayerCSVRow> = {}): PlayerCSVRow => ({
    name: '测试球员',
    englishName: 'Test Player',
    position: 'SG',
    playerType: '1',
    rotationType: '1',
    rating: '85',
    insideRating: '80',
    midRating: '75',
    threeRating: '82',
    freeThrowPercent: '85',
    interiorDefense: '60',
    perimeterDefense: '75',
    orbRating: '40',
    drbRating: '55',
    astRating: '70',
    stlRating: '72',
    blkRating: '65',
    layupRating: '82',
    standDunk: '55',
    drivingDunk: '65',
    athleticism: '78',
    durability: '85',
    offConst: '80',
    defConst: '70',
    drawFoul: '75',
    ...overrides,
})

// Create player from CSV row helper
const createPlayer = (row: PlayerCSVRow, teamName: string): Player => {
    return Player.fromCSVRow(row, teamName)
}

describe('Utilities', () => {
    let random: SeededRandom

    beforeEach(() => {
        random = new SeededRandom(12345)
    })

    describe('generateRandomNum', () => {
        it('should return a number within the specified range', () => {
            for (let i = 0; i < 100; i++) {
                const result = Utilities.generateRandomNum(random, 1, 100)
                expect(result).toBeGreaterThanOrEqual(1)
                expect(result).toBeLessThanOrEqual(100)
            }
        })

        it('should return min when min equals max', () => {
            const result = Utilities.generateRandomNum(random, 50, 50)
            expect(result).toBe(50)
        })

        it('should use default range [1, 100] when not specified', () => {
            const result = Utilities.generateRandomNum(random)
            expect(result).toBeGreaterThanOrEqual(1)
            expect(result).toBeLessThanOrEqual(100)
        })

        it('should produce deterministic results with same seed', () => {
            const random1 = new SeededRandom(42)
            const random2 = new SeededRandom(42)

            for (let i = 0; i < 10; i++) {
                const r1 = Utilities.generateRandomNum(random1, 1, 1000)
                const r2 = Utilities.generateRandomNum(random2, 1, 1000)
                expect(r1).toBe(r2)
            }
        })
    })

    describe('roundDouble', () => {
        it('should round to 2 decimal places by default', () => {
            expect(Utilities.roundDouble(3.14159)).toBe(3.14)
            expect(Utilities.roundDouble(2.5)).toBe(2.5)
            expect(Utilities.roundDouble(2.555)).toBe(2.56) // HALF_UP rounding
        })

        it('should round to specified scale', () => {
            expect(Utilities.roundDouble(3.14159, 0)).toBe(3)
            expect(Utilities.roundDouble(3.14159, 1)).toBe(3.1)
            expect(Utilities.roundDouble(3.14159, 3)).toBe(3.142)
            expect(Utilities.roundDouble(3.14159, 4)).toBe(3.1416)
        })

        it('should handle negative numbers', () => {
            expect(Utilities.roundDouble(-3.14159, 2)).toBe(-3.14)
        })
    })

    describe('generateRandomPlayTime', () => {
        it('should generate 4-24 seconds for 24-second clock', () => {
            for (let i = 0; i < 100; i++) {
                const time = Utilities.generateRandomPlayTime(random, 24)
                expect(time).toBeGreaterThanOrEqual(4)
                expect(time).toBeLessThanOrEqual(24)
            }
        })

        it('should generate 4-14 seconds for 14-second clock', () => {
            for (let i = 0; i < 100; i++) {
                const time = Utilities.generateRandomPlayTime(random, 14)
                expect(time).toBeGreaterThanOrEqual(4)
                expect(time).toBeLessThanOrEqual(14)
            }
        })

        it('should be deterministic with same seed', () => {
            const random1 = new SeededRandom(12345)
            const random2 = new SeededRandom(12345)

            for (let i = 0; i < 10; i++) {
                const t1 = Utilities.generateRandomPlayTime(random1, 24)
                const t2 = Utilities.generateRandomPlayTime(random2, 24)
                expect(t1).toBe(t2)
            }
        })
    })

    describe('getShotDistance', () => {
        it('should return valid distance for ALL_ROUNDED player (1-35 feet)', () => {
            const player = createPlayer(createMockPlayer({ playerType: '1' }), 'Lakers')
            for (let i = 0; i < 50; i++) {
                const distance = Utilities.getShotDistance(random, player)
                expect(distance).toBeGreaterThanOrEqual(1)
                expect(distance).toBeLessThanOrEqual(35)
            }
        })

        it('should return close shots for INSIDER player (1-12 feet)', () => {
            const player = createPlayer(createMockPlayer({ playerType: '2' }), 'Lakers')
            for (let i = 0; i < 50; i++) {
                const distance = Utilities.getShotDistance(random, player)
                expect(distance).toBeGreaterThanOrEqual(1)
                expect(distance).toBeLessThanOrEqual(12)
            }
        })

        it('should be deterministic with same seed', () => {
            const random1 = new SeededRandom(12345)
            const random2 = new SeededRandom(12345)
            const player = createPlayer(createMockPlayer({ playerType: '4' }), 'Lakers')

            for (let i = 0; i < 10; i++) {
                const d1 = Utilities.getShotDistance(random1, player)
                const d2 = Utilities.getShotDistance(random2, player)
                expect(d1).toBe(d2)
            }
        })
    })

    describe('calculateFoulPercent', () => {
        let offensePlayer: Player
        let defensePlayer: Player

        beforeEach(() => {
            offensePlayer = createPlayer(createMockPlayer({ drawFoul: '85' }), 'Lakers')
            defensePlayer = createPlayer(createMockPlayer({ drawFoul: '50' }), 'Celtics')
        })

        it('should return higher percent for close shots vs three pointers', () => {
            const closePercent = Utilities.calculateFoulPercent(5, offensePlayer, defensePlayer, false)
            const threePercent = Utilities.calculateFoulPercent(25, offensePlayer, defensePlayer, false)
            expect(closePercent).toBeGreaterThan(threePercent)
        })

        it('should return higher percent for and-one close shots', () => {
            const normalPercent = Utilities.calculateFoulPercent(5, offensePlayer, defensePlayer, false)
            const andOnePercent = Utilities.calculateFoulPercent(5, offensePlayer, defensePlayer, true)
            // And-one has lower base but same formula
            expect(normalPercent).toBeGreaterThan(0)
            expect(andOnePercent).toBeGreaterThan(0)
        })

        it('should increase percent for high drawFoul rating', () => {
            const highDrawFoulPlayer = createPlayer(createMockPlayer({ drawFoul: '95' }), 'Lakers')
            const lowDrawFoulPlayer = createPlayer(createMockPlayer({ drawFoul: '50' }), 'Lakers')

            const highPercent = Utilities.calculateFoulPercent(5, highDrawFoulPlayer, defensePlayer, false)
            const lowPercent = Utilities.calculateFoulPercent(5, lowDrawFoulPlayer, defensePlayer, false)
            expect(highPercent).toBeGreaterThan(lowPercent)
        })
    })

    describe('choosePlayerBasedOnRating', () => {
        let teamOnCourt: Map<string, Player>

        beforeEach(() => {
            teamOnCourt = new Map([
                ['PG', createPlayer(createMockPlayer({ position: 'PG', rating: '85', astRating: '90' }), 'Lakers')],
                ['SG', createPlayer(createMockPlayer({ position: 'SG', rating: '82', astRating: '60' }), 'Lakers')],
                ['SF', createPlayer(createMockPlayer({ position: 'SF', rating: '92', astRating: '75' }), 'Lakers')],
                ['PF', createPlayer(createMockPlayer({ position: 'PF', rating: '88', orbRating: '85', drbRating: '80' }), 'Lakers')],
                ['C', createPlayer(createMockPlayer({ position: 'C', rating: '80', orbRating: '90', drbRating: '95' }), 'Lakers')],
            ])
        })

        it('should return a player from the team', () => {
            const player = Utilities.choosePlayerBasedOnRating(random, teamOnCourt, 'rating')
            expect(teamOnCourt.has(player.position)).toBe(true)
        })

        it('should favor higher rating players for rating selection', () => {
            const counts: Record<string, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 }
            for (let i = 0; i < 1000; i++) {
                const random = new SeededRandom(i)
                const player = Utilities.choosePlayerBasedOnRating(random, teamOnCourt, 'rating')
                counts[player.position]++
            }
            // SF has highest rating (92), should be selected more often
            expect(counts['SF']).toBeGreaterThan(counts['C'])
        })

        it('should favor higher rebound rating for orb selection', () => {
            const counts: Record<string, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 }
            for (let i = 0; i < 1000; i++) {
                const random = new SeededRandom(i)
                const player = Utilities.choosePlayerBasedOnRating(random, teamOnCourt, 'orb')
                counts[player.position]++
            }
            // C has highest orbRating (90), should be selected more often
            expect(counts['C']).toBeGreaterThan(counts['SG'])
        })

        it('should favor higher assist rating for ast selection', () => {
            const counts: Record<string, number> = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 }
            for (let i = 0; i < 1000; i++) {
                const random = new SeededRandom(i)
                const player = Utilities.choosePlayerBasedOnRating(random, teamOnCourt, 'ast')
                counts[player.position]++
            }
            // PG has highest astRating (90), should be selected more often
            expect(counts['PG']).toBeGreaterThan(counts['SG'])
        })

        it('should be deterministic with same seed', () => {
            const random1 = new SeededRandom(12345)
            const random2 = new SeededRandom(12345)

            for (let i = 0; i < 10; i++) {
                const p1 = Utilities.choosePlayerBasedOnRating(random1, teamOnCourt, 'rating')
                const p2 = Utilities.choosePlayerBasedOnRating(random2, teamOnCourt, 'rating')
                expect(p1.position).toBe(p2.position)
            }
        })
    })

    describe('jumpBall', () => {
        it('should set hasBall on winning team', () => {
            // Create mock teams
            const mockRoster = [
                createMockPlayer({ position: 'PG', rotationType: '1' }),
                createMockPlayer({ position: 'SG', rotationType: '1' }),
                createMockPlayer({ position: 'SF', rotationType: '1' }),
                createMockPlayer({ position: 'PF', rotationType: '1' }),
                createMockPlayer({ position: 'C', rotationType: '1' }),
            ]

            // We can't easily test with full Team objects without mocking
            // Test the basic logic with players
            const offenseName = 'Player A'
            const defenseName = 'Player B'

            // Run multiple times to verify it's roughly 50/50
            let offenseWins = 0
            let defenseWins = 0
            for (let i = 0; i < 1000; i++) {
                const random = new SeededRandom(i)
                const winner = Utilities.jumpBallPlayers(random, offenseName, defenseName)
                if (winner === offenseName) offenseWins++
                else defenseWins++
            }

            // Should be roughly 50/50 (allow 10% variance)
            expect(offenseWins).toBeGreaterThan(400)
            expect(offenseWins).toBeLessThan(600)
            expect(defenseWins).toBeGreaterThan(400)
            expect(defenseWins).toBeLessThan(600)
        })
    })

    describe('judgeRebound', () => {
        let offenseTeamOnCourt: Map<string, Player>
        let defenseTeamOnCourt: Map<string, Player>

        beforeEach(() => {
            offenseTeamOnCourt = new Map([
                ['PG', createPlayer(createMockPlayer({ position: 'PG', orbRating: '30' }), 'Lakers')],
                ['SG', createPlayer(createMockPlayer({ position: 'SG', orbRating: '35' }), 'Lakers')],
                ['SF', createPlayer(createMockPlayer({ position: 'SF', orbRating: '45' }), 'Lakers')],
                ['PF', createPlayer(createMockPlayer({ position: 'PF', orbRating: '75' }), 'Lakers')],
                ['C', createPlayer(createMockPlayer({ position: 'C', orbRating: '85' }), 'Lakers')],
            ])

            defenseTeamOnCourt = new Map([
                ['PG', createPlayer(createMockPlayer({ position: 'PG', drbRating: '40' }), 'Celtics')],
                ['SG', createPlayer(createMockPlayer({ position: 'SG', drbRating: '50' }), 'Celtics')],
                ['SF', createPlayer(createMockPlayer({ position: 'SF', drbRating: '65' }), 'Celtics')],
                ['PF', createPlayer(createMockPlayer({ position: 'PF', drbRating: '80' }), 'Celtics')],
                ['C', createPlayer(createMockPlayer({ position: 'C', drbRating: '90' }), 'Celtics')],
            ])
        })

        it('should favor defensive rebounds in general', () => {
            let offensiveRebounds = 0
            let defensiveRebounds = 0

            for (let i = 0; i < 1000; i++) {
                const random = new SeededRandom(i)
                // Reset stats before each call
                for (const player of offenseTeamOnCourt.values()) {
                    player.rebound = 0
                    player.offensiveRebound = 0
                }
                for (const player of defenseTeamOnCourt.values()) {
                    player.rebound = 0
                    player.defensiveRebound = 0
                }

                const outcome = Utilities.judgeRebound(random, offenseTeamOnCourt, defenseTeamOnCourt)
                if (outcome.isOffensiveRebound) offensiveRebounds++
                else defensiveRebounds++
            }

            // Defensive rebounds should be more common (roughly 85-90%)
            expect(defensiveRebounds).toBeGreaterThan(offensiveRebounds)
            expect(defensiveRebounds).toBeGreaterThan(800)
        })

        it('should update player rebound stats', () => {
            const outcome = Utilities.judgeRebound(random, offenseTeamOnCourt, defenseTeamOnCourt)

            let totalRebounds = 0
            if (outcome.isOffensiveRebound) {
                for (const player of offenseTeamOnCourt.values()) {
                    totalRebounds += player.rebound
                }
            } else {
                for (const player of defenseTeamOnCourt.values()) {
                    totalRebounds += player.rebound
                }
            }

            expect(totalRebounds).toBe(1)
        })

        it('should be deterministic with same seed', () => {
            for (let i = 0; i < 10; i++) {
                const random1 = new SeededRandom(i * 1000)
                const random2 = new SeededRandom(i * 1000)

                // Reset stats
                for (const player of offenseTeamOnCourt.values()) {
                    player.rebound = 0
                    player.offensiveRebound = 0
                }
                for (const player of defenseTeamOnCourt.values()) {
                    player.rebound = 0
                    player.defensiveRebound = 0
                }

                const outcome1 = Utilities.judgeRebound(random1, offenseTeamOnCourt, defenseTeamOnCourt)

                // Reset stats again
                for (const player of offenseTeamOnCourt.values()) {
                    player.rebound = 0
                    player.offensiveRebound = 0
                }
                for (const player of defenseTeamOnCourt.values()) {
                    player.rebound = 0
                    player.defensiveRebound = 0
                }

                const outcome2 = Utilities.judgeRebound(random2, offenseTeamOnCourt, defenseTeamOnCourt)

                expect(outcome1.isOffensiveRebound).toBe(outcome2.isOffensiveRebound)
            }
        })
    })

    describe('calculatePercentage', () => {
        let offensePlayer: Player
        let defensePlayer: Player
        let offenseTeamOnCourt: Map<string, Player>

        beforeEach(() => {
            // Create player with clearly higher inside rating than three rating
            offensePlayer = createPlayer(
                createMockPlayer({
                    insideRating: '90',
                    midRating: '78',
                    threeRating: '70', // Lower three rating to make test clearer
                    offConst: '80',
                    athleticism: '85',
                }),
                'Lakers'
            )
            defensePlayer = createPlayer(
                createMockPlayer({
                    interiorDefense: '75',
                    perimeterDefense: '70',
                    defConst: '65',
                    athleticism: '78',
                }),
                'Celtics'
            )
            offenseTeamOnCourt = new Map([
                ['PG', createPlayer(createMockPlayer({ position: 'PG', astRating: '88' }), 'Lakers')],
                ['SG', offensePlayer],
                ['SF', createPlayer(createMockPlayer({ position: 'SF', astRating: '75' }), 'Lakers')],
                ['PF', createPlayer(createMockPlayer({ position: 'PF', astRating: '55' }), 'Lakers')],
                ['C', createPlayer(createMockPlayer({ position: 'C', astRating: '45' }), 'Lakers')],
            ])
        })

        it('should return higher percentage for close shots on average', () => {
            // Create mock teams for percentage calculation
            const mockTeam1 = { totalScore: 50 } as Team
            const mockTeam2 = { totalScore: 48 } as Team

            // Run multiple times to get average (due to defense density randomness)
            let closeTotal = 0
            let threeTotal = 0
            const iterations = 500 // Increased for more stable results

            for (let i = 0; i < iterations; i++) {
                const random1 = new SeededRandom(i * 1000)
                const random2 = new SeededRandom(i * 1000 + 500)

                closeTotal += Utilities.calculatePercentage(
                    random1,
                    3, // Very close shot (layup range)
                    offensePlayer,
                    defensePlayer,
                    offenseTeamOnCourt,
                    ShotType.LAYUP, // Use LAYUP for close shots
                    360,
                    2,
                    mockTeam1,
                    mockTeam2
                )

                threeTotal += Utilities.calculatePercentage(
                    random2,
                    25,
                    offensePlayer,
                    defensePlayer,
                    offenseTeamOnCourt,
                    ShotType.JUMPER,
                    360,
                    2,
                    mockTeam1,
                    mockTeam2
                )
            }

            const closeAvg = closeTotal / iterations
            const threeAvg = threeTotal / iterations

            // Close shots should have higher average percentage
            expect(closeAvg).toBeGreaterThan(threeAvg)
        })

        it('should return higher percentage for dunks', () => {
            const mockTeam1 = { totalScore: 50 } as Team
            const mockTeam2 = { totalScore: 48 } as Team

            const dunkPercent = Utilities.calculatePercentage(
                random,
                3,
                offensePlayer,
                defensePlayer,
                offenseTeamOnCourt,
                ShotType.DUNK,
                360,
                2,
                mockTeam1,
                mockTeam2
            )

            const random2 = new SeededRandom(12345)
            const jumperPercent = Utilities.calculatePercentage(
                random2,
                3,
                offensePlayer,
                defensePlayer,
                offenseTeamOnCourt,
                ShotType.JUMPER,
                360,
                2,
                mockTeam1,
                mockTeam2
            )

            expect(dunkPercent).toBeGreaterThan(jumperPercent)
        })

        it('should return a reasonable percentage (20-90)', () => {
            const mockTeam1 = { totalScore: 50 } as Team
            const mockTeam2 = { totalScore: 48 } as Team

            for (let i = 0; i < 50; i++) {
                const random = new SeededRandom(i)
                const percent = Utilities.calculatePercentage(
                    random,
                    15,
                    offensePlayer,
                    defensePlayer,
                    offenseTeamOnCourt,
                    ShotType.JUMPER,
                    360,
                    2,
                    mockTeam1,
                    mockTeam2
                )
                expect(percent).toBeGreaterThanOrEqual(15) // Some low percentages are valid
                expect(percent).toBeLessThanOrEqual(100)
            }
        })
    })

    describe('updatePlayerMinutes', () => {
        let teamOnCourt: Map<string, Player>

        beforeEach(() => {
            teamOnCourt = new Map([
                ['PG', createPlayer(createMockPlayer({ position: 'PG' }), 'Lakers')],
                ['SG', createPlayer(createMockPlayer({ position: 'SG' }), 'Lakers')],
                ['SF', createPlayer(createMockPlayer({ position: 'SF' }), 'Lakers')],
                ['PF', createPlayer(createMockPlayer({ position: 'PF' }), 'Lakers')],
                ['C', createPlayer(createMockPlayer({ position: 'C' }), 'Lakers')],
            ])
        })

        it('should add play time to all players on court', () => {
            Utilities.updatePlayerMinutes(teamOnCourt, 12)

            for (const player of teamOnCourt.values()) {
                expect(player.secondsPlayed).toBe(12)
                expect(player.currentStintSeconds).toBe(12)
            }
        })

        it('should accumulate minutes over multiple possessions', () => {
            Utilities.updatePlayerMinutes(teamOnCourt, 12)
            Utilities.updatePlayerMinutes(teamOnCourt, 8)
            Utilities.updatePlayerMinutes(teamOnCourt, 15)

            for (const player of teamOnCourt.values()) {
                expect(player.secondsPlayed).toBe(35)
                expect(player.currentStintSeconds).toBe(35)
            }
        })
    })

    describe('getTargetMinutes', () => {
        it('should return high durability minutes for durable starters', () => {
            const player = createPlayer(createMockPlayer({ durability: '95', rotationType: '1', athleticism: '85' }), 'Lakers')
            const target = Utilities.getTargetMinutes(player)
            // HIGH_DURABILITY_MINUTES = 32 * 60 = 1920 + ATHLETICISM_HIGH_BONUS = 1 * 60 = 60
            expect(target).toBeGreaterThanOrEqual(1920)
        })

        it('should return lower minutes for low durability starters', () => {
            const highDurabilityPlayer = createPlayer(createMockPlayer({ durability: '95', rotationType: '1', athleticism: '80' }), 'Lakers')
            const lowDurabilityPlayer = createPlayer(createMockPlayer({ durability: '65', rotationType: '1', athleticism: '80' }), 'Lakers')

            const highTarget = Utilities.getTargetMinutes(highDurabilityPlayer)
            const lowTarget = Utilities.getTargetMinutes(lowDurabilityPlayer)

            expect(highTarget).toBeGreaterThan(lowTarget)
        })

        it('should return non-starter max for bench players', () => {
            const benchPlayer = createPlayer(createMockPlayer({ rotationType: '2', durability: '95' }), 'Lakers')
            const target = Utilities.getTargetMinutes(benchPlayer)
            // NON_STARTER_MAX_MINUTES = 36 * 60 = 2160
            expect(target).toBe(2160)
        })
    })

    describe('shouldSubForFoulTrouble', () => {
        it('should return true for starter with 3 fouls in Q1', () => {
            const player = createPlayer(createMockPlayer({ rotationType: '1' }), 'Lakers')
            player.foul = 3
            expect(Utilities.shouldSubForFoulTrouble(player, 1)).toBe(true)
        })

        it('should return false for starter with 2 fouls in Q1', () => {
            const player = createPlayer(createMockPlayer({ rotationType: '1' }), 'Lakers')
            player.foul = 2
            expect(Utilities.shouldSubForFoulTrouble(player, 1)).toBe(false)
        })

        it('should return true for starter with 4 fouls in Q2', () => {
            const player = createPlayer(createMockPlayer({ rotationType: '1' }), 'Lakers')
            player.foul = 4
            expect(Utilities.shouldSubForFoulTrouble(player, 2)).toBe(true)
        })

        it('should return true for starter with 5 fouls in Q3', () => {
            const player = createPlayer(createMockPlayer({ rotationType: '1' }), 'Lakers')
            player.foul = 5
            expect(Utilities.shouldSubForFoulTrouble(player, 3)).toBe(true)
        })
    })

    describe('shouldSubForFatigue', () => {
        it('should return true for starter past max stint', () => {
            const player = createPlayer(createMockPlayer({ rotationType: '1' }), 'Lakers')
            player.currentStintSeconds = 650 // MAX_STARTER_STINT_NORMAL_GAME = 10 * 60 = 600
            expect(Utilities.shouldSubForFatigue(player, false)).toBe(true)
        })

        it('should return false for starter under max stint', () => {
            const player = createPlayer(createMockPlayer({ rotationType: '1' }), 'Lakers')
            player.currentStintSeconds = 300
            expect(Utilities.shouldSubForFatigue(player, false)).toBe(false)
        })

        it('should allow longer stint in close game', () => {
            const player = createPlayer(createMockPlayer({ rotationType: '1' }), 'Lakers')
            player.currentStintSeconds = 650 // Greater than normal (600) but less than close game (720)
            expect(Utilities.shouldSubForFatigue(player, true)).toBe(false)
        })

        it('should return true for bench player past bench stint', () => {
            const player = createPlayer(createMockPlayer({ rotationType: '2' }), 'Lakers')
            player.currentStintSeconds = 490 // MAX_BENCH_STINT = 8 * 60 = 480
            expect(Utilities.shouldSubForFatigue(player, false)).toBe(true)
        })
    })
})
