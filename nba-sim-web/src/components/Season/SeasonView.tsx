import { useState } from 'react'
import { useSeason } from '../../hooks/useSeason'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { Standings } from '../Standings/Standings'
import { Leaderboards } from '../Leaderboards/Leaderboards'
import { GameRecaps } from './GameRecaps'
import { PlayoffBracket } from './PlayoffBracket'
import { Play, Trophy, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

type TabType = 'standings' | 'leaders' | 'recaps' | 'playoffs'

export const SeasonView = () => {
    const { t, language } = useLocalization()
    const { currentSeason, simulateSeason, isLoading, seasonProgress } = useSeason()
    const [activeTab, setActiveTab] = useState<TabType>('standings')

    // Calculate progress percentage
    const progressPercent = seasonProgress
        ? Math.round((seasonProgress.gamesCompleted / seasonProgress.totalGames) * 100)
        : 0

    // Start screen
    if (!currentSeason && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="mb-6 w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Trophy className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-3">{t('ui.season.title')}</h1>
                <p className="text-slate-500 max-w-md mb-8">
                    {t('ui.season.subtitle')}
                </p>
                <button
                    onClick={() => simulateSeason()}
                    className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl"
                >
                    <Play className="w-5 h-5" />
                    {t('ui.season.startSeason')}
                </button>
            </div>
        )
    }

    // Loading screen with progress
    if (isLoading) {
        const isInitializing = seasonProgress?.phase === 'initializing'

        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-indigo-200 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h2 className="text-xl font-semibold text-slate-900">
                    {isInitializing ? t('ui.season.initializing') : t('ui.season.simulating')}
                </h2>
                <p className="text-slate-500 mt-2 text-sm mb-4">
                    {isInitializing ? t('ui.season.initializingDesc') : t('ui.season.simulatingDesc')}
                </p>

                {/* Progress info */}
                {seasonProgress && !isInitializing && (
                    <p className="text-indigo-600 font-medium mb-2">
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
                <div className="w-72 h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300 ease-out"
                        style={{ width: isInitializing ? '0%' : (seasonProgress ? `${progressPercent}%` : '5%') }}
                    ></div>
                </div>

                {seasonProgress && !isInitializing && (
                    <p className="text-slate-400 text-sm mt-2">{progressPercent}%</p>
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
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('ui.season.results')}</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        🏆 {t('ui.season.champion')}: <span className="font-semibold text-indigo-600">{championLocalName}</span>
                        {currentSeason.finalsMVP && (
                            <span className="ml-2">
                                • {t('ui.season.playoffs.finalsMvp')}: <span className="font-medium">{currentSeason.finalsMVP.playerName}</span>
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => simulateSeason()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 hover:border-slate-300 transition-all text-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    {t('ui.season.newSeason')}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg inline-flex overflow-x-auto">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={clsx(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                            activeTab === tab.key
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[550px]">
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
                    <GameRecaps recaps={currentSeason.regularSeason.recaps} />
                )}
                {activeTab === 'playoffs' && (
                    <PlayoffBracket playoffs={currentSeason.playoffs} />
                )}
            </div>
        </div>
    )
}
