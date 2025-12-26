/**
 * Bilingual Integration Tests
 *
 * Tests that the game engine produces correct localized output
 * in both Chinese and English languages.
 *
 * Tasks: T087, T088
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { Team } from '../../src/models/Team'
import { PlayerCSVRow } from '../../src/models/Player'
import { hostGame } from '../../src/models/Game'
import { Language } from '../../src/models/types'
import { SeededRandom } from '../../src/utils/SeededRandom'
import { setCommentsForTesting } from '../../src/services/CommentLoader'
import { setStringsForTesting, getString } from '../../src/services/LocalizationService'
import { getLocalizedTeamName } from '../../src/utils/Constants'
import * as ResourceLoader from '../../src/services/ResourceLoader'

// Mock the ResourceLoader
vi.mock('../../src/services/ResourceLoader', () => ({
    loadCSV: vi.fn(),
    loadJSON: vi.fn(),
}))

// =============================================================================
// LOAD ACTUAL JSON FILES
// =============================================================================

function loadActualComments() {
    const basePath = resolve(__dirname, '../../public/data/comments')
    const englishComments = JSON.parse(readFileSync(`${basePath}/comments_en_US.json`, 'utf-8'))
    const chineseComments = JSON.parse(readFileSync(`${basePath}/comments_zh_CN.json`, 'utf-8'))
    return { englishComments, chineseComments }
}

function loadActualStrings() {
    const basePath = resolve(__dirname, '../../public/data/localization')
    const englishStrings = JSON.parse(readFileSync(`${basePath}/strings_en_US.json`, 'utf-8'))
    const chineseStrings = JSON.parse(readFileSync(`${basePath}/strings_zh_CN.json`, 'utf-8'))
    return { englishStrings, chineseStrings }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createMockPlayerRow(
    englishName: string,
    chineseName: string,
    position: string,
    rotationType: string,
    rating = '85'
): PlayerCSVRow {
    return {
        name: chineseName,
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
        createMockPlayerRow(`${teamName} PG`, `${teamName}控卫`, 'PG', '1', '88'),
        createMockPlayerRow(`${teamName} SG`, `${teamName}分卫`, 'SG', '1', '87'),
        createMockPlayerRow(`${teamName} SF`, `${teamName}小前`, 'SF', '1', '86'),
        createMockPlayerRow(`${teamName} PF`, `${teamName}大前`, 'PF', '1', '85'),
        createMockPlayerRow(`${teamName} C`, `${teamName}中锋`, 'C', '1', '84'),
    ]

    const bench: PlayerCSVRow[] = [
        createMockPlayerRow(`${teamName} PG B`, `${teamName}替补控卫`, 'PG', '2', '78'),
        createMockPlayerRow(`${teamName} SG B`, `${teamName}替补分卫`, 'SG', '2', '77'),
        createMockPlayerRow(`${teamName} SF B`, `${teamName}替补小前`, 'SF', '2', '76'),
        createMockPlayerRow(`${teamName} PF B`, `${teamName}替补大前`, 'PF', '2', '75'),
        createMockPlayerRow(`${teamName} C B`, `${teamName}替补中锋`, 'C', '2', '74'),
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

async function loadSingleTeam(teamName: string): Promise<Team> {
    vi.mocked(ResourceLoader.loadCSV).mockResolvedValueOnce(createMockRoster(teamName))
    return Team.loadFromCSV(teamName)
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('Bilingual Support (T087, T088)', () => {
    beforeAll(() => {
        // Load actual comment and localization files
        const { englishComments, chineseComments } = loadActualComments()
        const { englishStrings, chineseStrings } = loadActualStrings()

        setCommentsForTesting(chineseComments, englishComments)
        setStringsForTesting(englishStrings, chineseStrings)
    })

    describe('T087: Full game simulation in both languages', () => {
        it('should simulate a game in English and produce English commentary', async () => {
            const [homeTeam, awayTeam] = await loadFreshTeams()
            const random = new SeededRandom(12345)

            const result = hostGame(homeTeam, awayTeam, random, Language.ENGLISH)

            expect(result).toBeDefined()
            expect(result.winner).toBeDefined()
            expect(result.team1Name).toBe('Lakers')
            expect(result.team2Name).toBe('Celtics')

            // Check that playByPlayLog exists
            expect(result.playByPlayLog.length).toBeGreaterThan(0)

            // Verify no Chinese characters in English mode
            const chineseRegex = /[\u4e00-\u9fff]/
            const hasChineseInCommentary = result.playByPlayLog.some((line) => chineseRegex.test(line))
            expect(hasChineseInCommentary).toBe(false)
        })

        it('should simulate a game in Chinese and produce Chinese commentary', async () => {
            const [homeTeam, awayTeam] = await loadFreshTeams()
            const random = new SeededRandom(12345)

            const result = hostGame(homeTeam, awayTeam, random, Language.CHINESE)

            expect(result).toBeDefined()
            expect(result.winner).toBeDefined()

            // Check that playByPlayLog exists
            expect(result.playByPlayLog.length).toBeGreaterThan(0)

            // Chinese commentary should include Chinese characters
            const chineseRegex = /[\u4e00-\u9fff]/
            const hasChineseInCommentary = result.playByPlayLog.some((line) => chineseRegex.test(line))
            expect(hasChineseInCommentary).toBe(true)
        })

        it('should produce valid game results in both languages', async () => {
            const seed = 42

            const [homeTeam1, awayTeam1] = await loadFreshTeams()
            const random1 = new SeededRandom(seed)
            const englishResult = hostGame(homeTeam1, awayTeam1, random1, Language.ENGLISH)

            const [homeTeam2, awayTeam2] = await loadFreshTeams()
            const random2 = new SeededRandom(seed)
            const chineseResult = hostGame(homeTeam2, awayTeam2, random2, Language.CHINESE)

            // Both games should produce valid results
            expect(englishResult.team1Score).toBeGreaterThan(0)
            expect(englishResult.team2Score).toBeGreaterThan(0)
            expect(chineseResult.team1Score).toBeGreaterThan(0)
            expect(chineseResult.team2Score).toBeGreaterThan(0)

            // Both should have a winner
            expect(englishResult.winner).toBeTruthy()
            expect(chineseResult.winner).toBeTruthy()
        })

        it('should display proper localized quarter indicators', async () => {
            const [homeTeam, awayTeam] = await loadFreshTeams()
            const random = new SeededRandom(12345)

            const result = hostGame(homeTeam, awayTeam, random, Language.ENGLISH)

            // Check that quarter end comments exist in commentary
            const hasQuarterIndicator = result.playByPlayLog.some(
                (line) => line.includes('Q1') || line.includes('Q2') || line.includes('Q3') || line.includes('Q4')
            )
            expect(hasQuarterIndicator).toBe(true)
        })

        it('should display proper localized game end comments', async () => {
            const [homeTeam, awayTeam] = await loadFreshTeams()
            const random = new SeededRandom(12345)

            const result = hostGame(homeTeam, awayTeam, random, Language.ENGLISH)

            // Check that game end comments exist
            const hasGameEnd = result.playByPlayLog.some(
                (line) => line.includes('Game over') || line.includes('Final score') || line.includes('final')
            )
            expect(hasGameEnd).toBe(true)
        })
    })

    describe('T088: Localization key verification', () => {
        it('should have all critical English localization keys', () => {
            const criticalKeys = [
                'stat.points.short',
                'stat.points.long',
                'stat.rebounds.short',
                'stat.assists.short',
                'game.away',
                'game.home',
                'conference.east',
                'conference.west',
                'commentary.time.quarter_prefix',
                'commentary.time.quarter_end',
                'commentary.game_end.full_time',
                'commentary.game_end.final_score',
            ]

            for (const key of criticalKeys) {
                const value = getString(key, Language.ENGLISH)
                // If not found, getString returns the key itself
                expect(value).not.toBe(key)
            }
        })

        it('should have all critical Chinese localization keys', () => {
            const criticalKeys = [
                'stat.points.short',
                'stat.points.long',
                'stat.rebounds.short',
                'stat.assists.short',
                'game.away',
                'game.home',
                'conference.east',
                'conference.west',
                'commentary.time.quarter_prefix',
                'commentary.time.quarter_end',
                'commentary.game_end.full_time',
                'commentary.game_end.final_score',
            ]

            for (const key of criticalKeys) {
                const value = getString(key, Language.CHINESE)
                // If not found, getString returns the key itself
                expect(value).not.toBe(key)
            }
        })

        it('should have proper team name translations', () => {
            const teams = [
                'Lakers',
                'Celtics',
                'Warriors',
                'Bulls',
                'Heat',
                'Knicks',
                'Nets',
                'Spurs',
                'Rockets',
                'Mavericks',
            ]

            for (const team of teams) {
                const englishName = getLocalizedTeamName(team, Language.ENGLISH)
                const chineseName = getLocalizedTeamName(team, Language.CHINESE)

                // English name should be the team name
                expect(englishName).toBe(team)

                // Chinese name should be different (Chinese characters)
                const chineseRegex = /[\u4e00-\u9fff]/
                expect(chineseRegex.test(chineseName)).toBe(true)
            }
        })
    })

    describe('Player and Team display names', () => {
        it('should display player names correctly in English', async () => {
            const team = await loadSingleTeam('Lakers')
            const player = team.players[0]

            expect(player).toBeDefined()
            const englishName = player.getDisplayName(Language.ENGLISH)
            expect(englishName).toBe('Lakers PG')
        })

        it('should display player names correctly in Chinese', async () => {
            const team = await loadSingleTeam('Lakers')
            const player = team.players[0]

            expect(player).toBeDefined()
            const chineseName = player.getDisplayName(Language.CHINESE)
            expect(chineseName).toBe('Lakers控卫')
        })

        it('should display team names correctly in both languages', async () => {
            const team = await loadSingleTeam('Lakers')

            const englishTeamName = team.getDisplayName(Language.ENGLISH)
            const chineseTeamName = team.getDisplayName(Language.CHINESE)

            expect(englishTeamName).toBe('Lakers')
            // Chinese name should contain Chinese characters
            const chineseRegex = /[\u4e00-\u9fff]/
            expect(chineseRegex.test(chineseTeamName)).toBe(true)
        })
    })

    describe('Language consistency', () => {
        it('should maintain language consistency throughout a game', async () => {
            const [homeTeam, awayTeam] = await loadFreshTeams()
            const random = new SeededRandom(12345)

            const result = hostGame(homeTeam, awayTeam, random, Language.ENGLISH)

            // All commentary should be in English (no Chinese characters)
            const chineseRegex = /[\u4e00-\u9fff]/
            for (const line of result.playByPlayLog) {
                expect(chineseRegex.test(line)).toBe(false)
            }
        })

        it('should maintain Chinese consistency throughout a game', async () => {
            const [homeTeam, awayTeam] = await loadFreshTeams()
            const random = new SeededRandom(12345)

            const result = hostGame(homeTeam, awayTeam, random, Language.CHINESE)

            // At least some commentary should contain Chinese
            const chineseRegex = /[\u4e00-\u9fff]/
            const hasAnyChineseLines = result.playByPlayLog.some((line) => chineseRegex.test(line))
            expect(hasAnyChineseLines).toBe(true)
        })
    })
})
