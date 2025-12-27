/**
 * Season Worker
 *
 * Web Worker for running season simulation in a background thread.
 * This prevents the UI from freezing during the simulation.
 */

import { SeasonManager, SeasonOptions } from '../models/Season'
import { initLocalization } from '../services/LocalizationService'
import { initComments } from '../services/CommentLoader'
import { Language } from '../models/types'
import type { SeasonStatsData } from '../models/SeasonStats'
import type { RegularSeasonResult } from '../models/Season'
import type { PlayoffBracketResult } from '../models/Playoffs'

// =============================================================================
// Message Types
// =============================================================================

/**
 * Messages sent from main thread to worker
 */
export interface SeasonWorkerInMessage {
    type: 'START_SEASON' | 'CANCEL'
    seed?: number
    language?: Language
}

/**
 * Serializable season result for Web Worker transfer
 */
export interface SerializedSeasonResult {
    regularSeason: Omit<RegularSeasonResult, 'stats'> & { stats: SeasonStatsData }
    playoffs: PlayoffBracketResult
    champion: string
    finalsMVP?: {
        playerName: string
        englishName: string
        teamName: string
    }
}

/**
 * Messages sent from worker to main thread
 */
export interface SeasonWorkerOutMessage {
    type: 'PROGRESS' | 'COMPLETE' | 'ERROR' | 'INITIALIZED'
    progress?: {
        gamesCompleted: number
        totalGames: number
        phase: 'regular' | 'playin' | 'playoffs'
    }
    result?: SerializedSeasonResult
    error?: string
}

// =============================================================================
// Worker State
// =============================================================================

let isRunning = false
// Note: shouldCancel is set but not read yet - reserved for future cancellation support
// @ts-expect-error Planned for future use
let shouldCancel = false

// =============================================================================
// Worker Implementation
// =============================================================================

/**
 * Initialize the worker (load resources)
 */
async function initialize(): Promise<void> {
    await initLocalization()
    await initComments()
}

/**
 * Run the season simulation
 */
async function runSeasonSimulation(
    seed: number | undefined,
    language: Language
): Promise<SerializedSeasonResult> {
    isRunning = true
    shouldCancel = false

    const options: SeasonOptions = {
        seed,
        language,
        silentMode: true,
        onProgress: (gamesCompleted: number, totalGames: number) => {
            // Send progress update for regular season
            const progressMessage: SeasonWorkerOutMessage = {
                type: 'PROGRESS',
                progress: {
                    gamesCompleted,
                    totalGames,
                    phase: 'regular',
                },
            }
            self.postMessage(progressMessage)
        },
        onPlayoffProgress: (gamesCompleted: number, totalGames: number, phase: 'playin' | 'playoffs') => {
            // Send progress update for play-in and playoffs
            // Add regular season games to the completed count
            const regularSeasonGames = 1230
            const progressMessage: SeasonWorkerOutMessage = {
                type: 'PROGRESS',
                progress: {
                    gamesCompleted: regularSeasonGames + gamesCompleted,
                    totalGames,
                    phase,
                },
            }
            self.postMessage(progressMessage)
        },
    }

    const manager = new SeasonManager(options)
    const result = await manager.hostSeason()

    isRunning = false

    // Serialize SeasonStats for Web Worker transfer
    const serializedResult: SerializedSeasonResult = {
        regularSeason: {
            standings: result.regularSeason.standings,
            stats: result.regularSeason.stats.toJSON(),
            games: result.regularSeason.games,
            gamesPlayed: result.regularSeason.gamesPlayed,
            recaps: result.regularSeason.recaps,
        },
        playoffs: result.playoffs,
        champion: result.champion,
        finalsMVP: result.finalsMVP,
    }

    return serializedResult
}

// =============================================================================
// Message Handler
// =============================================================================

self.onmessage = async (event: MessageEvent<SeasonWorkerInMessage>) => {
    const { type, seed, language } = event.data

    switch (type) {
        case 'START_SEASON':
            try {
                // Initialize resources first
                await initialize()

                const initMessage: SeasonWorkerOutMessage = { type: 'INITIALIZED' }
                self.postMessage(initMessage)

                // Run season
                const result = await runSeasonSimulation(
                    seed,
                    language ?? Language.ENGLISH
                )

                const completeMessage: SeasonWorkerOutMessage = {
                    type: 'COMPLETE',
                    result,
                }
                self.postMessage(completeMessage)
            } catch (error) {
                const errorMessage: SeasonWorkerOutMessage = {
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
