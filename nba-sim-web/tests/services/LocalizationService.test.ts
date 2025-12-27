import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
    initLocalization,
    isInitialized,
    setLanguage,
    getLanguage,
    getString,
    getStringShort,
    getStringLong,
    formatString,
    getFormattedString,
} from '../../src/services/LocalizationService'
import { Language } from '../../src/models/types'
import * as ResourceLoader from '../../src/services/ResourceLoader'

// Mock the ResourceLoader
vi.mock('../../src/services/ResourceLoader', () => ({
    loadJSON: vi.fn(),
}))

// Comprehensive mock data covering all critical localization paths
const mockChineseStrings = {
    stat: {
        points: { short: '分', long: '得分' },
        rebounds: { short: '篮板', long: '篮板球', offensive: { short: '前板', long: '进攻篮板' }, defensive: { short: '后板', long: '防守篮板' } },
        assists: { short: '助攻', long: '助攻' },
        steals: { short: '抢断', long: '抢断' },
        blocks: { short: '盖帽', long: '盖帽' },
        minutes: { short: '分钟', long: '上场时间' },
        fieldgoal: { label: '投篮', pct: '命中率' },
        threepoint: { label: '三分', pct: '三分命中率' },
        freethrow: { label: '罚球', pct: '罚球命中率' },
        winrate: '胜率',
        wins: '胜',
        losses: '负',
    },
    game: {
        away: '客场',
        home: '主场',
        at: '@',
        recap: '比赛回顾',
        finalscore: '最终比分',
        overtime: { suffix: '加时' },
    },
    conference: {
        east: '东部',
        west: '西部',
        east_full: '东部联盟:',
        west_full: '西部联盟:',
    },
    commentary: {
        time: {
            quarter_prefix: '第',
            quarter_suffix: '节',
            quarter_end: '结束',
            current_score: '当前比分:',
            game_start: '开始',
        },
        game_end: {
            full_time: '比赛结束',
            final_score: '最终比分:',
            congratulations: '恭喜',
            win_by: '击败',
            points_advantage: '分',
            defeat: '',
            quarter_details: '各节比分',
        },
        shot: {
            threepoint_suffix: '三分球',
        },
        rebound: {
            offensive: '进攻篮板',
            defensive: '防守篮板',
        },
        substitution: {
            replace: '替换',
            prefix: '换人',
        },
        player_stats: {
            points: '分',
            rebounds: '篮板',
            assists: '助攻',
            steals: '抢断',
            blocks: '盖帽',
        },
    },
    playoff: {
        round: { first: '首轮', semi: '半决赛', final: '决赛', championship: '总决赛' },
    },
}

const mockEnglishStrings = {
    stat: {
        points: { short: ' Pts', long: 'Points' },
        rebounds: { short: ' Reb', long: 'Rebounds', offensive: { short: ' orb', long: 'Offensive Rebounds' }, defensive: { short: ' drb', long: 'Defensive Rebounds' } },
        assists: { short: ' Ast', long: 'Assists' },
        steals: { short: ' Stl', long: 'Steals' },
        blocks: { short: ' Blk', long: 'Blocks' },
        minutes: { short: ' Min', long: 'Minutes Played' },
        fieldgoal: { label: 'FG ', pct: 'FG%' },
        threepoint: { label: '3P ', pct: '3P%' },
        freethrow: { label: 'FT ', pct: 'FT%' },
        winrate: ' W%',
        wins: 'W',
        losses: 'L',
    },
    game: {
        away: 'Away',
        home: 'Home',
        at: '@',
        recap: 'Game Recap',
        finalscore: 'Final Score',
        overtime: { suffix: 'OT' },
    },
    conference: {
        east: 'Eastern',
        west: 'Western',
        east_full: 'Eastern Conference:',
        west_full: 'Western Conference:',
    },
    commentary: {
        time: {
            quarter_prefix: 'Q',
            quarter_suffix: '',
            quarter_end: ' ends',
            current_score: 'Current score:',
            game_start: ' starts',
        },
        game_end: {
            full_time: 'Game over',
            final_score: 'Final score:',
            congratulations: 'Congratulations to ',
            win_by: ' for defeating ',
            points_advantage: ' by ',
            defeat: ' points',
            quarter_details: 'Score by quarters',
        },
        shot: {
            threepoint_suffix: ' three-pointer',
        },
        rebound: {
            offensive: 'offensive rebound',
            defensive: 'defensive rebound',
        },
        substitution: {
            replace: ' replaces ',
            prefix: 'Substitution',
        },
        player_stats: {
            points: ' Pts',
            rebounds: ' Reb',
            assists: ' Ast',
            steals: ' Stl',
            blocks: ' Blk',
        },
    },
    playoff: {
        round: { first: ' First Round', semi: ' Semifinals', final: ' Finals', championship: ' Championship' },
    },
}


