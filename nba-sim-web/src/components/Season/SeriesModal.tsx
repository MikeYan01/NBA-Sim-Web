import { useState } from 'react'
import { SeriesResult } from '../../models/Playoffs'
import { GameResult } from '../../models/Game'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { X, ChevronDown, ChevronRight, MessageSquareText, BarChart2 } from 'lucide-react'
import { clsx } from 'clsx'
import { BoxScore as BoxScoreComponent } from '../BoxScore/BoxScore'

interface SeriesModalProps {
    series: SeriesResult
    seriesTitle: string
    onClose: () => void
}

export const SeriesModal = ({ series, seriesTitle, onClose }: SeriesModalProps) => {
    const { t, language } = useLocalization()

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                    <div>
                        <div className="text-sm text-slate-500 mb-1">{seriesTitle}</div>
                        <div className="flex items-center gap-4">
                            <span className={clsx(
                                "text-xl font-bold",
                                series.winner === series.team1 ? "text-green-600" : "text-slate-700"
                            )}>
                                {getLocalizedTeamName(series.team1, language)}
                            </span>
                            <span className="text-2xl font-bold text-slate-900 tabular-nums">
                                {series.team1Wins} - {series.team2Wins}
                            </span>
                            <span className={clsx(
                                "text-xl font-bold",
                                series.winner === series.team2 ? "text-green-600" : "text-slate-700"
                            )}>
                                {getLocalizedTeamName(series.team2, language)}
                            </span>
                        </div>
                        {series.seriesMVP && (
                            <div className="text-sm text-indigo-600 mt-2">
                                <span className="font-medium">🏅 {t('ui.season.playoffs.seriesMvp')}: {series.seriesMVP.playerName}</span>
                                <span className="ml-2 text-xs text-slate-500 font-normal">
                                    {series.seriesMVP.avgPoints.toFixed(1)} {t('stat.abbr.pts')} | {series.seriesMVP.avgRebounds.toFixed(1)} {t('stat.abbr.reb')} | {series.seriesMVP.avgAssists.toFixed(1)} {t('stat.abbr.ast')} | {series.seriesMVP.avgSteals.toFixed(1)} {t('stat.abbr.stl')} | {series.seriesMVP.avgBlocks.toFixed(1)} {t('stat.abbr.blk')} | {series.seriesMVP.fgAttempted > 0 ? ((series.seriesMVP.fgMade / series.seriesMVP.fgAttempted) * 100).toFixed(1) : '0.0'}% FG | {series.seriesMVP.threeAttempted > 0 ? ((series.seriesMVP.threeMade / series.seriesMVP.threeAttempted) * 100).toFixed(1) : '0.0'}% 3P
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Games List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {series.games.map((game, i) => (
                        <GameCard key={i} game={game} gameNumber={i + 1} />
                    ))}
                </div>

                {/* Footer with close button */}
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                        {t('ui.common.close')}
                    </button>
                </div>
            </div>
        </div>
    )
}

interface GameCardProps {
    game: GameResult
    gameNumber: number
}

const GameCard = ({ game, gameNumber }: GameCardProps) => {
    const { t, language } = useLocalization()
    const [expanded, setExpanded] = useState(false)
    const [activeTab, setActiveTab] = useState<'commentary' | 'boxscore'>('commentary')

    const t1Won = game.team1Score > game.team2Score
    const otSuffix = game.finalQuarter > 4 ? ` (${game.finalQuarter - 4}OT)` : ''

    return (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Game Header - Always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-400 w-8">G{gameNumber}</span>
                    <div className="flex items-center gap-3">
                        <span className={clsx(
                            "font-medium",
                            t1Won ? "text-green-600 font-bold" : "text-slate-600"
                        )}>
                            {getLocalizedTeamName(game.team1Name, language)}
                        </span>
                        <span className="text-lg font-bold tabular-nums text-slate-900">
                            {game.team1Score} - {game.team2Score}
                        </span>
                        <span className={clsx(
                            "font-medium",
                            !t1Won ? "text-green-600 font-bold" : "text-slate-600"
                        )}>
                            {getLocalizedTeamName(game.team2Name, language)}
                        </span>
                        {otSuffix && (
                            <span className="text-xs text-orange-500 font-medium">{otSuffix}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {(game.playByPlayLog?.length > 0 || game.boxScore) && (
                        <span className="text-xs text-slate-400">
                            {expanded ? t('ui.common.collapse') : t('ui.common.expand')}
                        </span>
                    )}
                    {expanded ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-slate-200">
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
                        {game.boxScore && (
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
                                {t('ui.gameView.boxScore')}
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-4 max-h-[600px] overflow-y-auto">
                        {activeTab === 'commentary' && game.playByPlayLog && (
                            <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                                {game.playByPlayLog.join('\n')}
                            </div>
                        )}
                        {activeTab === 'boxscore' && game.boxScore && (
                            <BoxScoreComponent boxScore={game.boxScore} />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
