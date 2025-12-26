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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full">
            {/* Conference Tabs */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveConference(Conference.WEST)}
                    className={clsx(
                        "flex-1 py-3 text-sm font-medium transition-all",
                        activeConference === Conference.WEST
                            ? "bg-white text-slate-900 border-b-2 border-slate-900"
                            : "bg-slate-50 text-slate-500 hover:text-slate-700"
                    )}
                >
                    {t('conference.west')}
                </button>
                <button
                    onClick={() => setActiveConference(Conference.EAST)}
                    className={clsx(
                        "flex-1 py-3 text-sm font-medium transition-all",
                        activeConference === Conference.EAST
                            ? "bg-white text-slate-900 border-b-2 border-slate-900"
                            : "bg-slate-50 text-slate-500 hover:text-slate-700"
                    )}
                >
                    {t('conference.east')}
                </button>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                        <tr>
                            <th className="px-4 py-2.5 w-12 text-center">{t('ui.standings.rank')}</th>
                            <th className="px-4 py-2.5 text-left">{t('ui.standings.team')}</th>
                            <th className="px-3 py-2.5 text-center w-16">{t('stat.wins')}</th>
                            <th className="px-3 py-2.5 text-center w-16">{t('stat.losses')}</th>
                            <th className="px-3 py-2.5 text-center w-20">{t('stat.winrate')}</th>
                            <th className="px-3 py-2.5 text-center w-16">{t('ui.standings.gamesBack')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {activeStandings.map((entry) => (
                            <tr
                                key={entry.teamName}
                                className={clsx(
                                    "hover:bg-slate-50 transition-colors",
                                    entry.rank <= 6 && "bg-green-50/30",
                                    entry.rank >= 7 && entry.rank <= 10 && "bg-yellow-50/30"
                                )}
                            >
                                <td className="px-4 py-2.5 text-center font-medium text-slate-400">{entry.rank}</td>
                                <td className="px-4 py-2.5 font-medium text-slate-900">
                                    {getLocalizedTeamName(entry.teamName, language)}
                                </td>
                                <td className="px-3 py-2.5 text-center text-slate-900 font-medium">{entry.wins}</td>
                                <td className="px-3 py-2.5 text-center text-slate-600">{entry.losses}</td>
                                <td className="px-3 py-2.5 text-center text-slate-600">{(entry.winPercentage * 100).toFixed(1)}%</td>
                                <td className="px-3 py-2.5 text-center text-slate-400">{entry.gamesBack === 0 ? '—' : entry.gamesBack}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/80 flex items-center gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-green-100 border border-green-300"></span>
                    <span>{t('ui.standings.legend.playoffs')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></span>
                    <span>{t('ui.standings.legend.playIn')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300"></span>
                    <span>{t('ui.standings.legend.lottery')}</span>
                </div>
            </div>
        </div>
    )
}
