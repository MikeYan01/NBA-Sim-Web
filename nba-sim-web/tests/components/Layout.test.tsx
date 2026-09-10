import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '../../src/components/Layout/Layout'
import { Settings } from '../../src/components/Settings/Settings'
import { Language } from '../../src/models/types'

const localization = vi.hoisted(() => ({
    language: 'en_US',
    setLanguage: vi.fn(),
}))

vi.mock('../../src/hooks/useLocalization', () => ({
    useLocalization: () => ({
        language: localization.language,
        setLanguage: localization.setLanguage,
        t: (key: string) => key,
    }),
}))

beforeEach(() => {
    localization.language = Language.ENGLISH
    localization.setLanguage.mockClear()
})

afterEach(cleanup)

describe('Application layout', () => {
    it.each(['/', '/single-game', '/game', '/season', '/prediction', '/settings'])(
        'applies Arena on %s and keeps the home/language controls without duplicate mode links',
        path => {
            render(
                <MemoryRouter initialEntries={[path]}>
                    <Routes>
                        <Route element={<Layout />}>
                            <Route path="*" element={<p>Route content</p>} />
                        </Route>
                    </Routes>
                </MemoryRouter>,
            )

            expect(screen.getByRole('main').closest('.app-layout-arena')).toBeInTheDocument()
            expect(screen.getByRole('main')).toHaveTextContent('Route content')
            const header = screen.getByRole('banner')
            const home = within(header).getByRole('link', { name: 'NBA Simulator - Home' })
            expect(home).toHaveAttribute('href', '/')
            expect(within(header).getAllByRole('link')).toEqual([home])
            for (const path of ['/single-game', '/season', '/prediction']) {
                expect(header.querySelector(`a[href="${path}"]`)).not.toBeInTheDocument()
            }
            fireEvent.click(within(header).getByRole('button', { name: 'Switch to Chinese' }))
            expect(localization.setLanguage).toHaveBeenCalledWith(Language.CHINESE)
        },
    )

    it('retains the Chinese-to-English language action', () => {
        localization.language = Language.CHINESE
        render(<MemoryRouter><Layout /></MemoryRouter>)
        fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }))
        expect(localization.setLanguage).toHaveBeenCalledWith(Language.ENGLISH)
        expect(screen.getByRole('link', { name: 'NBA 模拟器 - 首页' })).toHaveAttribute('href', '/')
    })
})

describe('Settings', () => {
    it.each([
        [Language.ENGLISH, 'English United States', '中文 简体中文', Language.CHINESE],
        [Language.CHINESE, '中文 简体中文', 'English United States', Language.ENGLISH],
    ])('keeps both language choices when the current language is %s', (language, selected, target, nextLanguage) => {
        localization.language = language
        render(<Settings />)
        expect(screen.getByRole('heading', { name: 'ui.menu.settings' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: selected })).toHaveAttribute('aria-pressed', 'true')
        fireEvent.click(screen.getByRole('button', { name: target }))
        expect(localization.setLanguage).toHaveBeenCalledWith(nextLanguage)
    })
})
