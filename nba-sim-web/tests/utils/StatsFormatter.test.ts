/**
 * StatsFormatter Tests
 *
 * Tests for stats formatting utilities including standings, leaderboards, and season output.
 *
 * Task T071: StatsFormatter season output (standings, leaderboards)
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import {
    formatStanding,
    formatGamesBack,
    formatStandingEntry,
    formatConferenceStandings,
    formatLeaderboardEntry,
    formatLeaderboard,
    getStatCategoryLabel,
    formatSeasonHeader,
    formatSeriesResult,
    formatChampionshipResult,
    formatPlayerBoxScore,
    formatSimpleRanking,
    formatMinutes,
    formatPercentage,
    formatShootingStat,
    formatShootingPercentage,
    formatQuarterSummary,
} from '../../src/utils/StatsFormatter'
import { initLocalization } from '../../src/services/LocalizationService'
import { Language } from '../../src/models/types'
import * as ResourceLoader from '../../src/services/ResourceLoader'

// Mock the ResourceLoader
vi.mock('../../src/services/ResourceLoader', () => ({
    loadJSON: vi.fn(),
}))

const mockEnglishStrings = {
    stat: {
        points: { short: ' Pts', long: 'Points' },
        rebounds: { short: ' Reb', long: 'Rebounds' },
        assists: { short: ' Ast', long: 'Assists' },
        steals: { short: ' Stl', long: 'Steals' },
        blocks: { short: ' Blk', long: 'Blocks' },
        winrate: 'Win%: ',
        fieldgoal: { label: 'FG: ', pct: 'FG%' },
        threepoint: { label: '3P: ', made: '3PT Made' },
        freethrow: { label: 'FT: ', made: 'FT Made' },
        minutes: 'Minutes',
    },
    standings: {
        conference: 'Conference',
        team: 'Team',
        record: 'W-L',
        gamesback: 'GB',
    },
    leaderboard: {
        player: 'Player',
        value: 'Value',
    },
    playoffs: {
        champion: 'NBA Champion',
        finals: 'NBA Finals',
        mvp: 'Finals MVP',
    },
    season: {
        title: 'NBA Season',
    },
    game: {
        recap: 'Game Recap',
        finalscore: 'Final Score',
        away: 'Away',
        home: 'Home',
    },
}

const mockChineseStrings = {
    stat: {
        points: { short: '分', long: '得分' },
        rebounds: { short: '篮板', long: '篮板球' },
        assists: { short: '助攻', long: '助攻' },
        steals: { short: '抢断', long: '抢断' },
        blocks: { short: '盖帽', long: '盖帽' },
        winrate: '胜率: ',
        fieldgoal: { label: '投篮: ', pct: '投篮命中率' },
        threepoint: { label: '三分: ', made: '三分命中' },
        freethrow: { label: '罚球: ', made: '罚球命中' },
        minutes: '分钟',
    },
    standings: {
        conference: '分区',
        team: '球队',
        record: '战绩',
        gamesback: '胜差',
    },
    leaderboard: {
        player: '球员',
        value: '数值',
    },
    playoffs: {
        champion: 'NBA总冠军',
        finals: 'NBA总决赛',
        mvp: '总决赛MVP',
    },
    season: {
        title: 'NBA赛季',
    },
    game: {
        recap: '比赛回顾',
        finalscore: '最终比分',
        away: '客场',
        home: '主场',
    },
}

describe('StatsFormatter', () => {
    beforeAll(async () => {
        // Set up mock to return our test strings
        const mockLoadJSON = ResourceLoader.loadJSON as ReturnType<typeof vi.fn>
        mockLoadJSON.mockImplementation((path: string) => {
            if (path.includes('en_US')) {
                return Promise.resolve(mockEnglishStrings)
            } else {
                return Promise.resolve(mockChineseStrings)
            }
        })
        await initLocalization()
    })

    // =========================================================================
    // Standing Formatting
    // =========================================================================

    describe('formatStanding', () => {
        it('should format a basic standing line', () => {
            const result = formatStanding(1, 'Lakers', 50, 32, 60.98, Language.EN_US)
            expect(result).toContain('1')
            expect(result).toContain('Lakers')
            expect(result).toContain('50-32')
            expect(result).toContain('60.98')
        })

        it('should handle Chinese language', () => {
            const result = formatStanding(2, '勇士', 45, 37, 54.88, Language.ZH_CN)
            expect(result).toContain('2')
            expect(result).toContain('勇士')
            expect(result).toContain('45-37')
        })
    })

    describe('formatGamesBack', () => {
        it('should format zero games back as dash', () => {
            expect(formatGamesBack(0)).toBe('-')
        })

        it('should format half game back', () => {
            expect(formatGamesBack(0.5)).toBe('0.5')
        })

        it('should format multiple games back', () => {
            expect(formatGamesBack(5)).toBe('5.0')
            expect(formatGamesBack(10.5)).toBe('10.5')
        })
    })

    describe('formatStandingEntry', () => {
        it('should format a complete standing entry', () => {
            const entry = {
                rank: 1,
                teamName: 'Lakers',
                wins: 50,
                losses: 32,
                winPercentage: 0.610,
                gamesBack: 0,
            }
            const result = formatStandingEntry(entry, Language.EN_US)
            expect(result).toContain('1.')
            expect(result).toContain('Lakers')
            expect(result).toContain('50')
            expect(result).toContain('32')
            expect(result).toContain('.610')
            expect(result).toContain('-')  // Games back for leader
        })

        it('should format entry with games back', () => {
            const entry = {
                rank: 3,
                teamName: 'Clippers',
                wins: 47,
                losses: 35,
                winPercentage: 0.573,
                gamesBack: 3.5,
            }
            const result = formatStandingEntry(entry, Language.EN_US)
            expect(result).toContain('3.')
            expect(result).toContain('3.5')
        })
    })

    describe('formatConferenceStandings', () => {
        it('should format complete conference standings', () => {
            const standings = [
                { rank: 1, teamName: 'Lakers', wins: 50, losses: 32, winPercentage: 0.610, gamesBack: 0 },
                { rank: 2, teamName: 'Clippers', wins: 48, losses: 34, winPercentage: 0.585, gamesBack: 2 },
                { rank: 3, teamName: 'Warriors', wins: 45, losses: 37, winPercentage: 0.549, gamesBack: 5 },
            ]
            const lines = formatConferenceStandings('Western', standings, Language.EN_US)

            expect(lines.length).toBeGreaterThan(4) // Header + blank + column headers + divider + 3 teams
            expect(lines[0]).toContain('Western')
            expect(lines.some(l => l.includes('Lakers'))).toBe(true)
            expect(lines.some(l => l.includes('Clippers'))).toBe(true)
            expect(lines.some(l => l.includes('Warriors'))).toBe(true)
        })
    })

    // =========================================================================
    // Leaderboard Formatting
    // =========================================================================

    describe('formatLeaderboardEntry', () => {
        it('should format a leaderboard entry', () => {
            const result = formatLeaderboardEntry(1, 'LeBron James', 'Lakers', 27.5, Language.EN_US)
            expect(result).toContain('1.')
            expect(result).toContain('LeBron James')
            expect(result).toContain('Lakers')
            expect(result).toContain('27.5')
        })

        it('should handle high rank numbers', () => {
            const result = formatLeaderboardEntry(10, 'Player Name', 'Team', 15.3, Language.EN_US)
            expect(result).toContain('10.')
            expect(result).toContain('15.3')
        })
    })

    describe('formatLeaderboard', () => {
        it('should format a complete leaderboard', () => {
            const entries = [
                { name: 'Player 1', englishName: 'Player 1', teamName: 'Team A', value: 28.5 },
                { name: 'Player 2', englishName: 'Player 2', teamName: 'Team B', value: 27.0 },
                { name: 'Player 3', englishName: 'Player 3', teamName: 'Team C', value: 25.5 },
            ]
            const lines = formatLeaderboard('Points Per Game', entries, Language.EN_US)

            expect(lines.length).toBeGreaterThan(4)
            expect(lines[0]).toContain('Points Per Game')
            expect(lines.some(l => l.includes('Player 1'))).toBe(true)
            expect(lines.some(l => l.includes('28.5'))).toBe(true)
        })
    })

    describe('getStatCategoryLabel', () => {
        it('should return correct labels for stat categories', () => {
            // Default fallback labels when localization keys don't exist
            expect(getStatCategoryLabel('points', Language.EN_US)).toBeDefined()
            expect(getStatCategoryLabel('rebounds', Language.EN_US)).toBeDefined()
            expect(getStatCategoryLabel('assists', Language.EN_US)).toBeDefined()
            expect(getStatCategoryLabel('steals', Language.EN_US)).toBeDefined()
            expect(getStatCategoryLabel('blocks', Language.EN_US)).toBeDefined()
        })
    })

    // =========================================================================
    // Season Summary Formatting
    // =========================================================================

    describe('formatSeasonHeader', () => {
        it('should format season header', () => {
            const result = formatSeasonHeader('2023-24', Language.EN_US)
            expect(result).toContain('2023-24')
            expect(result).toContain('===')
        })
    })

    describe('formatSeriesResult', () => {
        it('should format a playoff series result', () => {
            const result = formatSeriesResult('Lakers', 'Warriors', 4, 2, Language.EN_US)
            expect(result).toContain('Lakers')
            expect(result).toContain('Warriors')
            expect(result).toContain('4-2')
            expect(result).toContain('def.')
        })

        it('should format a sweep', () => {
            const result = formatSeriesResult('Celtics', 'Nets', 4, 0, Language.EN_US)
            expect(result).toContain('4-0')
        })
    })

    describe('formatChampionshipResult', () => {
        it('should format championship result with MVP', () => {
            const lines = formatChampionshipResult(
                'Lakers',
                'Heat',
                4,
                2,
                'LeBron James',
                Language.EN_US
            )

            expect(lines.length).toBe(3)
            expect(lines[0]).toContain('Lakers')
            expect(lines[0]).toContain('🏆')
            expect(lines[1]).toContain('4-2')
            expect(lines[2]).toContain('LeBron James')
        })
    })

    // =========================================================================
    // Existing Formatter Tests
    // =========================================================================

    describe('formatPlayerBoxScore', () => {
        it('should format player box score line', () => {
            const result = formatPlayerBoxScore(
                1, 'LeBron James', 25.0, 8.0, 7.0, 1.5, 0.5,
                9.0, 18.0, 2.0, 5.0, 5.0, 6.0, Language.EN_US
            )
            expect(result).toContain('1')
            expect(result).toContain('LeBron James')
            expect(result).toContain('25.0')
        })
    })

    describe('formatSimpleRanking', () => {
        it('should format simple ranking line', () => {
            const result = formatSimpleRanking(1, 'Stephen Curry', 45.75, Language.EN_US)
            expect(result).toContain('1')
            expect(result).toContain('Stephen Curry')
            expect(result).toContain('45.75')
        })
    })

    describe('formatMinutes', () => {
        it('should format seconds to MM:SS', () => {
            expect(formatMinutes(600)).toBe('10:00')
            expect(formatMinutes(1830)).toBe('30:30')
            expect(formatMinutes(2880)).toBe('48:00')
        })

        it('should handle single digit seconds', () => {
            expect(formatMinutes(65)).toBe('1:05')
        })
    })

    describe('formatPercentage', () => {
        it('should format percentage with default decimal places', () => {
            expect(formatPercentage(45.5)).toBe('45.5%')
        })

        it('should handle NaN and Infinity', () => {
            expect(formatPercentage(NaN)).toBe('-')
            expect(formatPercentage(Infinity)).toBe('-')
        })

        it('should respect decimal places parameter', () => {
            expect(formatPercentage(45.567, 2)).toBe('45.57%')
        })
    })

    describe('formatShootingStat', () => {
        it('should format made/attempted', () => {
            expect(formatShootingStat(5, 10)).toBe('5/10')
            expect(formatShootingStat(0, 5)).toBe('0/5')
        })
    })

    describe('formatShootingPercentage', () => {
        it('should calculate and format percentage', () => {
            expect(formatShootingPercentage(5, 10)).toBe('50.0%')
        })

        it('should handle zero attempts', () => {
            expect(formatShootingPercentage(0, 0)).toBe('-')
        })
    })

    describe('formatQuarterSummary', () => {
        it('should format quarter-by-quarter summary', () => {
            const lines = formatQuarterSummary(
                'Lakers',
                'Warriors',
                [25, 55, 82, 108],  // Cumulative scores
                [28, 52, 78, 105]
            )

            expect(lines.length).toBe(3)
            expect(lines[0]).toContain('Q1')
            expect(lines[0]).toContain('Q2')
            expect(lines[0]).toContain('Q3')
            expect(lines[0]).toContain('Q4')
            expect(lines[0]).toContain('Total')
            expect(lines[1]).toContain('Lakers')
            expect(lines[1]).toContain('108')  // Final score
            expect(lines[2]).toContain('Warriors')
            expect(lines[2]).toContain('105')
        })

        it('should handle overtime', () => {
            const lines = formatQuarterSummary(
                'Lakers',
                'Warriors',
                [25, 55, 82, 108, 118],  // With OT
                [28, 52, 78, 108, 115]
            )

            expect(lines[0]).toContain('OT1')
            expect(lines[1]).toContain('118')
            expect(lines[2]).toContain('115')
        })
    })
})
