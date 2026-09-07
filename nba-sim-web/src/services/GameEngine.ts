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
import { initComments, isInitialized as isCommentsInitialized } from './CommentLoader'
import { initLocalization, isInitialized as isLocalizationInitialized } from './LocalizationService'
import { runSeasonFast } from '../models/Season'

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
 * Preloads all teams to avoid delays during simulation.
 */
export async function initGameEngine(): Promise<void> {
    if (initialized) {
        return
    }

    // Initialize in parallel for better performance
    const initPromises: Promise<void>[] = []

    // Initialize localization if needed
    if (!isLocalizationInitialized()) {
        initPromises.push(initLocalization())
    }

    // Initialize comments if needed
    if (!isCommentsInitialized()) {
        initPromises.push(initComments())
    }

    // Preload all teams if not cached
    if (!Team.areTeamsCached()) {
        initPromises.push(Team.preloadAllTeams())
    }

    await Promise.all(initPromises)

    initialized = true
}

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
 * Uses fast simulation mode that skips commentary, box scores, and stats tracking.
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
        onProgress,
    } = options

    const championCounts = new Map<string, number>()
    const startTime = performance.now()

    // Run N season simulations using fast mode
    for (let i = 0; i < count; i++) {
        // Each simulation uses a sequential seed for determinism
        const simulationSeed = baseSeed + i

        // Run fast season simulation (no commentary, no stats tracking)
        const champion = await runSeasonFast({ seed: simulationSeed })

        // Aggregate championship count
        if (champion) {
            const currentCount = championCounts.get(champion) ?? 0
            championCounts.set(champion, currentCount + 1)
        }

        // Report progress
        if (onProgress) {
            onProgress(i + 1, count)
        }

        // Yield to UI thread to allow progress updates to render
        await new Promise(resolve => setTimeout(resolve, 0))
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
