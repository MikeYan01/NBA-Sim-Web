import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { useGame } from '../../src/hooks/useGame'
import { useGameStore } from '../../src/stores/gameStore'
import { Team } from '../../src/models/Team'
import { hostGame } from '../../src/models/Game'
import { initGameEngine } from '../../src/services/GameEngine'

vi.mock('../../src/models/Game', () => ({ hostGame: vi.fn() }))
vi.mock('../../src/services/GameEngine', () => ({ initGameEngine: vi.fn() }))
vi.mock('../../src/hooks/useLocalization', () => ({
    useLocalization: () => ({ language: 'en_US' }),
}))

beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    useGameStore.setState({ currentGame: null, isLoading: false })
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useGameStore.setState({ currentGame: null, isLoading: false })
})

describe('useGame', () => {
    it('rejects initialization failures so the caller cannot navigate as if a game started', async () => {
        const error = new Error('Engine initialization failed')
        vi.mocked(initGameEngine).mockRejectedValue(error)
        const { result } = renderHook(() => useGame())

        await act(async () => {
            await expect(result.current.simulateGame(new Team('Celtics'), new Team('Lakers')))
                .rejects.toThrow(error)
        })

        expect(hostGame).not.toHaveBeenCalled()
        expect(useGameStore.getState().currentGame).toBeNull()
        expect(useGameStore.getState().isLoading).toBe(false)
        expect(console.error).toHaveBeenCalledWith('Game simulation failed:', error)
    })

    it('rejects simulation failures and restores the loading state', async () => {
        const error = new Error('Game simulation failed')
        vi.mocked(initGameEngine).mockResolvedValue(undefined)
        vi.mocked(hostGame).mockImplementation(() => { throw error })
        const { result } = renderHook(() => useGame())

        await act(async () => {
            await expect(result.current.simulateGame(new Team('Celtics'), new Team('Lakers'), 123))
                .rejects.toThrow(error)
        })

        expect(useGameStore.getState().currentGame).toBeNull()
        expect(useGameStore.getState().isLoading).toBe(false)
    })
})
