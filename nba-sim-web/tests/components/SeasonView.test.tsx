import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Home } from '../../src/components/Home/Home'
import { SeasonView } from '../../src/components/Season/SeasonView'
import { Team } from '../../src/models/Team'
import { useGameStore } from '../../src/stores/gameStore'

const season = vi.hoisted(() => ({
    simulateSeason: vi.fn(),
    translate: vi.fn((key: string) => key),
}))

vi.mock('../../src/hooks/useSeason', () => ({
    useSeason: () => {
        const { currentSeason, isLoading, seasonProgress } = useGameStore()
        return { currentSeason, isLoading, seasonProgress, simulateSeason: season.simulateSeason }
    },
}))

vi.mock('../../src/hooks/useLocalization', () => ({
    useLocalization: () => ({ t: season.translate, language: 'en_US' }),
}))

function HistoryControls() {
    const location = useLocation()
    const navigate = useNavigate()
    return (
        <>
            <output data-testid="season-location">{location.pathname}{location.search}{location.hash}</output>
            <button type="button" onClick={() => navigate(-1)}>Back</button>
            <button type="button" onClick={() => navigate(1)}>Forward</button>
        </>
    )
}

function renderSeason(entry = '/season', strict = false) {
    const content = (
        <MemoryRouter initialEntries={[entry]}>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/season" element={<SeasonView />} />
            </Routes>
            <HistoryControls />
        </MemoryRouter>
    )
    return render(strict ? <StrictMode>{content}</StrictMode> : content)
}

beforeEach(() => {
    useGameStore.setState({ currentGame: null, currentSeason: null, isLoading: false, seasonProgress: null })
    season.translate.mockClear()
    season.simulateSeason.mockReset().mockImplementation(async () => {
        useGameStore.setState({
            isLoading: true,
            seasonProgress: { phase: 'initializing', gamesCompleted: 0, totalGames: 0 },
        })
    })
    vi.spyOn(Team, 'loadFromCSV').mockImplementation(async name => new Team(name))
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    useGameStore.setState({ currentGame: null, currentSeason: null, isLoading: false, seasonProgress: null })
})

describe('SeasonView', () => {
    it('shows the season entry directly on the page without removing its start action', () => {
        renderSeason()
        const title = screen.getByRole('heading', { name: 'ui.season.title' })
        expect(title.closest('.ui-panel')).toBeNull()
        expect(screen.getByText('ui.season.subtitle')).toBeInTheDocument()
        fireEvent.click(screen.getByRole('button', { name: 'ui.season.startSeason' }))
        expect(season.simulateSeason).toHaveBeenCalledOnce()
    })

    it('keeps season progress on the same card-free background', () => {
        useGameStore.setState({
            isLoading: true,
            seasonProgress: { phase: 'regular', gamesCompleted: 123, totalGames: 1230 },
        })
        renderSeason()
        const title = screen.getByRole('heading', { name: 'ui.season.simulating' })
        expect(title.closest('.ui-panel')).toBeNull()
        expect(screen.getByText('10%')).toBeInTheDocument()
        expect(screen.getByText(/123 \/ 1230/)).toBeInTheDocument()
    })

    it('starts the season from the home entry without rendering an intermediate start screen', async () => {
        renderSeason('/')
        fireEvent.click(screen.getByRole('link', { name: /ui.home.startSeason/ }))

        await waitFor(() => expect(season.simulateSeason).toHaveBeenCalledOnce())
        expect(screen.getByRole('heading', { name: 'ui.season.initializing' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'ui.season.startSeason' })).not.toBeInTheDocument()
        expect(season.translate).not.toHaveBeenCalledWith('ui.season.startSeason')
        expect(screen.getByTestId('season-location')).toHaveTextContent(/^\/season$/)
    })

    it('consumes the start request once under StrictMode and preserves other URL parameters', async () => {
        renderSeason('/season?start=1&view=standings#results', true)
        await waitFor(() => expect(season.simulateSeason).toHaveBeenCalledOnce())
        expect(screen.getByTestId('season-location')).toHaveTextContent('/season?view=standings#results')

        act(() => useGameStore.setState({
            seasonProgress: { phase: 'regular', gamesCompleted: 123, totalGames: 1230 },
        }))
        expect(screen.getByText('10%')).toBeInTheDocument()
        expect(season.simulateSeason).toHaveBeenCalledOnce()
    })

    it('continues an active season rather than starting a second simulation', () => {
        const progress = { phase: 'regular' as const, gamesCompleted: 123, totalGames: 1230 }
        useGameStore.setState({ isLoading: true, seasonProgress: progress })
        renderSeason('/season?start=1')

        expect(season.simulateSeason).not.toHaveBeenCalled()
        expect(useGameStore.getState().seasonProgress).toEqual(progress)
        expect(screen.getByTestId('season-location')).toHaveTextContent(/^\/season$/)
        expect(screen.getByText('10%')).toBeInTheDocument()
    })

    it('does not repeat the simulation when navigating back and forward', async () => {
        renderSeason('/')
        fireEvent.click(screen.getByRole('link', { name: /ui.home.startSeason/ }))
        await waitFor(() => expect(season.simulateSeason).toHaveBeenCalledOnce())

        fireEvent.click(screen.getByRole('button', { name: 'Back' }))
        expect(screen.getByTestId('season-location')).toHaveTextContent(/^\/$/)
        fireEvent.click(screen.getByRole('button', { name: 'Forward' }))
        expect(screen.getByTestId('season-location')).toHaveTextContent(/^\/season$/)
        expect(season.simulateSeason).toHaveBeenCalledOnce()
    })

    it('does not start another season when the consumed URL is reopened', async () => {
        const page = renderSeason('/season?start=1')
        await waitFor(() => expect(season.simulateSeason).toHaveBeenCalledOnce())
        const url = screen.getByTestId('season-location').textContent
        if (!url) throw new Error('The current route was not available')
        page.unmount()
        useGameStore.setState({ isLoading: false, seasonProgress: null })
        renderSeason(url)
        expect(season.simulateSeason).toHaveBeenCalledOnce()
    })

    it('waits for another game to finish preparing before starting the requested season', async () => {
        useGameStore.setState({ isLoading: true, seasonProgress: null })
        renderSeason('/season?start=1')
        expect(season.simulateSeason).not.toHaveBeenCalled()
        expect(screen.getByRole('heading', { name: 'ui.season.initializing' })).toBeInTheDocument()

        act(() => useGameStore.setState({ isLoading: false }))
        await waitFor(() => expect(season.simulateSeason).toHaveBeenCalledOnce())
        expect(screen.getByTestId('season-location')).toHaveTextContent(/^\/season$/)
    })
})
