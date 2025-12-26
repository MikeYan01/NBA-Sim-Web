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
})
