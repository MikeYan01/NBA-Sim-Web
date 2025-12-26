import { describe, it, expect, beforeAll, vi } from 'vitest'
import { Team } from '../../src/models/Team'
import { ALL_TEAMS_EN } from '../../src/utils/Constants'
import { PlayerCSVRow } from '../../src/models/Player'
import * as ResourceLoader from '../../src/services/ResourceLoader'

// Mock CSV data for testing - we'll just verify the loading mechanism works
vi.mock('../../src/services/ResourceLoader', () => ({
    loadCSV: vi.fn(),
}))

describe('Roster Loading Integration', () => {
    // Create a mock roster that has all 25 attributes
    const createMockRoster = (teamName: string): PlayerCSVRow[] => [
        {
            name: '测试球员1',
            englishName: 'Test Player 1',
            position: 'PG',
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
            astRating: '88',
            stlRating: '72',
            blkRating: '45',
            layupRating: '82',
            standDunk: '55',
            drivingDunk: '65',
            athleticism: '78',
            durability: '85',
            offConst: '80',
            defConst: '70',
            drawFoul: '75',
        },
        {
            name: '测试球员2',
            englishName: 'Test Player 2',
            position: 'SG',
            playerType: '4',
            rotationType: '1',
            rating: '82',
            insideRating: '75',
            midRating: '80',
            threeRating: '85',
            freeThrowPercent: '88',
            interiorDefense: '55',
            perimeterDefense: '78',
            orbRating: '35',
            drbRating: '50',
            astRating: '70',
            stlRating: '68',
            blkRating: '40',
            layupRating: '78',
            standDunk: '50',
            drivingDunk: '60',
            athleticism: '75',
            durability: '80',
            offConst: '75',
            defConst: '72',
            drawFoul: '70',
        },
        {
            name: '测试球员3',
            englishName: 'Test Player 3',
            position: 'SF',
            playerType: '1',
            rotationType: '1',
            rating: '90',
            insideRating: '88',
            midRating: '82',
            threeRating: '75',
            freeThrowPercent: '72',
            interiorDefense: '70',
            perimeterDefense: '72',
            orbRating: '45',
            drbRating: '65',
            astRating: '75',
            stlRating: '60',
            blkRating: '55',
            layupRating: '90',
            standDunk: '80',
            drivingDunk: '85',
            athleticism: '82',
            durability: '88',
            offConst: '85',
            defConst: '75',
            drawFoul: '80',
        },
        {
            name: '测试球员4',
            englishName: 'Test Player 4',
            position: 'PF',
            playerType: '2',
            rotationType: '1',
            rating: '83',
            insideRating: '85',
            midRating: '70',
            threeRating: '65',
            freeThrowPercent: '70',
            interiorDefense: '78',
            perimeterDefense: '60',
            orbRating: '75',
            drbRating: '80',
            astRating: '50',
            stlRating: '55',
            blkRating: '72',
            layupRating: '80',
            standDunk: '82',
            drivingDunk: '80',
            athleticism: '75',
            durability: '82',
            offConst: '72',
            defConst: '78',
            drawFoul: '55',
        },
        {
            name: '测试球员5',
            englishName: 'Test Player 5',
            position: 'C',
            playerType: '2',
            rotationType: '1',
            rating: '80',
            insideRating: '88',
            midRating: '60',
            threeRating: '45',
            freeThrowPercent: '65',
            interiorDefense: '82',
            perimeterDefense: '50',
            orbRating: '80',
            drbRating: '85',
            astRating: '45',
            stlRating: '50',
            blkRating: '80',
            layupRating: '75',
            standDunk: '85',
            drivingDunk: '75',
            athleticism: '70',
            durability: '85',
            offConst: '68',
            defConst: '80',
            drawFoul: '50',
        },
    ]

    beforeAll(() => {
        vi.mocked(ResourceLoader.loadCSV).mockImplementation(async (path: string) => {
            // Extract team name from path
            const match = path.match(/\/data\/rosters\/(.+)\.csv/)
            const teamName = match ? match[1] : 'Unknown'
            return createMockRoster(teamName)
        })
    })

    describe('All 30 NBA Teams + CHEAT roster', () => {
        it('should have correct team list', () => {
            // Verify we have all 30 teams
            expect(ALL_TEAMS_EN.length).toBe(30)

            // Check both conferences
            const eastTeams = [
                '76ers',
                'Bulls',
                'Celtics',
                'Wizards',
                'Hornets',
                'Pacers',
                'Pistons',
                'Heat',
                'Raptors',
                'Nets',
                'Knicks',
                'Hawks',
                'Bucks',
                'Cavaliers',
                'Magic',
            ]
            const westTeams = [
                'Warriors',
                'Kings',
                'Suns',
                'Trail Blazers',
                'Clippers',
                'Nuggets',
                'Grizzlies',
                'Lakers',
                'Rockets',
                'Mavericks',
                'Timberwolves',
                'Jazz',
                'Thunder',
                'Spurs',
                'Pelicans',
            ]

            for (const team of eastTeams) {
                expect(ALL_TEAMS_EN).toContain(team)
            }
            for (const team of westTeams) {
                expect(ALL_TEAMS_EN).toContain(team)
            }
        })

        it('should load any team with 5 starters', async () => {
            const team = await Team.loadFromCSV('Lakers')

            // Verify starters at all 5 positions
            expect(team.starters.size).toBe(5)
            expect(team.starters.has('PG')).toBe(true)
            expect(team.starters.has('SG')).toBe(true)
            expect(team.starters.has('SF')).toBe(true)
            expect(team.starters.has('PF')).toBe(true)
            expect(team.starters.has('C')).toBe(true)
        })

        it('should parse all 25 player attributes correctly', async () => {
            const team = await Team.loadFromCSV('Celtics')
            const player = team.starters.get('PG')!

            // Verify all 25 attributes exist and are parsed
            expect(player.name).toBeDefined()
            expect(player.englishName).toBeDefined()
            expect(player.position).toBeDefined()
            expect(player.playerType).toBeDefined()
            expect(player.rotationType).toBeDefined()
            expect(typeof player.rating).toBe('number')
            expect(typeof player.insideRating).toBe('number')
            expect(typeof player.midRating).toBe('number')
            expect(typeof player.threeRating).toBe('number')
            expect(typeof player.freeThrowPercent).toBe('number')
            expect(typeof player.interiorDefense).toBe('number')
            expect(typeof player.perimeterDefense).toBe('number')
            expect(typeof player.orbRating).toBe('number')
            expect(typeof player.drbRating).toBe('number')
            expect(typeof player.astRating).toBe('number')
            expect(typeof player.stlRating).toBe('number')
            expect(typeof player.blkRating).toBe('number')
            expect(typeof player.layupRating).toBe('number')
            expect(typeof player.standDunk).toBe('number')
            expect(typeof player.drivingDunk).toBe('number')
            expect(typeof player.athleticism).toBe('number')
            expect(typeof player.durability).toBe('number')
            expect(typeof player.offConst).toBe('number')
            expect(typeof player.defConst).toBe('number')
            expect(typeof player.drawFoul).toBe('number')
        })

        it('should correctly calculate derived attributes', async () => {
            const team = await Team.loadFromCSV('Warriors')
            const player = team.starters.get('SF')! // Rating 90, should be a star

            expect(player.isStar).toBe(true)
            expect(player.dunkerType).toBeDefined()
        })

        // Test that all teams can be loaded (mocked)
        for (const teamName of ALL_TEAMS_EN) {
            it(`should load ${teamName} roster`, async () => {
                const team = await Team.loadFromCSV(teamName)
                expect(team.name).toBe(teamName)
                expect(team.players.length).toBeGreaterThan(0)
                expect(team.starters.size).toBe(5)
            })
        }
    })
})
