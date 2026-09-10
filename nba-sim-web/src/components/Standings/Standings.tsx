import { useState } from 'react'
import { StandingEntry, Conference } from '../../models/types'
import { getLocalizedTeamName } from '../../utils/Constants'
import { useLocalization } from '../../hooks/useLocalization'
import { clsx } from 'clsx'

interface StandingsProps {
    east: StandingEntry[]
    west: StandingEntry[]
}

export const Standings = ({ east, west }: StandingsProps) => {
    const [activeConference, setActiveConference] = useState<Conference>(Conference.WEST)
    const { t, language } = useLocalization()

    const activeStandings = activeConference === Conference.WEST ? west : east

    return (
        <div className="ui-panel flex h-full min-w-0 flex-col overflow-hidden">
            {/* Conference Tabs */}
            <div className="flex border-b border-line bg-canvas">
                <button
                    onClick={() => setActiveConference(Conference.WEST)}
                    className={clsx(
                        "ui-tab flex-1 rounded-none border-0 border-b-2 py-3 text-sm focus-visible:outline-offset-[-3px]",
                        activeConference === Conference.WEST
                            ? "ui-tab-active border-accent bg-surface-raised text-accent"
                            : "border-transparent text-muted"
                    )}
                >
                    {t('conference.west')}
                </button>
                <button
                    onClick={() => setActiveConference(Conference.EAST)}
                    className={clsx(
                        "ui-tab flex-1 rounded-none border-0 border-b-2 py-3 text-sm focus-visible:outline-offset-[-3px]",
                        activeConference === Conference.EAST
                            ? "ui-tab-active border-accent bg-surface-raised text-accent"
                            : "border-transparent text-muted"
                    )}
                >
                    {t('conference.east')}
                </button>
            </div>

            {/* Table */}
            <div className="min-h-0 min-w-0 flex-1 overflow-auto">
                <table className="ui-table min-w-[520px] text-[13px] whitespace-nowrap">
                    <thead className="sticky top-0 z-10 border-b border-line bg-canvas text-xs text-muted">
                        <tr>
                            <th className="px-4 py-2.5 w-12 text-center">{t('ui.standings.rank')}</th>
                            <th className="px-4 py-2.5 text-left">{t('ui.standings.team')}</th>
                            <th className="px-3 py-2.5 text-center w-16">{t('stat.wins')}</th>
                            <th className="px-3 py-2.5 text-center w-16">{t('stat.losses')}</th>
                            <th className="px-3 py-2.5 text-center w-20">{t('stat.winrate')}</th>
                            <th className="px-3 py-2.5 text-center w-16">{t('ui.standings.gamesBack')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                        {activeStandings.map((entry) => (
                            <tr
                                key={entry.teamName}
                                className={clsx(
                                    "transition-colors hover:bg-surface-hover",
                                    entry.rank <= 6 && "bg-success/5 [&>td:first-child]:text-success",
                                    entry.rank >= 7 && entry.rank <= 10 && "bg-warning/5 [&>td:first-child]:text-warning"
                                )}
                            >
                                <td className="px-4 py-3 text-center font-medium text-faint">{entry.rank}</td>
                                <td className="px-4 py-3 font-medium text-ink">
                                    {getLocalizedTeamName(entry.teamName, language)}
                                </td>
                                <td className="px-3 py-3 text-center font-medium text-ink">{entry.wins}</td>
                                <td className="px-3 py-3 text-center text-muted">{entry.losses}</td>
                                <td className="px-3 py-3 text-center text-muted">{(entry.winPercentage * 100).toFixed(1)}%</td>
                                <td className="px-3 py-3 text-center text-faint">{entry.gamesBack === 0 ? '—' : entry.gamesBack}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line bg-canvas/60 px-4 py-4 text-xs text-muted">
                <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm border border-success/40 bg-success/10"></span>
                    <span>{t('ui.standings.legend.playoffs')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm border border-warning/40 bg-warning/10"></span>
                    <span>{t('ui.standings.legend.playIn')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm border border-line-strong bg-surface-raised"></span>
                    <span>{t('ui.standings.legend.lottery')}</span>
                </div>
            </div>
        </div>
    )
}