describe('LocalizationService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(ResourceLoader.loadJSON).mockImplementation(async (path: string) => {
            if (path.includes('zh_CN')) {
                return mockChineseStrings
            }
            if (path.includes('en_US')) {
                return mockEnglishStrings
            }
            throw new Error(`Unknown path: ${path}`)
        })
    })

    describe('initLocalization', () => {
        it('should load both language files', async () => {
            await initLocalization()

            expect(ResourceLoader.loadJSON).toHaveBeenCalledTimes(2)
            expect(isInitialized()).toBe(true)
        })
    })

    describe('setLanguage and getLanguage', () => {
        it('should default to English', () => {
            expect(getLanguage()).toBe(Language.ENGLISH)
        })

        it('should change language when set', () => {
            setLanguage(Language.ENGLISH)
            expect(getLanguage()).toBe(Language.ENGLISH)

            setLanguage(Language.CHINESE)
            expect(getLanguage()).toBe(Language.CHINESE)
        })
    })

    describe('getString', () => {
        beforeEach(async () => {
            await initLocalization()
        })

        it('should return Chinese string for nested path', () => {
            setLanguage(Language.CHINESE)
            expect(getString('game.away')).toBe('客场')
            expect(getString('game.home')).toBe('主场')
        })

        it('should return English string for nested path', () => {
            setLanguage(Language.ENGLISH)
            expect(getString('game.away')).toBe('Away')
            expect(getString('game.home')).toBe('Home')
        })

        it('should return deeply nested values', () => {
            setLanguage(Language.ENGLISH)
            expect(getString('game.overtime.suffix')).toBe('OT')

            setLanguage(Language.CHINESE)
            expect(getString('game.overtime.suffix')).toBe('加时')
        })

        it('should return keyPath if not found', () => {
            expect(getString('nonexistent.key')).toBe('nonexistent.key')
        })

        it('should allow language override', () => {
            setLanguage(Language.CHINESE)
            expect(getString('game.away', Language.ENGLISH)).toBe('Away')
        })
    })

    describe('getStringShort and getStringLong', () => {
        beforeEach(async () => {
            await initLocalization()
        })

        it('should return short variant', () => {
            setLanguage(Language.ENGLISH)
            expect(getStringShort('stat.points')).toBe(' Pts')

            setLanguage(Language.CHINESE)
            expect(getStringShort('stat.points')).toBe('分')
        })

        it('should return long variant', () => {
            setLanguage(Language.ENGLISH)
            expect(getStringLong('stat.points')).toBe('Points')

            setLanguage(Language.CHINESE)
            expect(getStringLong('stat.points')).toBe('得分')
        })
    })

    describe('formatString', () => {
        it('should replace placeholders with values', () => {
            expect(formatString('{0} scored {1} points', 'LeBron', 30)).toBe('LeBron scored 30 points')
        })

        it('should handle multiple occurrences', () => {
            expect(formatString('{0} vs {0}', 'Lakers')).toBe('Lakers vs Lakers')
        })

        it('should leave unmatched placeholders', () => {
            expect(formatString('{0} {1} {2}', 'A', 'B')).toBe('A B {2}')
        })
    })

    describe('getFormattedString', () => {
        beforeEach(async () => {
            await initLocalization()
        })

        it('should get and format string', () => {
            setLanguage(Language.ENGLISH)
            // This would need a template string in the mock data
            // For now, just verify it returns the key if not found
            expect(getFormattedString('template.test', 'value')).toBe('template.test')
        })
    })

    // T085: Comprehensive Chinese mode tests
    describe('T085: All strings in Chinese mode', () => {
        beforeEach(async () => {
            await initLocalization()
            setLanguage(Language.CHINESE)
        })

        it('should return Chinese stat strings', () => {
            expect(getString('stat.points.short')).toBe('分')
            expect(getString('stat.points.long')).toBe('得分')
            expect(getString('stat.rebounds.short')).toBe('篮板')
            expect(getString('stat.rebounds.long')).toBe('篮板球')
            expect(getString('stat.assists.short')).toBe('助攻')
            expect(getString('stat.steals.short')).toBe('抢断')
            expect(getString('stat.blocks.short')).toBe('盖帽')
        })

        it('should return Chinese game strings', () => {
            expect(getString('game.away')).toBe('客场')
            expect(getString('game.home')).toBe('主场')
            expect(getString('game.recap')).toBe('比赛回顾')
            expect(getString('game.finalscore')).toBe('最终比分')
        })

        it('should return Chinese conference strings', () => {
            expect(getString('conference.east')).toBe('东部')
            expect(getString('conference.west')).toBe('西部')
        })

        it('should return Chinese commentary strings', () => {
            expect(getString('commentary.time.quarter_prefix')).toBe('第')
            expect(getString('commentary.time.quarter_suffix')).toBe('节')
            expect(getString('commentary.time.quarter_end')).toBe('结束')
            expect(getString('commentary.game_end.full_time')).toBe('比赛结束')
            expect(getString('commentary.game_end.final_score')).toBe('最终比分:')
        })

        it('should return Chinese rebound strings', () => {
            expect(getString('commentary.rebound.offensive')).toBe('进攻篮板')
            expect(getString('commentary.rebound.defensive')).toBe('防守篮板')
        })

        it('should return Chinese playoff strings', () => {
            expect(getString('playoff.round.first')).toBe('首轮')
            expect(getString('playoff.round.championship')).toBe('总决赛')
        })
    })

    // T086: Comprehensive English mode tests
    describe('T086: All strings in English mode', () => {
        beforeEach(async () => {
            await initLocalization()
            setLanguage(Language.ENGLISH)
        })

        it('should return English stat strings', () => {
            expect(getString('stat.points.short')).toBe(' Pts')
            expect(getString('stat.points.long')).toBe('Points')
            expect(getString('stat.rebounds.short')).toBe(' Reb')
            expect(getString('stat.rebounds.long')).toBe('Rebounds')
            expect(getString('stat.assists.short')).toBe(' Ast')
            expect(getString('stat.steals.short')).toBe(' Stl')
            expect(getString('stat.blocks.short')).toBe(' Blk')
        })

        it('should return English game strings', () => {
            expect(getString('game.away')).toBe('Away')
            expect(getString('game.home')).toBe('Home')
            expect(getString('game.recap')).toBe('Game Recap')
            expect(getString('game.finalscore')).toBe('Final Score')
        })

        it('should return English conference strings', () => {
            expect(getString('conference.east')).toBe('Eastern')
            expect(getString('conference.west')).toBe('Western')
        })

        it('should return English commentary strings', () => {
            expect(getString('commentary.time.quarter_prefix')).toBe('Q')
            expect(getString('commentary.time.quarter_suffix')).toBe('')
            expect(getString('commentary.time.quarter_end')).toBe(' ends')
            expect(getString('commentary.game_end.full_time')).toBe('Game over')
            expect(getString('commentary.game_end.final_score')).toBe('Final score:')
        })

        it('should return English rebound strings', () => {
            expect(getString('commentary.rebound.offensive')).toBe('offensive rebound')
            expect(getString('commentary.rebound.defensive')).toBe('defensive rebound')
        })

        it('should return English playoff strings', () => {
            expect(getString('playoff.round.first')).toBe(' First Round')
            expect(getString('playoff.round.championship')).toBe(' Championship')
        })
    })

    // Language switching tests
    describe('Language switching', () => {
        beforeEach(async () => {
            await initLocalization()
        })

        it('should switch between languages correctly', () => {
            setLanguage(Language.CHINESE)
            expect(getString('game.away')).toBe('客场')

            setLanguage(Language.ENGLISH)
            expect(getString('game.away')).toBe('Away')

            setLanguage(Language.CHINESE)
            expect(getString('game.away')).toBe('客场')
        })

        it('should handle rapid language switching', () => {
            for (let i = 0; i < 10; i++) {
                setLanguage(Language.ENGLISH)
                expect(getString('stat.points.short')).toBe(' Pts')

                setLanguage(Language.CHINESE)
                expect(getString('stat.points.short')).toBe('分')
            }
        })

        it('should return consistent values for the same key', () => {
            setLanguage(Language.ENGLISH)
            const value1 = getString('commentary.game_end.full_time')
            const value2 = getString('commentary.game_end.full_time')
            const value3 = getString('commentary.game_end.full_time')

            expect(value1).toBe(value2)
            expect(value2).toBe(value3)
        })
    })
})
