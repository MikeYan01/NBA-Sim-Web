import { useState } from 'react'
import { StatCategory } from '../../models/types'
import { SeasonStats } from '../../models/SeasonStats'
import { getLocalizedTeamName } from '../../utils/Constants'
import { useLocalization } from '../../hooks/useLocalization'
import { clsx } from 'clsx'

interface LeaderboardsProps {
    stats: SeasonStats
}

const PLAYER_CATEGORIES: { id: StatCategory; labelKey: string; seasonStatsKey: any; isTotal?: boolean }[] = [
    { id: StatCategory.POINTS, labelKey: 'ui.leaderboards.categories.points', seasonStatsKey: 'points' },
    { id: StatCategory.REBOUNDS, labelKey: 'ui.leaderboards.categories.rebounds', seasonStatsKey: 'rebounds' },
    { id: StatCategory.ASSISTS, labelKey: 'ui.leaderboards.categories.assists', seasonStatsKey: 'assists' },
    { id: StatCategory.STEALS, labelKey: 'ui.leaderboards.categories.steals', seasonStatsKey: 'steals' },
    { id: StatCategory.BLOCKS, labelKey: 'ui.leaderboards.categories.blocks', seasonStatsKey: 'blocks' },
    { id: StatCategory.TURNOVERS, labelKey: 'ui.leaderboards.categories.turnovers', seasonStatsKey: 'turnovers' },
    { id: StatCategory.DOUBLE_DOUBLES, labelKey: 'ui.leaderboards.categories.doubleDoubles', seasonStatsKey: 'doubleDoubles', isTotal: true },
    { id: StatCategory.TRIPLE_DOUBLES, labelKey: 'ui.leaderboards.categories.tripleDoubles', seasonStatsKey: 'tripleDoubles', isTotal: true },
    { id: StatCategory.THREE_POINTERS, labelKey: 'ui.leaderboards.categories.threes', seasonStatsKey: 'threesMade' },
    { id: StatCategory.FREE_THROWS, labelKey: 'ui.leaderboards.categories.freeThrows', seasonStatsKey: 'freeThrowsMade' },
]

type TeamStatType = 'points' | 'pointsAllowed' | 'shotsMade' | 'threesMade' | 'freeThrowsMade' | 'fieldGoalPct' | 'threePct' | 'opponentFieldGoalPct' | 'opponentThreePct'

const TEAM_CATEGORIES: { id: TeamStatType; labelKey: string; ascending?: boolean; isPercentage?: boolean }[] = [
    { id: 'points', labelKey: 'ui.leaderboards.team.points' },
    { id: 'pointsAllowed', labelKey: 'ui.leaderboards.team.pointsAllowed', ascending: true },
    { id: 'shotsMade', labelKey: 'ui.leaderboards.team.shotsMade' },
    { id: 'threesMade', labelKey: 'ui.leaderboards.team.threesMade' },
    { id: 'freeThrowsMade', labelKey: 'ui.leaderboards.team.freeThrowsMade' },
    { id: 'fieldGoalPct', labelKey: 'ui.leaderboards.team.fieldGoalPct', isPercentage: true },
    { id: 'threePct', labelKey: 'ui.leaderboards.team.threePct', isPercentage: true },
    { id: 'opponentFieldGoalPct', labelKey: 'ui.leaderboards.team.opponentFieldGoalPct', ascending: true, isPercentage: true },
    { id: 'opponentThreePct', labelKey: 'ui.leaderboards.team.opponentThreePct', ascending: true, isPercentage: true },
]

type ViewMode = 'players' | 'teams'

