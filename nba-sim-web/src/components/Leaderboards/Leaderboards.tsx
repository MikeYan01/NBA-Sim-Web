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

    const activePlayerLeaders = stats.getLeaders(getSeasonStatsCategory(activePlayerCategory), 50)
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full">
            {/* Header with Player/Team Toggle */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{t('ui.leaderboards.title')}</h2>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                    <button
                        onClick={() => setViewMode('players')}
                        className={clsx(
                            "px-3 py-1.5 font-medium transition-colors",
                            viewMode === 'players' ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        {t('ui.leaderboards.player')}
                    </button>
                    <button
                        onClick={() => setViewMode('teams')}
                        className={clsx(
                            "px-3 py-1.5 font-medium transition-colors",
                            viewMode === 'teams' ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                        )}
                    >
                        {t('ui.leaderboards.teamTab')}
                    </button>
                </div>
            </div>

            {/* Category Tabs */}
            {viewMode === 'players' ? (
                <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
                    {PLAYER_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActivePlayerCategory(cat.id)}
                            className={clsx(
                                "px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap",
                                activePlayerCategory === cat.id
                                    ? "bg-white text-slate-900 border-b-2 border-slate-900"
                                    : "bg-slate-50 text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {t(cat.labelKey)}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar">
                    {TEAM_CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTeamCategory(cat.id)}
                            className={clsx(
                                "px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap",
                                activeTeamCategory === cat.id
                                    ? "bg-white text-slate-900 border-b-2 border-slate-900"
                                    : "bg-slate-50 text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {t(cat.labelKey)}
                        </button>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="overflow-y-auto flex-1">
                {viewMode === 'players' ? (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                            <tr>
                                <th className="px-4 py-2.5 w-12 text-center">{t('ui.standings.rank')}</th>
                                <th className="px-4 py-2.5 text-left">{t('ui.leaderboards.player')}</th>
                                <th className="px-4 py-2.5 text-left">{t('ui.standings.team')}</th>
                                <th className="px-4 py-2.5 text-right">{t('ui.leaderboards.value')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activePlayerLeaders.map((entry, index) => (
                                <tr
                                    key={`${entry.name}-${entry.teamName}`}
                                    className={clsx(
                                        "hover:bg-slate-50 transition-colors",
                                        index < 3 && "bg-amber-50/30"
                                    )}
                                >
                                    <td className="px-4 py-2.5 text-center font-medium text-slate-400">{index + 1}</td>
                                    <td className="px-4 py-2.5 font-medium text-slate-900">{language === 'en_US' ? (entry.englishName || entry.name) : entry.name}</td>
                                    <td className="px-4 py-2.5 text-slate-500 text-sm">
                                        {getLocalizedTeamName(entry.teamName, language)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                                        {formatValue(entry.value, false, isCurrentCategoryTotal)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                            <tr>
                                <th className="px-4 py-2.5 w-12 text-center">{t('ui.standings.rank')}</th>
                                <th className="px-4 py-2.5 text-left">{t('ui.standings.team')}</th>
                                <th className="px-4 py-2.5 text-right">{t('ui.leaderboards.value')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {activeTeamLeaders.map((entry, index) => (
                                <tr
                                    key={entry.name}
                                    className={clsx(
                                        "hover:bg-slate-50 transition-colors",
                                        index < 3 && "bg-amber-50/30"
                                    )}
                                >
                                    <td className="px-4 py-2.5 text-center font-medium text-slate-400">{index + 1}</td>
                                    <td className="px-4 py-2.5 font-medium text-slate-900">
                                        {getLocalizedTeamName(entry.name, language)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
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
