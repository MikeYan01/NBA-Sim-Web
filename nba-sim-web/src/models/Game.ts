/**
 * Game Module
 *
 * Simulates basketball games between two teams.
 * Migrated from Java Game.java.
 *
 * This module handles:
 * - Game simulation with possession-by-possession logic
 * - Quarter/overtime management
 * - Score tracking and game flow insights
 * - Box score generation
 */

import type { Player } from './Player'
import { Team } from './Team'
import {
    Language,
    LoseBallResult,
    BlockResult,
    FoulResult,
    ShotResult,
    ShotType,
    type Position,
    type ShotChoiceResult,
} from './types'
import { SeededRandom } from '../utils/SeededRandom'
import {
    generateRandomPlayTime,
    choosePlayerBasedOnRating,
    chooseDefensePlayer,
    judgeLoseBall,
    judgeBlock,
    judgeNormalFoul,
    getShotDistance,
    calculatePercentage,
    judgeMakeShot,
    makeFreeThrow,
    updatePlayerMinutes,
    checkIntelligentSubstitutions,
    ensureStartersAtQuarterStart,
    jumpBall,
    judgeInjury,
    type LoseBallOutcome,
    type BlockOutcome,
    type ShotOutcome,
} from '../utils/Utilities'
import {
    DIFF1, TIME_LEFT1,
    DIFF2, TIME_LEFT2,
    DIFF3, TIME_LEFT3,
} from '../utils/Constants'
import {
    createCommentaryOutput,
    getJumpBallComments,
    getBallComment,
    getTimeAndScore,
    quarterEnd,
    regularEnd,
    gameEnd,
    getTeamData,
    getShotChoice,
    getShotPosition,
    getMakeShotsComment,
    getMissShotsComment,
    getStealComment,
    getTurnoverComment,
    getFastBreak,
    getNonFastBreak,
    getBlockComment,
    getReboundComment,
    shotOutOfBound,
    getStartersComment,
    type CommentaryOutput,
} from '../utils/Comments'

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Score differential tracking point.
 */
export interface ScoreDifferentialPoint {
    quarter: number
    timeRemaining: number
    differential: number // positive = team1 ahead, negative = team2 ahead
}

/**
 * Game flow insights for recap generation.
 */
export interface GameFlowInsights {
    team1LargestLead: number
    team2LargestLead: number
    leadChanges: number
    timesTied: number
    team1MaxLeadTime: string
    team2MaxLeadTime: string
}

/**
 * Individual player box score entry.
 */
export interface PlayerBoxScore {
    name: string
    englishName: string
    minutes: string
    points: number
    rebounds: number
    assists: number
    steals: number
    blocks: number
    fgMade: number
    fgAttempted: number
    threeMade: number
    threeAttempted: number
    ftMade: number
    ftAttempted: number
    turnovers: number
    fouls: number
    isStarter: boolean
}

/**
 * Team totals in box score.
 */
export interface TeamTotals {
    points: number
    rebounds: number
    assists: number
    steals: number
    blocks: number
    fgMade: number
    fgAttempted: number
    fgPct: number
    threeMade: number
    threeAttempted: number
    threePct: number
    ftMade: number
    ftAttempted: number
    ftPct: number
    turnovers: number
    fouls: number
}

/**
 * Complete box score for one team.
 */
export interface TeamBoxScore {
    teamName: string
    players: PlayerBoxScore[]
    totals: TeamTotals
}

/**
 * Full game box score.
 */
export interface BoxScore {
    team1: TeamBoxScore
    team2: TeamBoxScore
    /** Quarter-by-quarter scores: [[Q1, Q2, Q3, Q4, OT1...], [Q1, Q2, Q3, Q4, OT1...]] */
    quarterScores?: number[][]
}

/**
 * Player recap data for game summary.
 */
export interface PlayerRecapData {
    name: string
    points: number
    rebounds: number
    assists: number
    steals: number
    blocks: number
    fgMade: number
    fgAttempted: number
    marker: string // Special markers like 🔥, ⭐
}

/**
 * Game recap data for season summary.
 */
export interface GameRecapData {
    date: string
    awayTeam: string
    homeTeam: string
    awayScore: number
    homeScore: number
    awayFgPct: number
    homeFgPct: number
    away3pPct: number
    home3pPct: number
    awayTopPlayers: PlayerRecapData[]
    homeTopPlayers: PlayerRecapData[]
    awayWins: number
    awayLosses: number
    homeWins: number
    homeLosses: number
    flowInsights: GameFlowInsights
    finalQuarter: number
    /** Play-by-play commentary for the game */
    playByPlayLog: string[]
    /** Optional box score for detailed stats */
    boxScore?: BoxScore
    /** Score snapshots [team1Score, team2Score] for each log line */
    scoreSnapshots?: [number, number][]
    /** Time snapshots [quarter, timeRemaining] for each log line */
    timeSnapshots?: [number, number][]
}

/**
 * Complete game result returned after simulation.
 */
export interface GameResult {
    team1Name: string
    team2Name: string
    team1Score: number
    team2Score: number
    winner: string
    boxScore: BoxScore
    playByPlayLog: string[]
    /** Score snapshots [team1Score, team2Score] for each log line */
    scoreSnapshots: [number, number][]
    /** Time snapshots [quarter, timeRemaining] for each log line */
    timeSnapshots: [number, number][]
    flowInsights: GameFlowInsights
    finalQuarter: number
    quarterScores: number[][] // [team1Scores, team2Scores]
    recap?: GameRecapData // Optional recap data for season tracking
}

/**
 * Game simulation options.
 */
export interface GameOptions {
    seed?: number
    language?: Language
}

// =============================================================================
// GAME STATE
// =============================================================================

