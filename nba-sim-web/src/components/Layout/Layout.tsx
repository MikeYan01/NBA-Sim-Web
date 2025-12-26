import { Link, useLocation, Outlet } from 'react-router-dom'
import { useLocalization } from '../../hooks/useLocalization'
import { Language } from '../../models/types'
import { Trophy, Globe } from 'lucide-react'
import clsx from 'clsx'

export const Layout = () => {
    const { t, language, setLanguage } = useLocalization()
    const location = useLocation()

    const isActive = (path: string) => location.pathname === path

    const toggleLanguage = () => {
        setLanguage(language === Language.ENGLISH ? Language.CHINESE : Language.ENGLISH)
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
            {/* Skip to main content link - accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-orange-500 focus:text-white focus:rounded-lg focus:outline-none"
            >
                {language === Language.ENGLISH ? 'Skip to main content' : '跳转到主要内容'}
            </a>

            {/* Header */}
            <header
                className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50"
                role="banner"
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="flex items-center gap-2.5 group"
                        aria-label={language === Language.ENGLISH ? 'NBA Simulator - Home' : 'NBA 模拟器 - 首页'}
                    >
                        <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow" aria-hidden="true">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg text-slate-800 hidden sm:block">
                            NBA Sim
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1" role="navigation" aria-label={language === Language.ENGLISH ? 'Main navigation' : '主导航'}>
                        <Link
                            to="/single-game"
                            className={clsx(
                                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                                isActive('/single-game') || isActive('/game')
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                            aria-current={isActive('/single-game') || isActive('/game') ? 'page' : undefined}
                        >
                            {t('ui.menu.singleGame')}
                        </Link>
                        <Link
                            to="/season"
                            className={clsx(
                                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                                isActive('/season')
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                            aria-current={isActive('/season') ? 'page' : undefined}
                        >
                            {t('ui.menu.season')}
                        </Link>
                        <Link
                            to="/prediction"
                            className={clsx(
                                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                                isActive('/prediction')
                                    ? "bg-slate-900 text-white shadow-sm"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                            )}
                            aria-current={isActive('/prediction') ? 'page' : undefined}
                        >
                            {t('ui.menu.prediction')}
                        </Link>

                        {/* Language Toggle */}
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                            aria-label={language === Language.ENGLISH ? 'Switch to Chinese' : 'Switch to English'}
                        >
                            <Globe className="w-4 h-4" aria-hidden="true" />
                            <span className="hidden sm:inline">
                                {language === Language.ENGLISH ? '中文' : 'EN'}
                            </span>
                        </button>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main
                id="main-content"
                className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full"
                role="main"
                tabIndex={-1}
            >
                <Outlet />
            </main>

            {/* Footer */}
            <footer
                className="border-t border-slate-200/60 bg-white/50"
                role="contentinfo"
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-sm text-slate-400">
                    @ MikeYan01
                </div>
            </footer>
        </div>
    )
}
