/**
 * Game Engine Service
 *
 * High-level service wrapper for game simulation functionality.
 * Provides an API for the UI to interact with the game engine.
 *
 * Task T050: Implement GameEngine service wrapper
 */

import { Team } from '../models/Team'
import { Language } from '../models/types'
import { SeededRandom } from '../utils/SeededRandom'
import { initComments, isInitialized as isCommentsInitialized } from './CommentLoader'
import { initLocalization, isInitialized as isLocalizationInitialized } from './LocalizationService'
import {
    hostGame,
    hostGameByName,
    type GameResult,
} from '../models/Game'
import { SeasonManager, SeasonResult } from '../models/Season'

// =============================================================================
// Initialization State
// =============================================================================

let initialized = false

// =============================================================================
// Service Initialization
// =============================================================================

/**
 * Initialize the game engine service.
 * Must be called before running any simulations.
 */
export async function initGameEngine(): Promise<void> {
    if (initialized) {
        return
    }

    // Initialize localization if needed
    if (!isLocalizationInitialized()) {
        await initLocalization()
    }

    // Initialize comments if needed
    if (!isCommentsInitialized()) {
        await initComments()
    }

    initialized = true
}

/**
 * Check if the game engine is initialized.
 */
export function isGameEngineInitialized(): boolean {
    return initialized
}

// =============================================================================
// Game Simulation
// =============================================================================

/**
 * Simulate a single game between two teams.
 *
 * @param team1 - First team (home)
 * @param team2 - Second team (away)
 * @param options - Game options
 * @returns Game result including scores, box score, and play-by-play
 */
export async function simulateGame(
    team1: Team,
    team2: Team,
    options: Partial<SimulationOptions> = {}
): Promise<GameResult> {
    await initGameEngine()

    const {
        seed = Date.now(),
        language = Language.ENGLISH,
    } = options

    const random = new SeededRandom(BigInt(seed))
    return hostGame(team1, team2, random, language)
}

/**
 * Simulate a single game by team names.
 *
 * @param team1Name - First team name
 * @param team2Name - Second team name
 * @param options - Game options
 * @returns Game result including scores, box score, and play-by-play
 */
export async function simulateGameByName(
    team1Name: string,
    team2Name: string,
    options: Partial<SimulationOptions> = {}
): Promise<GameResult> {
    await initGameEngine()

    const {
        seed = Date.now(),
        language = Language.ENGLISH,
    } = options

    return hostGameByName(team1Name, team2Name, { seed, language })
}

// =============================================================================
// Team Loading
// =============================================================================

/**
 * Load a team from the roster CSV files.
 *
 * @param teamName - Team name (e.g., "Lakers", "Celtics")
 * @returns Loaded team
 */
export async function loadTeam(teamName: string): Promise<Team> {
    return Team.loadFromCSV(teamName)
}

// =============================================================================
// Types
// =============================================================================

/**
 * Options for game simulation.
 */
export interface SimulationOptions {
    /** Random seed for deterministic results */
    seed: number
    /** Language for commentary and display */
    language: Language
}

// =============================================================================
// Re-exports
// =============================================================================

export type {
    GameResult,
    GameOptions,
    BoxScore,
} from '../models/Game'

export { Language } from '../models/types'

// =============================================================================
// Prediction Types
// =============================================================================

/**
 * Result of championship prediction simulation
 */
export interface PredictionResult {
    /** Map of team name to championship count */
    championCounts: Map<string, number>
    /** Total number of simulations run */
    totalSimulations: number
    /** Time elapsed in milliseconds */
    timeElapsed: number
    /** Sorted array of team results for display */
    rankings: PredictionRanking[]
}

/**
 * Individual team's prediction ranking
 */
export interface PredictionRanking {
    rank: number
    teamName: string
    championships: number
    probability: number
}

/**
 * Options for prediction simulation
 */
export interface PredictionOptions {
    /** Starting seed (each simulation uses sequential seeds) */
    baseSeed?: number
    /** Language for output */
    language?: Language
    /** Progress callback for UI updates */
    onProgress?: (completed: number, total: number) => void
}

// =============================================================================
// Championship Prediction Mode (T072-T074)
// =============================================================================

/**
 * Run multiple season simulations for championship prediction.
 * 
 * This is the core prediction mode implementation that runs N complete
 * season simulations and aggregates championship counts.
 *
 * @param count - Number of seasons to simulate
 * @param options - Prediction options
 * @returns Prediction result with championship probabilities
 */
export async function runPrediction(
    count: number,
    options: PredictionOptions = {}
): Promise<PredictionResult> {
    await initGameEngine()

    const {
        baseSeed = Date.now(),
        language = Language.ENGLISH,
        onProgress,
    } = options

    const championCounts = new Map<string, number>()
    const startTime = performance.now()

    // Run N season simulations
    for (let i = 0; i < count; i++) {
        // Each simulation uses a sequential seed for determinism
        const simulationSeed = baseSeed + i

        // Create a fresh season manager for each simulation
        const seasonManager = new SeasonManager({
            seed: simulationSeed,
            silentMode: true, // No commentary for prediction mode
            language,
        })

        // Run the full season including playoffs
        const result: SeasonResult = await seasonManager.hostSeason()

        // Aggregate championship count
        const champion = result.champion
        if (champion) {
            const currentCount = championCounts.get(champion) ?? 0
            championCounts.set(champion, currentCount + 1)
        }

        // Report progress
        if (onProgress) {
            onProgress(i + 1, count)
        }

        // Yield to UI thread periodically to allow progress updates to render
        if ((i + 1) % 1 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0))
        }
    }

    const endTime = performance.now()
    const timeElapsed = endTime - startTime

    // Generate sorted rankings
    const rankings = generateRankings(championCounts, count)

    return {
        championCounts,
        totalSimulations: count,
        timeElapsed,
        rankings,
    }
}

/**
 * Generate sorted rankings from championship counts.
 *
 * @param championCounts - Map of team name to championship count
 * @param totalSimulations - Total number of simulations
 * @returns Sorted array of rankings
 */
function generateRankings(
    championCounts: Map<string, number>,
    totalSimulations: number
): PredictionRanking[] {
    const entries = Array.from(championCounts.entries())

    // Sort by championship count (descending)
    entries.sort((a, b) => b[1] - a[1])

    return entries.map(([teamName, championships], index) => ({
        rank: index + 1,
        teamName,
        championships,
        probability: (championships / totalSimulations) * 100,
    }))
}

/**
 * Format prediction results for display.
 *
 * @param result - Prediction result
 * @returns Formatted string for display
 */
export function formatPredictionResults(result: PredictionResult): string {
    const lines: string[] = []

    lines.push(`Championship Prediction (${result.totalSimulations} simulations)`)
    lines.push('='.repeat(50))

    for (const ranking of result.rankings) {
        lines.push(
            `${ranking.rank}. ${ranking.teamName}: ${ranking.championships} wins (${ranking.probability.toFixed(1)}%)`
        )
    }

    lines.push('')
    lines.push(`Time elapsed: ${(result.timeElapsed / 1000).toFixed(2)} seconds`)

    return lines.join('\n')
}
