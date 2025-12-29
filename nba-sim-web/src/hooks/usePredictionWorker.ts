/**
 * Prediction Worker Hook
 *
 * React hook for running championship predictions using a Web Worker.
 * Provides a clean API for starting, canceling, and tracking prediction progress.
 *
 * Task T075: Web Worker wrapper for non-blocking prediction
 *
 * Usage:
 * ```typescript
 * const { startPrediction, cancelPrediction, progress, result, isRunning, error } = usePredictionWorker()
 * await startPrediction({ count: 100, baseSeed: 12345 })
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Language } from '../models/types'
import type {
    WorkerInMessage,
    WorkerOutMessage,
    WorkerPredictionResult,
    WorkerPredictionRanking,
} from '../workers/prediction.worker'
import { SeasonManager } from '../models/Season'
import type { SeasonResult } from '../models/Season'
import { Team } from '../models/Team'
import { initLocalization } from '../services/LocalizationService'
import { initComments } from '../services/CommentLoader'

// =============================================================================
// Worker Support Detection
// =============================================================================

/**
 * Check if we're in a browser environment with Worker support.
 * Actual module worker compatibility is tested by attempting to create one.
 */
function hasWorkerSupport(): boolean {
    return typeof window !== 'undefined' && typeof Worker !== 'undefined'
}

// =============================================================================
// Types
// =============================================================================

export interface PredictionProgress {
    completed: number
    total: number
    percentage: number
    currentChampion?: string
}

export interface PredictionOptions {
    count: number
    baseSeed?: number
    language?: Language
}

export interface UsePredictionWorkerResult {
    /** Start a new prediction simulation */
    startPrediction: (options: PredictionOptions) => Promise<WorkerPredictionResult>
    /** Cancel the current prediction */
    cancelPrediction: () => void
    /** Current progress */
    progress: PredictionProgress | null
    /** Final result (available after completion) */
    result: WorkerPredictionResult | null
    /** Whether prediction is currently running */
    isRunning: boolean
    /** Error message if prediction failed */
    error: string | null
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function usePredictionWorker(): UsePredictionWorkerResult {
    const workerRef = useRef<Worker | null>(null)
    const resolveRef = useRef<((result: WorkerPredictionResult) => void) | null>(null)
    const rejectRef = useRef<((error: Error) => void) | null>(null)
    const cancelledRef = useRef(false)

    const [progress, setProgress] = useState<PredictionProgress | null>(null)
    const [result, setResult] = useState<WorkerPredictionResult | null>(null)
    const [isRunning, setIsRunning] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Run prediction on main thread (fallback for iOS)
    const runOnMainThread = useCallback(async (options: PredictionOptions): Promise<WorkerPredictionResult> => {
        const { count, baseSeed = Date.now(), language = Language.ENGLISH } = options

        // Initialize resources
        await Promise.all([
            initLocalization(),
            initComments(),
            Team.preloadAllTeams(),
        ])

        const championCounts = new Map<string, number>()
        const startTime = performance.now()
        cancelledRef.current = false

        // Helper to yield to main thread
        const yieldToMain = () => new Promise<void>(resolve => setTimeout(resolve, 0))

        for (let i = 0; i < count; i++) {
            // Check for cancellation
            if (cancelledRef.current) {
                break
            }

            // Yield every simulation to keep UI responsive
            await yieldToMain()

            const simulationSeed = baseSeed + i

            const seasonManager = new SeasonManager({
                seed: simulationSeed,
                silentMode: true,
                language,
            })

            const seasonResult: SeasonResult = await seasonManager.hostSeason()
            const champion = seasonResult.champion

            if (champion) {
                const currentCount = championCounts.get(champion) ?? 0
                championCounts.set(champion, currentCount + 1)
            }

            // Update progress
            setProgress({
                completed: i + 1,
                total: count,
                percentage: ((i + 1) / count) * 100,
                currentChampion: champion,
            })
        }

        const endTime = performance.now()
        const timeElapsed = endTime - startTime

        // Convert Map to Record
        const countsRecord: Record<string, number> = {}
        for (const [team, teamCount] of championCounts) {
            countsRecord[team] = teamCount
        }

        // Generate rankings
        const entries = Array.from(championCounts.entries())
        entries.sort((a, b) => b[1] - a[1])
        const rankings: WorkerPredictionRanking[] = entries.map(([teamName, championships], index) => ({
            rank: index + 1,
            teamName,
            championships,
            probability: (championships / count) * 100,
        }))

        return {
            championCounts: countsRecord,
            totalSimulations: count,
            timeElapsed,
            rankings,
        }
    }, [])

    // Create worker on mount
    useEffect(() => {
        return () => {
            // Cleanup worker on unmount
            if (workerRef.current) {
                workerRef.current.terminate()
                workerRef.current = null
            }
        }
    }, [])

    // Initialize worker (try to create, fallback if fails)
    const initializeWorker = useCallback((): Worker | null => {
        // Check basic Worker support
        if (!hasWorkerSupport()) {
            return null
        }

        if (workerRef.current) {
            workerRef.current.terminate()
        }

        try {
            const worker = new Worker(
                new URL('../workers/prediction.worker.ts', import.meta.url),
                { type: 'module' }
            )

            worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
                const message = event.data

                switch (message.type) {
                    case 'INITIALIZED':
                        // Worker is ready
                        break

                    case 'PROGRESS':
                        if (message.progress) {
                            setProgress({
                                completed: message.progress.completed,
                                total: message.progress.total,
                                percentage: (message.progress.completed / message.progress.total) * 100,
                                currentChampion: message.progress.currentChampion,
                            })
                        }
                        break

                    case 'COMPLETE':
                        if (message.result) {
                            setResult(message.result)
                            setIsRunning(false)
                            if (resolveRef.current) {
                                resolveRef.current(message.result)
                                resolveRef.current = null
                            }
                        }
                        break

                    case 'ERROR':
                        setError(message.error ?? 'Unknown error')
                        setIsRunning(false)
                        if (rejectRef.current) {
                            rejectRef.current(new Error(message.error))
                            rejectRef.current = null
                        }
                        break
                }
            }

            worker.onerror = (err) => {
                console.warn('Worker error, will fallback to main thread:', err.message)
                setError(err.message)
                setIsRunning(false)
                if (rejectRef.current) {
                    rejectRef.current(new Error(err.message))
                    rejectRef.current = null
                }
            }

            workerRef.current = worker
            return worker
        } catch (err) {
            console.warn('Failed to create worker, will use main thread:', err)
            return null
        }
    }, [])

