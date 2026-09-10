import { useState, useRef, useEffect } from 'react'
import { SeriesResult } from '../../models/Playoffs'
import { GameResult } from '../../models/Game'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { X, ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { GameDetails, type GameDetailsTab } from '../GameView/GameDetails'

interface SeriesModalProps {
    series: SeriesResult
    seriesTitle: string
    onClose: () => void
}

export const SeriesModal = ({ series, seriesTitle, onClose }: SeriesModalProps) => {
    const { t, language } = useLocalization()

    return (
        <div
            className="ui-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
            onClick={onClose}
        >
            <div
                className="ui-modal-panel flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden tabular-nums"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex max-h-[40vh] shrink-0 items-start justify-between gap-3 overflow-y-auto border-b border-line bg-surface-raised px-4 py-4 sm:px-6">
                    <div className="min-w-0">
                        <div className="mb-2 text-xs text-muted">{seriesTitle}</div>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                            <span className={clsx(
                                "min-w-0 text-lg font-medium tracking-tight break-words sm:text-xl",
                                series.winner === series.team1 ? "text-success" : "text-muted"
                            )}>
                                {getLocalizedTeamName(series.team1, language)}
                            </span>
                            <span className="text-2xl font-semibold tracking-tight whitespace-nowrap text-ink tabular-nums">
                                {series.team1Wins} - {series.team2Wins}
                            </span>
                            <span className={clsx(
                                "min-w-0 text-lg font-medium tracking-tight break-words sm:text-xl",
                                series.winner === series.team2 ? "text-success" : "text-muted"
                            )}>
                                {getLocalizedTeamName(series.team2, language)}
                            </span>
                        </div>
                        {series.seriesMVP && (
                            <div className="mt-3 text-sm leading-relaxed text-accent">
                                <span className="font-medium">🏅 {t('ui.season.playoffs.seriesMvp')}: {series.seriesMVP.playerName}</span>
                                <span className="mt-1 block text-xs leading-relaxed font-normal text-muted sm:mt-0 sm:ml-2 sm:inline">
                                    {series.seriesMVP.avgPoints.toFixed(1)} {t('stat.abbr.pts')} | {series.seriesMVP.avgRebounds.toFixed(1)} {t('stat.abbr.reb')} | {series.seriesMVP.avgAssists.toFixed(1)} {t('stat.abbr.ast')} | {series.seriesMVP.avgSteals.toFixed(1)} {t('stat.abbr.stl')} | {series.seriesMVP.avgBlocks.toFixed(1)} {t('stat.abbr.blk')} | {series.seriesMVP.fgAttempted > 0 ? ((series.seriesMVP.fgMade / series.seriesMVP.fgAttempted) * 100).toFixed(1) : '0.0'}% FG | {series.seriesMVP.threeAttempted > 0 ? ((series.seriesMVP.threeMade / series.seriesMVP.threeAttempted) * 100).toFixed(1) : '0.0'}% 3P
                                </span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="ui-icon-button"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Games List */}
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
                    {series.games.map((game, i) => (
                        <GameCard key={i} game={game} gameNumber={i + 1} />
                    ))}
                </div>

                {/* Footer with close button */}
                <div className="flex shrink-0 justify-end border-t border-line bg-canvas/60 px-4 py-3 sm:px-6">
                    <button
                        onClick={onClose}
                        className="ui-button ui-button-secondary px-6"
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
    const [activeTab, setActiveTab] = useState<GameDetailsTab>('commentary')
    const cardRef = useRef<HTMLDivElement>(null)

    // Scroll card into view when expanded
    useEffect(() => {
        if (expanded && cardRef.current) {
            setTimeout(() => {
                cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 50)
        }
    }, [expanded])

    const t1Won = game.team1Score > game.team2Score
    const otSuffix = game.finalQuarter > 4 ? ` (${game.finalQuarter - 4}OT)` : ''

    return (
        <div ref={cardRef} className="ui-panel-raised min-w-0 overflow-hidden">
            {/* Game Header - Always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex min-h-[72px] w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-hover focus-visible:outline-offset-[-3px]"
            >
                <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
                    <span className="w-8 shrink-0 text-xs font-medium text-faint">G{gameNumber}</span>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                        <span className={clsx(
                            "min-w-0 text-sm font-medium break-words",
                            t1Won ? "font-semibold text-success" : "text-muted"
                        )}>
                            {getLocalizedTeamName(game.team1Name, language)}
                        </span>
                        <span className="text-lg font-semibold tracking-tight whitespace-nowrap text-ink tabular-nums">
                            {game.team1Score} - {game.team2Score}
                        </span>
                        <span className={clsx(
                            "min-w-0 text-sm font-medium break-words",
                            !t1Won ? "font-semibold text-success" : "text-muted"
                        )}>
                            {getLocalizedTeamName(game.team2Name, language)}
                        </span>
                        {otSuffix && (
                            <span className="text-xs font-medium text-warning">{otSuffix}</span>
                        )}
                    </div>
                </div>
                <div className="ml-auto flex min-h-11 shrink-0 items-center gap-2">
                    {(game.playByPlayLog?.length > 0 || game.boxScore) && (
                        <span className="text-xs text-accent">
                            {expanded ? t('ui.common.collapse') : t('ui.common.expand')}
                        </span>
                    )}
                    {expanded ? (
                        <ChevronDown className="h-5 w-5 text-faint" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-faint" />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-line">
                    <GameDetails
                        game={game}
                        awayTeam={game.team1Name}
                        homeTeam={game.team2Name}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        contentClassName="max-h-[600px]"
                    />
                </div>
            )}
        </div>
    )
}
