/**
 * Prediction Worker
 *
 * Web Worker for running championship prediction simulations in a background thread.
 * This prevents the UI from freezing during long-running prediction simulations.
 *
 * Task T075: Add Web Worker wrapper for non-blocking prediction
 *
 * Usage:
 * ```typescript
 * const worker = new Worker(new URL('./workers/prediction.worker.ts', import.meta.url), { type: 'module' })
 * worker.postMessage({ type: 'START_PREDICTION', count: 100, baseSeed: 12345 })
 * worker.onmessage = (e) => { ... handle progress/results ... }
 * ```
 */

import { SeasonManager, SeasonResult } from '../models/Season'
import { Team } from '../models/Team'
import { initLocalization } from '../services/LocalizationService'
import { initComments } from '../services/CommentLoader'
import { Language } from '../models/types'

// =============================================================================
// Message Types
// =============================================================================

/**
 * Messages sent from main thread to worker
 */
export interface WorkerInMessage {
    type: 'START_PREDICTION' | 'CANCEL'
    count?: number
    baseSeed?: number
    language?: Language
}

/**
 * Messages sent from worker to main thread
 */
export interface WorkerOutMessage {
    type: 'PROGRESS' | 'COMPLETE' | 'ERROR' | 'INITIALIZED'
    progress?: {
        completed: number
        total: number
        currentChampion?: string
    }
    result?: WorkerPredictionResult
    error?: string
}

/**
 * Prediction result format for worker
 */
export interface WorkerPredictionResult {
    championCounts: Record<string, number>
    totalSimulations: number
    timeElapsed: number
    rankings: WorkerPredictionRanking[]
}

/**
 * Individual team ranking
 */
export interface WorkerPredictionRanking {
    rank: number
    teamName: string
    championships: number
    probability: number
}

// =============================================================================
// Worker State
// =============================================================================

let isRunning = false
let shouldCancel = false

// =============================================================================
// Worker Implementation
// =============================================================================

/**
 * Initialize the worker (load resources)
 * Loads localization, comments, and preloads all teams in parallel.
 */
async function initialize(): Promise<void> {
    await Promise.all([
        initLocalization(),
        initComments(),
        Team.preloadAllTeams(),
    ])
}

/**
 * Run the prediction simulation
 */
async function runPrediction(
    count: number,
    baseSeed: number,
    language: Language
): Promise<WorkerPredictionResult> {
    const championCounts = new Map<string, number>()
    const startTime = performance.now()

    isRunning = true
    shouldCancel = false

    for (let i = 0; i < count; i++) {
        // Check for cancellation
        if (shouldCancel) {
            break
        }

        // Each simulation uses a sequential seed
        const simulationSeed = baseSeed + i

        // Create fresh season manager
        const seasonManager = new SeasonManager({
            seed: simulationSeed,
            silentMode: true,
            language,
        })

        // Run full season
        const result: SeasonResult = await seasonManager.hostSeason()

        // Aggregate championship count
        const champion = result.champion
        if (champion) {
            const currentCount = championCounts.get(champion) ?? 0
            championCounts.set(champion, currentCount + 1)
        }

        // Send progress update
        const progressMessage: WorkerOutMessage = {
            type: 'PROGRESS',
            progress: {
                completed: i + 1,
                total: count,
                currentChampion: champion,
            },
        }
        self.postMessage(progressMessage)
    }

    isRunning = false

    const endTime = performance.now()
    const timeElapsed = endTime - startTime

    // Convert Map to Record for serialization
    const countsRecord: Record<string, number> = {}
    for (const [team, count] of championCounts) {
        countsRecord[team] = count
    }

    // Generate rankings
    const rankings = generateRankings(championCounts, count)

    return {
        championCounts: countsRecord,
        totalSimulations: count,
        timeElapsed,
        rankings,
    }
}

/**
 * Generate sorted rankings from championship counts
 */
function generateRankings(
    championCounts: Map<string, number>,
    totalSimulations: number
): WorkerPredictionRanking[] {
    const entries = Array.from(championCounts.entries())
    entries.sort((a, b) => b[1] - a[1])

    return entries.map(([teamName, championships], index) => ({
        rank: index + 1,
        teamName,
        championships,
        probability: (championships / totalSimulations) * 100,
    }))
}

// =============================================================================
// Message Handler
// =============================================================================

self.onmessage = async (event: MessageEvent<WorkerInMessage>) => {
    const { type, count, baseSeed, language } = event.data

    switch (type) {
        case 'START_PREDICTION':
            try {
                // Initialize resources first
                await initialize()

                const initMessage: WorkerOutMessage = { type: 'INITIALIZED' }
                self.postMessage(initMessage)

                // Run prediction
                const result = await runPrediction(
                    count ?? 100,
                    baseSeed ?? Date.now(),
                    language ?? Language.ENGLISH
                )

                const completeMessage: WorkerOutMessage = {
                    type: 'COMPLETE',
                    result,
                }
                self.postMessage(completeMessage)
            } catch (error) {
                const errorMessage: WorkerOutMessage = {
                    type: 'ERROR',
                    error: error instanceof Error ? error.message : 'Unknown error',
                }
                self.postMessage(errorMessage)
            }
            break

        case 'CANCEL':
            if (isRunning) {
                shouldCancel = true
            }
            break
    }
}
