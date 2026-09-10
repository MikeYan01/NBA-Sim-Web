import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeftRight, ArrowUpRight, ChevronDown, CircleAlert, Loader2, RotateCcw, X } from 'lucide-react'
import { useLocalization } from '../../hooks/useLocalization'
import { Team } from '../../models/Team'
import { Language, RotationType } from '../../models/types'
import { EAST_TEAMS_EN, WEST_TEAMS_EN, getLocalizedTeamName } from '../../utils/Constants'
import { getTeamColors } from '../../utils/teamColors'

const TEAM_ABBREVIATIONS: Record<string, string> = {
    '76ers': 'PHI', Bucks: 'MIL', Bulls: 'CHI', Cavaliers: 'CLE', Celtics: 'BOS',
    Clippers: 'LAC', Grizzlies: 'MEM', Hawks: 'ATL', Heat: 'MIA', Hornets: 'CHA',
    Jazz: 'UTA', Kings: 'SAC', Knicks: 'NYK', Lakers: 'LAL', Magic: 'ORL',
    Mavericks: 'DAL', Nets: 'BKN', Nuggets: 'DEN', Pacers: 'IND', Pelicans: 'NOP',
    Pistons: 'DET', Raptors: 'TOR', Rockets: 'HOU', Spurs: 'SAS', Suns: 'PHX',
    Thunder: 'OKC', Timberwolves: 'MIN', 'Trail Blazers': 'POR', Warriors: 'GSW',
    Wizards: 'WAS',
}

interface MatchupCardProps {
    awayTeamName: string
    homeTeamName: string
    disabled?: boolean
    onSelectTeam: (side: 'away' | 'home', name: string) => void
    onSwapTeams: () => void
}

interface RosterState {
    key: string
    away: Team | null
    home: Team | null
    error: string | null
}

