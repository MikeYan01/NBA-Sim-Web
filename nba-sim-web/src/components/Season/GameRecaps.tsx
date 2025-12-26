import { useState, useMemo } from 'react'
import { GameRecapData } from '../../models/Game'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { ChevronDown, ChevronRight, MessageSquareText, BarChart2, X } from 'lucide-react'
import { clsx } from 'clsx'
import { BoxScore as BoxScoreComponent } from '../BoxScore/BoxScore'

interface GameRecapsProps {
    recaps: GameRecapData[]
}

export const GameRecaps = ({ recaps }: GameRecapsProps) => {
    const { t } = useLocalization()
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

    // Group recaps by date
    const recapsByDate = useMemo(() => {
        const grouped = new Map<string, GameRecapData[]>()
        for (const recap of recaps) {
            const existing = grouped.get(recap.date) || []
            existing.push(recap)
            grouped.set(recap.date, existing)
        }
        return grouped
    }, [recaps])

    const toggleDate = (date: string) => {
        setExpandedDates((prev) => {
            const next = new Set(prev)
            if (next.has(date)) {
                next.delete(date)
            } else {
                next.add(date)
            }
            return next
        })
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <h2 className="font-semibold text-slate-900">
                    📰 {t('ui.season.recaps.title')} ({recaps.length} {t('ui.season.recaps.games')})
                </h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                {Array.from(recapsByDate.entries()).map(([date, games]) => (
                    <div key={date}>
                        <button
                            onClick={() => toggleDate(date)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <span className="font-medium text-slate-700">
                                {expandedDates.has(date) ? <ChevronDown className="w-4 h-4 inline mr-2" /> : <ChevronRight className="w-4 h-4 inline mr-2" />}
                                {date} ({games.length} {t('ui.season.recaps.games')})
                            </span>
                        </button>
                        {expandedDates.has(date) && (
                            <div className="px-4 pb-3 space-y-3">
                                {games.map((game, i) => (
                                    <GameRecapCard key={i} recap={game} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

const GameRecapCard = ({ recap }: { recap: GameRecapData }) => {
    const { t, language } = useLocalization()
    const [showModal, setShowModal] = useState(false)
    const [activeTab, setActiveTab] = useState<'commentary' | 'boxscore'>('commentary')
    const awayWon = recap.awayScore > recap.homeScore
    const otSuffix = recap.finalQuarter > 4 ? ` (${recap.finalQuarter - 4}OT)` : ''

    // Format player stats with enhanced info (FG%, steals, blocks when notable)
    const formatPlayerStats = (p: typeof recap.awayTopPlayers[0]) => {
        let stats = `${p.points}${t('stat.points.short')} ${p.rebounds}${t('stat.rebounds.short')} ${p.assists}${t('stat.assists.short')}`

        // Add FG% if notable (> 70% on 4+ shots)
        if (p.fgAttempted >= 4) {
            const fgPct = Math.round((p.fgMade / p.fgAttempted) * 100)
            if (fgPct >= 70) {
                stats += ` ${fgPct}%`
            }
        }

        // Add steals if 3+
        if (p.steals >= 3) {
            stats += ` ${p.steals}${t('stat.steals.short')}`
        }

        // Add blocks if 3+
        if (p.blocks >= 3) {
            stats += ` ${p.blocks}${t('stat.blocks.short')}`
        }

        return stats
    }

    return (
        <>
            <div
                className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all"
                onClick={() => setShowModal(true)}
            >
                {/* Score Line */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <span className={clsx("font-semibold", awayWon ? "text-green-600" : "text-slate-600")}>
                            {getLocalizedTeamName(recap.awayTeam, language)} ({recap.awayWins}-{recap.awayLosses})
                        </span>
                        <span className="text-slate-400">@</span>
                        <span className={clsx("font-semibold", !awayWon ? "text-green-600" : "text-slate-600")}>
                            {getLocalizedTeamName(recap.homeTeam, language)} ({recap.homeWins}-{recap.homeLosses})
                        </span>
                    </div>
                    <span className="font-bold text-slate-900 tabular-nums">
                        {recap.awayScore} - {recap.homeScore}{otSuffix}
                    </span>
                </div>

                {/* Top Players - Show 3 players with enhanced stats */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-2">
                    <div className="space-y-0.5">
                        {recap.awayTopPlayers.slice(0, 3).map((p, i) => (
                            <div key={i}>{p.marker}{p.name}: {formatPlayerStats(p)}</div>
                        ))}
                    </div>
                    <div className="space-y-0.5">
                        {recap.homeTopPlayers.slice(0, 3).map((p, i) => (
                            <div key={i}>{p.marker}{p.name}: {formatPlayerStats(p)}</div>
                        ))}
                    </div>
                </div>

                {/* Hint to click for details */}
                {(recap.playByPlayLog?.length > 0 || recap.boxScore) && (
                    <div className="text-[10px] text-indigo-500 flex items-center gap-1">
                        <span>{t('ui.common.expand')}</span>
                    </div>
                )}
            </div>

            {/* Game Detail Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                            <div>
                                <div className="text-sm text-slate-500 mb-1">{recap.date}</div>
                                <div className="flex items-center gap-4">
                                    <span className={clsx(
                                        "text-lg font-bold",
                                        awayWon ? "text-green-600" : "text-slate-700"
                                    )}>
                                        {getLocalizedTeamName(recap.awayTeam, language)}
                                        <span className="text-xs font-normal text-slate-400 ml-1">({recap.awayWins}-{recap.awayLosses})</span>
                                    </span>
                                    <span className="text-xl font-bold tabular-nums text-slate-900">
                                        {recap.awayScore} - {recap.homeScore}
                                    </span>
                                    <span className={clsx(
                                        "text-lg font-bold",
                                        !awayWon ? "text-green-600" : "text-slate-700"
                                    )}>
                                        {getLocalizedTeamName(recap.homeTeam, language)}
                                        <span className="text-xs font-normal text-slate-400 ml-1">({recap.homeWins}-{recap.homeLosses})</span>
                                    </span>
                                    {otSuffix && (
                                        <span className="text-sm text-orange-500 font-medium">{otSuffix}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex border-b border-slate-100 bg-slate-50">
                            <button
                                onClick={() => setActiveTab('commentary')}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                                    activeTab === 'commentary'
                                        ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <MessageSquareText className="w-4 h-4" />
                                {t('ui.season.recaps.commentary')}
                            </button>
                            {recap.boxScore && (
                                <button
                                    onClick={() => setActiveTab('boxscore')}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                                        activeTab === 'boxscore'
                                            ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <BarChart2 className="w-4 h-4" />
                                    {t('ui.boxScore.title')}
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {activeTab === 'commentary' && recap.playByPlayLog && (
                                <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                                    {recap.playByPlayLog.join('\n')}
                                </div>
                            )}
                            {activeTab === 'boxscore' && recap.boxScore && (
                                <BoxScoreComponent boxScore={recap.boxScore} />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                            >
                                {t('ui.common.close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
