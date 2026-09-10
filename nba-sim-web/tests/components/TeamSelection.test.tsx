import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TeamSelection } from '../../src/components/TeamSelection/TeamSelection'
import { MemoryRouter } from 'react-router-dom'
import * as GameHook from '../../src/hooks/useGame'
import * as LocalizationHook from '../../src/hooks/useLocalization'
import { Team } from '../../src/models/Team'

// Mock dependencies
vi.mock('../../src/hooks/useGame')
vi.mock('../../src/hooks/useLocalization')
vi.mock('../../src/models/Team')

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

describe('TeamSelection', () => {
    const mockSimulateGame = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        mockSimulateGame.mockReset().mockResolvedValue(undefined)

        // Setup default hook returns
        vi.spyOn(GameHook, 'useGame').mockReturnValue({
            currentGame: null,
            simulateGame: mockSimulateGame,
            isLoading: false,
        })

        vi.spyOn(LocalizationHook, 'useLocalization').mockReturnValue({
            t: (key: string) => key,
            language: 'en_US',
            setLanguage: vi.fn(),
        })

        // Mock Team.loadFromCSV
        vi.spyOn(Team, 'loadFromCSV').mockResolvedValue({} as Team)
    })

    it('renders team selection lists', () => {
        render(
            <MemoryRouter>
                <TeamSelection />
            </MemoryRouter>
        )

        expect(screen.getByText('ui.teamSelection.title')).toBeInTheDocument()
        expect(screen.getByText('ui.teamSelection.selectAway')).toBeInTheDocument()
        // Check for conference headers (now use localization keys)
        expect(screen.getAllByText('ui.teamSelection.westConf')).toHaveLength(2) // One for away, one for home
        expect(screen.getAllByText('ui.teamSelection.eastConf')).toHaveLength(2)
    })

    it('disables start button initially', () => {
        render(
            <MemoryRouter>
                <TeamSelection />
            </MemoryRouter>
        )

        const startButton = screen.getByText('ui.teamSelection.startGame').closest('button')
        expect(startButton).toBeDisabled()
    })

    it('enables start button when both teams are selected', () => {
        render(
            <MemoryRouter>
                <TeamSelection />
            </MemoryRouter>
        )

        // Select Away Team (Lakers)
        const lakersButtons = screen.getAllByText('Lakers')
        fireEvent.click(lakersButtons[0]) // Select for Away

        // Select Home Team (Celtics)
        const celticsButtons = screen.getAllByText('Celtics')
        fireEvent.click(celticsButtons[1]) // Select for Home

        const startButton = screen.getByText('ui.teamSelection.startGame').closest('button')
        expect(startButton).toBeEnabled()
    })

    it('preserves keyboard focus when selecting a team', () => {
        render(
            <MemoryRouter>
                <TeamSelection />
            </MemoryRouter>
        )

        const teamButton = screen.getAllByRole('button', { name: 'Lakers' })[0]
        teamButton.focus()
        fireEvent.click(teamButton)
        expect(teamButton).toHaveFocus()
        expect(teamButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('starts game and navigates when start button is clicked', async () => {
        render(
            <MemoryRouter>
                <TeamSelection />
            </MemoryRouter>
        )

        // Select teams
        const lakersButtons = screen.getAllByText('Lakers')
        fireEvent.click(lakersButtons[0])
        const celticsButtons = screen.getAllByText('Celtics')
        fireEvent.click(celticsButtons[1])

        // Click start
        const startButton = screen.getByText('ui.teamSelection.startGame')
        fireEvent.click(startButton)

        await waitFor(() => {
            expect(Team.loadFromCSV).toHaveBeenCalledTimes(2)
            expect(mockSimulateGame).toHaveBeenCalled()
            expect(mockNavigate).toHaveBeenCalledWith('/game')
        })
    })

    it('shows loading state when simulation is in progress', () => {
        vi.spyOn(GameHook, 'useGame').mockReturnValue({
            currentGame: null,
            simulateGame: mockSimulateGame,
            isLoading: true,
        })

        render(
            <MemoryRouter>
                <TeamSelection />
            </MemoryRouter>
        )

        const startButton = screen.getByText('ui.teamSelection.startGame').closest('button')
        expect(startButton).toBeDisabled()
    })

    it('accepts the matchup chosen on the home page', async () => {
        render(
            <MemoryRouter initialEntries={['/single-game?away=Trail+Blazers&home=Lakers']}>
                <TeamSelection />
            </MemoryRouter>
        )

        const startButton = screen.getByRole('button', { name: 'ui.teamSelection.startGame' })
        expect(startButton).toBeEnabled()
        fireEvent.click(startButton)

        await waitFor(() => {
            expect(Team.loadFromCSV).toHaveBeenCalledWith('Trail Blazers')
            expect(Team.loadFromCSV).toHaveBeenCalledWith('Lakers')
            expect(mockSimulateGame).toHaveBeenCalledOnce()
            expect(mockNavigate).toHaveBeenCalledWith('/game')
        })
    })

    it('shows a start failure instead of navigating and can retry the same matchup', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            mockSimulateGame.mockRejectedValueOnce(new Error('Game preparation failed'))
            render(
                <MemoryRouter initialEntries={['/single-game?away=Celtics&home=Lakers']}>
                    <TeamSelection />
                </MemoryRouter>
            )
            fireEvent.click(screen.getByRole('button', { name: 'ui.teamSelection.startGame' }))
            expect(await screen.findByRole('alert')).toHaveTextContent('Game preparation failed')
            expect(mockNavigate).not.toHaveBeenCalled()
            expect(log).toHaveBeenCalledOnce()

            fireEvent.click(screen.getByRole('button', { name: 'ui.teamSelection.startGame' }))
            await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/game'))
            expect(mockSimulateGame).toHaveBeenCalledTimes(2)
        } finally {
            log.mockRestore()
        }
    })

    it.each([
        '/single-game?away=Unknown&home=Lakers',
        '/single-game?away=Lakers&home=Lakers',
    ])('requires a valid distinct matchup for %s', entry => {
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
        try {
            render(
                <MemoryRouter initialEntries={[entry]}>
                    <TeamSelection />
                </MemoryRouter>
            )
            expect(screen.getByRole('button', { name: 'ui.teamSelection.startGame' })).toBeDisabled()
            expect(warning).toHaveBeenCalledOnce()
            expect(Team.loadFromCSV).not.toHaveBeenCalled()
        } finally {
            warning.mockRestore()
        }
    })
})
