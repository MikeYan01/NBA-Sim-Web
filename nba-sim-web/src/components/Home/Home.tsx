import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, CalendarDays, ChartNoAxesColumnIncreasing, Loader2, Play } from 'lucide-react'
import { useLocalization } from '../../hooks/useLocalization'
import { useStartGame } from '../../hooks/useStartGame'
import { Language } from '../../models/types'
import { MatchupCard } from './MatchupCard'
import './Home.css'

export const Home = () => {
    const { t, language } = useLocalization()
    const { startGame, isLoading, error } = useStartGame()
    const [teams, setTeams] = useState({ away: 'Celtics', home: 'Lakers' })
    const matchup = `/single-game?${new URLSearchParams(teams)}`
    const modes = [
        { to: matchup, icon: Play, title: 'ui.home.startSingle', description: 'ui.home.singleDesc' },
        { to: '/season?start=1', icon: CalendarDays, title: 'ui.home.startSeason', description: 'ui.home.seasonDesc' },
        { to: '/prediction', icon: ChartNoAxesColumnIncreasing, title: 'ui.home.startPrediction', description: 'ui.home.predictionDesc' },
    ]

    return (
        <div className="arena-home" lang={language === Language.CHINESE ? 'zh-CN' : 'en'}>
            <section className="arena-hero" aria-labelledby="home-title">
                <div className="arena-story">
                    <h1 id="home-title">{t('ui.home.title')}</h1>
                    <p className="arena-description">{t('ui.home.subtitle')}</p>
                    <button
                        type="button"
                        className="arena-primary"
                        onClick={() => startGame(teams.away, teams.home)}
                        disabled={isLoading}
                        aria-busy={isLoading}
                    >
                        {isLoading
                            ? <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                            : <Play size={15} aria-hidden="true" />}
                        <span>{t('ui.home.startSingle')}</span>
                        <ArrowUpRight size={17} aria-hidden="true" />
                    </button>
                    {error && (
                        <div role="alert" className="mt-4 break-words rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
                            {error}
                        </div>
                    )}
                </div>
                <MatchupCard
                    awayTeamName={teams.away}
                    homeTeamName={teams.home}
                    disabled={isLoading}
                    onSelectTeam={(side, name) => setTeams(previous => {
                        const opposite = side === 'away' ? 'home' : 'away'
                        if (name === previous[opposite]) {
                            return { away: previous.home, home: previous.away }
                        }
                        return { ...previous, [side]: name }
                    })}
                    onSwapTeams={() => setTeams(previous => ({ away: previous.home, home: previous.away }))}
                />
            </section>
            <nav className="arena-modes" aria-label={t('ui.menu.home')}>
                {modes.map(mode => {
                    const Icon = mode.icon
                    return (
                        <Link key={mode.title} to={mode.to} className="arena-mode">
                            <Icon size={18} aria-hidden="true" />
                            <div className="arena-mode-title">
                                <h2>{t(mode.title)}</h2>
                                <ArrowRight size={18} aria-hidden="true" />
                            </div>
                            <p>{t(mode.description)}</p>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
