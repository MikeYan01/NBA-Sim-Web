import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Home } from '../../src/components/Home/Home'
import { Player } from '../../src/models/Player'
import { Team } from '../../src/models/Team'
import { Language } from '../../src/models/types'
import english from '../../public/data/localization/strings_en_US.json'
import chinese from '../../public/data/localization/strings_zh_CN.json'

type Strings = { [key: string]: string | Strings }
const localization = vi.hoisted(() => ({ language: 'en_US' }))
const game = vi.hoisted(() => ({
    simulateGame: vi.fn(),
    isLoading: false,
}))

vi.mock('../../src/hooks/useGame', () => ({
    useGame: () => ({
        currentGame: null,
        simulateGame: game.simulateGame,
        isLoading: game.isLoading,
    }),
}))

vi.mock('../../src/hooks/useLocalization', () => ({
    useLocalization: () => ({
        language: localization.language,
        t: (key: string) => {
            let value: string | Strings = localization.language === 'zh_CN' ? chinese : english
            for (const segment of key.split('.')) {
                if (typeof value === 'string') throw new Error(`Invalid translation key: ${key}`)
                value = value[segment]
            }
            if (typeof value !== 'string') throw new Error(`Missing translation: ${key}`)
            return value
        },
    }),
}))

function makeTeam(name: string) {
    const team = new Team(name)
    team.players.push(Player.fromCSVRow({
        name: `${name}球员`,
        englishName: `${name} Player`,
        position: 'PG',
        playerType: '1',
        rotationType: '1',
        rating: '90',
        insideRating: '80',
        midRating: '80',
        threeRating: '80',
        freeThrowPercent: '80',
        interiorDefense: '80',
        perimeterDefense: '80',
        orbRating: '80',
        drbRating: '80',
        astRating: '80',
        stlRating: '80',
        blkRating: '80',
        layupRating: '80',
        standDunk: '80',
        drivingDunk: '80',
        athleticism: '80',
        durability: '80',
        offConst: '80',
        defConst: '80',
        drawFoul: '80',
    }, name))
    return team
}

function LocationProbe() {
    const location = useLocation()
    return <output data-testid="route-location">{location.pathname}{location.search}</output>
}

function renderHome() {
    return render(
        <MemoryRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="*" element={null} />
            </Routes>
            <LocationProbe />
        </MemoryRouter>,
    )
}

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeAll(() => {
    Object.defineProperties(HTMLDialogElement.prototype, {
        showModal: {
            configurable: true,
            value: function (this: HTMLDialogElement) { this.open = true },
        },
        close: {
            configurable: true,
            value: function (this: HTMLDialogElement) {
                this.open = false
                this.dispatchEvent(new Event('close'))
            },
        },
    })
})

afterAll(() => {
    for (const [method, descriptor] of [
        ['showModal', originalShowModal],
        ['close', originalClose],
    ] as const) {
        if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, method, descriptor)
        else Reflect.deleteProperty(HTMLDialogElement.prototype, method)
    }
})

beforeEach(() => {
    localization.language = Language.ENGLISH
    game.simulateGame.mockReset().mockResolvedValue(undefined)
    game.isLoading = false
    vi.spyOn(Team, 'loadFromCSV').mockImplementation(async name => makeTeam(name))
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
})