/**
 * Internal game state during simulation.
 */
interface GameState {
    team1: Team
    team2: Team
    teamOneOnCourt: Map<Position, Player>
    teamTwoOnCourt: Map<Position, Player>
    quarterTime: number
    currentQuarter: number
    isSecondChance: boolean
    team1Scores: number[]
    team2Scores: number[]
    scoreDifferentials: ScoreDifferentialPoint[]
    minutesRecorded: boolean[]
    gameFlow: GameFlowInsights
    previousDifferential: number
    totalGameTime: number
    random: SeededRandom
    language: Language
    commentary: CommentaryOutput
    isPlayoff: boolean
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sync current team scores and time to commentary output for real-time tracking.
 * Call this after any scoring play and before generating commentary.
 */
function syncScoresToCommentary(state: GameState, quarterTime?: number): void {
    state.commentary.currentScore1 = state.team1.totalScore
    state.commentary.currentScore2 = state.team2.totalScore
    state.commentary.currentQuarter = state.currentQuarter
    if (quarterTime !== undefined) {
        state.commentary.currentTimeRemaining = quarterTime
    }
}

/**
 * Create initial game flow insights.
 */
function createGameFlowInsights(): GameFlowInsights {
    return {
        team1LargestLead: 0,
        team2LargestLead: 0,
        leadChanges: 0,
        timesTied: 1, // Start at 1 because game begins 0-0
        team1MaxLeadTime: '',
        team2MaxLeadTime: '',
    }
}

/**
 * Format time for display.
 */
function formatTime(quarter: number, timeRemaining: number, _language: Language): string {
    const minutes = Math.floor(timeRemaining / 60)
    const seconds = timeRemaining % 60
    const quarterStr = quarter <= 4
        ? `Q${quarter}`
        : `OT${quarter - 4}`
    return `${quarterStr} ${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Update game flow insights based on current differential.
 */
function updateGameFlowInsights(
    gameFlow: GameFlowInsights,
    currentDiff: number,
    previousDiff: number,
    quarter: number,
    timeRemaining: number,
    language: Language
): void {
    // Track largest leads
    if (currentDiff > gameFlow.team1LargestLead) {
        gameFlow.team1LargestLead = currentDiff
        gameFlow.team1MaxLeadTime = formatTime(quarter, timeRemaining, language)
    }
    if (currentDiff < -gameFlow.team2LargestLead) {
        gameFlow.team2LargestLead = -currentDiff
        gameFlow.team2MaxLeadTime = formatTime(quarter, timeRemaining, language)
    }

    // Track lead changes (only when lead actually changes hands)
    if ((previousDiff > 0 && currentDiff < 0) || (previousDiff < 0 && currentDiff > 0)) {
        gameFlow.leadChanges++
    }

    // Track times tied
    if (previousDiff !== 0 && currentDiff === 0) {
        gameFlow.timesTied++
    }
}

/**
 * Get top 3 performing players from a team based on points.
 * Adds special markers for exceptional performances.
 */
function getTopPlayers(team: Team, language: Language = Language.ENGLISH): PlayerRecapData[] {
    const topPlayers: PlayerRecapData[] = []

    // Sort players by points (descending)
    const sortedPlayers = [...team.players].sort((p1, p2) => p2.score - p1.score)

    // Take top 3 players
    for (let i = 0; i < Math.min(3, sortedPlayers.length); i++) {
        const p = sortedPlayers[i]
        let marker = ''

        // Count stats >= 10 for triple-double check
        let doubleDigitStats = 0
        if (p.score >= 10) doubleDigitStats++
        if (p.rebound >= 10) doubleDigitStats++
        if (p.assist >= 10) doubleDigitStats++
        if (p.steal >= 10) doubleDigitStats++
        if (p.block >= 10) doubleDigitStats++

        // Calculate shooting efficiency
        const fgPct = p.shotAttempted > 0 ? (p.shotMade * 100.0 / p.shotAttempted) : 0.0
        const efficientScoring = p.score >= 20 && fgPct >= 70.0

        // Add special markers for exceptional performances (priority order)
        if (efficientScoring) {
            marker = '🎯 '  // Efficient scorer (20+ points on 70%+ shooting)
        } else if (p.score >= 40) {
            marker = '🔥 '  // 40+ points
        } else if (doubleDigitStats >= 3) {
            marker = '🔥 '  // Triple double
        } else if ((p.score >= 15 && p.rebound >= 15) || (p.score >= 15 && p.assist >= 15) ||
            (p.rebound >= 15 && p.assist >= 15)) {
            marker = '🔥 '  // Big double-double (15+15)
        } else if (p.steal >= 4 || p.block >= 4) {
            marker = '🔒 '  // Strong defense (4+ steals OR 4+ blocks)
        }

        topPlayers.push({
            name: p.getDisplayName(language),
            points: p.score,
            rebounds: p.rebound,
            assists: p.assist,
            steals: p.steal,
            blocks: p.block,
            fgMade: p.shotMade,
            fgAttempted: p.shotAttempted,
            marker,
        })
    }

    return topPlayers
}

/**
 * Generate game recap data from completed game.
 */
function generateGameRecap(
    team1: Team,
    team2: Team,
    date: string,
    gameFlow: GameFlowInsights,
    finalQuarter: number,
    playByPlayLog: string[],
    language: Language = Language.ENGLISH,
    boxScore?: BoxScore,
    scoreSnapshots?: [number, number][],
    timeSnapshots?: [number, number][]
): GameRecapData {
    // Calculate team shooting percentages
    const team1FgPct = team1.totalShotAttempted > 0
        ? (team1.totalShotMade * 100.0 / team1.totalShotAttempted) : 0.0
    const team2FgPct = team2.totalShotAttempted > 0
        ? (team2.totalShotMade * 100.0 / team2.totalShotAttempted) : 0.0
    const team13pPct = team1.total3Attempted > 0
        ? (team1.total3Made * 100.0 / team1.total3Attempted) : 0.0
    const team23pPct = team2.total3Attempted > 0
        ? (team2.total3Made * 100.0 / team2.total3Attempted) : 0.0

    return {
        date,
        awayTeam: team1.name,
        homeTeam: team2.name,
        awayScore: team1.totalScore,
        homeScore: team2.totalScore,
        awayFgPct: team1FgPct,
        homeFgPct: team2FgPct,
        away3pPct: team13pPct,
        home3pPct: team23pPct,
        awayTopPlayers: getTopPlayers(team1, language),
        homeTopPlayers: getTopPlayers(team2, language),
        awayWins: 0, // Will be updated by Season
        awayLosses: 0,
        homeWins: 0,
        homeLosses: 0,
        flowInsights: gameFlow,
        finalQuarter,
        playByPlayLog,
        boxScore,
        scoreSnapshots,
        timeSnapshots,
    }
}

/**
 * Initialize players on court for a team.
 */
function initializePlayersOnCourt(team: Team): Map<Position, Player> {
    const onCourt = new Map<Position, Player>()
    for (const [pos, player] of team.starters) {
        onCourt.set(pos, player)
        player.isOnCourt = true
        player.secondsPlayed = 0
        player.currentStintSeconds = 0
        player.lastSubbedOutTime = 0
    }
    return onCourt
}

/**
 * Check if it's garbage time based on score differential and time remaining.
 */
function isGarbageTime(
    scoreDiff: number,
    currentQuarter: number,
    quarterTime: number
): boolean {
    return (
        (currentQuarter === 4 && scoreDiff >= DIFF1 && quarterTime <= TIME_LEFT1) ||
        (currentQuarter === 4 && scoreDiff >= DIFF2 && quarterTime <= TIME_LEFT2) ||
        (currentQuarter === 4 && scoreDiff >= DIFF3 && quarterTime <= TIME_LEFT3)
    )
}

/**
 * Update quarter scores at the end of each quarter.
 */
function updateQuarterScores(
    team1Scores: number[],
    team2Scores: number[],
    team1TotalScore: number,
    team2TotalScore: number
): void {
    team1Scores.push(team1TotalScore)
    team2Scores.push(team2TotalScore)
}

/**
 * Generate player box score from player stats.
 */
function generatePlayerBoxScore(player: Player, language: Language): PlayerBoxScore {
    const minutes = Math.floor(player.secondsPlayed / 60)
    const seconds = player.secondsPlayed % 60
    const minutesStr = player.hasBeenOnCourt
        ? `${minutes}:${seconds.toString().padStart(2, '0')}`
        : 'DNP'

    return {
        name: player.getDisplayName(language),
        englishName: player.englishName,
        minutes: minutesStr,
        points: player.score,
        rebounds: player.rebound,
        assists: player.assist,
        steals: player.steal,
        blocks: player.block,
        fgMade: player.shotMade,
        fgAttempted: player.shotAttempted,
        threeMade: player.threeMade,
        threeAttempted: player.threeAttempted,
        ftMade: player.freeThrowMade,
        ftAttempted: player.freeThrowAttempted,
        turnovers: player.turnover,
        fouls: player.foul,
        isStarter: player.rotationType === 1, // RotationType.STARTER = 1
    }
}

/**
 * Generate team totals from player stats.
 */
function generateTeamTotals(team: Team): TeamTotals {
    let totalRebounds = 0
    let totalAssists = 0
    let totalSteals = 0
    let totalBlocks = 0
    let totalFouls = 0
    let totalTurnovers = 0
    let totalFgMade = 0
    let totalFgAttempted = 0
    let totalThreeMade = 0
    let totalThreeAttempted = 0
    let totalFtMade = 0
    let totalFtAttempted = 0

    for (const player of team.players) {
        totalRebounds += player.rebound
        totalAssists += player.assist
        totalSteals += player.steal
        totalBlocks += player.block
        totalFouls += player.foul
        totalTurnovers += player.turnover
        totalFgMade += player.shotMade
        totalFgAttempted += player.shotAttempted
        totalThreeMade += player.threeMade
        totalThreeAttempted += player.threeAttempted
        totalFtMade += player.freeThrowMade
        totalFtAttempted += player.freeThrowAttempted
    }

    return {
        points: team.totalScore,
        rebounds: totalRebounds,
        assists: totalAssists,
        steals: totalSteals,
        blocks: totalBlocks,
        fgMade: totalFgMade,
        fgAttempted: totalFgAttempted,
        fgPct: totalFgAttempted > 0 ? (totalFgMade / totalFgAttempted) * 100 : 0,
        threeMade: totalThreeMade,
        threeAttempted: totalThreeAttempted,
        threePct: totalThreeAttempted > 0 ? (totalThreeMade / totalThreeAttempted) * 100 : 0,
        ftMade: totalFtMade,
        ftAttempted: totalFtAttempted,
        ftPct: totalFtAttempted > 0 ? (totalFtMade / totalFtAttempted) * 100 : 0,
        turnovers: totalTurnovers,
        fouls: totalFouls,
    }
}

/**
 * Generate complete box score for both teams.
 */
export function generateBoxScore(team1: Team, team2: Team, language: Language, quarterScores?: number[][]): BoxScore {
    return {
        team1: {
            teamName: team1.name,
            players: team1.players.map((p) => generatePlayerBoxScore(p, language)),
            totals: generateTeamTotals(team1),
        },
        team2: {
            teamName: team2.name,
            players: team2.players.map((p) => generatePlayerBoxScore(p, language)),
            totals: generateTeamTotals(team2),
        },
        quarterScores,
    }
}

// =============================================================================
// POSSESSION SIMULATION
// =============================================================================

/**
 * Simulate a single possession.
 * Returns the time consumed by this possession.
 */
function playPossession(state: GameState): number {
    // Sync scores to commentary at the start of possession
    syncScoresToCommentary(state, state.quarterTime)

    const {
        team1,
        team2,
        teamOneOnCourt,
        teamTwoOnCourt,
        quarterTime,
        currentQuarter,
        random,
        language,
        commentary,
        isPlayoff,
    } = state

    // Determine play time (playoffs have slower pace)
    let currentPlayTime: number
    if (!state.isSecondChance) {
        currentPlayTime = quarterTime > 24 ? generateRandomPlayTime(random, 24, isPlayoff) : quarterTime
    } else {
        currentPlayTime = quarterTime > 24 ? generateRandomPlayTime(random, 14, isPlayoff) : quarterTime
        state.isSecondChance = false
    }

    // Update player minutes for both teams
    updatePlayerMinutes(teamOneOnCourt, currentPlayTime)
    updatePlayerMinutes(teamTwoOnCourt, currentPlayTime)
    state.totalGameTime += currentPlayTime

    // Get offense and defense teams
    const offenseTeam = team1.hasBall ? team1 : team2
    const defenseTeam = !team1.hasBall ? team1 : team2
    const offenseTeamOnCourt = team1.hasBall ? teamOneOnCourt : teamTwoOnCourt
    const defenseTeamOnCourt = !team1.hasBall ? teamOneOnCourt : teamTwoOnCourt

    // Choose players
    const offensePlayer = choosePlayerBasedOnRating(
        random,
        offenseTeamOnCourt,
        'rating',
        currentQuarter,
        quarterTime,
        offenseTeam,
        defenseTeam
    )

    if (!offensePlayer) {
        throw new Error('Cannot continue game without offense player')
    }

    const defensePlayer = chooseDefensePlayer(random, offensePlayer, defenseTeamOnCourt)

    // Generate ball comment
    getBallComment(
        offenseTeam.name,
        offensePlayer.getDisplayName(language),
        defensePlayer.getDisplayName(language),
        random,
        language,
        commentary
    )

    // Judge ball possession lost: turnover, steal, jumpball lose
    const loseBallOutcome: LoseBallOutcome = judgeLoseBall(
        random,
        defenseTeam,
        defenseTeamOnCourt,
        offensePlayer,
        defensePlayer,
        language,
        commentary
    )

    const loseBallResult = loseBallOutcome.result

    if (loseBallResult === LoseBallResult.LOSE_BALL_NO_SCORE) {
        // Turnover, no fast break (stats already updated in judgeLoseBall)
        if (loseBallOutcome.isSteal) {
            getStealComment(
                offensePlayer.getDisplayName(language),
                defensePlayer.getDisplayName(language),
                random,
                language,
                commentary
            )
            getNonFastBreak(defenseTeam.name, random, language, commentary)
        } else {
            getTurnoverComment(offensePlayer.getDisplayName(language), random, language, commentary)
        }
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    } else if (loseBallResult === LoseBallResult.LOSE_BALL_AND_SCORE) {
        // Turnover with fast break score (stats already updated in judgeLoseBall)
        // Sync scores after fast break scoring
        syncScoresToCommentary(state, quarterTime - currentPlayTime)
        getStealComment(
            offensePlayer.getDisplayName(language),
            defensePlayer.getDisplayName(language),
            random,
            language,
            commentary
        )
        getFastBreak(
            defenseTeam.name,
            (loseBallOutcome.fastBreakScorer ?? defensePlayer).getDisplayName(language),
            random,
            language,
            commentary
        )
        getTimeAndScore(
            quarterTime - currentPlayTime,
            currentQuarter,
            team1,
            team2,
            language,
            commentary
        )
        // After a made basket (fast break), the original offense team inbounds the ball
        // Possession stays with the offense team (who was scored on)
        // Note: No hasBall change needed - offense team keeps the ball to inbound
        return currentPlayTime
    } else if (loseBallResult === LoseBallResult.JUMP_BALL_WIN) {
        // Won jump ball, keep possession
        return currentPlayTime
    }

    // Judge offensive or defensive foul (no free-throw type)
    const foulResult = judgeNormalFoul(
        random,
        offenseTeamOnCourt,
        defenseTeamOnCourt,
        offensePlayer,
        defensePlayer,
        offenseTeam,
        defenseTeam,
        currentQuarter,
        quarterTime,
        team1,
        team2,
        language,
        commentary,
        (
            rand,
            player,
            offOnCourt,
            defOnCourt,
            offTeam,
            times,
            qTime,
            qtr,
            t1,
            t2,
            isFlag
        ) => makeFreeThrow(rand, player, offOnCourt, defOnCourt, offTeam, times, qTime, qtr, t1, t2, isFlag, language, commentary)
    )

    if (foulResult === FoulResult.OFFENSIVE_FOUL) {
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    } else if (foulResult === FoulResult.DEFENSIVE_FOUL) {
        // Sync scores after potential free throws from bonus
        syncScoresToCommentary(state, quarterTime - currentPlayTime)
        return currentPlayTime
    }

    if (judgeInjury(random, offenseTeamOnCourt, defenseTeamOnCourt, offenseTeam, defenseTeam, language, commentary)) {
        return 0
    }
    const distance = getShotDistance(random, offensePlayer)
    const shotPos = getShotPosition(random, distance, language)
    const shotChoice: ShotChoiceResult = getShotChoice(
        random,
        offensePlayer,
        distance,
        shotPos,
        language,
        commentary
    )
    const { shotType, movement: shotMovement } = shotChoice

    // Judge block (stats are updated inside judgeBlock)
    const blockOutcome: BlockOutcome = judgeBlock(
        random,
        distance,
        offenseTeamOnCourt,
        defenseTeamOnCourt,
        offensePlayer,
        defensePlayer,
        language,
        commentary
    )

    if (blockOutcome.result === BlockResult.BLOCK_OFFENSIVE_REBOUND) {
        getBlockComment(defensePlayer.getDisplayName(language), random, language, commentary)
        if (blockOutcome.reboundOutcome) {
            const { rebounder, isOffensiveRebound } = blockOutcome.reboundOutcome
            getReboundComment(
                rebounder.getDisplayName(language),
                isOffensiveRebound,
                random,
                language,
                commentary
            )
        }
        state.isSecondChance = true
        return currentPlayTime
    } else if (blockOutcome.result === BlockResult.BLOCK_DEFENSIVE_REBOUND) {
        getBlockComment(defensePlayer.getDisplayName(language), random, language, commentary)
        if (blockOutcome.reboundOutcome) {
            const { rebounder, isOffensiveRebound } = blockOutcome.reboundOutcome
            getReboundComment(
                rebounder.getDisplayName(language),
                isOffensiveRebound,
                random,
                language,
                commentary
            )
        }
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    }

    // Calculate shot percentage (playoffs have tighter defense)
    // Home team (team2) is on offense when team1 doesn't have the ball
    const isHomeTeamOnOffense = !team1.hasBall
    const percentage = calculatePercentage(
        random,
        distance,
        offensePlayer,
        defensePlayer,
        offenseTeamOnCourt,
        shotType,
        quarterTime,
        currentQuarter,
        offenseTeam,
        defenseTeam,
        isPlayoff,
        isHomeTeamOnOffense
    )

    // Judge whether to make the shot (stats are updated inside judgeMakeShot)
    const shotOutcome: ShotOutcome = judgeMakeShot(
        random,
        distance,
        offensePlayer,
        defensePlayer,
        offenseTeam,
        defenseTeam,
        offenseTeamOnCourt,
        defenseTeamOnCourt,
        percentage,
        quarterTime - currentPlayTime,
        currentQuarter,
        team1,
        team2,
        shotMovement,
        language,
        commentary
    )

    if (shotOutcome.result === ShotResult.MADE_SHOT) {
        // Sync scores after made shot (score was updated in judgeMakeShot)
        syncScoresToCommentary(state, quarterTime - currentPlayTime)
        getMakeShotsComment(
            offensePlayer.getDisplayName(language),
            defensePlayer.getDisplayName(language),
            distance,
            shotType,
            random,
            language,
            commentary
        )
        // Add time and score line after made shot
        getTimeAndScore(
            quarterTime - currentPlayTime,
            currentQuarter,
            team1,
            team2,
            language,
            commentary
        )
        // Add garbage time starters comment after time/score line
        if (shotOutcome.garbageTimeTeam) {
            getStartersComment(shotOutcome.garbageTimeTeam, random, language, commentary)
        }
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    } else if (shotOutcome.result === ShotResult.MADE_FREE_THROWS) {
        // Shot was missed but free throws were made after shooting foul
        // Score is already updated in makeFreeThrow, just sync
        // Do NOT call getMakeShotsComment or add extra time/score lines here
        syncScoresToCommentary(state, quarterTime - currentPlayTime)
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    } else if (shotOutcome.result === ShotResult.DEFENSIVE_REBOUND) {
        if (!shotOutcome.fromFreeThrow) {
            getMissShotsComment(shotType, offensePlayer.getDisplayName(language), random, language, commentary)
        }
        if (shotOutcome.reboundOutcome) {
            const { rebounder, isOffensiveRebound } = shotOutcome.reboundOutcome
            getReboundComment(
                rebounder.getDisplayName(language),
                isOffensiveRebound,
                random,
                language,
                commentary
            )
        }
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    } else if (shotOutcome.result === ShotResult.OUT_OF_BOUNDS) {
        if (!shotOutcome.fromFreeThrow) {
            getMissShotsComment(shotType, offensePlayer.getDisplayName(language), random, language, commentary)
        }
        shotOutOfBound(offensePlayer.getDisplayName(language), random, language, commentary)
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    } else if (shotOutcome.result === ShotResult.OFFENSIVE_REBOUND) {
        if (!shotOutcome.fromFreeThrow) {
            getMissShotsComment(shotType, offensePlayer.getDisplayName(language), random, language, commentary)
        }
        if (shotOutcome.reboundOutcome) {
            const { rebounder, isOffensiveRebound } = shotOutcome.reboundOutcome
            getReboundComment(
                rebounder.getDisplayName(language),
                isOffensiveRebound,
                random,
                language,
                commentary
            )
        }
        state.isSecondChance = true
        return currentPlayTime
    }

    return currentPlayTime
}

// =============================================================================
// QUARTER SIMULATION
// =============================================================================

/**
 * Simulate a full quarter (or overtime period).
 */
function playQuarter(state: GameState): void {
    const { team1, team2, teamOneOnCourt, teamTwoOnCourt, random, language, commentary } = state

    // Record score at the start of the quarter
    const startDiff = team1.totalScore - team2.totalScore
    state.scoreDifferentials.push({
        quarter: state.currentQuarter,
        timeRemaining: state.quarterTime,
        differential: startDiff,
    })
    state.minutesRecorded[12] = true

    while (state.quarterTime > 0) {
        // Track score differential at minute boundaries before the possession
        const beforeMinute = Math.floor(state.quarterTime / 60)

        // Check if it's garbage time
        const scoreDiff = Math.abs(team1.totalScore - team2.totalScore)
        const garbageTime = isGarbageTime(scoreDiff, state.currentQuarter, state.quarterTime)

        // Intelligent substitution system
        checkIntelligentSubstitutions(
            random,
            team1,
            teamOneOnCourt,
            state.currentQuarter,
            state.quarterTime,
            state.totalGameTime,
            team1,
            team2,
            garbageTime,
            language,
            commentary
        )
        checkIntelligentSubstitutions(
            random,
            team2,
            teamTwoOnCourt,
            state.currentQuarter,
            state.quarterTime,
            state.totalGameTime,
            team1,
            team2,
            garbageTime,
            language,
            commentary
        )

        // Play a possession
        const timeConsumed = playPossession(state)
        state.quarterTime -= timeConsumed

        // Track score differential after the possession
        const afterMinute = Math.floor(state.quarterTime / 60)

        // Record score for each minute we're entering for the first time
        for (let minute = beforeMinute - 1; minute >= afterMinute && minute >= 0; minute--) {
            if (minute <= 12 && !state.minutesRecorded[minute]) {
                const timeAtMinute = minute * 60
                const differential = team1.totalScore - team2.totalScore
                state.scoreDifferentials.push({
                    quarter: state.currentQuarter,
                    timeRemaining: timeAtMinute,
                    differential,
                })
                state.minutesRecorded[minute] = true

                // Update game flow insights
                updateGameFlowInsights(
                    state.gameFlow,
                    differential,
                    state.previousDifferential,
                    state.currentQuarter,
                    timeAtMinute,
                    language
                )
                state.previousDifferential = differential
            }
        }
    }

    // Quarter ended - update quarter scores
    updateQuarterScores(state.team1Scores, state.team2Scores, team1.totalScore, team2.totalScore)
}

// =============================================================================
// OVERTIME HANDLING
// =============================================================================

/**
 * Handle overtime period.
 */
function handleOvertime(state: GameState): void {
    // Reset for overtime
    state.quarterTime = 300 // 5 minutes
    state.currentQuarter++
    state.team1.quarterFoul = 0
    state.team2.quarterFoul = 0

    // Reset minutes tracking
    state.minutesRecorded = new Array(13).fill(false)

    // Ensure starters are on court at the start of overtime (unless injured/fouled out)
    ensureStartersAtQuarterStart(state.team1, state.teamOneOnCourt, state.random, state.language, state.commentary)
    ensureStartersAtQuarterStart(state.team2, state.teamTwoOnCourt, state.random, state.language, state.commentary)

    // Generate overtime start commentary
    syncScoresToCommentary(state, 300)
    regularEnd(state.team1, state.team2, state.language, state.commentary)

    // Play the overtime period
    playQuarter(state)
}

// =============================================================================
// MAIN GAME FUNCTION
// =============================================================================

/**
 * Host a game between two teams.
 *
 * @param team1 First team (away team in display order)
 * @param team2 Second team (home team in display order)
 * @param random Seeded random generator
 * @param language Language for commentary
 * @param date Optional date string for recap (e.g., "01-15")
 * @param isPlayoff Whether this is a playoff/play-in game (slower pace, tighter defense)
 * @returns Complete game result
 */
export function hostGame(
    team1: Team,
    team2: Team,
    random: SeededRandom,
    language: Language = Language.ENGLISH,
    date?: string,
    isPlayoff: boolean = false
): GameResult {
    // Reset team game stats
    team1.resetGameStats()
    team2.resetGameStats()

    // Reset player stats
    for (const player of team1.players) {
        player.resetGameStats()
    }
    for (const player of team2.players) {
        player.resetGameStats()
    }

    // Initialize players on court
    const teamOneOnCourt = initializePlayersOnCourt(team1)
    const teamTwoOnCourt = initializePlayersOnCourt(team2)

    // Create commentary output
    const commentary = createCommentaryOutput()

    // Initialize game state
    const state: GameState = {
        team1,
        team2,
        teamOneOnCourt,
        teamTwoOnCourt,
        quarterTime: 720, // 12 minutes in seconds
        currentQuarter: 1,
        isSecondChance: false,
        team1Scores: [],
        team2Scores: [],
        scoreDifferentials: [],
        minutesRecorded: new Array(13).fill(false),
        gameFlow: createGameFlowInsights(),
        previousDifferential: 0,
        totalGameTime: 0,
        random,
        language,
        commentary,
        isPlayoff,
    }

    // Jump ball to start the game
    // Sync initial scores (0-0) to commentary
    syncScoresToCommentary(state, 720)
    const jumpBallWinner = jumpBall(random, team1, team2)
    getJumpBallComments(team1, team2, jumpBallWinner, random, language, commentary)

    // Play 4 quarters
    for (let quarter = 1; quarter <= 4; quarter++) {
        state.currentQuarter = quarter
        state.quarterTime = 720
        state.team1.quarterFoul = 0
        state.team2.quarterFoul = 0
        state.minutesRecorded = new Array(13).fill(false)

        // Ensure starters are on court at the start of Q3 (unless injured/fouled out)
        if (quarter === 3) {
            ensureStartersAtQuarterStart(team1, state.teamOneOnCourt, random, language, commentary)
            ensureStartersAtQuarterStart(team2, state.teamTwoOnCourt, random, language, commentary)
        }

        playQuarter(state)

        // End of quarter commentary (except after Q4)
        if (quarter < 4) {
            syncScoresToCommentary(state, 0)
            quarterEnd(quarter, team1, team2, language, commentary)
        }
    }

    // Check for overtime
    while (team1.totalScore === team2.totalScore) {
        handleOvertime(state)
    }

    // Record final score differential
    const finalDiff = team1.totalScore - team2.totalScore
    state.scoreDifferentials.push({
        quarter: state.currentQuarter,
        timeRemaining: 0,
        differential: finalDiff,
    })
    updateGameFlowInsights(
        state.gameFlow,
        finalDiff,
        state.previousDifferential,
        state.currentQuarter,
        0,
        language
    )

    // Generate game end commentary
    syncScoresToCommentary(state, 0)
    gameEnd(
        team1,
        team2,
        state.team1Scores,
        state.team2Scores,
        language,
        commentary
    )

    // Generate team data
    getTeamData(team1, language, commentary)
    getTeamData(team2, language, commentary)

    // Set opponent stats
    team1.totalScoreAllowed = team2.totalScore
    team2.totalScoreAllowed = team1.totalScore
    // Set opponent shooting stats for defensive efficiency tracking
    team1.opponentShotMade = team2.totalShotMade
    team1.opponentShotAttempted = team2.totalShotAttempted
    team1.opponent3Made = team2.total3Made
    team1.opponent3Attempted = team2.total3Attempted
    team2.opponentShotMade = team1.totalShotMade
    team2.opponentShotAttempted = team1.totalShotAttempted
    team2.opponent3Made = team1.total3Made
    team2.opponent3Attempted = team1.total3Attempted

    // Generate box score
    const boxScore = generateBoxScore(team1, team2, language, [state.team1Scores, state.team2Scores])

    // Determine winner
    const winner = team1.totalScore > team2.totalScore ? team1.name : team2.name

    // Generate recap data if date is provided (includes play-by-play log and box score)
    const recap = date
        ? generateGameRecap(team1, team2, date, state.gameFlow, state.currentQuarter, commentary.lines, language, boxScore, commentary.scoreSnapshots, commentary.timeSnapshots)
        : undefined

    // Use real-time score snapshots from commentary (recorded at each addLine call)
    // These show the actual score at the time each commentary line was generated
    const scoreSnapshots = commentary.scoreSnapshots
    const timeSnapshots = commentary.timeSnapshots

    return {
        team1Name: team1.name,
        team2Name: team2.name,
        team1Score: team1.totalScore,
        team2Score: team2.totalScore,
        winner,
        boxScore,
        playByPlayLog: commentary.lines,
        scoreSnapshots,
        timeSnapshots,
        flowInsights: state.gameFlow,
        finalQuarter: state.currentQuarter,
        quarterScores: [state.team1Scores, state.team2Scores],
        recap,
    }
}

/**
 * Host a game by team names.
 * Convenience function that loads teams by name.
 *
 * @param team1Name Name of first team
 * @param team2Name Name of second team
 * @param options Game options
 * @returns Promise resolving to game result
 */
export async function hostGameByName(
    team1Name: string,
    team2Name: string,
    options: GameOptions = {}
): Promise<GameResult> {
    const [team1, team2] = await Promise.all([
        Team.loadFromCSV(team1Name),
        Team.loadFromCSV(team2Name),
    ])

    const seed = options.seed ?? Date.now()
    const random = new SeededRandom(BigInt(seed))
    const language = options.language ?? Language.ENGLISH

    return hostGame(team1, team2, random, language)
}

// =============================================================================
// FAST GAME SIMULATION (for prediction mode)
// =============================================================================

/**
 * Minimal game state for fast simulation.
 */
interface FastGameState {
    team1: Team
    team2: Team
    teamOneOnCourt: Map<Position, Player>
    teamTwoOnCourt: Map<Position, Player>
    quarterTime: number
    currentQuarter: number
    isSecondChance: boolean
    random: SeededRandom
    isPlayoff: boolean
}

/**
 * Play a single possession in fast mode (no commentary).
 */
function playPossessionFast(state: FastGameState): number {
    const {
        team1,
        team2,
        teamOneOnCourt,
        teamTwoOnCourt,
        quarterTime,
        currentQuarter,
        random,
        isPlayoff,
    } = state

    // Determine play time
    let currentPlayTime: number
    if (!state.isSecondChance) {
        currentPlayTime = quarterTime > 24 ? generateRandomPlayTime(random, 24, isPlayoff) : quarterTime
    } else {
        currentPlayTime = quarterTime > 24 ? generateRandomPlayTime(random, 14, isPlayoff) : quarterTime
        state.isSecondChance = false
    }

    // Update player minutes (simplified)
    updatePlayerMinutes(teamOneOnCourt, currentPlayTime)
    updatePlayerMinutes(teamTwoOnCourt, currentPlayTime)

    // Get offense and defense teams
    const offenseTeam = team1.hasBall ? team1 : team2
    const defenseTeam = !team1.hasBall ? team1 : team2
    const offenseTeamOnCourt = team1.hasBall ? teamOneOnCourt : teamTwoOnCourt
    const defenseTeamOnCourt = !team1.hasBall ? teamOneOnCourt : teamTwoOnCourt

    // Choose players
    const offensePlayer = choosePlayerBasedOnRating(
        random,
        offenseTeamOnCourt,
        'rating',
        currentQuarter,
        quarterTime,
        offenseTeam,
        defenseTeam
    )

    if (!offensePlayer) {
        throw new Error('Cannot continue game without offense player')
    }

    const defensePlayer = chooseDefensePlayer(random, offensePlayer, defenseTeamOnCourt)

    // Judge ball possession lost (no commentary)
    const loseBallOutcome: LoseBallOutcome = judgeLoseBall(
        random,
        defenseTeam,
        defenseTeamOnCourt,
        offensePlayer,
        defensePlayer
    )

    const loseBallResult = loseBallOutcome.result

    if (loseBallResult === LoseBallResult.LOSE_BALL_NO_SCORE) {
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    } else if (loseBallResult === LoseBallResult.LOSE_BALL_AND_SCORE) {
        // Possession stays with offense team (they inbound after being scored on)
        return currentPlayTime
    } else if (loseBallResult === LoseBallResult.JUMP_BALL_WIN) {
        return currentPlayTime
    }

    // Judge foul (no commentary, simplified)
    const foulResult = judgeNormalFoul(
        random,
        offenseTeamOnCourt,
        defenseTeamOnCourt,
        offensePlayer,
        defensePlayer,
        offenseTeam,
        defenseTeam,
        currentQuarter,
        quarterTime,
        team1,
        team2
    )

    if (foulResult === FoulResult.OFFENSIVE_FOUL) {
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    } else if (foulResult === FoulResult.DEFENSIVE_FOUL) {
        return currentPlayTime
    }

    // Skip injury check in fast mode for speed

    const distance = getShotDistance(random, offensePlayer)
    const shotType = distance <= 4 ? ShotType.LAYUP : ShotType.JUMPER

    // Judge block (no commentary)
    const blockOutcome: BlockOutcome = judgeBlock(
        random,
        distance,
        offenseTeamOnCourt,
        defenseTeamOnCourt,
        offensePlayer,
        defensePlayer
    )

    if (blockOutcome.result === BlockResult.BLOCK_OFFENSIVE_REBOUND) {
        state.isSecondChance = true
        return currentPlayTime
    } else if (blockOutcome.result === BlockResult.BLOCK_DEFENSIVE_REBOUND) {
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    }

    // Calculate shot percentage
    // Home team (team2) is on offense when team1 doesn't have the ball
    const isHomeTeamOnOffense = !team1.hasBall
    const percentage = calculatePercentage(
        random,
        distance,
        offensePlayer,
        defensePlayer,
        offenseTeamOnCourt,
        shotType,
        quarterTime,
        currentQuarter,
        offenseTeam,
        defenseTeam,
        isPlayoff,
        isHomeTeamOnOffense
    )

    // Judge shot (no commentary)
    const shotOutcome: ShotOutcome = judgeMakeShot(
        random,
        distance,
        offensePlayer,
        defensePlayer,
        offenseTeam,
        defenseTeam,
        offenseTeamOnCourt,
        defenseTeamOnCourt,
        percentage,
        quarterTime - currentPlayTime,
        currentQuarter,
        team1,
        team2,
        ''
    )

    if (shotOutcome.result === ShotResult.MADE_SHOT || shotOutcome.result === ShotResult.MADE_FREE_THROWS) {
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    } else if (shotOutcome.result === ShotResult.DEFENSIVE_REBOUND || shotOutcome.result === ShotResult.OUT_OF_BOUNDS) {
        offenseTeam.hasBall = false
        defenseTeam.hasBall = true
        return currentPlayTime
    } else if (shotOutcome.result === ShotResult.OFFENSIVE_REBOUND) {
        state.isSecondChance = true
        return currentPlayTime
    }

    return currentPlayTime
}

/**
 * Play a quarter in fast mode.
 */
function playQuarterFast(state: FastGameState): void {
    while (state.quarterTime > 0) {
        const timeConsumed = playPossessionFast(state)
        state.quarterTime -= timeConsumed
    }
}

/**
 * Fast game simulation that only returns the winner.
 * Skips all commentary, box scores, recaps, and detailed tracking.
 * Designed for prediction mode where only the winner matters.
 *
 * @param team1 First team
 * @param team2 Second team
 * @param random Seeded random generator
 * @param isPlayoff Whether this is a playoff game
 * @returns Winner team name
 */
export function hostGameFast(
    team1: Team,
    team2: Team,
    random: SeededRandom,
    isPlayoff: boolean = false
): string {
    // Reset team game stats
    team1.resetGameStats()
    team2.resetGameStats()

    // Reset player stats
    for (const player of team1.players) {
        player.resetGameStats()
    }
    for (const player of team2.players) {
        player.resetGameStats()
    }

    // Initialize players on court
    const teamOneOnCourt = initializePlayersOnCourt(team1)
    const teamTwoOnCourt = initializePlayersOnCourt(team2)

    // Initialize fast game state
    const state: FastGameState = {
        team1,
        team2,
        teamOneOnCourt,
        teamTwoOnCourt,
        quarterTime: 720,
        currentQuarter: 1,
        isSecondChance: false,
        random,
        isPlayoff,
    }

    // Jump ball
    jumpBall(random, team1, team2)

    // Play 4 quarters
    for (let quarter = 1; quarter <= 4; quarter++) {
        state.currentQuarter = quarter
        state.quarterTime = 720
        state.team1.quarterFoul = 0
        state.team2.quarterFoul = 0

        // Ensure starters are on court at the start of Q3 (unless injured/fouled out)
        if (quarter === 3) {
            ensureStartersAtQuarterStart(team1, state.teamOneOnCourt)
            ensureStartersAtQuarterStart(team2, state.teamTwoOnCourt)
        }

        playQuarterFast(state)
    }

    // Overtime if needed
    while (team1.totalScore === team2.totalScore) {
        state.currentQuarter++
        state.quarterTime = 300 // 5 minutes
        state.team1.quarterFoul = 0
        state.team2.quarterFoul = 0

        // Ensure starters are on court at the start of overtime (unless injured/fouled out)
        ensureStartersAtQuarterStart(team1, state.teamOneOnCourt)
        ensureStartersAtQuarterStart(team2, state.teamTwoOnCourt)

        playQuarterFast(state)
    }

    return team1.totalScore > team2.totalScore ? team1.name : team2.name
}
