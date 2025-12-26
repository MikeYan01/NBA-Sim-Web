import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocalization } from '../../hooks/useLocalization'
import { useGame } from '../../hooks/useGame'
import { Team } from '../../models/Team'
import { EAST_TEAMS_EN, WEST_TEAMS_EN, getLocalizedTeamName } from '../../utils/Constants'
import { getTeamColors } from '../../utils/teamColors'
import { Play, Loader2, Check } from 'lucide-react'
import { clsx } from 'clsx'

export const TeamSelection = () => {
    const { t, language } = useLocalization()
    const { simulateGame, isLoading } = useGame()
    const navigate = useNavigate()

    const [awayTeamName, setAwayTeamName] = useState<string | null>(null)
    const [homeTeamName, setHomeTeamName] = useState<string | null>(null)

    const handleStartGame = async () => {
        if (!awayTeamName || !homeTeamName) return

        try {
            const awayTeam = await Team.loadFromCSV(awayTeamName)
            const homeTeam = await Team.loadFromCSV(homeTeamName)

            await simulateGame(awayTeam, homeTeam)
            navigate('/game')
        } catch (error) {
            console.error("Failed to start game:", error)
        }
    }

    const TeamButton = ({ name, isSelected, onClick, disabled }: { name: string, isSelected: boolean, onClick: () => void, disabled?: boolean }) => {
        const teamColors = getTeamColors(name)

        return (
            <button
                onClick={onClick}
                disabled={disabled}
                className={clsx(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center justify-between",
                    disabled
                        ? "text-slate-300 cursor-not-allowed"
                        : !isSelected && "hover:bg-slate-100 text-slate-700"
                )}
                style={isSelected ? {
                    backgroundColor: teamColors.primary,
                    color: teamColors.text,
                    borderLeft: `4px solid ${teamColors.secondary}`
                } : undefined}
            >
                <span className={isSelected ? "font-medium" : ""}>{getLocalizedTeamName(name, language)}</span>
                {isSelected && <Check className="w-4 h-4" />}
            </button>
        )
    }

    const ConferenceList = ({ title, teams, selectedTeam, onSelect, disabledTeam }: {
        title: string,
        teams: string[],
        selectedTeam: string | null,
        onSelect: (t: string) => void,
        disabledTeam?: string | null
    }) => (
        <div className="mb-6">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">{title}</h4>
            <div className="space-y-1">
                {teams.map(team => (
                    <TeamButton
                        key={team}
                        name={team}
                        isSelected={selectedTeam === team}
                        onClick={() => onSelect(team)}
                        disabled={disabledTeam === team}
                    />
                ))}
            </div>
        </div>
    )

    const canStart = awayTeamName && homeTeamName && awayTeamName !== homeTeamName

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('ui.teamSelection.title')}</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {awayTeamName && homeTeamName
                            ? `${getLocalizedTeamName(awayTeamName, language)} @ ${getLocalizedTeamName(homeTeamName, language)}`
                            : t('ui.home.singleDesc')
                        }
                    </p>
                </div>
                <button
                    onClick={handleStartGame}
                    disabled={!canStart || isLoading}
                    className={clsx(
                        "flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
                        canStart && !isLoading
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-200"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Play className="w-5 h-5" />
                    )}
                    {t('ui.teamSelection.startGame')}
                </button>
            </div>

            {/* Team Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Away Team */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">{t('ui.teamSelection.selectAway')}</h2>
                            {awayTeamName && (
                                <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                                    {t('ui.teamSelection.selected')}
                                </span>
                            )}
                        </div>
                        {awayTeamName && (
                            <p className="text-sm text-slate-500 mt-1">{getLocalizedTeamName(awayTeamName, language)}</p>
                        )}
                    </div>
                    <div className="h-[500px] overflow-y-auto p-4">
                        <ConferenceList
                            title={t('ui.teamSelection.westConf')}
                            teams={WEST_TEAMS_EN}
                            selectedTeam={awayTeamName}
                            onSelect={setAwayTeamName}
                            disabledTeam={homeTeamName}
                        />
                        <ConferenceList
                            title={t('ui.teamSelection.eastConf')}
                            teams={EAST_TEAMS_EN}
                            selectedTeam={awayTeamName}
                            onSelect={setAwayTeamName}
                            disabledTeam={homeTeamName}
                        />
                    </div>
                </div>

                {/* Home Team */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-slate-900">{t('ui.teamSelection.selectHome')}</h2>
                            {homeTeamName && (
                                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                    {t('ui.teamSelection.selected')}
                                </span>
                            )}
                        </div>
                        {homeTeamName && (
                            <p className="text-sm text-slate-500 mt-1">{getLocalizedTeamName(homeTeamName, language)}</p>
                        )}
                    </div>
                    <div className="h-[500px] overflow-y-auto p-4">
                        <ConferenceList
                            title={t('ui.teamSelection.westConf')}
                            teams={WEST_TEAMS_EN}
                            selectedTeam={homeTeamName}
                            onSelect={setHomeTeamName}
                            disabledTeam={awayTeamName}
                        />
                        <ConferenceList
                            title={t('ui.teamSelection.eastConf')}
                            teams={EAST_TEAMS_EN}
                            selectedTeam={homeTeamName}
                            onSelect={setHomeTeamName}
                            disabledTeam={awayTeamName}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
