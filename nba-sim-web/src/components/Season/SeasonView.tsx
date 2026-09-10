import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSeason } from '../../hooks/useSeason'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { Standings } from '../Standings/Standings'
import { Leaderboards } from '../Leaderboards/Leaderboards'
import { GameRecaps, GameRecapCard } from './GameRecaps'
import { PlayoffBracket } from './PlayoffBracket'
import { Play, Trophy, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

type TabType = 'standings' | 'leaders' | 'recaps' | 'playoffs'

export const SeasonView = () => {
    const { t, language } = useLocalization()
    const { currentSeason, simulateSeason, isLoading, seasonProgress } = useSeason()
    const location = useLocation()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<TabType>('standings')
    const handledStart = useRef<string | null>(null)
    const startRequested = new URLSearchParams(location.search).get('start') === '1'

    useEffect(() => {
        if (!startRequested || handledStart.current === location.key) return
        if (isLoading && !seasonProgress) return

        // Consume the intent before launching so StrictMode and history cannot replay it.
        handledStart.current = location.key
        const params = new URLSearchParams(location.search)
        params.delete('start')
        const search = params.toString()
        navigate({
            pathname: location.pathname,
            search: search ? `?${search}` : '',
            hash: location.hash,
        }, { replace: true, state: location.state })

        if (!isLoading) void simulateSeason()
    }, [startRequested, location, navigate, isLoading, seasonProgress, simulateSeason])

    // Calculate progress percentage
    const progressPercent = seasonProgress
        ? Math.round((seasonProgress.gamesCompleted / seasonProgress.totalGames) * 100)
        : 0

    // Start screen
    if (!currentSeason && !isLoading && !startRequested) {
        return (
            <div className="ui-page mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center px-6 py-12 text-center sm:px-12">
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10">
                    <Trophy className="h-8 w-8 text-accent" />
                </div>
                <h1 className="ui-title mb-4">{t('ui.season.title')}</h1>
                <p className="mb-8 max-w-md text-sm leading-relaxed text-muted">
                    {t('ui.season.subtitle')}
                </p>
                <button
                    onClick={() => simulateSeason()}
                    className="ui-button ui-button-primary min-h-12 px-7 text-sm"
                >
                    <Play className="w-5 h-5" />
                    {t('ui.season.startSeason')}
                </button>
            </div>
        )
    }

    // Loading screen with progress
    if (isLoading || startRequested) {
        const isInitializing = seasonProgress?.phase === 'initializing'
            || (startRequested && !seasonProgress)

        return (
            <div className="ui-page mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center px-6 py-12 text-center">
                <div className="relative mb-8">
                    <div className="h-16 w-16 rounded-full border-2 border-line"></div>
                    <div className="absolute top-0 left-0 h-16 w-16 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
                </div>
                <h2 className="text-xl font-medium tracking-tight text-ink">
                    {isInitializing ? t('ui.season.initializing') : t('ui.season.simulating')}
                </h2>
                <p className="mt-3 mb-6 max-w-md text-sm leading-relaxed text-muted">
                    {isInitializing ? t('ui.season.initializingDesc') : t('ui.season.simulatingDesc')}
                </p>

                {/* Progress info */}
                {seasonProgress && !isInitializing && (
                    <p className="mb-3 text-sm font-medium text-accent tabular-nums">
                        {seasonProgress.phase === 'regular'
                            ? t('ui.season.regularSeason')
                            : seasonProgress.phase === 'playin'
                                ? t('ui.season.playoffs.playIn')
                                : t('ui.season.playoffs.title')}
                        {' • '}
                        {seasonProgress.gamesCompleted} / {seasonProgress.totalGames}
                    </p>
                )}

                {/* Progress bar */}
                <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-line">
                    <div
                        className="h-full rounded-full bg-accent transition-[width] duration-300 ease-[var(--ui-ease)]"
                        style={{ width: isInitializing ? '0%' : (seasonProgress ? `${progressPercent}%` : '5%') }}
                    ></div>
                </div>

                {seasonProgress && !isInitializing && (
                    <p className="mt-3 text-xs text-faint tabular-nums">{progressPercent}%</p>
                )}
            </div>
        )
    }

    if (!currentSeason) return null

    const championLocalName = getLocalizedTeamName(currentSeason.champion, language)

    const tabs: { key: TabType; label: string }[] = [
        { key: 'standings', label: t('ui.season.tabs.standings') },
        { key: 'leaders', label: t('ui.season.tabs.leaders') },
        { key: 'recaps', label: t('ui.season.tabs.recaps') },
        { key: 'playoffs', label: t('ui.season.tabs.playoffs') },
    ]

    return (
        <div className="ui-page mx-auto max-w-6xl tabular-nums">
            {/* Header */}
            <div className="ui-page-header items-start">
                <div className="min-w-0">
                    <h1 className="ui-title">{t('ui.season.results')}</h1>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                        🏆 {t('ui.season.champion')}: <span className="font-medium text-accent">{championLocalName}</span>
                        {currentSeason.finalsMVP && (
                            <span className="ml-2">
                                • {t('ui.season.playoffs.finalsMvp')}: <span className="font-medium text-ink">{currentSeason.finalsMVP.playerName}</span>
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => simulateSeason()}
                    className="ui-button ui-button-secondary"
                >
                    <RefreshCw className="w-4 h-4" />
                    {t('ui.season.newSeason')}
                </button>
            </div>

            {/* Tabs */}
            <div className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-canvas p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={clsx(
                            "ui-tab shrink-0",
                            activeTab === tab.key
                                ? "ui-tab-active"
                                : "text-muted"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[550px] min-w-0">
                {activeTab === 'standings' && (
                    <Standings
                        east={currentSeason.regularSeason.standings.east}
                        west={currentSeason.regularSeason.standings.west}
                    />
                )}
                {activeTab === 'leaders' && (
                    <Leaderboards
                        stats={currentSeason.regularSeason.stats}
                    />
                )}
                {activeTab === 'recaps' && (
                    <div className="space-y-4">
                        <GameRecaps recaps={currentSeason.regularSeason.recaps} />
                        {currentSeason.regularSeason.allStarRecap && (
                            <GameRecapCard recap={currentSeason.regularSeason.allStarRecap} />
                        )}
                    </div>
                )}
                {activeTab === 'playoffs' && (
                    <PlayoffBracket playoffs={currentSeason.playoffs} />
                )}
            </div>
        </div>
    )
}
