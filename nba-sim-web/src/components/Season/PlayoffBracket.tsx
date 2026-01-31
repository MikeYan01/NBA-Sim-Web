import { useState } from 'react'
import { PlayoffBracketResult, SeriesResult, PlayInResult, PlayInGameResult } from '../../models/Playoffs'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { MessageSquareText, Trophy, BarChart2, TrendingUp, X } from 'lucide-react'
import { clsx } from 'clsx'
import { SeriesModal } from './SeriesModal'
import { BoxScore as BoxScoreComponent } from '../BoxScore/BoxScore'
import { ScoreDifferentialChart } from '../GameView/ScoreDifferentialChart'
import { getTeamColors } from '../../utils/teamColors'

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
        <div className="space-y-4">
            {/* Champion Banner */}
            <div className="bg-gradient-to-r from-amber-400 to-amber-500 rounded-xl p-4 text-center text-white shadow-lg">
                <Trophy className="w-8 h-8 mx-auto mb-2" />
                <div className="text-2xl font-bold">{getLocalizedTeamName(playoffs.champion, language)}</div>
                {playoffs.finalsMVP && (
                    <div className="mt-2 text-sm">
                        {t('ui.season.playoffs.finalsMvp')}: <span className="font-semibold">{playoffs.finalsMVP.playerName}</span>
                    </div>
                )}
            </div>

            <details open className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer hover:bg-slate-50 font-medium text-slate-700">
                    {t('ui.season.playoffs.playIn')}
                </summary>
                <div className="p-4 space-y-6 border-t border-slate-100">
                    <PlayInSection title={t('conference.west')} playIn={playoffs.playIn.west} />
                    <PlayInSection title={t('conference.east')} playIn={playoffs.playIn.east} />
                </div>
            </details>

            {/* Bracket */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <h2 className="font-semibold text-slate-900">{t('ui.season.playoffs.title')}</h2>
                </div>

                {/* Desktop Bracket Layout with Connecting Lines */}
                <div className="hidden lg:block p-4 overflow-x-auto">
                    <div className="relative min-w-[1000px]">
                        {/* Bracket Grid */}
                        <div className="grid grid-cols-7 gap-0" style={{ minHeight: '600px' }}>
                            {/* West First Round - Column 1 */}
                            <div className="relative flex flex-col py-2">
                                <div className="text-xs font-medium text-slate-400 uppercase text-center absolute -top-1 left-0 right-0">{t('ui.season.playoffs.firstRound')}</div>
                                {westFirstRound.map((series, i) => (
                                    <div key={`w-r1-${i}`} className="relative flex items-center" style={{ height: '25%' }}>
                                        <div className="flex-1 pr-2">
                                            <SeriesCard series={series} onClick={() => openSeriesModal(series, `${t('conference.west')} ${t('ui.season.playoffs.firstRound')}`)} />
                                        </div>
                                        {/* Connector line to next round */}
                                        <div className="absolute right-0 top-1/2 w-3 h-px bg-slate-300"></div>
                                    </div>
                                ))}
                            </div>

                            {/* West Semis - Column 2 - Position between first round pairs */}
                            <div className="relative flex flex-col py-2">
                                <div className="text-xs font-medium text-slate-400 uppercase text-center absolute -top-1 left-0 right-0">{t('ui.season.playoffs.confSemis')}</div>
                                {/* First semi - centered between 1st round matchups 1&2 (at 25% height) */}
                                <div className="flex items-center justify-center" style={{ height: '50%' }}>
                                    <div className="relative w-full flex items-center">
                                        <div className="flex-1 px-2">
                                            <SeriesCard series={westConfSemis[0]} onClick={() => openSeriesModal(westConfSemis[0], `${t('conference.west')} ${t('ui.season.playoffs.confSemis')}`)} />
                                        </div>
                                        <div className="absolute right-0 top-1/2 w-3 h-px bg-slate-300"></div>
                                    </div>
                                </div>
                                {/* Second semi - centered between 1st round matchups 3&4 (at 75% height) */}
                                <div className="flex items-center justify-center" style={{ height: '50%' }}>
                                    <div className="relative w-full flex items-center">
                                        <div className="flex-1 px-2">
                                            <SeriesCard series={westConfSemis[1]} onClick={() => openSeriesModal(westConfSemis[1], `${t('conference.west')} ${t('ui.season.playoffs.confSemis')}`)} />
                                        </div>
                                        <div className="absolute right-0 top-1/2 w-3 h-px bg-slate-300"></div>
                                    </div>
                                </div>
                                {/* Vertical connectors - span exactly between first round matchup centers */}
                                {/* Upper pair: matchup 1 center (12.5%) to matchup 2 center (37.5%) */}
                                <div className="absolute left-0 top-[12.5%] h-[25%] w-px bg-slate-300"></div>
                                {/* Lower pair: matchup 3 center (62.5%) to matchup 4 center (87.5%) */}
                                <div className="absolute left-0 top-[62.5%] h-[25%] w-px bg-slate-300"></div>
                                {/* Horizontal taps at midpoints (25% and 75%) */}
                                <div className="absolute left-0 top-[25%] w-2 h-px bg-slate-300"></div>
                                <div className="absolute left-0 top-[75%] w-2 h-px bg-slate-300"></div>
                            </div>

                            {/* West Finals - Column 3 */}
                            <div className="relative flex flex-col justify-center py-8">
                                <div className="text-xs font-medium text-slate-400 uppercase text-center absolute -top-1 left-0 right-0">{t('ui.season.playoffs.confFinals')}</div>
                                <div className="relative flex items-center">
                                    {/* Input connector */}
                                    <div className="absolute left-0 top-1/2 w-3 h-px bg-slate-300"></div>
                                    <div className="flex-1 px-2">
                                        {westConfFinals && <SeriesCard series={westConfFinals} onClick={() => openSeriesModal(westConfFinals, `${t('conference.west')} ${t('ui.season.playoffs.confFinals')}`)} />}
                                    </div>
                                    {/* Output connector */}
                                    <div className="absolute right-0 top-1/2 w-3 h-px bg-slate-300"></div>
                                </div>
                                {/* Vertical connector for West Semis */}
                                <div className="absolute left-0 top-[25%] h-[50%] w-px bg-slate-300"></div>
                            </div>

                            {/* NBA Finals - Column 4 (Center) */}
                            <div className="relative flex flex-col justify-center py-8">
                                <div className="text-xs font-medium text-amber-500 uppercase text-center absolute -top-1 left-0 right-0">{t('ui.season.playoffs.finals')}</div>
                                <div className="relative flex items-center">
                                    {/* West connector */}
                                    <div className="absolute left-0 top-1/2 w-2 h-px bg-amber-400"></div>
                                    <div className="flex-1 px-1">
                                        <SeriesCard series={playoffs.finals} highlight onClick={() => openSeriesModal(playoffs.finals, t('ui.season.playoffs.finals'))} />
                                    </div>
                                    {/* East connector */}
                                    <div className="absolute right-0 top-1/2 w-2 h-px bg-amber-400"></div>
                                </div>
                            </div>

                            {/* East Finals - Column 5 */}
                            <div className="relative flex flex-col justify-center py-8">
                                <div className="text-xs font-medium text-slate-400 uppercase text-center absolute -top-1 left-0 right-0">{t('ui.season.playoffs.confFinals')}</div>
                                <div className="relative flex items-center">
                                    {/* Input connector */}
                                    <div className="absolute left-0 top-1/2 w-3 h-px bg-slate-300"></div>
                                    <div className="flex-1 px-2">
                                        {eastConfFinals && <SeriesCard series={eastConfFinals} onClick={() => openSeriesModal(eastConfFinals, `${t('conference.east')} ${t('ui.season.playoffs.confFinals')}`)} />}
                                    </div>
                                    {/* Output connector */}
                                    <div className="absolute right-0 top-1/2 w-3 h-px bg-slate-300"></div>
                                </div>
                                {/* Vertical connector for East Semis */}
                                <div className="absolute right-0 top-[25%] h-[50%] w-px bg-slate-300"></div>
                            </div>

                            {/* East Semis - Column 6 - Position between first round pairs */}
                            <div className="relative flex flex-col py-2">
                                <div className="text-xs font-medium text-slate-400 uppercase text-center absolute -top-1 left-0 right-0">{t('ui.season.playoffs.confSemis')}</div>
                                {/* First semi - centered between 1st round matchups 1&2 (at 25% height) */}
                                <div className="flex items-center justify-center" style={{ height: '50%' }}>
                                    <div className="relative w-full flex items-center">
                                        <div className="absolute left-0 top-1/2 w-3 h-px bg-slate-300"></div>
                                        <div className="flex-1 px-2">
                                            <SeriesCard series={eastConfSemis[0]} onClick={() => openSeriesModal(eastConfSemis[0], `${t('conference.east')} ${t('ui.season.playoffs.confSemis')}`)} />
                                        </div>
                                    </div>
                                </div>
                                {/* Second semi - centered between 1st round matchups 3&4 (at 75% height) */}
                                <div className="flex items-center justify-center" style={{ height: '50%' }}>
                                    <div className="relative w-full flex items-center">
                                        <div className="absolute left-0 top-1/2 w-3 h-px bg-slate-300"></div>
                                        <div className="flex-1 px-2">
                                            <SeriesCard series={eastConfSemis[1]} onClick={() => openSeriesModal(eastConfSemis[1], `${t('conference.east')} ${t('ui.season.playoffs.confSemis')}`)} />
                                        </div>
                                    </div>
                                </div>
                                {/* Vertical connectors - span exactly between first round matchup centers */}
                                {/* Upper pair: matchup 1 center (12.5%) to matchup 2 center (37.5%) */}
                                <div className="absolute right-0 top-[12.5%] h-[25%] w-px bg-slate-300"></div>
                                {/* Lower pair: matchup 3 center (62.5%) to matchup 4 center (87.5%) */}
                                <div className="absolute right-0 top-[62.5%] h-[25%] w-px bg-slate-300"></div>
                                {/* Horizontal taps at midpoints (25% and 75%) */}
                                <div className="absolute right-0 top-[25%] w-2 h-px bg-slate-300"></div>
                                <div className="absolute right-0 top-[75%] w-2 h-px bg-slate-300"></div>
                            </div>

                            {/* East First Round - Column 7 */}
                            <div className="relative flex flex-col py-2">
                                <div className="text-xs font-medium text-slate-400 uppercase text-center absolute -top-1 left-0 right-0">{t('ui.season.playoffs.firstRound')}</div>
                                {eastFirstRound.map((series, i) => (
                                    <div key={`e-r1-${i}`} className="relative flex items-center" style={{ height: '25%' }}>
                                        {/* Connector line from previous round */}
                                        <div className="absolute left-0 top-1/2 w-3 h-px bg-slate-300"></div>
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
                <div className="lg:hidden p-4 space-y-4">
                    <RoundSection title={t('ui.season.playoffs.finals')} series={[playoffs.finals]} highlight onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                    <div className="grid grid-cols-2 gap-4">
                        <RoundSection title={`${t('conference.west')} ${t('ui.season.playoffs.confFinals')}`} series={westConfFinals ? [westConfFinals] : []} onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                        <RoundSection title={`${t('conference.east')} ${t('ui.season.playoffs.confFinals')}`} series={eastConfFinals ? [eastConfFinals] : []} onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <RoundSection title={`${t('conference.west')} ${t('ui.season.playoffs.confSemis')}`} series={westConfSemis} onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                        <RoundSection title={`${t('conference.east')} ${t('ui.season.playoffs.confSemis')}`} series={eastConfSemis} onSeriesClick={(series, title) => openSeriesModal(series, title)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
    <div>
        <div className={clsx("text-xs font-medium uppercase mb-2", highlight ? "text-amber-500" : "text-slate-400")}>{title}</div>
        <div className="space-y-2">
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
            "rounded-lg border overflow-hidden cursor-pointer transition-all hover:shadow-md",
            highlight ? "border-amber-300 bg-amber-50 hover:border-amber-400" : "border-slate-200 bg-white hover:border-slate-300"
        )}>
            <button
                onClick={onClick}
                className="w-full p-2 text-left hover:bg-slate-50/50 transition-colors"
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <div className={clsx("text-xs truncate", series.winner === series.team1 ? "font-bold text-green-600" : "text-slate-600")}>
                            {getLocalizedTeamName(series.team1, language)}
                        </div>
                        <div className={clsx("text-xs truncate", series.winner === series.team2 ? "font-bold text-green-600" : "text-slate-600")}>
                            {getLocalizedTeamName(series.team2, language)}
                        </div>
                    </div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums ml-2">
                        {series.team1Wins}-{series.team2Wins}
                    </div>
                </div>
            </button>
        </div>
    )
}

const PlayInSection = ({ title, playIn }: { title: string; playIn: PlayInResult }) => {

    return (
        <div>
            <div className="text-sm font-medium text-slate-700 mb-2">{title}</div>
            <div className="space-y-2">
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
    const [activeTab, setActiveTab] = useState<'commentary' | 'boxscore' | 'differential'>('commentary')
    const gameResult = game.gameResult
    const awayWon = game.winner === game.awayTeam
    const otSuffix = gameResult.finalQuarter && gameResult.finalQuarter > 4 ? ` (${gameResult.finalQuarter - 4}OT)` : ''

    // Get team colors for the chart
    const team1Colors = getTeamColors(game.awayTeam)
    const team2Colors = getTeamColors(game.homeTeam)

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
                className="bg-slate-50 rounded-lg p-3 text-xs border border-slate-200 hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all"
                onClick={() => setShowModal(true)}
            >
                <div className="text-[10px] text-slate-400 uppercase mb-1">{getLocalizedRoundName(game.roundName)}</div>
                <div className="flex items-center justify-between">
                    <span className={clsx(awayWon ? "font-bold text-green-600" : "text-slate-600")}>
                        {getLocalizedTeamName(game.awayTeam, language)}
                    </span>
                    <span className="font-bold tabular-nums">
                        {gameResult.team1Score} - {gameResult.team2Score}
                    </span>
                    <span className={clsx(!awayWon ? "font-bold text-green-600" : "text-slate-600")}>
                        {getLocalizedTeamName(game.homeTeam, language)}
                    </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                    {getLocalizedTeamName(game.winner, language)}: {getLocalizedStatus(game.winnerStatus)}
                    {game.loserStatus !== 'Eliminated' && ` • ${getLocalizedTeamName(game.loser, language)}: ${getLocalizedStatus(game.loserStatus)}`}
                </div>
                {/* Hint to click for details */}
                {(gameResult.playByPlayLog?.length > 0 || gameResult.boxScore) && (
                    <div className="text-[10px] text-indigo-500 mt-1.5 flex items-center gap-1">
                        <span>{t('ui.common.expand')}</span>
                    </div>
                )}
            </div>

            {/* Game Detail Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
                            <div>
                                <div className="text-sm text-slate-500 mb-1">{getLocalizedRoundName(game.roundName)}</div>
                                <div className="flex items-center gap-4">
                                    <span className={clsx(
                                        "text-lg font-bold",
                                        awayWon ? "text-green-600" : "text-slate-700"
                                    )}>
                                        {getLocalizedTeamName(game.awayTeam, language)}
                                    </span>
                                    <span className="text-xl font-bold tabular-nums text-slate-900">
                                        {gameResult.team1Score} - {gameResult.team2Score}
                                    </span>
                                    <span className={clsx(
                                        "text-lg font-bold",
                                        !awayWon ? "text-green-600" : "text-slate-700"
                                    )}>
                                        {getLocalizedTeamName(game.homeTeam, language)}
                                    </span>
                                    {otSuffix && (
                                        <span className="text-sm text-orange-500 font-medium">{otSuffix}</span>
                                    )}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {getLocalizedTeamName(game.winner, language)}: {getLocalizedStatus(game.winnerStatus)}
                                    {game.loserStatus !== 'Eliminated' && ` • ${getLocalizedTeamName(game.loser, language)}: ${getLocalizedStatus(game.loserStatus)}`}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-full hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Tab Navigation */}
                        <div className="flex border-b border-slate-100 bg-slate-50">
                            <button
                                onClick={() => setActiveTab('commentary')}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                                    activeTab === 'commentary'
                                        ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                                        : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <MessageSquareText className="w-4 h-4" />
                                {t('ui.season.recaps.commentary')}
                            </button>
                            {gameResult.boxScore && (
                                <button
                                    onClick={() => setActiveTab('boxscore')}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                                        activeTab === 'boxscore'
                                            ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <BarChart2 className="w-4 h-4" />
                                    {t('ui.boxScore.title')}
                                </button>
                            )}
                            {gameResult.scoreSnapshots && gameResult.scoreSnapshots.length > 0 && (
                                <button
                                    onClick={() => setActiveTab('differential')}
                                    className={clsx(
                                        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                                        activeTab === 'differential'
                                            ? "text-indigo-600 border-b-2 border-indigo-600 bg-white"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    {t('game.score_differential_title')}
                                </button>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {activeTab === 'commentary' && gameResult.playByPlayLog && (
                                <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                                    {gameResult.playByPlayLog.join('\n')}
                                </div>
                            )}
                            {activeTab === 'boxscore' && gameResult.boxScore && (
                                <BoxScoreComponent boxScore={gameResult.boxScore} />
                            )}
                            {activeTab === 'differential' && gameResult.scoreSnapshots && gameResult.scoreSnapshots.length > 0 && (
                                <ScoreDifferentialChart
                                    scoreSnapshots={gameResult.scoreSnapshots}
                                    timeSnapshots={gameResult.timeSnapshots || []}
                                    visibleCount={gameResult.scoreSnapshots.length}
                                    team1Name={getLocalizedTeamName(game.awayTeam, language)}
                                    team2Name={getLocalizedTeamName(game.homeTeam, language)}
                                    team1Color={team1Colors.primary}
                                    team2Color={team2Colors.primary}
                                />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
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
