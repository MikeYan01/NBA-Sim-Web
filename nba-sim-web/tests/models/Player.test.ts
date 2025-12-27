import { describe, it, expect } from 'vitest'
import { Player, PlayerCSVRow } from '../../src/models/Player'
import { PlayerType, DunkerType, RotationType, Language } from '../../src/models/types'

describe('Player', () => {
    const createMockCSVRow = (overrides: Partial<PlayerCSVRow> = {}): PlayerCSVRow => ({
        name: '勒布朗·詹姆斯',
        englishName: 'LeBron James',
        position: 'SF',
        playerType: '1',
        rotationType: '1',
        rating: '92',
        insideRating: '94',
        midRating: '89',
        threeRating: '74',
        freeThrowPercent: '62',
        interiorDefense: '74',
        perimeterDefense: '74',
        orbRating: '38',
        drbRating: '66',
        astRating: '89',
        stlRating: '38',
        blkRating: '62',
        layupRating: '97',
        standDunk: '80',
        drivingDunk: '85',
        athleticism: '84',
        durability: '97',
        offConst: '85',
        defConst: '60',
        drawFoul: '80',
        ...overrides,
    })

    describe('fromCSVRow', () => {
        it('should parse all 25 attributes correctly', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')

            expect(player.name).toBe('勒布朗·詹姆斯')
            expect(player.englishName).toBe('LeBron James')
            expect(player.position).toBe('SF')
            expect(player.teamName).toBe('Lakers')
            expect(player.playerType).toBe(PlayerType.ALL_ROUNDED)
            expect(player.rotationType).toBe(RotationType.STARTER)
            expect(player.rating).toBe(92)
            expect(player.insideRating).toBe(94)
            expect(player.midRating).toBe(89)
            expect(player.threeRating).toBe(74)
            expect(player.freeThrowPercent).toBe(62)
            expect(player.interiorDefense).toBe(74)
            expect(player.perimeterDefense).toBe(74)
            expect(player.orbRating).toBe(38)
            expect(player.drbRating).toBe(66)
            expect(player.astRating).toBe(89)
            expect(player.stlRating).toBe(38)
            expect(player.blkRating).toBe(62)
            expect(player.layupRating).toBe(97)
            expect(player.standDunk).toBe(80)
            expect(player.drivingDunk).toBe(85)
            expect(player.athleticism).toBe(84)
            expect(player.durability).toBe(97)
            expect(player.offConst).toBe(85)
            expect(player.defConst).toBe(60)
            expect(player.drawFoul).toBe(80)
        })

        it('should parse different player types', () => {
            for (let i = 1; i <= 5; i++) {
                const row = createMockCSVRow({ playerType: String(i) })
                const player = Player.fromCSVRow(row, 'Lakers')
                expect(player.playerType).toBe(i)
            }
        })

        it('should parse different rotation types', () => {
            const starter = Player.fromCSVRow(createMockCSVRow({ rotationType: '1' }), 'Lakers')
            expect(starter.rotationType).toBe(RotationType.STARTER)

            const bench = Player.fromCSVRow(createMockCSVRow({ rotationType: '2' }), 'Lakers')
            expect(bench.rotationType).toBe(RotationType.BENCH)

            const deepBench = Player.fromCSVRow(createMockCSVRow({ rotationType: '3' }), 'Lakers')
            expect(deepBench.rotationType).toBe(RotationType.DEEP_BENCH)
        })
    })

    describe('dunkerType calculation', () => {
        it('should be RARELY_DUNK when dunk sum <= 60', () => {
            const row = createMockCSVRow({ standDunk: '25', drivingDunk: '35' }) // sum = 60
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.dunkerType).toBe(DunkerType.RARELY_DUNK)
        })

        it('should be NORMAL when dunk sum is between 61 and 159', () => {
            const row = createMockCSVRow({ standDunk: '50', drivingDunk: '50' }) // sum = 100
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.dunkerType).toBe(DunkerType.NORMAL)
        })

        it('should be EXCELLENT when dunk sum >= 160', () => {
            const row = createMockCSVRow({ standDunk: '80', drivingDunk: '80' }) // sum = 160
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.dunkerType).toBe(DunkerType.EXCELLENT)
        })

        it('should be EXCELLENT when standDunk >= 90', () => {
            const row = createMockCSVRow({ standDunk: '90', drivingDunk: '50' }) // sum = 140
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.dunkerType).toBe(DunkerType.EXCELLENT)
        })

        it('should be EXCELLENT when drivingDunk >= 90', () => {
            const row = createMockCSVRow({ standDunk: '50', drivingDunk: '90' }) // sum = 140
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.dunkerType).toBe(DunkerType.EXCELLENT)
        })
    })

    describe('isStar calculation', () => {
        it('should be true when rating >= 90', () => {
            const row = createMockCSVRow({ rating: '90' })
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.isStar).toBe(true)
        })

        it('should be false when rating < 90', () => {
            const row = createMockCSVRow({ rating: '89' })
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.isStar).toBe(false)
        })
    })

    describe('getDisplayName', () => {
        it('should return English name for English language', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.getDisplayName(Language.ENGLISH)).toBe('LeBron James')
        })

        it('should return Chinese name for Chinese language', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.getDisplayName(Language.CHINESE)).toBe('勒布朗·詹姆斯')
        })
    })

    describe('getLastName', () => {
        it('should return last name for English', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.getLastName(Language.ENGLISH)).toBe('James')
        })

        it('should return full name for Chinese', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')
            expect(player.getLastName(Language.CHINESE)).toBe('勒布朗·詹姆斯')
        })
    })

    describe('resetGameStats', () => {
        it('should reset all game statistics to zero', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')

            // Simulate some game activity
            player.score = 30
            player.rebound = 10
            player.assist = 8
            player.shotMade = 12
            player.shotAttempted = 20
            player.secondsPlayed = 2000
            player.isOnCourt = true

            player.resetGameStats()

            expect(player.score).toBe(0)
            expect(player.rebound).toBe(0)
            expect(player.assist).toBe(0)
            expect(player.shotMade).toBe(0)
            expect(player.shotAttempted).toBe(0)
            expect(player.secondsPlayed).toBe(0)
            expect(player.isOnCourt).toBe(false)
            expect(player.canOnCourt).toBe(true)
        })

        it('should set hasBeenOnCourt based on rotation type', () => {
            const starter = Player.fromCSVRow(createMockCSVRow({ rotationType: '1' }), 'Lakers')
            starter.hasBeenOnCourt = false
            starter.resetGameStats()
            expect(starter.hasBeenOnCourt).toBe(true)

            const bench = Player.fromCSVRow(createMockCSVRow({ rotationType: '2' }), 'Lakers')
            bench.hasBeenOnCourt = true
            bench.resetGameStats()
            expect(bench.hasBeenOnCourt).toBe(false)
        })
    })

    describe('getFormattedMinutes', () => {
        it('should format seconds as MM:SS', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')

            player.secondsPlayed = 0
            expect(player.getFormattedMinutes()).toBe('0:00')

            player.secondsPlayed = 60
            expect(player.getFormattedMinutes()).toBe('1:00')

            player.secondsPlayed = 125
            expect(player.getFormattedMinutes()).toBe('2:05')

            player.secondsPlayed = 2400
            expect(player.getFormattedMinutes()).toBe('40:00')
        })
    })

    describe('percentage calculations', () => {
        it('should calculate field goal percentage', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')

            expect(player.getFieldGoalPercentage()).toBe(0)

            player.shotMade = 5
            player.shotAttempted = 10
            expect(player.getFieldGoalPercentage()).toBe(50)
        })

        it('should calculate three-point percentage', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')

            expect(player.getThreePointPercentage()).toBe(0)

            player.threeMade = 3
            player.threeAttempted = 9
            expect(player.getThreePointPercentage()).toBeCloseTo(33.33, 1)
        })

        it('should calculate free throw percentage', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')

            expect(player.getFreeThrowPercentage()).toBe(0)

            player.freeThrowMade = 8
            player.freeThrowAttempted = 10
            expect(player.getFreeThrowPercentage()).toBe(80)
        })
    })

    describe('getGameStats', () => {
        it('should return all game statistics', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')

            player.score = 30
            player.rebound = 10
            player.assist = 8

            const stats = player.getGameStats()

            expect(stats.score).toBe(30)
            expect(stats.rebound).toBe(10)
            expect(stats.assist).toBe(8)
        })
    })

    describe('toJSON', () => {
        it('should serialize player to JSON', () => {
            const row = createMockCSVRow()
            const player = Player.fromCSVRow(row, 'Lakers')

            const json = player.toJSON()

            expect(json.name).toBe('勒布朗·詹姆斯')
            expect(json.englishName).toBe('LeBron James')
            expect(json.position).toBe('SF')
            expect(json.teamName).toBe('Lakers')
            expect(json.isStar).toBe(true)
            expect(json.gameStats).toBeDefined()
            expect(json.minutesTracking).toBeDefined()
        })
    })
})
