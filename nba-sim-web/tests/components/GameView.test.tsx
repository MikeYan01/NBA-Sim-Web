import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { GameView } from '../../src/components/GameView/GameView'
import { MemoryRouter } from 'react-router-dom'
import { useGameStore } from '../../src/stores/gameStore'
import { Language } from '../../src/models/types'
import english from '../../public/data/localization/strings_en_US.json'
import chinese from '../../public/data/localization/strings_zh_CN.json'

type Strings = { [key: string]: string | Strings }
const localization = vi.hoisted(() => ({ language: 'en_US' }))

// Define hoisted mocks
const { mockNavigate } = vi.hoisted(() => {
    return { mockNavigate: vi.fn() }
})

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate
    }
})

// Mock the store
vi.mock('../../src/stores/gameStore', () => ({
    useGameStore: vi.fn()
}))

// Mock localization
vi.mock('../../src/hooks/useLocalization', () => ({
    useLocalization: () => ({
        language: localization.language,
        t: (key: string) => {
            if (!key.startsWith('ui.gameView.controls.speed.')) return key
            let value: string | Strings = localization.language === Language.CHINESE ? chinese : english
            for (const segment of key.split('.')) {
                if (typeof value === 'string') throw new Error(`Invalid translation key: ${key}`)
                value = value[segment]
            }
            if (typeof value !== 'string') throw new Error(`Missing translation: ${key}`)
            return value
        }
    })
}))

// Mock scrollIntoView since it's not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn()

describe('GameView', () => {
    const mockGame = {
        team1Name: 'Lakers',
        team2Name: 'Celtics',
        team1Score: 100,
        team2Score: 95,
        playByPlayLog: [
            'Q1 12:00 - Tip off',
            'Q1 11:50 - Lakers score',
            'Q1 11:40 - Celtics score'
        ],
        boxScore: {
            team1: {
                teamName: 'Lakers',
                players: [
                    { name: 'LeBron James', points: 30, rebounds: 10, assists: 8, steals: 2, blocks: 1, fouls: 2, minutes: '35:00', fgMade: 10, fgAttempted: 20, threeMade: 2, threeAttempted: 5, ftMade: 8, ftAttempted: 10, turnovers: 3 }
                ],
                totals: {
                    points: 100, rebounds: 40, assists: 25, steals: 8, blocks: 5, fouls: 15, fgMade: 40, fgAttempted: 85, threeMade: 10, threeAttempted: 30, ftMade: 10, ftAttempted: 15, turnovers: 12
                }
            },
            team2: {
                teamName: 'Celtics',
                players: [
                    { name: 'Jayson Tatum', points: 28, rebounds: 8, assists: 5, steals: 1, blocks: 0, fouls: 3, minutes: '34:00', fgMade: 9, fgAttempted: 18, threeMade: 3, threeAttempted: 8, ftMade: 7, ftAttempted: 8, turnovers: 2 }
                ],
                totals: {
                    points: 95, rebounds: 38, assists: 22, steals: 6, blocks: 3, fouls: 18, fgMade: 38, fgAttempted: 82, threeMade: 8, threeAttempted: 28, ftMade: 11, ftAttempted: 14, turnovers: 10
                }
            }
        }
    }

    beforeEach(() => {
        vi.clearAllMocks()
        localization.language = Language.ENGLISH
            ; (useGameStore as any).mockReturnValue({
                currentGame: mockGame
            })
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders game score and team names', () => {
        render(
            <MemoryRouter>
                <GameView />
            </MemoryRouter>
        )

        // Team names should always be visible in scoreboard
        expect(screen.getAllByText('Lakers').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Celtics').length).toBeGreaterThan(0)

        // Skip to end to see final scores (game starts at 0-0)
        const skipButton = screen.getByTitle('ui.gameView.controls.skipToEnd')
        fireEvent.click(skipButton)

        // Now final scores and box score should be visible
        expect(screen.getAllByText('100').length).toBeGreaterThan(0)
        expect(screen.getAllByText('95').length).toBeGreaterThan(0)
    })

    it('renders playback controls', () => {
        render(
            <MemoryRouter>
                <GameView />
            </MemoryRouter>
        )

        // Check for control buttons by their title attributes (localization keys in test)
        // Game starts playing, so pause button is shown instead of play/restart
        expect(screen.getByTitle('ui.gameView.controls.pause')).toBeInTheDocument()
        expect(screen.getByTitle('ui.gameView.controls.skipToEnd')).toBeInTheDocument()

        const speeds = screen.getByRole('group', { name: 'Playback speed' })
        expect(within(speeds).getAllByRole('button')).toHaveLength(3)
        expect(within(speeds).getByRole('button', { name: /^Normal/ })).toHaveAttribute('aria-pressed', 'true')
    })

    it('plays commentary at the selected 1x, 4x, and 32x speeds', () => {
        vi.useFakeTimers()

        render(
            <MemoryRouter>
                <GameView />
            </MemoryRouter>
        )

        act(() => vi.advanceTimersByTime(799))
        expect(screen.queryByText(mockGame.playByPlayLog[0])).not.toBeInTheDocument()
        act(() => vi.advanceTimersByTime(1))
        expect(screen.getByText(mockGame.playByPlayLog[0])).toBeInTheDocument()

        const fast = screen.getByRole('button', { name: /^Fast/ })
        fireEvent.click(fast)
        expect(fast).toHaveAttribute('aria-pressed', 'true')
        act(() => vi.advanceTimersByTime(199))
        expect(screen.queryByText(mockGame.playByPlayLog[1])).not.toBeInTheDocument()
        act(() => vi.advanceTimersByTime(1))
        expect(screen.getByText(mockGame.playByPlayLog[1])).toBeInTheDocument()

        const turbo = screen.getByRole('button', { name: /^Turbo/ })
        fireEvent.click(turbo)
        expect(turbo).toHaveAttribute('aria-pressed', 'true')
        expect(fast).toHaveAttribute('aria-pressed', 'false')
        act(() => vi.advanceTimersByTime(24))
        expect(screen.queryByText(mockGame.playByPlayLog[2])).not.toBeInTheDocument()
        act(() => vi.advanceTimersByTime(1))
        expect(screen.getByText(mockGame.playByPlayLog[2])).toBeInTheDocument()
    })

    it.each([
        { language: Language.ENGLISH, group: 'Playback speed', labels: ['Normal', 'Fast', 'Turbo'] },
        { language: Language.CHINESE, group: '播放速度', labels: ['常速', '快速', '极速'] },
    ])('localizes the three speed choices in $language', ({ language, group, labels }) => {
        localization.language = language
        render(<MemoryRouter><GameView /></MemoryRouter>)

        const buttons = within(screen.getByRole('group', { name: group })).getAllByRole('button')
        expect(buttons).toHaveLength(3)
        for (const [index, label] of labels.entries()) {
            expect(buttons[index]).toHaveTextContent(label)
            expect(buttons[index]).toHaveTextContent(`${[1, 4, 32][index]}x`)
        }
    })

    it('redirects if no game is present', () => {
        ; (useGameStore as any).mockReturnValue({
            currentGame: null
        })

        render(
            <MemoryRouter>
                <GameView />
            </MemoryRouter>
        )

        expect(mockNavigate).toHaveBeenCalledWith('/single-game')
    })
})