export function MatchupCard({ awayTeamName, homeTeamName, disabled = false, onSelectTeam, onSwapTeams }: MatchupCardProps) {
    const { t, language } = useLocalization()
    const id = useId()
    const [attempt, setAttempt] = useState(0)
    const [rosters, setRosters] = useState<RosterState>({ key: '', away: null, home: null, error: null })
    const [expandedTeam, setExpandedTeam] = useState<Team | null>(null)
    const dialogRef = useRef<HTMLDialogElement>(null)
    const requestKey = `${awayTeamName}:${homeTeamName}:${attempt}`
    const isLoading = rosters.key !== requestKey
    const error = isLoading ? null : rosters.error

    useEffect(() => {
        let cancelled = false
        Promise.all([Team.loadFromCSV(awayTeamName), Team.loadFromCSV(homeTeamName)])
            .then(([away, home]) => {
                if (!cancelled) setRosters({ key: requestKey, away, home, error: null })
            })
            .catch((cause: unknown) => {
                if (cancelled) return
                console.error('Failed to load matchup rosters:', cause)
                setRosters({
                    key: requestKey,
                    away: null,
                    home: null,
                    error: cause instanceof Error ? cause.message : String(cause),
                })
            })
        return () => { cancelled = true }
    }, [awayTeamName, homeTeamName, requestKey])

    const getPlayerName = (player: Team['players'][number]) =>
        language === Language.CHINESE ? player.name || player.englishName : player.englishName

    return (
        <div className="arena-court">
            <svg className="arena-court-drawing" viewBox="0 0 600 500" fill="none" aria-hidden="true" focusable="false">
                <g stroke="currentColor" strokeWidth="1">
                    <rect x="55" y="44" width="490" height="412" rx="4" />
                    <path d="M55 250H545M218 44V137H382V44M218 456V363H382V456" />
                    <circle cx="300" cy="250" r="63" />
                    <circle cx="300" cy="137" r="48" />
                    <circle cx="300" cy="363" r="48" />
                    <path d="M100 44V85C100 337 500 337 500 85V44M100 456V415C100 163 500 163 500 415V456" />
                    <path d="M276 64H324M276 436H324" />
                    <circle cx="300" cy="78" r="10" />
                    <circle cx="300" cy="422" r="10" />
                </g>
            </svg>
            <div className="arena-matchup">
                {(['away', 'home'] as const).map(side => {
                    const name = side === 'away' ? awayTeamName : homeTeamName
                    const opposite = side === 'away' ? homeTeamName : awayTeamName
                    const team = isLoading ? null : rosters[side]
                    const starters = team?.players.filter(player => player.rotationType === RotationType.STARTER) ?? []
                    return (
                        <div key={side} className={`arena-team arena-team-${side}`}>
                            <label htmlFor={`${id}-${side}`} className="arena-team-label">
                                {t(side === 'away' ? 'ui.teamSelection.selectAway' : 'ui.teamSelection.selectHome')}
                            </label>
                            <button
                                type="button"
                                className="arena-team-mark"
                                style={{ borderColor: getTeamColors(name).primary }}
                                disabled={disabled || !team || !!error}
                                onClick={() => {
                                    if (team) {
                                        setExpandedTeam(team)
                                        dialogRef.current?.showModal()
                                    }
                                }}
                                aria-label={`${t('ui.common.expand')}: ${getLocalizedTeamName(name, language)}`}
                                aria-haspopup="dialog"
                            >
                                <span key={name}>{TEAM_ABBREVIATIONS[name]}</span>
                                <ArrowUpRight size={12} aria-hidden="true" />
                            </button>
                            <div className="arena-team-select">
                                <select
                                    id={`${id}-${side}`}
                                    value={name}
                                    disabled={disabled}
                                    onChange={event => onSelectTeam(side, event.target.value)}
                                >
                                    {[
                                        { label: 'ui.teamSelection.eastConf', names: EAST_TEAMS_EN },
                                        { label: 'ui.teamSelection.westConf', names: WEST_TEAMS_EN },
                                    ].map(conference => (
                                        <optgroup key={conference.label} label={t(conference.label)}>
                                            {conference.names.map(teamName => (
                                                <option key={teamName} value={teamName} disabled={teamName === opposite}>
                                                    {getLocalizedTeamName(teamName, language)}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <ChevronDown size={13} aria-hidden="true" />
                            </div>
                            <div className="arena-lineup" aria-busy={isLoading}>
                                {isLoading ? (
                                    <div className="arena-lineup-skeleton" aria-hidden="true">
                                        {Array.from({ length: 5 }, (_, index) => <span key={index} />)}
                                    </div>
                                ) : (
                                    <ul key={name}>
                                        {starters.map(player => (
                                            <li key={player.englishName}>
                                                <span className="arena-player-name">{getPlayerName(player)}</span>
                                                <span className="arena-player-position">{player.position}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )
                })}
                <div className="arena-matchup-middle">
                    <button
                        type="button"
                        onClick={onSwapTeams}
                        disabled={disabled}
                        aria-label={`${t('ui.teamSelection.selectAway')} ↔ ${t('ui.teamSelection.selectHome')}`}
                    >
                        <ArrowLeftRight size={17} aria-hidden="true" />
                    </button>
                </div>
            </div>
            <div className="arena-roster-status" role="status">
                {isLoading && (
                    <>
                        <Loader2 size={14} className="arena-loader" aria-hidden="true" />
                        {t('ui.season.initializing')}
                    </>
                )}
            </div>
            {error && (
                <div className="arena-roster-error" role="alert">
                    <CircleAlert size={17} aria-hidden="true" />
                    <p>{error}</p>
                    <button type="button" onClick={() => setAttempt(value => value + 1)}>
                        <RotateCcw size={14} aria-hidden="true" />
                        {t('ui.gameView.controls.restart')}
                    </button>
                </div>
            )}
            <dialog
                ref={dialogRef}
                className="arena-roster-dialog"
                aria-labelledby={`${id}-roster-title`}
                onClick={event => {
                    if (event.target !== event.currentTarget) return
                    const bounds = event.currentTarget.getBoundingClientRect()
                    if (event.clientX < bounds.left || event.clientX > bounds.right
                        || event.clientY < bounds.top || event.clientY > bounds.bottom) {
                        event.currentTarget.close()
                    }
                }}
            >
                <div className="arena-roster-dialog-content">
                    <div className="arena-roster-heading">
                        <h2 id={`${id}-roster-title`}>{expandedTeam?.getDisplayName(language)}</h2>
                        <button
                            type="button"
                            autoFocus
                            aria-label={t('ui.common.close')}
                            onClick={() => dialogRef.current?.close()}
                        >
                            <X size={19} aria-hidden="true" />
                        </button>
                    </div>
                    <ul className="arena-roster-players" aria-label={t('ui.boxScore.player')}>
                        {expandedTeam?.players.map(player => (
                            <li key={player.englishName}>
                                <span className="arena-player-position">{player.position}</span>
                                <span className="arena-player-name">{getPlayerName(player)}</span>
                                {player.rotationType === RotationType.STARTER && <span className="arena-starter">{t('ui.boxScore.starter')}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            </dialog>
        </div>
    )
}
