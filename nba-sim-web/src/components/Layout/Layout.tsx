import { Link, Outlet } from 'react-router-dom'
import { useLocalization } from '../../hooks/useLocalization'
import { Language } from '../../models/types'
import { Trophy, Globe } from 'lucide-react'
import './Layout.css'

export const Layout = () => {
    const { language, setLanguage } = useLocalization()

    const toggleLanguage = () => {
        setLanguage(language === Language.ENGLISH ? Language.CHINESE : Language.ENGLISH)
    }

    return (
        <div className="app-layout-arena">
            {/* Skip to main content link - accessibility */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-ink focus:rounded-lg"
            >
                {language === Language.ENGLISH ? 'Skip to main content' : '跳转到主要内容'}
            </a>

            {/* Header */}
            <header
                className="app-header"
                role="banner"
            >
                <div className="app-header-inner">
                    {/* Logo */}
                    <Link
                        to="/"
                        className="app-brand"
                        aria-label={language === Language.ENGLISH ? 'NBA Simulator - Home' : 'NBA 模拟器 - 首页'}
                    >
                        <div className="app-brand-mark" aria-hidden="true">
                            <Trophy size={16} />
                        </div>
                        <span>NBA Sim</span>
                    </Link>

                    <button
                        type="button"
                        onClick={toggleLanguage}
                        className="ui-button ui-button-ghost"
                        aria-label={language === Language.ENGLISH ? 'Switch to Chinese' : 'Switch to English'}
                    >
                        <Globe size={16} aria-hidden="true" />
                        <span>{language === Language.ENGLISH ? '中文' : 'EN'}</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main
                id="main-content"
                className="app-main"
                role="main"
                tabIndex={-1}
            >
                <Outlet />
            </main>

            {/* Footer */}
            <footer
                className="app-footer"
                role="contentinfo"
            >
                <div>
                    @ MikeYan01
                </div>
            </footer>
        </div>
    )
}
