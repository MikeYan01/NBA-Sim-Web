import { useState } from 'react'
import { PlayoffBracketResult, SeriesResult, PlayInResult, PlayInGameResult } from '../../models/Playoffs'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { Trophy, X } from 'lucide-react'
import { clsx } from 'clsx'
import { SeriesModal } from './SeriesModal'
import { GameDetails, type GameDetailsTab } from '../GameView/GameDetails'

interface PlayoffBracketProps {
    playoffs: PlayoffBracketResult
}

export const PlayoffBracket = ({ playoffs }: PlayoffBracketProps) => {
    const { t, language } = useLocalization()

    // State for series modal - clicking on any series opens the modal
    const [selectedSeries, setSelectedSeries] = useState<SeriesResult | null>(null)
    const [seriesTitle, setSeriesTitle] = useState<string>('')

    // Handler to open series modal
    const openSeriesModal = (series: SeriesResult, title: string) => {
        setSelectedSeries(series)
        setSeriesTitle(title)
    }

    // Extract West/East series
    const westFirstRound = playoffs.firstRound.series.slice(0, 4)
    const eastFirstRound = playoffs.firstRound.series.slice(4, 8)
    const westConfSemis = playoffs.confSemis.series.slice(0, 2)
    const eastConfSemis = playoffs.confSemis.series.slice(2, 4)
    const westConfFinals = playoffs.confFinals.series[0]
    const eastConfFinals = playoffs.confFinals.series[1]

    return (
        <div className="min-w-0 space-y-5 tabular-nums">
            {/* Champion Banner */}
            <div className="ui-panel border-accent/30 bg-surface-raised p-6 text-center text-ink sm:p-7">
                <Trophy className="mx-auto mb-3 h-8 w-8 text-accent" />
                <div className="text-2xl font-medium tracking-tight break-words sm:text-3xl">{getLocalizedTeamName(playoffs.champion, language)}</div>
                {playoffs.finalsMVP && (
                    <div className="mt-3 text-sm text-muted">
                        {t('ui.season.playoffs.finalsMvp')}: <span className="font-medium text-accent">{playoffs.finalsMVP.playerName}</span>
                    </div>
                )}
            </div>

            <details open className="ui-panel min-w-0 overflow-hidden">
                <summary className="min-h-[52px] cursor-pointer px-4 py-4 text-sm font-medium text-ink transition-colors marker:text-accent hover:bg-surface-hover focus-visible:outline-offset-[-3px] sm:px-5">
                    {t('ui.season.playoffs.playIn')}
                </summary>
                <div className="grid gap-6 border-t border-line p-4 sm:p-5 md:grid-cols-2">
                    <PlayInSection title={t('conference.west')} playIn={playoffs.playIn.west} />
                    <PlayInSection title={t('conference.east')} playIn={playoffs.playIn.east} />
                </div>
            </details>

            {/* Bracket */}
            <div className="ui-panel min-w-0 overflow-hidden">
                <div className="border-b border-line bg-canvas/60 px-4 py-4 sm:px-5">
                    <h2 className="text-sm font-medium text-ink">{t('ui.season.playoffs.title')}</h2>
                </div>

                {/* Desktop Bracket Layout with Connecting Lines */}
                <div className="hidden overflow-x-auto p-5 lg:block">
                    <div className="relative min-w-[1000px]">
                        {/* Bracket Grid */}
                        <div className="grid grid-cols-7 gap-0" style={{ minHeight: '600px' }}>
                            {/* West First Round - Column 1 */}
                            <div className="relative flex flex-col py-2">
                                <div className="ui-section-label absolute -top-1 right-0 left-0 text-center">{t('ui.season.playoffs.firstRound')}</div>
                                {westFirstRound.map((series, i) => (
                                    <div key={`w-r1-${i}`} className="relative flex items-center" style={{ height: '25%' }}>
                                        <div className="flex-1 pr-2">
                                            <SeriesCard series={series} onClick={() => openSeriesModal(series, `${t('conference.west')} ${t('ui.season.playoffs.firstRound')}`)} />
                                        </div>
                                        {/* Connector line to next round */}
                                        <div className="absolute right-0 top-1/2 h-px w-3 bg-line-strong"></div>
                                    </div>
                                ))}
                            </div>

                            {/* West Semis - Column 2 - Position between first round pairs */}
                            <div className="relative flex flex-col py-2">
                                <div className="ui-section-label absolute -top-1 right-0 left-0 text-center">{t('ui.season.playoffs.confSemis')}</div>
                                {/* First semi - centered between 1st round matchups 1&2 (at 25% height) */}
                                <div className="flex items-center justify-center" style={{ height: '50%' }}>
                                    <div className="relative w-full flex items-center">
                                        <div className="flex-1 px-2">
                                            <SeriesCard series={westConfSemis[0]} onClick={() => openSeriesModal(westConfSemis[0], `${t('conference.west')} ${t('ui.season.playoffs.confSemis')}`)} />
                                        </div>
                                        <div className="absolute right-0 top-1/2 h-px w-3 bg-line-strong"></div>
                                    </div>
                                </div>
                                {/* Second semi - centered between 1st round matchups 3&4 (at 75% height) */}
                                <div className="flex items-center justify-center" style={{ height: '50%' }}>
                                    <div className="relative w-full flex items-center">
                                        <div className="flex-1 px-2">
                                            <SeriesCard series={westConfSemis[1]} onClick={() => openSeriesModal(westConfSemis[1], `${t('conference.west')} ${t('ui.season.playoffs.confSemis')}`)} />
                                        </div>
                                        <div className="absolute right-0 top-1/2 h-px w-3 bg-line-strong"></div>
                                    </div>
                                </div>
                                {/* Vertical connectors - span exactly between first round matchup centers */}
                                {/* Upper pair: matchup 1 center (12.5%) to matchup 2 center (37.5%) */}
                                <div className="absolute top-[12.5%] left-0 h-[25%] w-px bg-line-strong"></div>
                                {/* Lower pair: matchup 3 center (62.5%) to matchup 4 center (87.5%) */}
                                <div className="absolute top-[62.5%] left-0 h-[25%] w-px bg-line-strong"></div>
                                {/* Horizontal taps at midpoints (25% and 75%) */}
                                <div className="absolute top-[25%] left-0 h-px w-2 bg-line-strong"></div>
                                <div className="absolute top-[75%] left-0 h-px w-2 bg-line-strong"></div>
                            </div>

                            {/* West Finals - Column 3 */}
                            <div className="relative flex flex-col justify-center py-8">
                                <div className="ui-section-label absolute -top-1 right-0 left-0 text-center">{t('ui.season.playoffs.confFinals')}</div>
                                <div className="relative flex items-center">
                                    {/* Input connector */}
                                    <div className="absolute top-1/2 left-0 h-px w-3 bg-line-strong"></div>
                                    <div className="flex-1 px-2">
                                        {westConfFinals && <SeriesCard series={westConfFinals} onClick={() => openSeriesModal(westConfFinals, `${t('conference.west')} ${t('ui.season.playoffs.confFinals')}`)} />}
                                    </div>
                                    {/* Output connector */}
                                    <div className="absolute top-1/2 right-0 h-px w-3 bg-line-strong"></div>
                                </div>
                                {/* Vertical connector for West Semis */}
                                <div className="absolute top-[25%] left-0 h-[50%] w-px bg-line-strong"></div>
                            </div>

                            {/* NBA Finals - Column 4 (Center) */}
                            <div className="relative flex flex-col justify-center py-8">
                                <div className="ui-section-label absolute -top-1 right-0 left-0 text-center text-accent">{t('ui.season.playoffs.finals')}</div>
                                <div className="relative flex items-center">
                                    {/* West connector */}
                                    <div className="absolute top-1/2 left-0 h-px w-2 bg-accent/60"></div>
                                    <div className="flex-1 px-1">
                                        <SeriesCard series={playoffs.finals} highlight onClick={() => openSeriesModal(playoffs.finals, t('ui.season.playoffs.finals'))} />
                                    </div>
                                    {/* East connector */}
                                    <div className="absolute top-1/2 right-0 h-px w-2 bg-accent/60"></div>
                                </div>
                            </div>

                            {/* East Finals - Column 5 */}
                            <div className="relative flex flex-col justify-center py-8">
                                <div className="ui-section-label absolute -top-1 right-0 left-0 text-center">{t('ui.season.playoffs.confFinals')}</div>
                                <div className="relative flex items-center">
                                    {/* Input connector */}
                                    <div className="absolute top-1/2 left-0 h-px w-3 bg-line-strong"></div>
                                    <div className="flex-1 px-2">
                                        {eastConfFinals && <SeriesCard series={eastConfFinals} onClick={() => openSeriesModal(eastConfFinals, `${t('conference.east')} ${t('ui.season.playoffs.confFinals')}`)} />}
                                    </div>
                                    {/* Output connector */}
                                    <div className="absolute top-1/2 right-0 h-px w-3 bg-line-strong"></div>
                                </div>
                                {/* Vertical connector for East Semis */}
                                <div className="absolute top-[25%] right-0 h-[50%] w-px bg-line-strong"></div>
                            </div>

                            {/* East Semis - Column 6 - Position between first round pairs */}
                            <div className="relative flex flex-col py-2">
                                <div className="ui-section-label absolute -top-1 right-0 left-0 text-center">{t('ui.season.playoffs.confSemis')}</div>
                                {/* First semi - centered between 1st round matchups 1&2 (at 25% height) */}
                                <div className="flex items-center justify-center" style={{ height: '50%' }}>
                                    <div className="relative w-full flex items-center">
                                        <div className="absolute top-1/2 left-0 h-px w-3 bg-line-strong"></div>
                                        <div className="flex-1 px-2">
                                            <SeriesCard series={eastConfSemis[0]} onClick={() => openSeriesModal(eastConfSemis[0], `${t('conference.east')} ${t('ui.season.playoffs.confSemis')}`)} />
                                        </div>
                                    </div>
                                </div>
                                {/* Second semi - centered between 1st round matchups 3&4 (at 75% height) */}
                                <div className="flex items-center justify-center" style={{ height: '50%' }}>
                                    <div className="relative w-full flex items-center">
                                        <div className="absolute top-1/2 left-0 h-px w-3 bg-line-strong"></div>
                                        <div className="flex-1 px-2">
                                            <SeriesCard series={eastConfSemis[1]} onClick={() => openSeriesModal(eastConfSemis[1], `${t('conference.east')} ${t('ui.season.playoffs.confSemis')}`)} />
                                        </div>
                                    </div>
                                </div>
                                {/* Vertical connectors - span exactly between first round matchup centers */}
                                {/* Upper pair: matchup 1 center (12.5%) to matchup 2 center (37.5%) */}
                                <div className="absolute top-[12.5%] right-0 h-[25%] w-px bg-line-strong"></div>
                                {/* Lower pair: matchup 3 center (62.5%) to matchup 4 center (87.5%) */}
                                <div className="absolute top-[62.5%] right-0 h-[25%] w-px bg-line-strong"></div>
                                {/* Horizontal taps at midpoints (25% and 75%) */}
                                <div className="absolute top-[25%] right-0 h-px w-2 bg-line-strong"></div>
                                <div className="absolute top-[75%] right-0 h-px w-2 bg-line-strong"></div>
                            </div>

                            {/* East First Round - Column 7 */}
                            <div className="relative flex flex-col py-2">
                                <div className="ui-section-label absolute -top-1 right-0 left-0 text-center">{t('ui.season.playoffs.firstRound')}</div>
                                {eastFirstRound.map((series, i) => (
                                    <div key={`e-r1-${i}`} className="relative flex items-center" style={{ height: '25%' }}>
                                        {/* Connector line from previous round */}
                                        <div className="absolute top-1/2 left-0 h-px w-3 bg-line-strong"></div>
                                        <div className="flex-1 pl-2">
                                            <SeriesCard series={series} onClick={() => openSeriesModal(series, `${t('conference.east')} ${t('ui.season.playoffs.firstRound')}`)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Layout */}
                <div className="space-y-5 p-4 sm:p-5 lg:hidden">
                    <RoundSection title={t('ui.season.playoffs.finals')} series={[playoffs.finals]} highlight onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <RoundSection title={`${t('conference.west')} ${t('ui.season.playoffs.confFinals')}`} series={westConfFinals ? [westConfFinals] : []} onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                        <RoundSection title={`${t('conference.east')} ${t('ui.season.playoffs.confFinals')}`} series={eastConfFinals ? [eastConfFinals] : []} onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <RoundSection title={`${t('conference.west')} ${t('ui.season.playoffs.confSemis')}`} series={westConfSemis} onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                        <RoundSection title={`${t('conference.east')} ${t('ui.season.playoffs.confSemis')}`} series={eastConfSemis} onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                    </div>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <RoundSection title={`${t('conference.west')} ${t('ui.season.playoffs.firstRound')}`} series={westFirstRound} onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                        <RoundSection title={`${t('conference.east')} ${t('ui.season.playoffs.firstRound')}`} series={eastFirstRound} onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                    </div>
                </div>
            </div>

            {/* Series Modal */}
            {selectedSeries && (
                <SeriesModal
                    series={selectedSeries}
                    seriesTitle={seriesTitle}
                    onClose={() => setSelectedSeries(null)}
                />
            )}
        </div>
    )
}

const RoundSection = ({ title, series, highlight, onSeriesClick }: {
    title: string;
    series: SeriesResult[];
    highlight?: boolean;
    onSeriesClick?: (series: SeriesResult, seriesTitle: string) => void;
}) => (
    <div className="min-w-0">
        <div className={clsx("mb-3 text-xs font-medium tracking-wide uppercase", highlight ? "text-accent" : "text-muted")}>{title}</div>
        <div className="space-y-2.5">
            {series.map((s, i) => (
                <SeriesCard
                    key={i}
                    series={s}
                    highlight={highlight}
                    onClick={onSeriesClick ? () => onSeriesClick(s, title) : undefined}
                />
            ))}
        </div>
    </div>
)

const SeriesCard = ({ series, highlight, onClick }: {
    series: SeriesResult;
    highlight?: boolean;
    onClick?: () => void;
}) => {
    const { language } = useLocalization()

    return (
        <div className={clsx(
            "min-w-0 cursor-pointer overflow-hidden rounded-xl border transition-colors",
            highlight ? "border-accent/40 bg-accent/10 hover:border-accent/70" : "border-line bg-surface-raised hover:border-line-strong"
        )}>
            <button
                onClick={onClick}
                className="min-h-16 w-full p-3 text-left transition-colors hover:bg-surface-hover focus-visible:outline-offset-[-3px]"
            >
                <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className={clsx("truncate text-xs", series.winner === series.team1 ? "font-semibold text-success" : "text-muted")}>
                            {getLocalizedTeamName(series.team1, language)}
                        </div>
                        <div className={clsx("truncate text-xs", series.winner === series.team2 ? "font-semibold text-success" : "text-muted")}>
                            {getLocalizedTeamName(series.team2, language)}
                        </div>
                    </div>
                    <div className="ml-2 shrink-0 text-sm font-semibold text-ink tabular-nums">
                        {series.team1Wins}-{series.team2Wins}
                    </div>
                </div>
            </button>
        </div>
    )
}

const PlayInSection = ({ title, playIn }: { title: string; playIn: PlayInResult }) => {

    return (
        <div className="min-w-0">
            <div className="mb-3 text-sm font-medium text-ink">{title}</div>
            <div className="space-y-2.5">
                {playIn.games.map((game, i) => (
                    <PlayInGameCard key={i} game={game} />
                ))}
            </div>
        </div>
    )
}

const PlayInGameCard = ({ game }: { game: PlayInGameResult }) => {
    const { t, language } = useLocalization()
    const [showModal, setShowModal] = useState(false)
    const [activeTab, setActiveTab] = useState<GameDetailsTab>('commentary')
    const gameResult = game.gameResult
    const awayWon = game.winner === game.awayTeam
    const otSuffix = gameResult.finalQuarter && gameResult.finalQuarter > 4 ? ` (${gameResult.finalQuarter - 4}OT)` : ''

    // Localize the round name
    const getLocalizedRoundName = (roundName: string): string => {
        const roundLower = roundName.toLowerCase()
        if (roundLower.includes('7') && roundLower.includes('8') && !roundLower.includes('seed') && !roundLower.includes('争夺')) {
            return t('ui.season.playoffs.playIn78')
        }
        if (roundLower.includes('9') && roundLower.includes('10')) {
            return t('ui.season.playoffs.playIn910')
        }
        if (roundLower.includes('8') && (roundLower.includes('seed') || roundLower.includes('争夺'))) {
            return t('ui.season.playoffs.playIn8th')
        }
        if (roundLower.includes('final') || roundLower.includes('决赛')) {
            return t('ui.season.playoffs.playInFinal')
        }
        return roundName
    }

    // Localize the status text
    const getLocalizedStatus = (status: string): string => {
        const statusLower = status.toLowerCase()
        if (statusLower.includes('secured 7') || statusLower.includes('锁定7')) {
            return t('ui.season.playoffs.secured7th')
        }
        if (statusLower.includes('secured 8') || statusLower.includes('锁定8')) {
            return t('ui.season.playoffs.secured8th')
        }
        // Check 'advances to final' before generic 'advances'
        if (statusLower.includes('advances to final') || statusLower.includes('进入8号') || statusLower.includes('争夺')) {
            return t('ui.season.playoffs.advancesToFinal')
        }
        if (statusLower.includes('advances') || statusLower.includes('晋级')) {
            return t('ui.season.playoffs.advances')
        }
        if (statusLower.includes('eliminated') || statusLower.includes('淘汰')) {
            return t('ui.season.playoffs.eliminated')
        }
        if (statusLower.includes('will face') || statusLower.includes('将面对')) {
            return t('ui.season.playoffs.willFace')
        }
        return status
    }

    return (
        <>
            <div
                className="ui-panel-raised min-w-0 cursor-pointer p-4 text-xs transition-colors hover:border-line-strong hover:bg-surface-hover"
                onClick={() => setShowModal(true)}
            >
                <div className="ui-section-label mb-2">{getLocalizedRoundName(game.roundName)}</div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                    <span className={clsx("min-w-0 break-words", awayWon ? "font-semibold text-success" : "text-muted")}>
                        {getLocalizedTeamName(game.awayTeam, language)}
                    </span>
                    <span className="font-semibold whitespace-nowrap text-ink tabular-nums">
                        {gameResult.team1Score} - {gameResult.team2Score}
                    </span>
                    <span className={clsx("min-w-0 text-right break-words", !awayWon ? "font-semibold text-success" : "text-muted")}>
                        {getLocalizedTeamName(game.homeTeam, language)}
                    </span>
                </div>
                <div className="mt-3 text-[11px] leading-relaxed text-muted">
                    {getLocalizedTeamName(game.winner, language)}: {getLocalizedStatus(game.winnerStatus)}
                    {game.loserStatus !== 'Eliminated' && ` • ${getLocalizedTeamName(game.loser, language)}: ${getLocalizedStatus(game.loserStatus)}`}
                </div>
                {/* Hint to click for details */}
                {(gameResult.playByPlayLog?.length > 0 || gameResult.boxScore) && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-accent">
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
                                <div className="mb-2 text-xs text-muted">{getLocalizedRoundName(game.roundName)}</div>
                                <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                                    <span className={clsx(
                                        "min-w-0 text-base font-medium tracking-tight break-words sm:text-lg",
                                        awayWon ? "text-success" : "text-muted"
                                    )}>
                                        {getLocalizedTeamName(game.awayTeam, language)}
                                    </span>
                                    <span className="text-xl font-semibold tracking-tight whitespace-nowrap text-ink tabular-nums">
                                        {gameResult.team1Score} - {gameResult.team2Score}
                                    </span>
                                    <span className={clsx(
                                        "min-w-0 text-base font-medium tracking-tight break-words sm:text-lg",
                                        !awayWon ? "text-success" : "text-muted"
                                    )}>
                                        {getLocalizedTeamName(game.homeTeam, language)}
                                    </span>
                                    {otSuffix && (
                                        <span className="text-xs font-medium text-warning">{otSuffix}</span>
                                    )}
                                </div>
                                <div className="mt-3 text-xs leading-relaxed text-muted">
                                    {getLocalizedTeamName(game.winner, language)}: {getLocalizedStatus(game.winnerStatus)}
                                    {game.loserStatus !== 'Eliminated' && ` • ${getLocalizedTeamName(game.loser, language)}: ${getLocalizedStatus(game.loserStatus)}`}
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
                            game={gameResult}
                            awayTeam={game.awayTeam}
                            homeTeam={game.homeTeam}
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
