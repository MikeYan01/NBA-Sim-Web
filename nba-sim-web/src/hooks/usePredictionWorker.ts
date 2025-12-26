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
} from '../workers/prediction.worker'

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

    const [progress, setProgress] = useState<PredictionProgress | null>(null)
    const [result, setResult] = useState<WorkerPredictionResult | null>(null)
    const [isRunning, setIsRunning] = useState(false)
    const [error, setError] = useState<string | null>(null)

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

    // Initialize worker
    const initializeWorker = useCallback(() => {
        if (workerRef.current) {
            workerRef.current.terminate()
        }

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
            setError(err.message)
            setIsRunning(false)
            if (rejectRef.current) {
                rejectRef.current(new Error(err.message))
                rejectRef.current = null
            }
        }

        workerRef.current = worker
        return worker
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

                // Initialize or reuse worker
                const worker = initializeWorker()

                // Send start message
                const message: WorkerInMessage = {
                    type: 'START_PREDICTION',
                    count: options.count,
                    baseSeed: options.baseSeed ?? Date.now(),
                    language: options.language ?? Language.ENGLISH,
                }

                worker.postMessage(message)
            })
        },
        [initializeWorker]
    )

    // Cancel prediction
    const cancelPrediction = useCallback(() => {
        if (workerRef.current && isRunning) {
            const message: WorkerInMessage = { type: 'CANCEL' }
            workerRef.current.postMessage(message)
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
