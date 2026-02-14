/**
 * Schedule Loading Integration Test
 * 
 * Tests that verify the actual schedule file loads correctly.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseSchedule, type SeasonSchedule } from '../../src/services/ResourceLoader'

// Helper functions for this test file
function getTeamGames(schedule: SeasonSchedule, teamName: string) {
    return schedule.games.filter(
        game => game.homeTeam === teamName || game.awayTeam === teamName
    )
}

function getScheduleDates(schedule: SeasonSchedule): string[] {
    const dates: string[] = []
    for (const game of schedule.games) {
        if (!dates.includes(game.date)) {
            dates.push(game.date)
        }
    }
    return dates
}

describe('Schedule File Integration', () => {
    // Load the actual schedule file
    const schedulePath = join(__dirname, '../../public/data/schedule/schedule-82games.txt')
    const scheduleText = readFileSync(schedulePath, 'utf-8')
    const schedule = parseSchedule(scheduleText)

    describe('Full Season Validation', () => {
        it('should have exactly 1230 regular season games', () => {
            // 30 teams x 82 games / 2 = 1230 (All-Star not counted)
            expect(schedule.totalGames).toBe(1230)
        })

        it('each team should play exactly 82 games', () => {
            const teams = [
                '76ers', 'Bucks', 'Bulls', 'Cavaliers', 'Celtics', 'Clippers',
                'Grizzlies', 'Hawks', 'Heat', 'Hornets', 'Jazz', 'Kings',
                'Knicks', 'Lakers', 'Magic', 'Mavericks', 'Nets', 'Nuggets',
                'Pacers', 'Pelicans', 'Pistons', 'Raptors', 'Rockets', 'Spurs',
                'Suns', 'Thunder', 'Timberwolves', 'Trail Blazers', 'Warriors', 'Wizards',
            ]

            for (const team of teams) {
                const teamGames = getTeamGames(schedule, team)
                expect(teamGames.length, `${team} should have 82 games`).toBe(82)
            }
        })

        it('should have games across multiple months', () => {
            const dates = getScheduleDates(schedule)

            // Season typically runs October through April
            expect(dates.length).toBeGreaterThan(100) // Many game days

            // Check we have games in different months
            const months = new Set(dates.map(d => d.split('-')[0]))
            expect(months.size).toBeGreaterThan(4) // At least 5 months of games
        })

        it('each team should have roughly equal home and away games', () => {
            const teams = ['Lakers', 'Celtics', 'Warriors', 'Heat']

            for (const team of teams) {
                const teamGames = getTeamGames(schedule, team)
                const homeGames = teamGames.filter(g => g.homeTeam === team).length
                const awayGames = teamGames.filter(g => g.awayTeam === team).length

                // Should be close to 41/41, but may vary slightly
                expect(homeGames).toBeGreaterThanOrEqual(40)
                expect(homeGames).toBeLessThanOrEqual(42)
                expect(awayGames).toBeGreaterThanOrEqual(40)
                expect(awayGames).toBeLessThanOrEqual(42)
                expect(homeGames + awayGames).toBe(82)
            }
        })

        it('should not have any team playing themselves', () => {
            for (const game of schedule.games) {
                // Skip All-Star game marker
                if (game.awayTeam === 'ALL-STAR') continue
                expect(game.homeTeam).not.toBe(game.awayTeam)
            }
        })

        it('should have valid team names for all games', () => {
            const validTeams = new Set([
                '76ers', 'Bucks', 'Bulls', 'Cavaliers', 'Celtics', 'Clippers',
                'Grizzlies', 'Hawks', 'Heat', 'Hornets', 'Jazz', 'Kings',
                'Knicks', 'Lakers', 'Magic', 'Mavericks', 'Nets', 'Nuggets',
                'Pacers', 'Pelicans', 'Pistons', 'Raptors', 'Rockets', 'Spurs',
                'Suns', 'Thunder', 'Timberwolves', 'Trail Blazers', 'Warriors', 'Wizards',
            ])

            for (const game of schedule.games) {
                // Skip All-Star game marker
                if (game.awayTeam === 'ALL-STAR') continue
                expect(validTeams.has(game.homeTeam), `Invalid home team: ${game.homeTeam}`).toBe(true)
                expect(validTeams.has(game.awayTeam), `Invalid away team: ${game.awayTeam}`).toBe(true)
            }
        })
    })
})
