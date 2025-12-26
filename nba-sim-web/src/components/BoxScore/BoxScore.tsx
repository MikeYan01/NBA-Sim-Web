import { useState, useMemo } from 'react'
import { BoxScore as BoxScoreType, PlayerBoxScore, TeamTotals } from '../../models/Game'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { getTeamColors } from '../../utils/teamColors'
import { clsx } from 'clsx'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

interface BoxScoreProps {
    boxScore: BoxScoreType
}

type SortField = keyof PlayerBoxScore | 'fg' | '3p' | 'ft'
type SortDirection = 'asc' | 'desc'

export const BoxScore = ({ boxScore }: BoxScoreProps) => {
    const { t, language } = useLocalization()
    const [activeTab, setActiveTab] = useState<'team1' | 'team2'>('team1')
    const [sortField, setSortField] = useState<SortField>('points')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    const activeTeam = activeTab === 'team1' ? boxScore.team1 : boxScore.team2

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('desc')
        }
    }

    const sortedPlayers = useMemo(() => {
        return [...activeTeam.players].sort((a, b) => {
            let valA: number = 0
            let valB: number = 0

            if (sortField === 'fg') {
                valA = a.fgMade
                valB = b.fgMade
            } else if (sortField === '3p') {
                valA = a.threeMade
                valB = b.threeMade
            } else if (sortField === 'ft') {
                valA = a.ftMade
                valB = b.ftMade
            } else if (sortField === 'minutes') {
                const getSeconds = (timeStr: string) => {
                    if (timeStr === 'DNP') return -1
                    const [m, s] = timeStr.split(':').map(Number)
                    return m * 60 + s
                }
                valA = getSeconds(a.minutes)
                valB = getSeconds(b.minutes)
            } else {
                valA = a[sortField as keyof PlayerBoxScore] as number
                valB = b[sortField as keyof PlayerBoxScore] as number
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1
            return 0
        })
    }, [activeTeam.players, sortField, sortDirection])

    const SortHeader = ({ field, label, className }: { field: SortField, label: string, className?: string }) => (
        <th
            className={clsx(
                "px-2 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors select-none text-center",
                className
            )}
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center justify-center gap-1">
                <span>{label}</span>
                {sortField === field ? (
                    sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-300" />
                )}
            </div>
        </th>
    )

    const team1LocalName = getLocalizedTeamName(boxScore.team1.teamName, language)
    const team2LocalName = getLocalizedTeamName(boxScore.team2.teamName, language)

    // Get team colors for tab styling
    const team1Colors = getTeamColors(boxScore.team1.teamName)
    const team2Colors = getTeamColors(boxScore.team2.teamName)

    // Calculate quarter-by-quarter scores (individual quarter scores, not cumulative)
    const getQuarterLabels = () => {
        if (!boxScore.quarterScores || boxScore.quarterScores[0].length === 0) return []
        const numQuarters = boxScore.quarterScores[0].length
        const labels: string[] = []
        for (let i = 0; i < numQuarters; i++) {
            if (i < 4) {
                labels.push(`Q${i + 1}`)
            } else {
                labels.push(`OT${i - 3}`)
            }
        }
        return labels
    }

    // Convert cumulative scores to per-quarter scores
    const getPerQuarterScores = (cumulativeScores: number[]) => {
        const perQuarter: number[] = []
        for (let i = 0; i < cumulativeScores.length; i++) {
            if (i === 0) {
                perQuarter.push(cumulativeScores[i])
            } else {
                perQuarter.push(cumulativeScores[i] - cumulativeScores[i - 1])
            }
        }
        return perQuarter
    }

    const quarterLabels = getQuarterLabels()
    const team1QuarterScores = boxScore.quarterScores ? getPerQuarterScores(boxScore.quarterScores[0]) : []
    const team2QuarterScores = boxScore.quarterScores ? getPerQuarterScores(boxScore.quarterScores[1]) : []
    const team1Total = boxScore.quarterScores ? boxScore.quarterScores[0][boxScore.quarterScores[0].length - 1] : boxScore.team1.totals.points
    const team2Total = boxScore.quarterScores ? boxScore.quarterScores[1][boxScore.quarterScores[1].length - 1] : boxScore.team2.totals.points

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Quarter Scores Table */}
            {boxScore.quarterScores && boxScore.quarterScores[0].length > 0 && (
                <div className="border-b border-slate-200 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-100 text-slate-500">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">{t('ui.boxScore.team')}</th>
                                {quarterLabels.map((label, i) => (
                                    <th key={i} className="px-2 py-2 text-center font-medium w-10">{label}</th>
                                ))}
                                <th className="px-3 py-2 text-center font-bold w-12">{t('ui.boxScore.total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-100">
                                <td className="px-3 py-2 font-medium text-slate-900">{team1LocalName}</td>
                                {team1QuarterScores.map((score, i) => (
                                    <td key={i} className="px-2 py-2 text-center text-slate-600 tabular-nums">{score}</td>
                                ))}
                                <td className="px-3 py-2 text-center font-bold text-slate-900 tabular-nums">{team1Total}</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-2 font-medium text-slate-900">{team2LocalName}</td>
                                {team2QuarterScores.map((score, i) => (
                                    <td key={i} className="px-2 py-2 text-center text-slate-600 tabular-nums">{score}</td>
                                ))}
                                <td className="px-3 py-2 text-center font-bold text-slate-900 tabular-nums">{team2Total}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Team Tabs with Team Colors */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('team1')}
                    className={clsx(
                        "flex-1 py-3 text-sm font-medium transition-all",
                        activeTab === 'team1'
                            ? "text-white"
                            : "bg-slate-50 text-slate-500 hover:text-slate-700"
                    )}
                    style={activeTab === 'team1' ? { backgroundColor: team1Colors.primary, color: team1Colors.text } : undefined}
                >
                    {team1LocalName}
                </button>
                <button
                    onClick={() => setActiveTab('team2')}
                    className={clsx(
                        "flex-1 py-3 text-sm font-medium transition-all",
                        activeTab === 'team2'
                            ? "text-white"
                            : "bg-slate-50 text-slate-500 hover:text-slate-700"
                    )}
                    style={activeTab === 'team2' ? { backgroundColor: team2Colors.primary, color: team2Colors.text } : undefined}
                >
                    {team2LocalName}
                </button>
            </div>

            {/* Stats Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="px-3 py-2.5 text-left w-36">{t('ui.boxScore.player')}</th>
                            <SortHeader field="minutes" label="MIN" />
                            <SortHeader field="points" label="PTS" className="font-bold text-slate-700" />
                            <SortHeader field="rebounds" label="REB" />
                            <SortHeader field="assists" label="AST" />
                            <SortHeader field="steals" label="STL" />
                            <SortHeader field="blocks" label="BLK" />
                            <SortHeader field="fg" label="FG" />
                            <SortHeader field="3p" label="3P" />
                            <SortHeader field="ft" label="FT" />
                            <SortHeader field="turnovers" label="TO" />
                            <SortHeader field="fouls" label="PF" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedPlayers.map((player, idx) => (
                            <PlayerRow key={idx} player={player} t={t} />
                        ))}
                        <TotalsRow totals={activeTeam.totals} label={t('ui.boxScore.totals')} />
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// Calculate shooting percentage with 1 decimal place
const calcPct = (made: number, attempted: number): string => {
    if (attempted === 0) return '-'
    return ((made / attempted) * 100).toFixed(1)
}

const PlayerRow = ({ player, t }: { player: PlayerBoxScore; t: (key: string) => string }) => (
    <tr className="hover:bg-slate-50 transition-colors">
        <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
                {player.name}
                {player.isStarter && (
                    <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1 py-0.5 rounded">{t('ui.boxScore.starter')}</span>
                )}
            </span>
        </td>
        <td className="px-2 py-2 text-center text-slate-400">{player.minutes}</td>
        <td className="px-2 py-2 text-center font-bold text-slate-900">{player.points}</td>
        <td className="px-2 py-2 text-center text-slate-600">{player.rebounds}</td>
        <td className="px-2 py-2 text-center text-slate-600">{player.assists}</td>
        <td className="px-2 py-2 text-center text-slate-600">{player.steals}</td>
        <td className="px-2 py-2 text-center text-slate-600">{player.blocks}</td>
        <td className="px-2 py-2 text-center text-slate-400">
            <div>{player.fgMade}-{player.fgAttempted}</div>
            <div className="text-[10px] text-slate-300">{calcPct(player.fgMade, player.fgAttempted)}%</div>
        </td>
        <td className="px-2 py-2 text-center text-slate-400">
            <div>{player.threeMade}-{player.threeAttempted}</div>
            <div className="text-[10px] text-slate-300">{calcPct(player.threeMade, player.threeAttempted)}%</div>
        </td>
        <td className="px-2 py-2 text-center text-slate-400">
            <div>{player.ftMade}-{player.ftAttempted}</div>
            <div className="text-[10px] text-slate-300">{calcPct(player.ftMade, player.ftAttempted)}%</div>
        </td>
        <td className="px-2 py-2 text-center text-slate-500">{player.turnovers}</td>
        <td className="px-2 py-2 text-center text-slate-500">{player.fouls}</td>
    </tr>
)

const TotalsRow = ({ totals, label }: { totals: TeamTotals, label: string }) => (
    <tr className="bg-slate-50 font-semibold border-t-2 border-slate-200">
        <td className="px-3 py-2 text-slate-900">{label}</td>
        <td className="px-2 py-2 text-center text-slate-400">—</td>
        <td className="px-2 py-2 text-center text-slate-900">{totals.points}</td>
        <td className="px-2 py-2 text-center text-slate-800">{totals.rebounds}</td>
        <td className="px-2 py-2 text-center text-slate-800">{totals.assists}</td>
        <td className="px-2 py-2 text-center text-slate-800">{totals.steals}</td>
        <td className="px-2 py-2 text-center text-slate-800">{totals.blocks}</td>
        <td className="px-2 py-2 text-center text-slate-600">
            <div>{totals.fgMade}-{totals.fgAttempted}</div>
            <div className="text-[10px] text-slate-400">{calcPct(totals.fgMade, totals.fgAttempted)}%</div>
        </td>
        <td className="px-2 py-2 text-center text-slate-600">
            <div>{totals.threeMade}-{totals.threeAttempted}</div>
            <div className="text-[10px] text-slate-400">{calcPct(totals.threeMade, totals.threeAttempted)}%</div>
        </td>
        <td className="px-2 py-2 text-center text-slate-600">
            <div>{totals.ftMade}-{totals.ftAttempted}</div>
            <div className="text-[10px] text-slate-400">{calcPct(totals.ftMade, totals.ftAttempted)}%</div>
        </td>
        <td className="px-2 py-2 text-center text-slate-800">{totals.turnovers}</td>
        <td className="px-2 py-2 text-center text-slate-800">{totals.fouls}</td>
    </tr>
)