export const Leaderboards = ({ stats }: LeaderboardsProps) => {
    const [viewMode, setViewMode] = useState<ViewMode>('players')
    const [activePlayerCategory, setActivePlayerCategory] = useState<StatCategory>(StatCategory.POINTS)
    const [activeTeamCategory, setActiveTeamCategory] = useState<TeamStatType>('points')
    const { t, language } = useLocalization()

    // Map StatCategory to SeasonStats category string
    const getSeasonStatsCategory = (cat: StatCategory): any => {
        switch (cat) {
            case StatCategory.POINTS: return 'points'
            case StatCategory.REBOUNDS: return 'rebounds'
            case StatCategory.ASSISTS: return 'assists'
            case StatCategory.STEALS: return 'steals'
            case StatCategory.BLOCKS: return 'blocks'
            case StatCategory.TURNOVERS: return 'turnovers'
            case StatCategory.DOUBLE_DOUBLES: return 'doubleDoubles'
            case StatCategory.TRIPLE_DOUBLES: return 'tripleDoubles'
            case StatCategory.THREE_POINTERS: return 'threesMade'
            case StatCategory.FREE_THROWS: return 'freeThrowsMade'
            default: return 'points'
        }
    }

    // Check if current category displays totals instead of per-game
    const isCurrentCategoryTotal = PLAYER_CATEGORIES.find(c => c.id === activePlayerCategory)?.isTotal ?? false

    const activePlayerLeaders = stats.getLeaders(getSeasonStatsCategory(activePlayerCategory), 100)
    const activeTeamConfig = TEAM_CATEGORIES.find(c => c.id === activeTeamCategory)!
    const activeTeamLeaders = stats.getTeamLeaders(activeTeamCategory, 30, activeTeamConfig.ascending)

    const formatValue = (value: number, isPercentage?: boolean, isTotal?: boolean) => {
        if (isPercentage) {
            return `${(value * 100).toFixed(1)}%`
        }
        if (isTotal) {
            return value.toString()
        }
        return value.toFixed(1)
    }

    return (
        <div className="ui-panel flex h-full min-w-0 flex-col overflow-hidden">
            {/* Header with Player/Team Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
                <h2 className="font-medium tracking-tight text-ink">{t('ui.leaderboards.title')}</h2>
                <div className="flex gap-1 rounded-xl border border-line bg-canvas p-1 text-xs">
                    <button
                        onClick={() => setViewMode('players')}
                        className={clsx(
                            "ui-tab px-3",
                            viewMode === 'players' ? "ui-tab-active" : "text-muted"
                        )}
                    >
                        {t('ui.leaderboards.player')}
                    </button>
                    <button
                        onClick={() => setViewMode('teams')}
                        className={clsx(
                            "ui-tab px-3",
                            viewMode === 'teams' ? "ui-tab-active" : "text-muted"
                        )}
                    >
                        {t('ui.leaderboards.teamTab')}
                    </button>
                </div>
            </div>

            {/* Category Tabs */}
            {viewMode === 'players' ? (
                <div className="flex min-w-0 gap-1 overflow-x-auto border-b border-line bg-canvas/60 p-2">
                    {PLAYER_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActivePlayerCategory(cat.id)}
                            className={clsx(
                                "ui-tab shrink-0",
                                activePlayerCategory === cat.id
                                    ? "ui-tab-active border-accent/30 bg-accent/10 text-accent"
                                    : "text-muted"
                            )}
                        >
                            {t(cat.labelKey)}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex min-w-0 gap-1 overflow-x-auto border-b border-line bg-canvas/60 p-2">
                    {TEAM_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTeamCategory(cat.id)}
                            className={clsx(
                                "ui-tab shrink-0",
                                activeTeamCategory === cat.id
                                    ? "ui-tab-active border-accent/30 bg-accent/10 text-accent"
                                    : "text-muted"
                            )}
                        >
                            {t(cat.labelKey)}
                        </button>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="min-h-0 min-w-0 flex-1 overflow-auto">
                {viewMode === 'players' ? (
                    <table className="ui-table min-w-[520px] text-[13px] whitespace-nowrap">
                        <thead className="sticky top-0 z-10 border-b border-line bg-canvas text-xs text-muted">
                            <tr>
                                <th className="px-4 py-2.5 w-12 text-center">{t('ui.standings.rank')}</th>
                                <th className="px-4 py-2.5 text-left">{t('ui.leaderboards.player')}</th>
                                <th className="px-4 py-2.5 text-left">{t('ui.standings.team')}</th>
                                <th className="px-4 py-2.5 text-right">{t('ui.leaderboards.value')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {activePlayerLeaders.map((entry, index) => (
                                <tr
                                    key={`${entry.name}-${entry.teamName}`}
                                    className={clsx(
                                        "transition-colors hover:bg-surface-hover",
                                        index < 3 && "bg-accent/5 [&>td:first-child]:text-accent"
                                    )}
                                >
                                    <td className="px-4 py-3 text-center font-medium text-faint">{index + 1}</td>
                                    <td className="px-4 py-3 font-medium text-ink">{language === 'en_US' ? (entry.englishName || entry.name) : entry.name}</td>
                                    <td className="px-4 py-3 text-muted">
                                        {getLocalizedTeamName(entry.teamName, language)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-accent">
                                        {formatValue(entry.value, false, isCurrentCategoryTotal)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="ui-table min-w-[360px] text-[13px] whitespace-nowrap">
                        <thead className="sticky top-0 z-10 border-b border-line bg-canvas text-xs text-muted">
                            <tr>
                                <th className="px-4 py-2.5 w-12 text-center">{t('ui.standings.rank')}</th>
                                <th className="px-4 py-2.5 text-left">{t('ui.standings.team')}</th>
                                <th className="px-4 py-2.5 text-right">{t('ui.leaderboards.value')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                            {activeTeamLeaders.map((entry, index) => (
                                <tr
                                    key={entry.name}
                                    className={clsx(
                                        "transition-colors hover:bg-surface-hover",
                                        index < 3 && "bg-accent/5 [&>td:first-child]:text-accent"
                                    )}
                                >
                                    <td className="px-4 py-3 text-center font-medium text-faint">{index + 1}</td>
                                    <td className="px-4 py-3 font-medium text-ink">
                                        {getLocalizedTeamName(entry.name, language)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-accent">
                                        {formatValue(entry.value, activeTeamConfig.isPercentage)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
