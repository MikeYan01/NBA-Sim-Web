import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocalization } from '../../hooks/useLocalization'
import { useStartGame } from '../../hooks/useStartGame'
import { Language } from '../../models/types'
import { ALL_TEAMS_EN, EAST_TEAMS_EN, WEST_TEAMS_EN, getLocalizedTeamName } from '../../utils/Constants'
import { getTeamColors } from '../../utils/teamColors'
import { Play, Loader2, Check } from 'lucide-react'
import { clsx } from 'clsx'

const TeamButton = ({ name, language, isSelected, onClick, disabled }: {
    name: string
    language: Language
    isSelected: boolean
    onClick: () => void
    disabled?: boolean
}) => {
    const teamColors = getTeamColors(name)

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={isSelected}
            className={clsx(
                "w-full min-h-11 text-left px-3 py-2.5 rounded-lg border-l-[3px] border-transparent text-sm transition-colors flex items-center justify-between",
                disabled
                    ? "text-faint/50 cursor-not-allowed"
                    : !isSelected && "hover:bg-surface-hover text-muted"
            )}
            style={isSelected ? {
                backgroundColor: teamColors.primary,
                color: teamColors.text,
                borderLeft: `3px solid ${teamColors.secondary}`
            } : undefined}
        >
            <span className={isSelected ? "font-medium" : ""}>{getLocalizedTeamName(name, language)}</span>
            {isSelected && <Check className="w-4 h-4" aria-hidden="true" />}
        </button>
    )
}

const ConferenceList = ({ title, teams, language, selectedTeam, onSelect, disabledTeam, disabled }: {
    title: string
    teams: string[]
    language: Language
    selectedTeam: string | null
    onSelect: (team: string) => void
    disabledTeam?: string | null
    disabled?: boolean
}) => (
    <div className="mb-6">
        <h4 className="ui-section-label mb-3 px-1">{title}</h4>
        <div className="space-y-1">
            {teams.map(team => (
                <TeamButton
                    key={team}
                    name={team}
                    language={language}
                    isSelected={selectedTeam === team}
                    onClick={() => onSelect(team)}
                    disabled={disabled || disabledTeam === team}
                />
            ))}
        </div>
    </div>
)

export const TeamSelection = () => {
    const { t, language } = useLocalization()
    const { startGame, isLoading, error } = useStartGame()
    const [searchParams] = useSearchParams()

    const [{ awayTeamName, homeTeamName }, setTeams] = useState(() => {
        const readTeam = (side: string) => {
            const name = searchParams.get(side)
            if (name === null) return null
            if (ALL_TEAMS_EN.includes(name)) return name
            console.warn(`Ignoring invalid ${side} team in the matchup URL:`, name)
            return null
        }
        const away = readTeam('away')
        const home = readTeam('home')
        if (away && away === home) {
            console.warn('Ignoring duplicate home team in the matchup URL:', home)
        }
        return { awayTeamName: away, homeTeamName: home === away ? null : home }
    })
    const setAwayTeamName = (name: string) => setTeams(previous => ({ ...previous, awayTeamName: name }))
    const setHomeTeamName = (name: string) => setTeams(previous => ({ ...previous, homeTeamName: name }))

    const handleStartGame = () => {
        if (!awayTeamName || !homeTeamName) return
        return startGame(awayTeamName, homeTeamName)
    }

    const canStart = awayTeamName && homeTeamName && awayTeamName !== homeTeamName

    return (
        <div className="ui-page max-w-5xl mx-auto">
            {/* Header */}
            <div className="ui-page-header">
                <div>
                    <h1 className="ui-title">{t('ui.teamSelection.title')}</h1>
                    <p className="text-muted text-sm mt-2">
                        {awayTeamName && homeTeamName
                            ? `${getLocalizedTeamName(awayTeamName, language)} @ ${getLocalizedTeamName(homeTeamName, language)}`
                            : t('ui.home.singleDesc')
                        }
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleStartGame}
                    disabled={!canStart || isLoading}
                    aria-busy={isLoading}
                    className="ui-button ui-button-primary w-full sm:w-auto"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Play className="w-5 h-5" />
                    )}
                    {t('ui.teamSelection.startGame')}
                </button>
            </div>

            {error && (
                <div role="alert" className="mb-6 break-words rounded-xl border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
                    {error}
                </div>
            )}

            {/* Team Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Away Team */}
                <div className="ui-panel overflow-hidden">
                    <div className="px-5 py-5 border-b border-line bg-surface-raised/50">
                        <div className="flex items-center justify-between">
                            <h2 className="font-medium text-ink">{t('ui.teamSelection.selectAway')}</h2>
                            {awayTeamName && (
                                <span className="text-xs font-medium text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full">
                                    {t('ui.teamSelection.selected')}
                                </span>
                            )}
                        </div>
                        {awayTeamName && (
                            <p className="text-sm text-muted mt-1">{getLocalizedTeamName(awayTeamName, language)}</p>
                        )}
                    </div>
                    <div className="h-[500px] overflow-y-auto p-4">
                        <ConferenceList
                            title={t('ui.teamSelection.westConf')}
                            language={language}
                            teams={WEST_TEAMS_EN}
                            selectedTeam={awayTeamName}
                            onSelect={setAwayTeamName}
                            disabledTeam={homeTeamName}
                            disabled={isLoading}
                        />
                        <ConferenceList
                            title={t('ui.teamSelection.eastConf')}
                            language={language}
                            teams={EAST_TEAMS_EN}
                            selectedTeam={awayTeamName}
                            onSelect={setAwayTeamName}
                            disabledTeam={homeTeamName}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                {/* Home Team */}
                <div className="ui-panel overflow-hidden">
                    <div className="px-5 py-5 border-b border-line bg-surface-raised/50">
                        <div className="flex items-center justify-between">
                            <h2 className="font-medium text-ink">{t('ui.teamSelection.selectHome')}</h2>
                            {homeTeamName && (
                                <span className="text-xs font-medium text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full">
                                    {t('ui.teamSelection.selected')}
                                </span>
                            )}
                        </div>
                        {homeTeamName && (
                            <p className="text-sm text-muted mt-1">{getLocalizedTeamName(homeTeamName, language)}</p>
                        )}
                    </div>
                    <div className="h-[500px] overflow-y-auto p-4">
                        <ConferenceList
                            title={t('ui.teamSelection.westConf')}
                            language={language}
                            teams={WEST_TEAMS_EN}
                            selectedTeam={homeTeamName}
                            onSelect={setHomeTeamName}
                            disabledTeam={awayTeamName}
                            disabled={isLoading}
                        />
                        <ConferenceList
                            title={t('ui.teamSelection.eastConf')}
                            language={language}
                            teams={EAST_TEAMS_EN}
                            selectedTeam={homeTeamName}
                            onSelect={setHomeTeamName}
                            disabledTeam={awayTeamName}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