    // Start prediction
    const startPrediction = useCallback(
        (options: PredictionOptions): Promise<WorkerPredictionResult> => {
            return new Promise((resolve, reject) => {
                // Reset state
                setProgress(null)
                setResult(null)
                setError(null)
                setIsRunning(true)

                // Store resolve/reject for later
                resolveRef.current = resolve
                rejectRef.current = reject

                // Try to initialize worker
                const worker = initializeWorker()

                // If worker creation failed, use main thread fallback
                if (!worker) {
                    console.log('Using main thread fallback for prediction')
                    // Run async to not block
                    setTimeout(async () => {
                        try {
                            const mainThreadResult = await runOnMainThread(options)
                            setResult(mainThreadResult)
                            setIsRunning(false)
                            if (resolveRef.current) {
                                resolveRef.current(mainThreadResult)
                                resolveRef.current = null
                            }
                        } catch (err) {
                            const errorMsg = err instanceof Error ? err.message : 'Unknown error'
                            setError(errorMsg)
                            setIsRunning(false)
                            if (rejectRef.current) {
                                rejectRef.current(err instanceof Error ? err : new Error(errorMsg))
                                rejectRef.current = null
                            }
                        }
                    }, 0)
                    return
                }

                // Send start message to worker
                const message: WorkerInMessage = {
                    type: 'START_PREDICTION',
                    count: options.count,
                    baseSeed: options.baseSeed ?? Date.now(),
                    language: options.language ?? Language.ENGLISH,
                }

                worker.postMessage(message)
            })
        },
        [initializeWorker, runOnMainThread]
    )

    // Cancel prediction
    const cancelPrediction = useCallback(() => {
        if (isRunning) {
            // Cancel main thread fallback
            cancelledRef.current = true

            // Cancel worker if running
            if (workerRef.current) {
                const message: WorkerInMessage = { type: 'CANCEL' }
                workerRef.current.postMessage(message)
            }

            setIsRunning(false)
            if (rejectRef.current) {
                rejectRef.current(new Error('Prediction cancelled'))
                rejectRef.current = null
            }
        }
    }, [isRunning])

    return {
        startPrediction,
        cancelPrediction,
        progress,
        result,
        isRunning,
        error,
    }
}

export type { WorkerPredictionResult, WorkerPredictionRanking } from '../workers/prediction.worker'
