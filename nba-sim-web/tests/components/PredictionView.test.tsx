import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PredictionView } from '../../src/components/Prediction/PredictionView'
import { initGameEngine, runPrediction } from '../../src/services/GameEngine'
import type { PredictionResult } from '../../src/services/GameEngine'
import { Language } from '../../src/models/types'

vi.mock('../../src/services/GameEngine', () => ({
    initGameEngine: vi.fn(),
    runPrediction: vi.fn(),
}))

vi.mock('../../src/hooks/useLocalization', () => ({
    useLocalization: () => ({
        language: 'en_US',
        t: (key: string) => key,
    }),
}))

function makeResult(count: number): PredictionResult {
    const teams = ['Celtics', 'Lakers', 'Warriors', 'Knicks']
    const rankings = teams.map((teamName, index) => {
        const championships = index === 0 ? count - 3 : 1
        return { rank: index + 1, teamName, championships, probability: championships / count * 100 }
    })
    return {
        championCounts: new Map(rankings.map(ranking => [ranking.teamName, ranking.championships])),
        totalSimulations: count,
        timeElapsed: 1250,
        rankings,
    }
}

beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(initGameEngine).mockResolvedValue(undefined)
    vi.mocked(runPrediction).mockImplementation(async count => makeResult(count))
})

afterEach(cleanup)

describe('PredictionView', () => {
    it('preserves engine loading before exposing the simulation controls', () => {
        vi.mocked(initGameEngine).mockReturnValue(new Promise(() => {}))
        render(<PredictionView />)
        expect(screen.getByText('ui.prediction.loadingEngine')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'ui.prediction.startPrediction' })).not.toBeInTheDocument()
    })

    it.each([10, 25, 100])('runs the selected %i-simulation preset and renders every ranking', async count => {
        render(<PredictionView />)
        const start = await screen.findByRole('button', { name: 'ui.prediction.startPrediction' })
        fireEvent.click(screen.getByRole('button', { name: String(count) }))
        expect(screen.getByRole('button', { name: String(count) })).toHaveAttribute('aria-pressed', 'true')
        fireEvent.click(start)

        await screen.findByRole('heading', { name: 'ui.prediction.results' })
        expect(runPrediction).toHaveBeenCalledWith(count, {
            baseSeed: expect.any(Number),
            language: Language.ENGLISH,
            onProgress: expect.any(Function),
        })
        for (const ranking of makeResult(count).rankings) {
            expect(screen.getByText(ranking.teamName)).toBeInTheDocument()
        }
        expect(screen.getByText('#4')).toBeInTheDocument()
        expect(screen.getByText(`${((count - 3) / count * 100).toFixed(1)}%`)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'ui.prediction.runAgain' })).toBeInTheDocument()
    })

    it('keeps custom counts, live progress and the run-again action', async () => {
        let finish: ((result: PredictionResult) => void) | undefined
        const pending = new Promise<PredictionResult>(resolve => { finish = resolve })
        vi.mocked(runPrediction).mockImplementationOnce((count, options) => {
            options?.onProgress?.(3, count)
            return pending
        })
        render(<PredictionView />)
        const start = await screen.findByRole('button', { name: 'ui.prediction.startPrediction' })
        const custom = screen.getByRole('spinbutton', { name: 'ui.prediction.simCount' })
        expect(custom).toHaveAttribute('min', '1')
        expect(custom).toHaveAttribute('max', '1000')
        fireEvent.change(custom, { target: { value: '7' } })
        fireEvent.click(start)
        expect(await screen.findByText('43%')).toBeInTheDocument()
        expect(screen.getByText(/3 \/ 7/)).toBeInTheDocument()
        expect(runPrediction).toHaveBeenCalledWith(7, expect.any(Object))

        if (!finish) throw new Error('The prediction completion callback was not created')
        const resolve = finish
        await act(async () => { resolve(makeResult(7)) })
        fireEvent.click(screen.getByRole('button', { name: 'ui.prediction.runAgain' }))
        await waitFor(() => expect(runPrediction).toHaveBeenCalledTimes(2))
        expect(runPrediction).toHaveBeenLastCalledWith(7, expect.any(Object))
        await screen.findByRole('heading', { name: 'ui.prediction.results' })
    })

    it('keeps failure messages and allows another run after a simulation error', async () => {
        vi.mocked(runPrediction).mockRejectedValueOnce(new Error('Simulation interrupted'))
        render(<PredictionView />)
        fireEvent.click(await screen.findByRole('button', { name: 'ui.prediction.startPrediction' }))
        expect(await screen.findByText('Prediction failed: Simulation interrupted')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'ui.prediction.startPrediction' }))
        await screen.findByRole('heading', { name: 'ui.prediction.results' })
        expect(runPrediction).toHaveBeenCalledTimes(2)
    })
})
