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
                "h-12 cursor-pointer select-none px-2 py-3 text-center transition-colors duration-200 ease-[var(--ui-ease)] hover:bg-surface-hover hover:text-ink",
                className
            )}
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center justify-center gap-1">
                <span>{label}</span>
                {sortField === field ? (
                    sortDirection === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 text-faint" />
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
        <div className="ui-panel min-w-0 overflow-hidden">
            {/* Quarter Scores Table */}
            {boxScore.quarterScores && boxScore.quarterScores[0].length > 0 && (
                <div className="overflow-x-auto border-b border-line">
                    <table className="ui-table min-w-[360px]">
                        <thead className="bg-canvas text-muted">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">{t('ui.boxScore.team')}</th>
                                {quarterLabels.map((label, i) => (
                                    <th key={i} className="w-10 px-2 py-3 text-center font-medium">{label}</th>
                                ))}
                                <th className="w-12 px-4 py-3 text-center font-semibold text-ink">{t('ui.boxScore.total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-line">
                                <td className="min-w-[120px] max-w-[220px] break-words px-4 py-3 font-medium text-ink">{team1LocalName}</td>
                                {team1QuarterScores.map((score, i) => (
                                    <td key={i} className="px-2 py-3 text-center text-muted tabular-nums">{score}</td>
                                ))}
                                <td className="px-4 py-3 text-center font-semibold text-ink tabular-nums">{team1Total}</td>
                            </tr>
                            <tr>
                                <td className="min-w-[120px] max-w-[220px] break-words px-4 py-3 font-medium text-ink">{team2LocalName}</td>
                                {team2QuarterScores.map((score, i) => (
                                    <td key={i} className="px-2 py-3 text-center text-muted tabular-nums">{score}</td>
                                ))}
                                <td className="px-4 py-3 text-center font-semibold text-ink tabular-nums">{team2Total}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Team Tabs with Team Colors */}
            <div className="flex min-w-0 gap-2 border-b border-line bg-canvas p-2">
                <button
                    onClick={() => setActiveTab('team1')}
                    className={clsx(
                        "ui-tab min-w-0 flex-1 whitespace-normal px-3 py-3 text-sm",
                        activeTab === 'team1'
                            ? "border-line-strong bg-surface-raised text-ink"
                            : "text-muted"
                    )}
                    style={activeTab === 'team1' ? {
                        backgroundColor: `color-mix(in srgb, ${team1Colors.primary} 16%, var(--ui-panel-raised))`,
                        boxShadow: `inset 0 -2px 0 ${team1Colors.primary}`,
                    } : undefined}
                >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-ink/30" style={{ backgroundColor: team1Colors.primary }} aria-hidden="true" />
                    <span className="min-w-0 break-words">{team1LocalName}</span>
                </button>
                <button
                    onClick={() => setActiveTab('team2')}
                    className={clsx(
                        "ui-tab min-w-0 flex-1 whitespace-normal px-3 py-3 text-sm",
                        activeTab === 'team2'
                            ? "border-line-strong bg-surface-raised text-ink"
                            : "text-muted"
                    )}
                    style={activeTab === 'team2' ? {
                        backgroundColor: `color-mix(in srgb, ${team2Colors.primary} 16%, var(--ui-panel-raised))`,
                        boxShadow: `inset 0 -2px 0 ${team2Colors.primary}`,
                    } : undefined}
                >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-ink/30" style={{ backgroundColor: team2Colors.primary }} aria-hidden="true" />
                    <span className="min-w-0 break-words">{team2LocalName}</span>
                </button>
            </div>

            {/* Stats Table */}
            <div className="min-w-0 overflow-x-auto">
                <table className="ui-table min-w-[800px]">
                    <thead className="border-b border-line bg-canvas font-medium text-muted">
                        <tr>
                            <th className="w-48 px-4 py-3 text-left">{t('ui.boxScore.player')}</th>
                            <SortHeader field="minutes" label="MIN" />
                            <SortHeader field="points" label="PTS" className="font-semibold text-ink" />
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
                    <tbody className="divide-y divide-line">
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
    <tr className="transition-colors duration-200 ease-[var(--ui-ease)] hover:bg-surface-hover">
        <td className="px-4 py-3 font-medium text-ink">
            <span className="inline-flex max-w-[220px] flex-wrap items-center gap-1.5 break-words">
                {player.name}
                {player.isStarter && (
                    <span className="rounded border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-medium text-accent">{t('ui.boxScore.starter')}</span>
                )}
            </span>
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-center text-faint">{player.minutes}</td>
        <td className="px-2 py-3 text-center font-semibold text-ink">{player.points}</td>
        <td className="px-2 py-3 text-center text-muted">{player.rebounds}</td>
        <td className="px-2 py-3 text-center text-muted">{player.assists}</td>
        <td className="px-2 py-3 text-center text-muted">{player.steals}</td>
        <td className="px-2 py-3 text-center text-muted">{player.blocks}</td>
        <td className="whitespace-nowrap px-2 py-3 text-center text-muted">
            <div>{player.fgMade}-{player.fgAttempted}</div>
            <div className="mt-0.5 text-[10px] text-faint">{calcPct(player.fgMade, player.fgAttempted)}%</div>
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-center text-muted">
            <div>{player.threeMade}-{player.threeAttempted}</div>
            <div className="mt-0.5 text-[10px] text-faint">{calcPct(player.threeMade, player.threeAttempted)}%</div>
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-center text-muted">
            <div>{player.ftMade}-{player.ftAttempted}</div>
            <div className="mt-0.5 text-[10px] text-faint">{calcPct(player.ftMade, player.ftAttempted)}%</div>
        </td>
        <td className="px-2 py-3 text-center text-muted">{player.turnovers}</td>
        <td className="px-2 py-3 text-center text-muted">{player.fouls}</td>
    </tr>
)

const TotalsRow = ({ totals, label }: { totals: TeamTotals, label: string }) => (
    <tr className="border-t-2 border-line-strong bg-surface-raised font-semibold">
        <td className="px-4 py-3 text-ink">{label}</td>
        <td className="px-2 py-3 text-center text-faint">—</td>
        <td className="px-2 py-3 text-center text-ink">{totals.points}</td>
        <td className="px-2 py-3 text-center text-ink">{totals.rebounds}</td>
        <td className="px-2 py-3 text-center text-ink">{totals.assists}</td>
        <td className="px-2 py-3 text-center text-ink">{totals.steals}</td>
        <td className="px-2 py-3 text-center text-ink">{totals.blocks}</td>
        <td className="whitespace-nowrap px-2 py-3 text-center text-muted">
            <div>{totals.fgMade}-{totals.fgAttempted}</div>
            <div className="mt-0.5 text-[10px] text-faint">{calcPct(totals.fgMade, totals.fgAttempted)}%</div>
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-center text-muted">
            <div>{totals.threeMade}-{totals.threeAttempted}</div>
            <div className="mt-0.5 text-[10px] text-faint">{calcPct(totals.threeMade, totals.threeAttempted)}%</div>
        </td>
        <td className="whitespace-nowrap px-2 py-3 text-center text-muted">
            <div>{totals.ftMade}-{totals.ftAttempted}</div>
            <div className="mt-0.5 text-[10px] text-faint">{calcPct(totals.ftMade, totals.ftAttempted)}%</div>
        </td>
        <td className="px-2 py-3 text-center text-ink">{totals.turnovers}</td>
        <td className="px-2 py-3 text-center text-ink">{totals.fouls}</td>
    </tr>
)
