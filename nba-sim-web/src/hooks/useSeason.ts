import { useCallback, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { SeasonManager, SeasonResult, SeasonOptions } from '../models/Season'
import { SeasonStats } from '../models/SeasonStats'
import { useLocalization } from './useLocalization'
import { Team } from '../models/Team'
import { initLocalization } from '../services/LocalizationService'
import { initComments } from '../services/CommentLoader'
import type { SeasonWorkerInMessage, SeasonWorkerOutMessage } from '../workers/season.worker'

/**
 * Check if we're in a browser environment with Worker support.
 * iPhone Safari has issues with module workers even on latest iOS.
 */
function hasWorkerSupport(): boolean {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
        return false
    }

    // iPhone Safari has issues with module workers - use main thread
    // iPad and Mac are fine
    const isIPhone = /iPhone/.test(navigator.userAgent)
    if (isIPhone) {
        return false
    }

    return true
}

export function useSeason() {
    const { currentSeason, setSeason, isLoading, setIsLoading, seasonProgress, setSeasonProgress } = useGameStore()
    const { language } = useLocalization()
    const workerRef = useRef<Worker | null>(null)

    /**
     * Run season simulation on main thread (fallback for iOS and unsupported browsers)
     */
    const runOnMainThread = useCallback(async (seed?: number) => {
        try {
            // Initialize resources
            await Promise.all([
                initLocalization(),
                initComments(),
                Team.preloadAllTeams(),
            ])

            // Update progress to show we're past initialization
            setSeasonProgress({
                gamesCompleted: 0,
                totalGames: 1230,
                phase: 'regular',
            })

            const options: SeasonOptions = {
                seed,
                language,
                silentMode: true,
                onProgress: (gamesCompleted: number, totalGames: number) => {
                    setSeasonProgress({
                        gamesCompleted,
                        totalGames,
                        phase: 'regular',
                    })
                },
                onPlayoffProgress: (gamesCompleted: number, totalGames: number, phase: 'playin' | 'playoffs') => {
                    const regularSeasonGames = 1230
                    setSeasonProgress({
                        gamesCompleted: regularSeasonGames + gamesCompleted,
                        totalGames,
                        phase,
                    })
                },
            }

            const manager = new SeasonManager(options)
            const result = await manager.hostSeason()

            setSeason(result)
            setSeasonProgress(null)
            setIsLoading(false)
        } catch (error) {
            console.error('Main thread season simulation failed:', error)
            setSeasonProgress(null)
            setIsLoading(false)
        }
    }, [language, setSeason, setSeasonProgress, setIsLoading])

    const simulateSeason = useCallback(async (seed?: number) => {
        setIsLoading(true)
        // Show initializing phase immediately
        setSeasonProgress({
            gamesCompleted: 0,
            totalGames: 0,
            phase: 'initializing',
        })

        // Terminate any existing worker
        if (workerRef.current) {
            workerRef.current.terminate()
            workerRef.current = null
        }

        // Check basic Worker support
        if (!hasWorkerSupport()) {
            console.log('Workers not supported, running on main thread')
            setTimeout(() => runOnMainThread(seed), 50)
            return
        }

        // Try to create module worker - will fallback if it fails
        let worker: Worker
        try {
            worker = new Worker(
                new URL('../workers/season.worker.ts', import.meta.url),
                { type: 'module' }
            )
        } catch (error) {
            console.warn('Failed to create worker, falling back to main thread:', error)
            setTimeout(() => runOnMainThread(seed), 50)
            return
        }

        workerRef.current = worker

        worker.onmessage = (event: MessageEvent<SeasonWorkerOutMessage>) => {
            const { type, result, error, progress } = event.data

            switch (type) {
                case 'INITIALIZED':
                    // Worker finished loading resources, season will start
                    setSeasonProgress({
                        gamesCompleted: 0,
                        totalGames: 1230,
                        phase: 'regular',
                    })
                    break

                case 'PROGRESS':
                    if (progress) {
                        setSeasonProgress(progress)
                    }
                    break

                case 'COMPLETE':
                    if (result) {
                        // Rebuild SeasonStats instance from serialized data
                        const seasonResult: SeasonResult = {
                            regularSeason: {
                                standings: result.regularSeason.standings,
                                stats: SeasonStats.fromJSON(result.regularSeason.stats),
                                games: result.regularSeason.games,
                                gamesPlayed: result.regularSeason.gamesPlayed,
                                recaps: result.regularSeason.recaps,
                            },
                            playoffs: result.playoffs,
                            champion: result.champion,
                            finalsMVP: result.finalsMVP,
                        }
                        setSeason(seasonResult)
                    }
                    setSeasonProgress(null)
                    setIsLoading(false)
                    worker.terminate()
                    workerRef.current = null
                    break

                case 'ERROR':
                    console.error('Season simulation failed:', error)
                    // Fallback to main thread on worker error
                    worker.terminate()
                    workerRef.current = null
                    console.log('Retrying on main thread after worker error')
                    runOnMainThread(seed)
                    break
            }
        }

        worker.onerror = (error) => {
            console.error('Worker error:', error)
            worker.terminate()
            workerRef.current = null
            // Fallback to main thread on worker error
            console.log('Retrying on main thread after worker error')
            runOnMainThread(seed)
        }

        // Start the simulation
        const message: SeasonWorkerInMessage = {
            type: 'START_SEASON',
            seed,
            language,
        }
        worker.postMessage(message)
    }, [language, setIsLoading, setSeason, setSeasonProgress, runOnMainThread])

    return { currentSeason, simulateSeason, isLoading, seasonProgress }
}
