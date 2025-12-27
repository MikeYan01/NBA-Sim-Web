import { useCallback, useRef } from 'react'
import { useGameStore } from '../stores/gameStore'
import { SeasonResult } from '../models/Season'
import { SeasonStats } from '../models/SeasonStats'
import { useLocalization } from './useLocalization'
import type { SeasonWorkerInMessage, SeasonWorkerOutMessage } from '../workers/season.worker'

export function useSeason() {
    const { currentSeason, setSeason, isLoading, setIsLoading, seasonProgress, setSeasonProgress } = useGameStore()
    const { language } = useLocalization()
    const workerRef = useRef<Worker | null>(null)

    const simulateSeason = useCallback(async (seed?: number) => {
        setIsLoading(true)
        setSeasonProgress(null)

        // Terminate any existing worker
        if (workerRef.current) {
            workerRef.current.terminate()
        }

        // Create new worker
        const worker = new Worker(
            new URL('../workers/season.worker.ts', import.meta.url),
            { type: 'module' }
        )
        workerRef.current = worker

        worker.onmessage = (event: MessageEvent<SeasonWorkerOutMessage>) => {
            const { type, result, error, progress } = event.data

            switch (type) {
                case 'INITIALIZED':
                    // Worker is ready, season will start
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
                    setSeasonProgress(null)
                    setIsLoading(false)
                    worker.terminate()
                    workerRef.current = null
                    break
            }
        }

        worker.onerror = (error) => {
            console.error('Worker error:', error)
            setSeasonProgress(null)
            setIsLoading(false)
            worker.terminate()
            workerRef.current = null
        }

        // Start the simulation
        const message: SeasonWorkerInMessage = {
            type: 'START_SEASON',
            seed,
            language,
        }
        worker.postMessage(message)
    }, [language, setIsLoading, setSeason, setSeasonProgress])

    return { currentSeason, simulateSeason, isLoading, seasonProgress }
}
