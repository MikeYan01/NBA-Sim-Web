/**
 * Resource Loader Service
 *
 * Handles loading of JSON, CSV, and text files from the public directory.
 * Provides caching to avoid repeated network requests.
 */

import Papa from 'papaparse'

// Cache for loaded resources
const resourceCache = new Map<string, unknown>()

/**
 * Load a JSON file from the public directory.
 * @param path Path relative to public directory (e.g., '/data/localization/strings_en_US.json')
 * @returns Parsed JSON object
 */
export async function loadJSON<T>(path: string): Promise<T> {
    const cacheKey = `json:${path}`

    if (resourceCache.has(cacheKey)) {
        return resourceCache.get(cacheKey) as T
    }

    const response = await fetch(path)
    if (!response.ok) {
        throw new Error(`Failed to load JSON file: ${path} (${response.status})`)
    }

    const data = await response.json()
    resourceCache.set(cacheKey, data)

    return data as T
}

/**
 * Load a CSV file from the public directory.
 * @param path Path relative to public directory (e.g., '/data/rosters/Lakers.csv')
 * @returns Array of parsed CSV rows
 */
export async function loadCSV<T>(path: string): Promise<T[]> {
    const cacheKey = `csv:${path}`

    if (resourceCache.has(cacheKey)) {
        return resourceCache.get(cacheKey) as T[]
    }

    const response = await fetch(path)
    if (!response.ok) {
        throw new Error(`Failed to load CSV file: ${path} (${response.status})`)
    }

    const text = await response.text()

    return new Promise((resolve, reject) => {
        Papa.parse<T>(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false, // Keep as strings for consistent parsing
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.warn(`CSV parsing warnings for ${path}:`, results.errors)
                }
                resourceCache.set(cacheKey, results.data)
                resolve(results.data)
            },
            error: (error: Error) => {
                reject(new Error(`Failed to parse CSV file: ${path} - ${error.message}`))
            },
        })
    })
}

/**
 * Load a text file from the public directory.
 * @param path Path relative to public directory
 * @returns File contents as string
 */
export async function loadText(path: string): Promise<string> {
    const cacheKey = `text:${path}`

    if (resourceCache.has(cacheKey)) {
        return resourceCache.get(cacheKey) as string
    }

    const response = await fetch(path)
    if (!response.ok) {
        throw new Error(`Failed to load text file: ${path} (${response.status})`)
    }

    const text = await response.text()
    resourceCache.set(cacheKey, text)

    return text
}

// =============================================================================
// SCHEDULE PARSING (T053)
// =============================================================================

/**
 * Represents a single game in the schedule.
 */
export interface ScheduleGame {
    date: string       // MM-DD format
    homeTeam: string   // Team name (e.g., "Lakers")
    awayTeam: string   // Team name (e.g., "Celtics")
}

/**
 * Represents the full season schedule.
 */
export interface SeasonSchedule {
    games: ScheduleGame[]
    totalGames: number
    startDate: string
    endDate: string
}

/**
 * Parse the schedule file format.
 * 
 * Format:
 * - Date line: MM-DD (e.g., "10-21")
 * - Game lines: "AwayTeam HomeTeam" (e.g., "Rockets Thunder")
 * - Empty lines separate different dates
 * 
 * Note: First team is AWAY, second team is HOME
 * 
 * @param text Raw schedule file content
 * @returns Parsed schedule with all games
 */
export function parseSchedule(text: string): SeasonSchedule {
    const lines = text.split('\n').map(line => line.trim())
    const games: ScheduleGame[] = []
    let currentDate = ''
    let startDate = ''
    let endDate = ''

    for (const line of lines) {
        if (!line) {
            continue // Skip empty lines
        }

        // Check if this is a date line (MM-DD format)
        if (/^\d{1,2}-\d{1,2}$/.test(line)) {
            currentDate = line
            if (!startDate) {
                startDate = line
            }
            endDate = line
            continue
        }

        // Otherwise it's a game line: "AwayTeam HomeTeam"
        const parts = line.split(' ')
        if (parts.length >= 2) {
            // Handle team names with spaces (e.g., "Trail Blazers")
            // The format is: AwayTeam HomeTeam, but some teams have spaces
            // We need to identify team names properly
            const teamName = findTeamSplit(line)
            if (teamName) {
                games.push({
                    date: currentDate,
                    awayTeam: teamName.away,
                    homeTeam: teamName.home,
                })
            }
        }
    }

    return {
        games,
        totalGames: games.length,
        startDate,
        endDate,
    }
}

/**
 * NBA team names for matching in schedule.
 */
const NBA_TEAM_NAMES = [
    '76ers', 'Bucks', 'Bulls', 'Cavaliers', 'Celtics', 'Clippers',
    'Grizzlies', 'Hawks', 'Heat', 'Hornets', 'Jazz', 'Kings',
    'Knicks', 'Lakers', 'Magic', 'Mavericks', 'Nets', 'Nuggets',
    'Pacers', 'Pelicans', 'Pistons', 'Raptors', 'Rockets', 'Spurs',
    'Suns', 'Thunder', 'Timberwolves', 'Trail Blazers', 'Warriors', 'Wizards',
]

/**
 * Find the split point between two team names in a game line.
 * Handles teams with spaces like "Trail Blazers".
 */
function findTeamSplit(line: string): { away: string; home: string } | null {
    // Try each team name as the away team
    for (const awayTeam of NBA_TEAM_NAMES) {
        if (line.startsWith(awayTeam + ' ')) {
            const remainder = line.substring(awayTeam.length + 1)
            // Check if remainder is a valid team name
            if (NBA_TEAM_NAMES.includes(remainder)) {
                return { away: awayTeam, home: remainder }
            }
        }
    }
    return null
}

import { SCHEDULE_PATH } from '../utils/Constants'

/**
 * Load and parse the season schedule.
 * @param path Path to schedule file
 * @returns Parsed season schedule
 */
export async function loadSchedule(
    path: string = SCHEDULE_PATH
): Promise<SeasonSchedule> {
    const text = await loadText(path)
    return parseSchedule(text)
}
