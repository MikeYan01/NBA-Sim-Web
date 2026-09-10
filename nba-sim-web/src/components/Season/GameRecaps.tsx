import { useState, useMemo } from 'react'
import { GameRecapData } from '../../models/Game'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { ChevronDown, ChevronRight, X, Star } from 'lucide-react'
import { clsx } from 'clsx'
import { GameDetails, type GameDetailsTab } from '../GameView/GameDetails'

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
        <div className="ui-panel min-w-0 overflow-hidden tabular-nums">
            <div className="border-b border-line bg-canvas/60 px-4 py-4 sm:px-5">
                <h2 className="text-sm font-medium text-ink">
                    {t('ui.season.recaps.title')} ({recaps.length} {t('ui.season.recaps.games')})
                </h2>
            </div>
            <div className="max-h-[500px] overflow-y-auto divide-y divide-line">
                {Array.from(recapsByDate.entries()).map(([date, games]) => (
                    <div key={date}>
                        <button
                            onClick={() => toggleDate(date)}
                            className="flex min-h-[52px] w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-offset-[-3px] sm:px-5"
                        >
                            <span className="text-sm font-medium text-muted">
                                {expandedDates.has(date) ? <ChevronDown className="w-4 h-4 inline mr-2" /> : <ChevronRight className="w-4 h-4 inline mr-2" />}
                                {date} ({games.length} {t('ui.season.recaps.games')})
                            </span>
                        </button>
                        {expandedDates.has(date) && (
                            <div className="space-y-3 px-3 pb-4 sm:px-5">
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

export const GameRecapCard = ({ recap }: { recap: GameRecapData }) => {
    const { t, language } = useLocalization()
    const [showModal, setShowModal] = useState(false)
    const [activeTab, setActiveTab] = useState<GameDetailsTab>('commentary')
    const awayWon = recap.awayScore > recap.homeScore
    const otSuffix = recap.finalQuarter > 4 ? ` (${recap.finalQuarter - 4}OT)` : ''

    // Format player stats with enhanced info (steals, blocks, FG% when notable)
    const formatPlayerStats = (p: typeof recap.awayTopPlayers[0]) => {
        let stats = `${p.points}${t('stat.points.short')} ${p.rebounds}${t('stat.rebounds.short')} ${p.assists}${t('stat.assists.short')}`

        // Add steals if 3+
        if (p.steals >= 3) {
            stats += ` ${p.steals}${t('stat.steals.short')}`
        }

        // Add blocks if 3+
        if (p.blocks >= 3) {
            stats += ` ${p.blocks}${t('stat.blocks.short')}`
        }

        // Add FG% if notable (> 70% on 4+ shots) - show at the end
        if (p.fgAttempted >= 4) {
            const fgPct = Math.round((p.fgMade / p.fgAttempted) * 100)
            if (fgPct >= 70) {
                stats += ` ${fgPct}%`
            }
        }

        return stats
    }

    const isAllStar = recap.isAllStar ?? false

    return (
        <>
            <div
                className={clsx(
                    "min-w-0 cursor-pointer rounded-xl border p-4 tabular-nums transition-colors hover:bg-surface-hover",
                    isAllStar
                        ? "border-warning/30 bg-warning/5 hover:border-warning/60"
                        : "border-line bg-surface-raised hover:border-line-strong"
                )}
                onClick={() => setShowModal(true)}
            >
                {/* All-Star Badge */}
                {isAllStar && (
                    <div className="mb-3 flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        <span className="text-xs font-medium tracking-wider text-warning uppercase">{t('ui.season.allStarGame')}</span>
                        <Star className="h-4 w-4 fill-warning text-warning" />
                    </div>
                )}

                {/* Score Line */}
                <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className={clsx("min-w-0 font-medium break-words", awayWon ? "text-success" : "text-muted")}>
                            {getLocalizedTeamName(recap.awayTeam, language)}{!isAllStar && ` (${recap.awayWins}-${recap.awayLosses})`}
                        </span>
                        <span className="text-faint">vs</span>
                        <span className={clsx("min-w-0 font-medium break-words", !awayWon ? "text-success" : "text-muted")}>
                            {getLocalizedTeamName(recap.homeTeam, language)}{!isAllStar && ` (${recap.homeWins}-${recap.homeLosses})`}
                        </span>
                    </div>
                    <span className={clsx("shrink-0 text-lg font-semibold tracking-tight whitespace-nowrap tabular-nums", isAllStar ? "text-warning" : "text-ink")}>
                        {recap.awayScore} - {recap.homeScore}{otSuffix}
                    </span>
                </div>

                {/* Top Players - Show 3 players with enhanced stats */}
                <div className="mb-3 grid grid-cols-1 gap-x-6 gap-y-3 text-xs leading-relaxed text-muted sm:grid-cols-2">
                    <div className="min-w-0 space-y-1 break-words">
                        {recap.awayTopPlayers.slice(0, 3).map((p, i) => (
                            <div key={i}>{p.marker}{p.name}: {formatPlayerStats(p)}</div>
                        ))}
                    </div>
                    <div className="min-w-0 space-y-1 break-words">
                        {recap.homeTopPlayers.slice(0, 3).map((p, i) => (
                            <div key={i}>{p.marker}{p.name}: {formatPlayerStats(p)}</div>
                        ))}
                    </div>
                </div>

                {/* Hint to click for details */}
                {(recap.playByPlayLog?.length > 0 || recap.boxScore) && (
                    <div className="flex items-center gap-1 text-[11px] text-accent">
                        <span>{t('ui.common.expand')}</span>
                    </div>
                )}
            </div>

            {/* Game Detail Modal */}
            {showModal && (
                <div
                    className="ui-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="ui-modal-panel flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden tabular-nums"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex max-h-[40vh] shrink-0 items-start justify-between gap-3 overflow-y-auto border-b border-line bg-surface-raised px-4 py-4 sm:px-6">
                            <div className="min-w-0">
                                <div className="mb-2 text-xs text-muted">{recap.date}</div>
                                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                                    <span className={clsx(
                                        "min-w-0 text-base font-medium tracking-tight break-words sm:text-lg",
                                        awayWon ? "text-success" : "text-muted"
                                    )}>
                                        {getLocalizedTeamName(recap.awayTeam, language)}
                                        {!isAllStar && <span className="ml-1 text-xs font-normal text-faint">({recap.awayWins}-{recap.awayLosses})</span>}
                                    </span>
                                    <span className="text-xl font-semibold tracking-tight whitespace-nowrap text-ink tabular-nums">
                                        {recap.awayScore} - {recap.homeScore}
                                    </span>
                                    <span className={clsx(
                                        "min-w-0 text-base font-medium tracking-tight break-words sm:text-lg",
                                        !awayWon ? "text-success" : "text-muted"
                                    )}>
                                        {getLocalizedTeamName(recap.homeTeam, language)}
                                        {!isAllStar && <span className="ml-1 text-xs font-normal text-faint">({recap.homeWins}-{recap.homeLosses})</span>}
                                    </span>
                                    {otSuffix && (
                                        <span className="text-xs font-medium text-warning">{otSuffix}</span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="ui-icon-button"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <GameDetails
                            game={recap}
                            awayTeam={recap.awayTeam}
                            homeTeam={recap.homeTeam}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                        />

                        {/* Footer */}
                        <div className="flex shrink-0 justify-end border-t border-line bg-canvas/60 px-4 py-3 sm:px-6">
                            <button
                                onClick={() => setShowModal(false)}
                                className="ui-button ui-button-secondary px-6"
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