describe('Home', () => {
    it('starts the selected matchup directly from the primary Quick Match action', async () => {
        renderHome()
        await screen.findByText('Celtics Player')
        fireEvent.click(screen.getAllByText(english.ui.home.startSingle)[0])

        await waitFor(() => expect(screen.getByTestId('route-location')).toHaveTextContent(/^\/game$/))
        expect(game.simulateGame).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Celtics' }),
            expect.objectContaining({ name: 'Lakers' }),
        )
    })

    it('starts the currently selected teams rather than the initial matchup', async () => {
        renderHome()
        fireEvent.change(screen.getByRole('combobox', { name: 'Away Team' }), { target: { value: 'Warriors' } })
        fireEvent.change(screen.getByRole('combobox', { name: 'Home Team' }), { target: { value: 'Bulls' } })
        await screen.findByText('Warriors Player')
        fireEvent.click(screen.getByRole('button', { name: 'Quick Match' }))

        await waitFor(() => expect(screen.getByTestId('route-location')).toHaveTextContent(/^\/game$/))
        expect(game.simulateGame).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'Warriors' }),
            expect.objectContaining({ name: 'Bulls' }),
        )
    })

    it('keeps the lower Quick Match entry as navigation to team selection', async () => {
        renderHome()
        await screen.findByText('Celtics Player')
        fireEvent.click(screen.getByRole('link', { name: /^Quick Match/ }))
        expect(screen.getByTestId('route-location')).toHaveTextContent('/single-game?away=Celtics&home=Lakers')
        expect(game.simulateGame).not.toHaveBeenCalled()
    })

    it('blocks duplicate starts and selection changes while the game is preparing', async () => {
        let finish: (() => void) | undefined
        game.simulateGame.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve }))
        renderHome()
        await screen.findByText('Celtics Player')
        const start = screen.getByRole('button', { name: 'Quick Match' })
        fireEvent.click(start)
        await waitFor(() => expect(game.simulateGame).toHaveBeenCalledOnce())
        expect(start).toBeDisabled()
        expect(start).toHaveAttribute('aria-busy', 'true')
        expect(screen.getByRole('combobox', { name: 'Away Team' })).toBeDisabled()
        expect(screen.getByRole('combobox', { name: 'Home Team' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Away Team ↔ Home Team' })).toBeDisabled()
        fireEvent.click(start)
        expect(game.simulateGame).toHaveBeenCalledOnce()
        expect(screen.getByTestId('route-location')).toHaveTextContent(/^\/$/)

        if (!finish) throw new Error('The game simulation was not started')
        const resolve = finish
        await act(async () => { resolve() })
        expect(screen.getByTestId('route-location')).toHaveTextContent(/^\/game$/)
    })

    it('disables the primary action during roster loading, before simulation begins', async () => {
        renderHome()
        await screen.findByText('Celtics Player')
        let finish: ((team: Team) => void) | undefined
        vi.mocked(Team.loadFromCSV).mockClear().mockImplementation(name => {
            if (name === 'Celtics') return new Promise(resolve => { finish = resolve })
            return Promise.resolve(makeTeam(name))
        })
        const start = screen.getByRole('button', { name: 'Quick Match' })
        fireEvent.click(start)
        fireEvent.click(start)
        expect(start).toBeDisabled()
        expect(Team.loadFromCSV).toHaveBeenCalledTimes(2)
        expect(game.simulateGame).not.toHaveBeenCalled()

        if (!finish) throw new Error('The roster request was not started')
        const resolve = finish
        await act(async () => { resolve(makeTeam('Celtics')) })
        expect(game.simulateGame).toHaveBeenCalledOnce()
        expect(screen.getByTestId('route-location')).toHaveTextContent(/^\/game$/)
    })

    it.each(['roster', 'simulation'])('keeps the home page on %s failure and allows a retry', async failure => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {})
        renderHome()
        await screen.findByText('Celtics Player')
        const error = new Error(`${failure} failed`)
        if (failure === 'roster') vi.mocked(Team.loadFromCSV).mockRejectedValueOnce(error)
        else game.simulateGame.mockRejectedValueOnce(error)

        fireEvent.click(screen.getByRole('button', { name: 'Quick Match' }))
        expect(await screen.findByRole('alert')).toHaveTextContent(error.message)
        expect(log).toHaveBeenCalledWith('Failed to start game:', error)
        expect(screen.getByTestId('route-location')).toHaveTextContent(/^\/$/)
        expect(screen.getByRole('button', { name: 'Quick Match' })).toBeEnabled()
        fireEvent.click(screen.getByRole('button', { name: 'Quick Match' }))
        await waitFor(() => expect(screen.getByTestId('route-location')).toHaveTextContent(/^\/game$/))
    })

    it('does not redirect back into a game after leaving during roster loading', async () => {
        renderHome()
        await screen.findByText('Celtics Player')
        let finish: ((team: Team) => void) | undefined
        vi.mocked(Team.loadFromCSV).mockImplementation(name => {
            if (name === 'Celtics') return new Promise(resolve => { finish = resolve })
            return Promise.resolve(makeTeam(name))
        })
        fireEvent.click(screen.getByRole('button', { name: 'Quick Match' }))
        fireEvent.click(screen.getByRole('link', { name: /^Full Season/ }))
        expect(screen.getByTestId('route-location')).toHaveTextContent(/^\/season\?start=1$/)
        if (!finish) throw new Error('The roster request was not started')
        const resolve = finish
        await act(async () => { resolve(makeTeam('Celtics')) })
        expect(game.simulateGame).not.toHaveBeenCalled()
        expect(screen.getByTestId('route-location')).toHaveTextContent(/^\/season\?start=1$/)
    })

    it('uses the original localized title, descriptions, and mode names', async () => {
        renderHome()
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(english.ui.home.title)
        expect(screen.getByText(english.ui.home.subtitle)).toBeInTheDocument()
        for (const text of [
            english.ui.home.startSingle, english.ui.home.startSeason, english.ui.home.startPrediction,
        ]) {
            expect(screen.getByRole('heading', { name: text })).toBeInTheDocument()
        }
        for (const text of [
            english.ui.home.singleDesc, english.ui.home.seasonDesc, english.ui.home.predictionDesc,
        ]) {
            expect(screen.getByText(text)).toBeInTheDocument()
        }
        await screen.findByText('Celtics Player')
        expect(screen.queryByLabelText('Design preview switcher')).not.toBeInTheDocument()
        expect(screen.queryByText(/No noise|Every possession|YOUR CALL|A little less interface/i)).not.toBeInTheDocument()
    })

    it('links to the real game, season, and prediction flows', async () => {
        renderHome()
        const links = screen.getAllByRole('link')
        expect(links.map(link => link.getAttribute('href'))).toEqual([
            '/single-game?away=Celtics&home=Lakers',
            '/season?start=1',
            '/prediction',
        ])
        await screen.findByText('Celtics Player')
    })

    it('carries selected teams into quick match and prevents duplicate selections', async () => {
        renderHome()
        await screen.findByText('Celtics Player')
        const away = screen.getByRole('combobox', { name: 'Away Team' })
        const home = screen.getByRole('combobox', { name: 'Home Team' })
        expect(within(away).getByRole('option', { name: 'Lakers' })).toBeDisabled()
        fireEvent.change(away, { target: { value: 'Trail Blazers' } })
        await screen.findByText('Trail Blazers Player')
        expect(home).toHaveValue('Lakers')
        expect(screen.getByRole('link', { name: /^Quick Match/ })).toHaveAttribute(
            'href', '/single-game?away=Trail+Blazers&home=Lakers',
        )
        expect(within(home).getByRole('option', { name: 'Trail Blazers' })).toBeDisabled()

        fireEvent.click(screen.getByRole('button', { name: 'Away Team ↔ Home Team' }))
        expect(away).toHaveValue('Lakers')
        expect(home).toHaveValue('Trail Blazers')
        await waitFor(() => expect(Team.loadFromCSV).toHaveBeenLastCalledWith('Trail Blazers'))
    })

    it('uses the existing Chinese translations and localized player names', async () => {
        localization.language = Language.CHINESE
        renderHome()
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(chinese.ui.home.title)
        expect(screen.getByRole('combobox', { name: chinese.ui.teamSelection.selectAway })).toHaveValue('Celtics')
        expect(screen.getByRole('button', { name: chinese.ui.home.startSingle })).toBeInTheDocument()
        await screen.findByText('Celtics球员')
    })

    it('opens the current roster and can reopen the same team after closing', async () => {
        renderHome()
        const open = screen.getByRole('button', { name: 'Expand: Celtics' })
        await waitFor(() => expect(open).toBeEnabled())
        fireEvent.click(open)
        const dialog = screen.getByRole('dialog', { name: 'Celtics' })
        expect(within(dialog).getByText('Celtics Player')).toBeInTheDocument()
        fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        fireEvent.click(open)
        expect(screen.getByRole('dialog', { name: 'Celtics' })).toBeInTheDocument()
    })

    it('reports roster failures and retries without resetting team selections', async () => {
        const log = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(Team.loadFromCSV).mockRejectedValueOnce(new Error('Roster request failed'))
        renderHome()
        expect(await screen.findByRole('alert')).toHaveTextContent('Roster request failed')
        expect(log).toHaveBeenCalledOnce()
        expect(screen.getByRole('button', { name: 'Expand: Celtics' })).toBeDisabled()
        fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
        await screen.findByText('Celtics Player')
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
        expect(screen.getByRole('combobox', { name: 'Away Team' })).toHaveValue('Celtics')
    })

    it('does not display a stale roster after a newer selection has loaded', async () => {
        let finishOldRequest: ((team: Team) => void) | undefined
        vi.mocked(Team.loadFromCSV).mockImplementation(name => {
            if (name === 'Celtics') {
                return new Promise(resolve => { finishOldRequest = resolve })
            }
            return Promise.resolve(makeTeam(name))
        })
        renderHome()
        fireEvent.change(screen.getByRole('combobox', { name: 'Away Team' }), { target: { value: 'Warriors' } })
        await screen.findByText('Warriors Player')
        if (!finishOldRequest) throw new Error('The initial roster request was not started')
        const resolve = finishOldRequest
        await act(async () => { resolve(makeTeam('Celtics')) })
        expect(screen.getByText('Warriors Player')).toBeInTheDocument()
        expect(screen.queryByText('Celtics Player')).not.toBeInTheDocument()
    })
})
