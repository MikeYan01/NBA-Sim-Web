import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Home } from '../../src/components/Home/Home'
import { MemoryRouter } from 'react-router-dom'

// Mock localization
vi.mock('../../src/hooks/useLocalization', () => ({
    useLocalization: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'ui.home.title': 'NBA Simulator',
                'ui.home.subtitle': 'Experience the thrill of basketball simulation',
                'ui.home.startSingle': 'Quick Game',
                'ui.home.startSeason': 'Season Mode'
            }
            return translations[key] || key
        }
    })
}))

describe('Home', () => {
    it('renders title and subtitle', () => {
        render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>
        )

        expect(screen.getByText('NBA Simulator')).toBeInTheDocument()
        expect(screen.getByText('Experience the thrill of basketball simulation')).toBeInTheDocument()
    })

    it('renders navigation cards', () => {
        render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>
        )

        expect(screen.getByText('Quick Game')).toBeInTheDocument()
        expect(screen.getByText('Season Mode')).toBeInTheDocument()

        // Check descriptions (now use localization keys)
        expect(screen.getByText('ui.home.singleDesc')).toBeInTheDocument()
        expect(screen.getByText('ui.home.seasonDesc')).toBeInTheDocument()
    })

    it('contains correct links', () => {
        render(
            <MemoryRouter>
                <Home />
            </MemoryRouter>
        )

        const links = screen.getAllByRole('link')
        expect(links).toHaveLength(3)

        expect(links[0]).toHaveAttribute('href', '/single-game')
        expect(links[1]).toHaveAttribute('href', '/season')
        expect(links[2]).toHaveAttribute('href', '/prediction')
    })
})
