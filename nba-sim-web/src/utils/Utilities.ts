/**
 * Utilities Module
 *
 * Core game utility functions migrated from Java Utilities.java.
 * Contains all gameplay logic for basketball simulation including:
 * - Random number generation with seeded RNG
 * - Shot mechanics and calculations
 * - Turnover/steal logic
 * - Block/rebound logic
 * - Foul handling
 * - Substitution logic
 */

import { SeededRandom } from './SeededRandom'
import * as Constants from './Constants'
import { Player } from '../models/Player'
import { Team } from '../models/Team'
import {
    PlayerType,
    Language,
    LoseBallResult,
    BlockResult,
    FoulResult,
    ShotResult,
    FreeThrowResult,
    ShotType,
} from '../models/types'
import type { Position } from '../models/types'
import type { CommentaryOutput } from './Comments'
import {
    getFoulComment,
    getFlagFoulComment,
    getAndOneComment,
    getChallengeComment,
    getFreeThrowPrepareComment,
    getMakeFreeThrowComment,
    getMissFreeThrowComment,
    getTimeAndScore,
    getFoulOutComment,
    getFoulProtectComment,
    getInjuryComment,
    getOffensiveFoul,
    getDefensiveFoul,
    getSubstituteComment,
    getSubstitutionPrefix,
    getSubstitutionComment,
    getReachFoulTimes,
    getJumpBallPlayerComments,
} from './Comments'

// Re-export enums for convenience
export { LoseBallResult, BlockResult, FoulResult, ShotResult, FreeThrowResult }

// Additional metadata for lose-ball outcomes to drive accurate commentary
export interface LoseBallOutcome {
    result: LoseBallResult
    isSteal: boolean
    fastBreakScorer?: Player
}

// Rebound metadata to drive possession handling and commentary order (commentary emitted by caller)
export interface ReboundOutcome {
    isOffensiveRebound: boolean
    rebounder: Player
}

// Outcome of free throws that may include rebound metadata
export interface FreeThrowOutcome {
    result: FreeThrowResult
    reboundOutcome?: ReboundOutcome
}

// Outcome of a shot attempt (field goal or free-throw sequence)
export interface ShotOutcome {
    result: ShotResult
    reboundOutcome?: ReboundOutcome
    fromFreeThrow?: boolean
    garbageTimeTeam?: Team  // Team to show garbage time starters comment for
}

// Outcome of a block sequence with optional rebound metadata
export interface BlockOutcome {
    result: BlockResult
    reboundOutcome?: ReboundOutcome
}

interface SubstitutionCommentaryContext {
    announced: boolean
}

function emitSubstitutionCommentary(
    team: Team,
    incoming: Player,
    outgoing: Player,
    random?: SeededRandom,
    language?: Language,
    commentary?: CommentaryOutput,
    context?: SubstitutionCommentaryContext,
    announcePrefix: boolean = false
): void {
    if (!commentary || !language || !random) return

    if (announcePrefix && context && !context.announced) {
        getSubstitutionComment(team.name, random, language, commentary)
        getSubstitutionPrefix(team.name, language, commentary)
        context.announced = true
    }

    getSubstituteComment(incoming.getDisplayName(language), outgoing.getDisplayName(language), language, commentary)
}

// =============================================================================
// Core Utility Functions (T028)
// =============================================================================

/**
 * Generate a random number from range [min, max].
 *
 * @param random - The SeededRandom object to generate random number
 * @param min - The lower bound of the range (default: 1)
 * @param max - The upper bound of the range (default: 100)
 * @returns A random number in [min, max]
 */
export function generateRandomNum(random: SeededRandom, min: number = 1, max: number = 100): number {
    if (min === max) return min
    return random.nextInt(max - min + 1) + min
}

/**
 * Round a number to a given scale using HALF_UP rounding.
 *
 * @param num - The number to be rounded
 * @param scale - The number of decimal places (default: 2)
 * @returns A rounded number
 */
export function roundDouble(num: number, scale: number = 2): number {
    const factor = Math.pow(10, scale)
    return Math.round(num * factor) / factor
}

/**
 * Generate current play's time based on NBA-realistic distributions.
 * Uses a weighted probability system to simulate realistic possession times:
 * - 24s shot clock: Average 15-17s (bell curve centered around 16s)
 * - 14s shot clock: Average 8-10s (bell curve centered around 9s)
 * Playoff games have slower pace (+1s average per possession).
 *
 * @param random - The SeededRandom object
 * @param time - Maximum time of current play (24 for full possession, 14 for offensive rebound)
 * @param isPlayoff - Whether this is a playoff/play-in game (slower pace)
 * @returns Current play's time in seconds
 */
export function generateRandomPlayTime(random: SeededRandom, time: number, isPlayoff: boolean = false): number {
    // Playoff pace adjustment
    const paceAdjustment = isPlayoff ? Constants.PLAYOFF_PACE_SLOWDOWN : 0

    if (time === 24) {
        // Distribution: 5% very quick (4-7s), 80% normal (8-18s), 15% slow (19-24s)
        const roll = generateRandomNum(random, 1, 100)

        let baseTime: number
        if (roll <= 10) {
            // Very quick play: 4-7 seconds
            return generateRandomNum(random, 4, 7)
        } else if (roll <= 85) {
            // Use triangle distribution for more realistic clustering
            const r1 = generateRandomNum(random, 8, 18)
            const r2 = generateRandomNum(random, 8, 18)
            baseTime = Math.floor((r1 + r2) / 2) // Averages toward middle values (12-14)
        } else {
            // Slow, deliberate play: 19-24 seconds
            return generateRandomNum(random, 19, 24)
        }
        return Math.min(baseTime + paceAdjustment, 24)
    } else if (time === 14) {
        // Offensive rebound / reset possession (14 seconds)
        // Real NBA average: ~8-10 seconds
        // Distribution: 50% quick putback (4-6s), 40% normal reset (7-11s), 10% full reset (12-14s)

        const roll = generateRandomNum(random, 1, 100)

        if (roll <= 50) {
            // Quick putback or tip-in: 4-6 seconds
            return generateRandomNum(random, 4, 6)
        } else if (roll <= 90) {
            // Normal reset play: 7-11 seconds (bell curve around 9)
            const r1 = generateRandomNum(random, 7, 11)
            const r2 = generateRandomNum(random, 7, 11)
            return Math.floor((r1 + r2) / 2) // Averages toward 9 seconds
        } else {
            // Full reset to perimeter: 12-14 seconds
            return generateRandomNum(random, 12, 14)
        }
    } else {
        // Fallback for other shot clock times (e.g., end of quarter situations)
        // Use proportional scaling based on 24-second distribution
        const scaledMin = Math.max(4, Math.floor(time / 6))
        const scaledMax = time
        return generateRandomNum(random, scaledMin, scaledMax)
    }
}

// =============================================================================
// Player Selection (T036)
// =============================================================================

/**
 * Select a player based on rating.
 *
 * @param random - The SeededRandom object
 * @param teamOnCourt - Current players on the court (Map: position -> Player)
 * @param attr - The rating criteria: 'rating', 'orb', 'drb', or 'ast'
 * @param currentQuarter - Current quarter number (optional, for clutch time)
 * @param quarterTime - Time left in current quarter (optional)
 * @param offenseTeam - Offense team (optional)
 * @param defenseTeam - Defense team (optional)
 * @returns Selected player
 */
export function choosePlayerBasedOnRating(
    random: SeededRandom,
    teamOnCourt: Map<string, Player>,
    attr: 'rating' | 'orb' | 'drb' | 'ast',
    currentQuarter: number = 0,
    quarterTime: number = 0,
    offenseTeam: Team | null = null,
    defenseTeam: Team | null = null
): Player {
    const major = Constants.MAJOR_SCORE_FACTOR
    const minor = Constants.MINOR_SCORE_FACTOR

    let totalRating = 0
    for (const player of teamOnCourt.values()) {
        if (attr === 'rating') {
            totalRating +=
                major * player.rating +
                minor * Math.max(player.insideRating, player.layupRating) +
                minor * Math.max(player.midRating, player.threeRating) +
                minor * player.offConst
        } else if (attr === 'orb') {
            totalRating += player.orbRating
        } else if (attr === 'drb') {
            totalRating += player.drbRating
        } else if (attr === 'ast') {
            totalRating += player.astRating
        }
    }
    const avgRating = totalRating / 5

    const poss: number[] = new Array(5).fill(0)
    const positions = ['C', 'PF', 'SF', 'SG', 'PG']

    const basePoss = 100 / 5

    if (attr === 'rating') {
        // Get top-highest rating players
        let highestRating = 0
        const selectedPlayerList: Player[] = []

        for (const player of teamOnCourt.values()) {
            highestRating = Math.max(highestRating, player.rating)
        }

        for (const player of teamOnCourt.values()) {
            if (highestRating - player.rating <= Constants.RATING_RANGE) {
                selectedPlayerList.push(player)
            }
        }

        // Sort by rating (descending)
        selectedPlayerList.sort((a, b) => b.rating - a.rating)

        let selectedPlayer: Player | null = null

        // Higher chance to select the player with highest rating
        if (selectedPlayerList.length >= 1) {
            let totalStarRating = 0
            for (const player of selectedPlayerList) {
                totalStarRating += player.rating
            }

            let currentRatingSum = 0
            const randomPick = generateRandomNum(random, 1, totalStarRating)
            for (const player of selectedPlayerList) {
                currentRatingSum += player.rating
                if (randomPick <= currentRatingSum) {
                    selectedPlayer = player
                    break
                }
            }

            // Clutch time: give star players with top-highest rating
            if (
                currentQuarter >= 4 &&
                quarterTime <= Constants.TIME_LEFT_CLUTCH &&
                offenseTeam &&
                defenseTeam &&
                Math.abs(offenseTeam.totalScore - defenseTeam.totalScore) <= Constants.CLOSE_GAME_DIFF
            ) {
                if (generateRandomNum(random) <= Constants.CLUTCH_PERCENT && selectedPlayer) {
                    return selectedPlayer
                }
            }
        }

        for (let i = 0; i < poss.length; i++) {
            const currentPos = positions[i]
            const player = teamOnCourt.get(currentPos)
            if (!player) {
                console.warn(`Warning: Missing player at position ${currentPos}`)
                poss[i] = 0
                continue
            }

            // Apply diminishing returns for star players (rating >= 90)
            // This reduces their shot frequency while keeping role players unaffected
            let effectiveRating = player.rating
            if (player.rating >= Constants.PLAYER_STAR_LB) {
                // Use power decay: rating^0.85 * scaling factor to match original range
                // Example: 97^0.85 ≈ 52.8, 78^0.85 ≈ 44.6 → ratio reduced from 1.24 to 1.18
                effectiveRating = Math.pow(player.rating, Constants.STAR_SELECTION_DECAY_POWER) *
                    Math.pow(100, 1 - Constants.STAR_SELECTION_DECAY_POWER)
            }

            poss[i] =
                10 *
                (basePoss +
                    major * effectiveRating +
                    minor * Math.max(player.insideRating, player.layupRating) +
                    minor * Math.max(player.midRating, player.threeRating) +
                    minor * player.offConst -
                    avgRating)
        }
    } else {
        for (let i = 0; i < poss.length; i++) {
            const currentPos = positions[i]
            const player = teamOnCourt.get(currentPos)
            if (!player) {
                console.warn(`Warning: Missing player at position ${currentPos}`)
                poss[i] = 0
                continue
            }

            if (attr === 'orb') {
                // Use power scaling for rebounds to create NBA-realistic distribution
                const normalizedRating = Math.pow(Math.max(player.orbRating, 1), Constants.REBOUND_POWER_SCALE)
                poss[i] = normalizedRating * 100
            } else if (attr === 'drb') {
                const normalizedRating = Math.pow(Math.max(player.drbRating, 1), Constants.REBOUND_POWER_SCALE)
                poss[i] = normalizedRating * 100
            } else {
                poss[i] = Math.max((1000 * (Constants.AST_SCALE * player.astRating - avgRating)) / totalRating, 0)
            }
        }
    }

    // For rebounds, normalize probabilities to sum to 1000 for proper distribution
    if (attr === 'orb' || attr === 'drb') {
        let totalPoss = 0
        for (let i = 0; i < poss.length; i++) {
            totalPoss += poss[i]
        }
        if (totalPoss > 0) {
            for (let i = 0; i < poss.length; i++) {
                poss[i] = (poss[i] / totalPoss) * 1000
            }
        }
    }

    const pick = generateRandomNum(random, 1, 1000)
    let selectedPlayer: Player
    if (pick <= poss[0] && teamOnCourt.get('C')) selectedPlayer = teamOnCourt.get('C')!
    else if (pick <= poss[0] + poss[1] && teamOnCourt.get('PF')) selectedPlayer = teamOnCourt.get('PF')!
    else if (pick <= poss[0] + poss[1] + poss[2] && teamOnCourt.get('SF')) selectedPlayer = teamOnCourt.get('SF')!
    else if (pick <= poss[0] + poss[1] + poss[2] + poss[3] && teamOnCourt.get('SG')) selectedPlayer = teamOnCourt.get('SG')!
    else if (teamOnCourt.get('PG')) selectedPlayer = teamOnCourt.get('PG')!
    else {
        // Fallback: return any non-null player
        for (const player of teamOnCourt.values()) {
            if (player) {
                selectedPlayer = player
                break
            }
        }
        if (!selectedPlayer!) {
            throw new Error('ERROR: No players found in TeamOnCourt map!')
        }
    }

    // Veteran star load management: when a veteran star is selected for a shot,
    // there's a 15% chance the ball goes to a teammate instead (simulates rest/load management)
    // Exception: clutch time (Q4+, close game, <7min left) - veterans should always take the shot
    if (attr === 'rating' && Constants.VETERAN_STAR_PLAYERS.includes(selectedPlayer.englishName)) {
        // Check if it's clutch time - if so, skip load management
        const isClutchTime = currentQuarter >= 4 &&
            quarterTime <= Constants.TIME_LEFT_CLUTCH &&
            offenseTeam && defenseTeam &&
            Math.abs(offenseTeam.totalScore - defenseTeam.totalScore) <= Constants.CLOSE_GAME_DIFF

        if (!isClutchTime && generateRandomNum(random) <= Constants.VETERAN_STAR_USAGE_PENALTY) {
            // Find teammates and their ratings for weighted selection
            const teammates: Player[] = []
            let totalTeammateRating = 0
            for (const player of teamOnCourt.values()) {
                if (player !== selectedPlayer) {
                    teammates.push(player)
                    totalTeammateRating += player.rating
                }
            }
            if (teammates.length > 0 && totalTeammateRating > 0) {
                // Weighted selection based on rating
                let currentRatingSum = 0
                const randomPick = generateRandomNum(random, 1, Math.floor(totalTeammateRating))
                for (const teammate of teammates) {
                    currentRatingSum += teammate.rating
                    if (randomPick <= currentRatingSum) {
                        selectedPlayer = teammate
                        break
                    }
                }
            }
        }
    }

    return selectedPlayer
}

/**
 * Select a player to defend the offense player.
 *
 * @param random - The SeededRandom object
 * @param offensePlayer - Offense player
 * @param defenseTeamOnCourt - Current defense players on the court
 * @returns Selected defender
 */
export function chooseDefensePlayer(
    random: SeededRandom,
    offensePlayer: Player,
    defenseTeamOnCourt: Map<string, Player>
): Player {
    const offensePos = offensePlayer.position
    const otherPos: string[] = []
    for (const pos of defenseTeamOnCourt.keys()) {
        if (pos !== offensePos) otherPos.push(pos)
    }

    const poss = generateRandomNum(random)
    if (poss <= Constants.SAME_POS) return defenseTeamOnCourt.get(offensePos)!
    else if (poss <= Constants.SAME_POS + Constants.OTHER_POS) return defenseTeamOnCourt.get(otherPos[0])!
    else if (poss <= Constants.SAME_POS + 2 * Constants.OTHER_POS) return defenseTeamOnCourt.get(otherPos[1])!
    else if (poss <= Constants.SAME_POS + 3 * Constants.OTHER_POS) return defenseTeamOnCourt.get(otherPos[2])!
    else return defenseTeamOnCourt.get(otherPos[3])!
}

// =============================================================================
// Shot Distance (T035)
// =============================================================================

/**
 * Generate shooting distance by player type.
 *
 * @param random - The SeededRandom object
 * @param offensePlayer - Offense player
 * @returns Shot distance in feet
 */
export function getShotDistance(random: SeededRandom, offensePlayer: Player): number {
    let distance = 0
    const shotChoice = generateRandomNum(random)

    switch (offensePlayer.playerType) {
        case PlayerType.ALL_ROUNDED:
            distance = generateRandomNum(random, Constants.MIN_CLOSE_SHOT, Constants.MAX_THREE_SHOT)
            break
        case PlayerType.INSIDER:
            distance = generateRandomNum(random, Constants.MIN_CLOSE_SHOT, Constants.MAX_CLOSE_SHOT)
            break
        case PlayerType.MID_RANGE:
            distance = generateRandomNum(random, Constants.MIN_CLOSE_SHOT, Constants.MID_THREE_SHOT)
            if (distance >= Constants.MIN_MID_SHOT && generateRandomNum(random) <= Constants.TYPE3_PERCENT)
                distance -= Constants.MIN_MID_SHOT - Constants.MIN_CLOSE_SHOT
            break
        case PlayerType.INSIDE_OUTSIDE:
            if (shotChoice <= Constants.TYPE4_CLOSE_SHOT)
                distance = generateRandomNum(random, Constants.MIN_CLOSE_SHOT, Constants.MAX_CLOSE_SHOT)
            else if (shotChoice <= Constants.TYPE4_CLOSE_SHOT + Constants.TYPE4_MID_SHOT)
                distance = generateRandomNum(random, Constants.MIN_MID_SHOT, Constants.MIN_MID_SHOT)
            else distance = generateRandomNum(random, Constants.MIN_THREE_SHOT, Constants.MAX_THREE_SHOT)
            break
        case PlayerType.OUTSIDER:
            if (shotChoice <= Constants.TYPE5_CLOSE_SHOT)
                distance = generateRandomNum(random, Constants.MIN_CLOSE_SHOT, Constants.MAX_CLOSE_SHOT)
            else if (shotChoice <= Constants.TYPE5_CLOSE_SHOT + Constants.TYPE5_MID_SHOT)
                distance = generateRandomNum(random, Constants.MIN_MID_SHOT, Constants.MIN_MID_SHOT)
            else distance = generateRandomNum(random, Constants.MIN_THREE_SHOT, Constants.MAX_THREE_SHOT)
            break
        default:
            break
    }

    if (distance >= Constants.MIN_DIST_CURVE && generateRandomNum(random) <= Constants.DIST_CURVE_PERCENT)
        distance -= Constants.DIST_CURVE

    return distance
}

// =============================================================================
// Shot Percentage Calculation (T033)
// =============================================================================

/**
 * Calculate athleticism impact on shot percentage using sigmoid function with distance-dependent weighting.
 * Close shots (drives, dunks): athleticism matters more (higher weight)
 * Mid-range: moderate athleticism impact
 * Three-pointers: minimal athleticism impact (shooting touch > athleticism)
 *
 * @param athleticismDiff - Difference between offense and defense athleticism
 * @param distance - Shot distance
 * @returns Athleticism impact on percentage
 */
function calculateAthleticismImpact(athleticismDiff: number, distance: number): number {
    // Sigmoid parameters (matching Java implementation)
    const MAX_IMPACT = 4.0  // Maximum percentage boost/penalty at extreme differences
    const SIGMOID_SCALE = 15.0  // Controls curve steepness (higher = more gradual)

    // Calculate sigmoid value: maps (-∞, +∞) to (-1, +1)
    // At diff=0: impact=0
    // At diff=15: impact ≈ 0.63 * MAX_IMPACT (63% of max)
    // At diff=30: impact ≈ 0.86 * MAX_IMPACT (86% of max)
    // At diff=50: impact ≈ 0.96 * MAX_IMPACT (96% of max, nearly saturated)
    const sigmoidValue = 2.0 / (1.0 + Math.exp(-athleticismDiff / SIGMOID_SCALE)) - 1.0

    // Distance-based weight factor (matching Java)
    let distanceWeight: number
    if (distance <= Constants.MAX_CLOSE_SHOT) {
        // Close shots: full athleticism impact
        distanceWeight = 1.0
    } else if (distance <= Constants.MAX_MID_SHOT) {
        // Mid-range: moderate athleticism impact
        distanceWeight = 0.6
    } else {
        // Three-pointers: minimal athleticism impact
        distanceWeight = 0.3
    }

    return MAX_IMPACT * sigmoidValue * distanceWeight
}

/**
 * Calculate shot goal percentage.
 *
 * @param random - The SeededRandom object
 * @param distance - Shot distance
 * @param offensePlayer - Offense player
 * @param defensePlayer - Defense player
 * @param offenseTeamOnCourt - Current offense players on the court
 * @param shotType - The type of shot (DUNK, LAYUP, or JUMPER)
 * @param quarterTime - Time left in current quarter
 * @param currentQuarter - Current quarter number
 * @param team1 - Team 1
 * @param team2 - Team 2
 * @param isPlayoff - Whether this is a playoff/play-in game (tighter defense)
 * @returns Shot goal percentage (0-100 scale)
 */
export function calculatePercentage(
    random: SeededRandom,
    distance: number,
    offensePlayer: Player,
    defensePlayer: Player,
    offenseTeamOnCourt: Map<string, Player>,
    shotType: ShotType,
    quarterTime: number,
    currentQuarter: number,
    team1: Team,
    team2: Team,
    isPlayoff: boolean = false
): number {
    let percentage: number

    // Initial value based on distance
    if (distance <= Constants.MID_MID_SHOT) {
        percentage = Constants.INIT_CLOSE_SHOT_COFF * distance + Constants.INIT_CLOSE_SHOT_INTCP
    } else if (distance <= Constants.MAX_MID_SHOT) {
        percentage = distance + Constants.INIT_MID_SHOT_INTCP
    } else {
        percentage =
            Constants.INIT_THREE_SHOT_COFF * (distance - Constants.MIN_THREE_SHOT) * (distance - Constants.MIN_THREE_SHOT) +
            Constants.INIT_THREE_SHOT_INTCP
    }

    // Based on shot choice, adjust percentage
    if (shotType === ShotType.DUNK) {
        percentage *= Constants.DUNK_SCALE
    } else if (shotType === ShotType.LAYUP) {
        percentage += Constants.SHOT_COFF * offensePlayer.layupRating
    } else {
        if (distance <= Constants.MAX_CLOSE_SHOT) {
            percentage += Constants.SHOT_COFF * (offensePlayer.insideRating - Constants.OFFENSE_BASE)
        } else if (distance <= Constants.MAX_MID_SHOT) {
            percentage += Constants.SHOT_COFF * (offensePlayer.midRating - Constants.OFFENSE_BASE)
        } else {
            percentage += Constants.SHOT_COFF * (offensePlayer.threeRating - Constants.OFFENSE_BASE)
        }
    }

    // Based on defender, adjust percentage
    if (distance <= Constants.MAX_CLOSE_SHOT) {
        percentage -= Constants.DEFENSE_COFF * (defensePlayer.interiorDefense - Constants.DEFENSE_BASE)
    } else {
        percentage -= Constants.DEFENSE_COFF * (defensePlayer.perimeterDefense - Constants.DEFENSE_BASE)
    }

    // Check defense density (playoffs have tighter defense)
    const defenseEasy = isPlayoff ? Constants.PLAYOFF_DEFENSE_EASY : Constants.DEFENSE_EASY
    const defenseHard = isPlayoff ? Constants.PLAYOFF_DEFENSE_HARD : Constants.DEFENSE_HARD
    const temp = generateRandomNum(random)
    if (temp <= defenseEasy) {
        percentage += Constants.DEFENSE_BUFF
    } else if (temp <= defenseEasy + defenseHard) {
        percentage -= Constants.DEFENSE_BUFF
    }

    // Offensive consistency bonus (higher offConst = better)
    let offConsistencyBonus = Constants.OFF_CONSISTENCY_COFF * (offensePlayer.offConst - Constants.CONSISTENCY_BASE)
    if (offConsistencyBonus > Constants.OFF_CONSISTENCY_MAX_BONUS) offConsistencyBonus = Constants.OFF_CONSISTENCY_MAX_BONUS
    else if (offConsistencyBonus < -Constants.OFF_CONSISTENCY_MAX_BONUS) offConsistencyBonus = -Constants.OFF_CONSISTENCY_MAX_BONUS
    percentage += offConsistencyBonus

    // Defensive consistency penalty (higher defConst = harder to score against)
    let defConsistencyPenalty = Constants.DEF_CONSISTENCY_COFF * (defensePlayer.defConst - Constants.CONSISTENCY_BASE)
    if (defConsistencyPenalty > Constants.DEF_CONSISTENCY_MAX_BONUS) defConsistencyPenalty = Constants.DEF_CONSISTENCY_MAX_BONUS
    else if (defConsistencyPenalty < -Constants.DEF_CONSISTENCY_MAX_BONUS) defConsistencyPenalty = -Constants.DEF_CONSISTENCY_MAX_BONUS
    percentage -= defConsistencyPenalty

    // Athleticism - uses sigmoid function with distance-dependent weighting
    const athleticismDiff = offensePlayer.athleticism - defensePlayer.athleticism
    const athleticismImpact = calculateAthleticismImpact(athleticismDiff, distance)
    percentage += athleticismImpact

    // Clutch time penalty with linear decay based on offensive consistency
    if (
        currentQuarter >= 4 &&
        Math.abs(team1.totalScore - team2.totalScore) <= Constants.CLOSE_GAME_DIFF &&
        quarterTime <= Constants.TIME_LEFT_CLUTCH
    ) {
        // Linear interpolation: at offConst=25, use full penalty (0.6); at offConst=99, use minimal penalty (1.0)
        const clutchPenalty = Constants.CLUTCH_SHOT_COFF + ((1.0 - Constants.CLUTCH_SHOT_COFF) * (offensePlayer.offConst - 25)) / 74.0
        percentage *= clutchPenalty
    }

    // Elite playmaker bonus - count 90+ astRating players on court
    let elitePlaymakerCount = 0
    for (const player of offenseTeamOnCourt.values()) {
        if (player.astRating >= Constants.ELITE_PLAYMAKER_THRESHOLD) {
            elitePlaymakerCount++
        }
    }
    if (elitePlaymakerCount >= 2) {
        percentage += Constants.ELITE_PLAYMAKER_DUAL_BONUS
    } else if (elitePlaymakerCount === 1) {
        percentage += Constants.ELITE_PLAYMAKER_SINGLE_BONUS
    }

    // Star player defensive focus penalty
    // High-rated players (rating >= 90) face tighter defense from opposing teams' game plans
    // This reduces their efficiency while not affecting role players
    if (offensePlayer.rating >= Constants.PLAYER_STAR_LB) {
        percentage -= Constants.STAR_DEFENSE_FOCUS_PENALTY
    }

    return percentage
}

// =============================================================================
// Jump Ball
// =============================================================================

/**
 * Generates actions when two teams jumping ball before the game starts.
 *
 * @param random - The SeededRandom object
 * @param team1 - Team 1
 * @param team2 - Team 2
 * @returns The team that wins the jump ball
 */
export function jumpBall(random: SeededRandom, team1: Team, team2: Team): Team {
    const winTeam = generateRandomNum(random) <= Constants.JUMP_BALL_FIFTY_FIFTY ? team1 : team2
    winTeam.hasBall = true
    return winTeam
}

/**
 * Generates actions when two players jumping ball.
 *
 * @param random - The SeededRandom object
 * @param offensePlayer - Offense player name
 * @param defensePlayer - Defense player name
 * @param language - Current language for commentary
 * @param commentary - Optional commentary output collector
 * @returns The player name that wins the jump ball
 */
export function jumpBallPlayers(
    random: SeededRandom,
    offensePlayer: string,
    defensePlayer: string,
    language?: Language,
    commentary?: CommentaryOutput
): string {
    const winPlayer = generateRandomNum(random) <= Constants.JUMP_BALL_FIFTY_FIFTY ? offensePlayer : defensePlayer
    if (commentary && language) {
        getJumpBallPlayerComments(offensePlayer, defensePlayer, winPlayer, random, language, commentary)
    }
    return winPlayer
}

// =============================================================================
// Lose Ball / Turnover / Steal (T029)
// =============================================================================

/**
 * Generate actions after losing ball.
 *
 * @param random - The SeededRandom object
 * @param defenseTeam - Defense team
 * @param defenseTeamOnCourt - Current defense players on the court
 * @param offensePlayer - Offense player
 * @param defensePlayer - Defense player
 * @param language - Current language for commentary
 * @param commentary - Optional commentary output collector
 * @returns LoseBallOutcome indicating the outcome and steal metadata
 */
export function judgeLoseBall(
    random: SeededRandom,
    defenseTeam: Team,
    defenseTeamOnCourt: Map<string, Player>,
    offensePlayer: Player,
    defensePlayer: Player,
    language: Language = Language.ENGLISH,
    commentary?: CommentaryOutput
): LoseBallOutcome {
    let range =
        60 * Constants.STEAL_BASE +
        Constants.STEAL_RATING_SCALE * defensePlayer.stlRating +
        Constants.STEAL_DEFENSE_SCALE * Math.max(defensePlayer.interiorDefense, defensePlayer.perimeterDefense) +
        defensePlayer.athleticism

    if (defensePlayer.stlRating >= Constants.STEAL_BONUS_THLD1 && defensePlayer.stlRating < Constants.STEAL_BONUS_THLD2)
        range *= Constants.STEAL_BONUS_SCALE1
    else if (defensePlayer.stlRating >= Constants.STEAL_BONUS_THLD2 && defensePlayer.stlRating < Constants.STEAL_BONUS_THLD3)
        range *= Constants.STEAL_BONUS_SCALE2
    else if (defensePlayer.stlRating >= Constants.STEAL_BONUS_THLD3 && defensePlayer.stlRating < Constants.STEAL_BONUS_THLD4)
        range *= Constants.STEAL_BONUS_SCALE3
    else if (defensePlayer.stlRating >= Constants.STEAL_BONUS_THLD4) range *= Constants.STEAL_BONUS_SCALE4

    const poss = generateRandomNum(random)

    // Chance to jump ball
    if (poss <= 1) {
        if (generateRandomNum(random) <= Constants.JUMP_BALL_PLAY) {
            const winPlayer = jumpBallPlayers(random, offensePlayer.getDisplayName(language), defensePlayer.getDisplayName(language), language, commentary)
            return {
                result: winPlayer === offensePlayer.getDisplayName(language)
                    ? LoseBallResult.JUMP_BALL_WIN
                    : LoseBallResult.LOSE_BALL_NO_SCORE,
                isSteal: false,
            }
        }
    }

    // Chance to turnover
    else if (poss <= 1 + Constants.TURNOVER) {
        offensePlayer.turnover++
        return { result: LoseBallResult.LOSE_BALL_NO_SCORE, isSteal: false }
    }

    // Steal
    else if (60 * poss <= 60 * (1 + Constants.TURNOVER) + range) {
        offensePlayer.turnover++
        defensePlayer.steal++

        // Low chance to start a non-fast-break play, high chance to start a fast break
        const fastBreak = generateRandomNum(random)
        if (fastBreak <= Constants.NON_FASTBREAK) {
            return { result: LoseBallResult.LOSE_BALL_NO_SCORE, isSteal: true }
        } else {
            const fastBreakTemp = generateRandomNum(random)

            // Finish by himself or teammate
            let finisher: Player
            if (fastBreakTemp <= Constants.SAME_POS) {
                finisher = defensePlayer
            } else {
                const otherTeammate: string[] = []
                for (const pos of defenseTeamOnCourt.keys()) {
                    if (pos !== defensePlayer.position) otherTeammate.push(pos)
                }

                if (poss <= Constants.SAME_POS + Constants.OTHER_POS) finisher = defenseTeamOnCourt.get(otherTeammate[0])!
                else if (poss <= Constants.SAME_POS + 2 * Constants.OTHER_POS) finisher = defenseTeamOnCourt.get(otherTeammate[1])!
                else if (poss <= Constants.SAME_POS + 3 * Constants.OTHER_POS) finisher = defenseTeamOnCourt.get(otherTeammate[2])!
                else finisher = defenseTeamOnCourt.get(otherTeammate[3])!
            }

            defenseTeam.totalScore += 2
            finisher.score += 2
            finisher.shotMade++
            finisher.shotAttempted++
            return { result: LoseBallResult.LOSE_BALL_AND_SCORE, isSteal: true, fastBreakScorer: finisher }
        }
    }
    return { result: LoseBallResult.NO_LOSE_BALL, isSteal: false }
}

// =============================================================================
// Block (T030)
// =============================================================================

/**
 * Generate actions after a block.
 *
 * @param random - The SeededRandom object
 * @param distance - Shot distance
 * @param offenseTeamOnCourt - Current offense players on the court
 * @param defenseTeamOnCourt - Current defense players on the court
 * @param offensePlayer - Offense player
 * @param defensePlayer - Defense player
 * @returns BlockResult indicating the outcome
 */
export function judgeBlock(
    random: SeededRandom,
    distance: number,
    offenseTeamOnCourt: Map<string, Player>,
    defenseTeamOnCourt: Map<string, Player>,
    offensePlayer: Player,
    defensePlayer: Player,
    _language?: Language,
    _commentary?: CommentaryOutput
): BlockOutcome {
    let range =
        Constants.BLOCK_RATING_SCALE * defensePlayer.blkRating +
        Math.max(defensePlayer.interiorDefense, defensePlayer.perimeterDefense) +
        defensePlayer.athleticism

    if (defensePlayer.blkRating >= Constants.BLOCK_BONUS_THLD1 && defensePlayer.blkRating < Constants.BLOCK_BONUS_THLD2)
        range *= Constants.BLOCK_BONUS_SCALE1
    else if (defensePlayer.blkRating >= Constants.BLOCK_BONUS_THLD2 && defensePlayer.blkRating < Constants.BLOCK_BONUS_THLD3)
        range *= Constants.BLOCK_BONUS_SCALE2
    else if (defensePlayer.blkRating >= Constants.BLOCK_BONUS_THLD3 && defensePlayer.blkRating < Constants.BLOCK_BONUS_THLD4)
        range *= Constants.BLOCK_BONUS_SCALE3
    else if (defensePlayer.blkRating >= Constants.BLOCK_BONUS_THLD4 && defensePlayer.blkRating < Constants.BLOCK_BONUS_THLD5)
        range *= Constants.BLOCK_BONUS_SCALE4
    else if (defensePlayer.blkRating >= Constants.BLOCK_BONUS_THLD5) range *= Constants.BLOCK_BONUS_SCALE5

    const poss = generateRandomNum(random)
    if (60 * poss <= range) {
        offensePlayer.shotAttempted++
        if (distance >= Constants.MIN_THREE_SHOT) offensePlayer.threeAttempted++
        defensePlayer.block++

        // Low chance to go out of bound, high chance to go to rebound judging
        const outOfBound = generateRandomNum(random)
        if (outOfBound <= Constants.BLOCK_OUT_OF_BOUND) {
            return { result: BlockResult.BLOCK_OFFENSIVE_REBOUND }
        } else {
            const reboundOutcome = judgeRebound(random, offenseTeamOnCourt, defenseTeamOnCourt)
            return {
                result: reboundOutcome.isOffensiveRebound ? BlockResult.BLOCK_OFFENSIVE_REBOUND : BlockResult.BLOCK_DEFENSIVE_REBOUND,
                reboundOutcome,
            }
        }
    }
    return { result: BlockResult.NO_BLOCK }
}

// =============================================================================
// Rebound (T031)
// =============================================================================

/**
 * Generate actions when two teams fight for a rebound.
 *
 * @param random - The SeededRandom object
 * @param offenseTeamOnCourt - Current offense players on the court
 * @param defenseTeamOnCourt - Current defense players on the court
 * @returns true - offensive rebound, false - defensive rebound
 */
export function judgeRebound(
    random: SeededRandom,
    offenseTeamOnCourt: Map<string, Player>,
    defenseTeamOnCourt: Map<string, Player>
): ReboundOutcome {
    let offenseTeamReb = 0
    let defenseTeamReb = 0

    for (const player of offenseTeamOnCourt.values()) {
        offenseTeamReb += player.orbRating
    }
    for (const player of defenseTeamOnCourt.values()) {
        defenseTeamReb += player.drbRating
    }

    const offRebBonus = offenseTeamReb > defenseTeamReb

    const orbORdrb = generateRandomNum(random)
    const rebAssign = generateRandomNum(random)
    let rebounder: Player | null = null

    if ((offRebBonus && orbORdrb <= Constants.ORB_WITH_BONUS) || (!offRebBonus && orbORdrb <= Constants.ORB_WITHOUT_BONUS)) {
        if (rebAssign <= Constants.REBOUND_RATING_BONUS_PERCENT) {
            for (const player of offenseTeamOnCourt.values()) {
                if (player.orbRating >= Constants.REBOUND_RATING_BONUS) {
                    rebounder = player
                    break
                }
            }
            if (rebounder === null) rebounder = choosePlayerBasedOnRating(random, offenseTeamOnCourt, 'orb')
        } else {
            rebounder = choosePlayerBasedOnRating(random, offenseTeamOnCourt, 'orb')
        }

        rebounder.rebound++
        rebounder.offensiveRebound++
        return { isOffensiveRebound: true, rebounder }
    } else {
        if (rebAssign <= Constants.REBOUND_RATING_BONUS_PERCENT) {
            for (const player of defenseTeamOnCourt.values()) {
                if (player.drbRating >= Constants.REBOUND_RATING_BONUS) {
                    rebounder = player
                    break
                }
            }
            if (rebounder === null) rebounder = choosePlayerBasedOnRating(random, defenseTeamOnCourt, 'drb')
        } else {
            rebounder = choosePlayerBasedOnRating(random, defenseTeamOnCourt, 'drb')
        }

        rebounder.rebound++
        rebounder.defensiveRebound++
        return { isOffensiveRebound: false, rebounder }
    }
}

// =============================================================================
// Foul Calculation
// =============================================================================

/**
 * Calculate foul percentage based on player rating.
 *
 * @param distance - Shot distance
 * @param offensePlayer - The offense player
 * @param defensePlayer - The defense player
 * @param isAndOne - Decide whether current foul is an And-One foul or not.
 * @returns Foul percentage (scaled by 100 for integer comparison)
 */
export function calculateFoulPercent(distance: number, offensePlayer: Player, defensePlayer: Player, isAndOne: boolean): number {
    let basePercent: number

    if (isAndOne) {
        basePercent =
            distance <= Constants.MAX_CLOSE_SHOT
                ? Constants.AND_ONE_CLOSE_BASE
                : distance <= Constants.MAX_MID_SHOT
                    ? Constants.AND_ONE_MID_BASE
                    : Constants.AND_ONE_THREE_BASE
    } else {
        basePercent =
            distance <= Constants.MAX_CLOSE_SHOT
                ? Constants.NORMAL_CLOSE_BASE
                : distance <= Constants.MAX_MID_SHOT
                    ? Constants.NORMAL_MID_BASE
                    : Constants.NORMAL_THREE_BASE
    }

    let drawFoulPercent: number
    if (offensePlayer.drawFoul >= Constants.FOUL_RATING_THLD1) {
        drawFoulPercent = basePercent * (100 + Constants.FOUL_COFF1 * offensePlayer.drawFoul)
    } else if (offensePlayer.drawFoul >= Constants.FOUL_RATING_THLD2) {
        drawFoulPercent = basePercent * (100 + Constants.FOUL_COFF2 * offensePlayer.drawFoul)
    } else {
        drawFoulPercent = basePercent * (100 + Constants.FOUL_COFF3 * offensePlayer.drawFoul)
    }

    if (offensePlayer.isStar && !defensePlayer.isStar) drawFoulPercent *= Constants.STAR_FOUL_SCALE

    return Math.floor(drawFoulPercent)
}

// =============================================================================
// Foul Out and Foul Protection
// =============================================================================

/**
 * Find a player to substitute another teammate on the court.
 *
 * @param previousPlayer - The player to be substituted
 * @param team - The team making substitution
 * @returns The incoming player
 */
export function findSubPlayer(previousPlayer: Player, team: Team): Player {
    let currentPlayer: Player | null = null

    if (previousPlayer.rotationType === 1) {
        // STARTER
        const benchPlayers = team.benches.get(previousPlayer.position)
        if (benchPlayers && benchPlayers.length > 0 && benchPlayers[0].canOnCourt) {
            currentPlayer = benchPlayers[0]
        }

        if (currentPlayer === null && team.rareBenches.has(previousPlayer.position)) {
            const availableDeepBench: Player[] = []
            for (const p of team.rareBenches.get(previousPlayer.position)!) {
                if (p.canOnCourt) availableDeepBench.push(p)
            }
            if (availableDeepBench.length > 0) {
                currentPlayer = availableDeepBench[Math.floor(Math.random() * availableDeepBench.length)]
            }
        }
    } else if (previousPlayer.rotationType === 2) {
        // BENCH
        const starter = team.starters.get(previousPlayer.position)
        if (starter && starter.canOnCourt) {
            currentPlayer = starter
        }

        if (currentPlayer === null && team.rareBenches.has(previousPlayer.position)) {
            const availableDeepBench: Player[] = []
            for (const p of team.rareBenches.get(previousPlayer.position)!) {
                if (p.canOnCourt) availableDeepBench.push(p)
            }
            if (availableDeepBench.length > 0) {
                currentPlayer = availableDeepBench[Math.floor(Math.random() * availableDeepBench.length)]
            }
        }
    } else if (previousPlayer.rotationType === 3) {
        // DEEP_BENCH
        const starter = team.starters.get(previousPlayer.position)
        if (starter && starter.canOnCourt) {
            currentPlayer = starter
        }

        if (currentPlayer === null && team.benches.has(previousPlayer.position)) {
            const benchPlayers = team.benches.get(previousPlayer.position)
            if (benchPlayers && benchPlayers.length > 0 && benchPlayers[0].canOnCourt) {
                currentPlayer = benchPlayers[0]
            }
        }
    }

    const preferred = currentPlayer ?? null

    // If we don't have a valid off-court, eligible replacement, look for any available player
    if (!preferred || preferred.isOnCourt || !preferred.canOnCourt) {
        for (const player of team.players) {
            if (player !== previousPlayer && player.canOnCourt && !player.isOnCourt) {
                return player
            }
        }
    }

    // Fallback to previous player only if still eligible (avoids reusing fouled-out players)
    if (preferred && preferred.canOnCourt && !preferred.isOnCourt) {
        return preferred
    }

    return previousPlayer
}

/**
 * Generate actions when a player gets fouled out.
 *
 * @param previousPlayer - The player getting fouled out
 * @param team - Team having this player
 * @param teamOnCourt - Players on the court
 */
export function judgeFoulOut(
    previousPlayer: Player,
    team: Team,
    teamOnCourt: Map<string, Player>,
    random?: SeededRandom,
    language?: Language,
    commentary?: CommentaryOutput
): void {
    if (previousPlayer.foul === Constants.FOULS_TO_FOUL_OUT || previousPlayer.flagFoul === Constants.FLAGRANT_FOULS_TO_EJECT) {
        if (commentary && language && random) {
            const isNormalFoul = previousPlayer.foul === Constants.FOULS_TO_FOUL_OUT
            getFoulOutComment(previousPlayer.getDisplayName(language), isNormalFoul, random, language, commentary)
        }

        previousPlayer.canOnCourt = false
        previousPlayer.isOnCourt = false
        previousPlayer.currentStintSeconds = 0

        const currentPlayer = findSubPlayer(previousPlayer, team)
        currentPlayer.isOnCourt = true
        currentPlayer.hasBeenOnCourt = true
        currentPlayer.currentStintSeconds = 0
        teamOnCourt.set(previousPlayer.position, currentPlayer)

        if (commentary && language && random) {
            emitSubstitutionCommentary(team, currentPlayer, previousPlayer, random, language, commentary)
        }
    }
}

/**
 * Prevent the starter players from getting fouled out quickly.
 *
 * @param previousPlayer - The player getting fouled
 * @param team - Team having this player
 * @param teamOnCourt - Players on the court
 * @param currentQuarter - Current quarter number
 */
export function foulProtect(
    previousPlayer: Player,
    team: Team,
    teamOnCourt: Map<string, Player>,
    currentQuarter: number,
    random?: SeededRandom,
    language?: Language,
    commentary?: CommentaryOutput
): void {
    if (
        previousPlayer.rotationType === 1 && // STARTER
        ((currentQuarter === 1 && previousPlayer.foul === Constants.QUARTER1_PROTECT) ||
            (currentQuarter === 2 && previousPlayer.foul === Constants.QUARTER2_PROTECT) ||
            (currentQuarter === 3 && previousPlayer.foul === Constants.QUARTER3_PROTECT))
    ) {
        const currentPlayer = findSubPlayer(previousPlayer, team)

        if (commentary && language && random) {
            getFoulProtectComment(previousPlayer.getDisplayName(language), random, language, commentary)
            emitSubstitutionCommentary(team, currentPlayer, previousPlayer, random, language, commentary)
        }

        // Update on-court status
        previousPlayer.isOnCourt = false
        previousPlayer.currentStintSeconds = 0
        currentPlayer.isOnCourt = true
        currentPlayer.hasBeenOnCourt = true
        currentPlayer.currentStintSeconds = 0

        teamOnCourt.set(previousPlayer.position, currentPlayer)
    }
}

// =============================================================================
// Injury Handling
// =============================================================================

function handleInjury(
    random: SeededRandom,
    teamOnCourt: Map<string, Player>,
    team: Team,
    language?: Language,
    commentary?: CommentaryOutput
): boolean {
    for (const pos of teamOnCourt.keys()) {
        const playerOnCourt = teamOnCourt.get(pos)!
        if (generateRandomNum(random, 1, Constants.INJURY_PROBABILITY_DIVISOR) <= Constants.INJURY_BASE_PROBABILITY - playerOnCourt.durability) {
            const previousPlayer = playerOnCourt
            const currentPlayer = findSubPlayer(previousPlayer, team)

            previousPlayer.canOnCourt = false
            previousPlayer.isOnCourt = false

            currentPlayer.isOnCourt = true
            currentPlayer.hasBeenOnCourt = true
            currentPlayer.currentStintSeconds = 0

            teamOnCourt.set(previousPlayer.position, currentPlayer)

            if (commentary && language) {
                getInjuryComment(previousPlayer.getDisplayName(language), random, language, commentary)
                emitSubstitutionCommentary(team, currentPlayer, previousPlayer, random, language, commentary)
            }

            return true
        }
    }

    return false
}

export function judgeInjury(
    random: SeededRandom,
    offenseTeamOnCourt: Map<string, Player>,
    defenseTeamOnCourt: Map<string, Player>,
    offenseTeam: Team,
    defenseTeam: Team,
    language?: Language,
    commentary?: CommentaryOutput
): boolean {
    return handleInjury(random, offenseTeamOnCourt, offenseTeam, language, commentary) ||
        handleInjury(random, defenseTeamOnCourt, defenseTeam, language, commentary)
}

// =============================================================================
// Normal Foul (T032)
// =============================================================================

/**
 * Generate actions after a normal foul.
 *
 * @param random - The SeededRandom object
 * @param offenseTeamOnCourt - Current offense players on the court
 * @param defenseTeamOnCourt - Current defense players on the court
 * @param offensePlayer - Offense player
 * @param defensePlayer - Defense player
 * @param offenseTeam - Offense team
 * @param defenseTeam - Defense team
 * @param currentQuarter - Current quarter number
 * @param quarterTime - Time left in current quarter
 * @param team1 - Team 1
 * @param team2 - Team 2
 * @param makeFreeThrowFn - Function to make free throws (passed in to avoid circular dependency)
 * @returns FoulResult indicating the outcome
 */
export function judgeNormalFoul(
    random: SeededRandom,
    offenseTeamOnCourt: Map<string, Player>,
    defenseTeamOnCourt: Map<string, Player>,
    offensePlayer: Player,
    defensePlayer: Player,
    offenseTeam: Team,
    defenseTeam: Team,
    currentQuarter: number,
    quarterTime: number,
    team1: Team,
    team2: Team,
    language?: Language,
    commentary?: CommentaryOutput,
    makeFreeThrowFn?: (
        random: SeededRandom,
        player: Player,
        offenseTeamOnCourt: Map<string, Player>,
        defenseTeamOnCourt: Map<string, Player>,
        offenseTeam: Team,
        times: number,
        quarterTime: number,
        currentQuarter: number,
        team1: Team,
        team2: Team,
        isFlagFoul: boolean,
        language?: Language,
        commentary?: CommentaryOutput
    ) => FreeThrowOutcome
): FoulResult {
    const poss = generateRandomNum(random)
    const foulTemp = generateRandomNum(random)

    if (poss <= Constants.OFF_FOUL) {
        let fouler: Player
        let foulType = 1

        // High chance to foul on offensePlayer, small chance on teammates
        if (foulTemp <= Constants.SAME_POS) {
            fouler = offensePlayer
        } else {
            const otherTeammate: string[] = []
            for (const pos of offenseTeamOnCourt.keys()) {
                if (pos !== offensePlayer.position) otherTeammate.push(pos)
            }

            if (foulTemp <= Constants.SAME_POS + Constants.OTHER_POS) fouler = offenseTeamOnCourt.get(otherTeammate[0])!
            else if (foulTemp <= Constants.SAME_POS + 2 * Constants.OTHER_POS) fouler = offenseTeamOnCourt.get(otherTeammate[1])!
            else if (foulTemp <= Constants.SAME_POS + 3 * Constants.OTHER_POS) fouler = offenseTeamOnCourt.get(otherTeammate[2])!
            else fouler = offenseTeamOnCourt.get(otherTeammate[3])!

            foulType = 2
        }

        if (commentary && language) {
            getOffensiveFoul(fouler.getDisplayName(language), foulType, random, language, commentary)
        }

        // Challenge the foul
        if (
            currentQuarter >= Constants.CHALLENGE_START_QUARTER &&
            offenseTeam.canChallenge &&
            generateRandomNum(random) <= Constants.FOUL_CHALLENGE
        ) {
            const isSuccessful = commentary && language
                ? getChallengeComment(offenseTeam.name, random, language, commentary)
                : generateRandomNum(random) <= Constants.CHALLENGE_SUCCESS
            offenseTeam.canChallenge = false

            if (isSuccessful) return FoulResult.NO_FOUL
        }

        fouler.turnover++
        fouler.foul++
        judgeFoulOut(fouler, offenseTeam, offenseTeamOnCourt, random, language, commentary)
        foulProtect(fouler, offenseTeam, offenseTeamOnCourt, currentQuarter, random, language, commentary)
        return FoulResult.OFFENSIVE_FOUL
    } else if (poss <= Constants.OFF_FOUL + Constants.DEF_FOUL) {
        let fouler: Player
        let foulType = 1

        // High chance to foul on defensePlayer, small chance on teammates
        if (foulTemp <= Constants.SAME_POS) {
            fouler = defensePlayer
        } else {
            const otherTeammate: string[] = []
            for (const pos of defenseTeamOnCourt.keys()) {
                if (pos !== defensePlayer.position) otherTeammate.push(pos)
            }

            if (foulTemp <= Constants.SAME_POS + Constants.OTHER_POS) fouler = defenseTeamOnCourt.get(otherTeammate[0])!
            else if (foulTemp <= Constants.SAME_POS + 2 * Constants.OTHER_POS) fouler = defenseTeamOnCourt.get(otherTeammate[1])!
            else if (foulTemp <= Constants.SAME_POS + 3 * Constants.OTHER_POS) fouler = defenseTeamOnCourt.get(otherTeammate[2])!
            else fouler = defenseTeamOnCourt.get(otherTeammate[3])!

            foulType = 2
        }

        if (commentary && language) {
            getDefensiveFoul(fouler.getDisplayName(language), foulType, random, language, commentary)
        }

        // Challenge the foul
        if (
            currentQuarter >= Constants.CHALLENGE_START_QUARTER &&
            defenseTeam.canChallenge &&
            generateRandomNum(random) <= Constants.FOUL_CHALLENGE
        ) {
            const isSuccessful = commentary && language
                ? getChallengeComment(defenseTeam.name, random, language, commentary)
                : generateRandomNum(random) <= Constants.CHALLENGE_SUCCESS
            defenseTeam.canChallenge = false

            if (isSuccessful) return FoulResult.NO_FOUL
        }

        fouler.foul++
        judgeFoulOut(fouler, defenseTeam, defenseTeamOnCourt, random, language, commentary)
        foulProtect(fouler, defenseTeam, defenseTeamOnCourt, currentQuarter, random, language, commentary)

        defenseTeam.quarterFoul++
        if (defenseTeam.quarterFoul >= Constants.BONUS_FOUL_THRESHOLD) {
            if (commentary && language) {
                getReachFoulTimes(offenseTeam.name, defenseTeam.name, random, language, commentary)
            }
            if (makeFreeThrowFn) {
                makeFreeThrowFn(
                    random,
                    offensePlayer,
                    offenseTeamOnCourt,
                    defenseTeamOnCourt,
                    offenseTeam,
                    2,
                    quarterTime,
                    currentQuarter,
                    team1,
                    team2,
                    false,
                    language,
                    commentary
                )
            }
        }
        return FoulResult.DEFENSIVE_FOUL
    }
    return FoulResult.NO_FOUL
}

// =============================================================================
// Free Throw (T037)
// =============================================================================

/**
 * Generate actions after a player makes a free throw.
 *
 * @param random - The SeededRandom object
 * @param player - The player who makes the free throw
 * @param offenseTeamOnCourt - Current offense players on the court
 * @param defenseTeamOnCourt - Current defense players on the court
 * @param offenseTeam - Offense team
 * @param times - Total free throw times
 * @param quarterTime - Time left in current quarter
 * @param currentQuarter - Current quarter number
 * @param team1 - Team 1
 * @param team2 - Team 2
 * @param isFlagFoul - Whether current foul is flagrant foul or not
 * @param language - Current language for commentary
 * @param commentary - Optional commentary output collector
 * @returns FreeThrowResult indicating the outcome
 */
export function makeFreeThrow(
    random: SeededRandom,
    player: Player,
    offenseTeamOnCourt: Map<string, Player>,
    defenseTeamOnCourt: Map<string, Player>,
    offenseTeam: Team,
    times: number,
    quarterTime: number,
    currentQuarter: number,
    team1: Team,
    team2: Team,
    isFlagFoul: boolean,
    language?: Language,
    commentary?: CommentaryOutput
): FreeThrowOutcome {
    let timesLeft = times
    const onlyOneShot = times === 1
    let count = 0
    let reboundOutcome: ReboundOutcome | undefined

    // Generate prepare comment at start of free throws
    if (commentary && language) {
        getFreeThrowPrepareComment(player.getDisplayName(language), random, language, commentary)
    }

    while (timesLeft > 0) {
        timesLeft--
        count++

        if (generateRandomNum(random) <= player.freeThrowPercent) {
            player.freeThrowAttempted++
            player.freeThrowMade++
            player.score++
            offenseTeam.totalScore++

            // Generate make free throw comment
            if (commentary && language) {
                // Sync scores to commentary before generating the comment
                // This ensures real-time score tracking works correctly
                commentary.currentScore1 = team1.totalScore
                commentary.currentScore2 = team2.totalScore
                commentary.currentQuarter = currentQuarter
                commentary.currentTimeRemaining = quarterTime
                getMakeFreeThrowComment(count, onlyOneShot, random, language, commentary)
                getTimeAndScore(quarterTime, currentQuarter, team1, team2, language, commentary)
            }

            if (timesLeft === 0) return { result: isFlagFoul ? FreeThrowResult.OFFENSIVE_REBOUND : FreeThrowResult.MADE_LAST_FREE_THROW }
        } else {
            player.freeThrowAttempted++

            // Generate miss free throw comment
            if (commentary && language) {
                getMissFreeThrowComment(count, onlyOneShot, random, language, commentary)
            }

            if (timesLeft === 0) {
                if (isFlagFoul) return { result: FreeThrowResult.OFFENSIVE_REBOUND }
                reboundOutcome = judgeRebound(random, offenseTeamOnCourt, defenseTeamOnCourt)
                return {
                    result: reboundOutcome.isOffensiveRebound ? FreeThrowResult.OFFENSIVE_REBOUND : FreeThrowResult.DEFENSIVE_REBOUND,
                    reboundOutcome,
                }
            }
        }
    }
    return { result: FreeThrowResult.ERROR }
}

// =============================================================================
// Shot Result (T034)
// =============================================================================

/**
 * Helper function to convert FreeThrowOutcome to ShotOutcome
 * Note: MADE_LAST_FREE_THROW returns MADE_FREE_THROWS (not MADE_SHOT)
 * to distinguish between actual made field goals and free throw scenarios.
 */
function convertFreeThrowToShotOutcome(freeThrowOutcome: FreeThrowOutcome): ShotOutcome {
    switch (freeThrowOutcome.result) {
        case FreeThrowResult.MADE_LAST_FREE_THROW:
            // Return MADE_FREE_THROWS, not MADE_SHOT, so we don't generate
            // "made shot" commentary for shooting foul scenarios
            return { result: ShotResult.MADE_FREE_THROWS, fromFreeThrow: true }
        case FreeThrowResult.OFFENSIVE_REBOUND:
        case FreeThrowResult.DEFENSIVE_REBOUND:
            return {
                result:
                    freeThrowOutcome.result === FreeThrowResult.OFFENSIVE_REBOUND
                        ? ShotResult.OFFENSIVE_REBOUND
                        : ShotResult.DEFENSIVE_REBOUND,
                reboundOutcome: freeThrowOutcome.reboundOutcome,
                fromFreeThrow: true,
            }
        default:
            return { result: ShotResult.DEFENSIVE_REBOUND, fromFreeThrow: true } // Fallback
    }
}

/**
 * Generate actions after a player makes a shot.
 *
 * @param random - The SeededRandom object
 * @param distance - Shot distance
 * @param offensePlayer - Offense player
 * @param defensePlayer - Defense player
 * @param offenseTeam - Offense team
 * @param defenseTeam - Defense team
 * @param offenseTeamOnCourt - Current offense players on the court
 * @param defenseTeamOnCourt - Current defense players on the court
 * @param percentage - Shot goal percentage
 * @param quarterTime - Time left in current quarter
 * @param currentQuarter - Current quarter number
 * @param team1 - Team 1
 * @param team2 - Team 2
 * @param movement - Shot choice string
 * @param language - Current language for commentary
 * @param commentary - Optional commentary output collector
 * @returns ShotOutcome indicating the outcome
 */
export function judgeMakeShot(
    random: SeededRandom,
    distance: number,
    offensePlayer: Player,
    defensePlayer: Player,
    offenseTeam: Team,
    defenseTeam: Team,
    offenseTeamOnCourt: Map<string, Player>,
    defenseTeamOnCourt: Map<string, Player>,
    percentage: number,
    quarterTime: number,
    currentQuarter: number,
    team1: Team,
    team2: Team,
    _movement: string,
    language?: Language,
    commentary?: CommentaryOutput
): ShotOutcome {
    const judgeShot = generateRandomNum(random, 1, 10000)

    // Make the shot
    if (judgeShot < Math.floor(100 * percentage)) {
        offensePlayer.shotMade++
        offensePlayer.shotAttempted++

        if (distance >= Constants.MIN_THREE_SHOT) {
            offensePlayer.threeAttempted++
            offensePlayer.threeMade++
            offensePlayer.score += 3
            offenseTeam.totalScore += 3
        } else {
            offensePlayer.score += 2
            offenseTeam.totalScore += 2
        }

        // Find the teammate with the highest astRating for assist
        let highestAstRating = 0
        let highestPlayer: Player | null = null
        for (const [pos, player] of offenseTeamOnCourt.entries()) {
            if (pos === offensePlayer.position) continue

            if (highestAstRating < player.astRating) {
                highestAstRating = player.astRating
                highestPlayer = player
            }
        }

        const assistAssign = generateRandomNum(random)
        if (assistAssign <= Constants.HIGH_BOTH_RATING) {
            // High rating and high astRating, or highest astRating in the team
            if (
                highestPlayer &&
                ((highestPlayer.rating >= Constants.HIGH_BOTH_RATING_THLD && highestPlayer.astRating >= Constants.HIGH_BOTH_RATING_THLD) ||
                    assistAssign <= Constants.HIGHEST_RATING_PERCENT)
            ) {
                highestPlayer.assist += 1
            }
        } else {
            const astTemp = generateRandomNum(random)
            if (
                (offensePlayer.isStar && astTemp <= Constants.STAR_PLAYER_AST) ||
                (!offensePlayer.isStar && astTemp <= Constants.NON_STAR_PLAYER_AST)
            ) {
                let assister: Player
                do {
                    assister = choosePlayerBasedOnRating(random, offenseTeamOnCourt, 'ast')
                } while (assister.position === offensePlayer.position)
                assister.assist += 1
            }
        }

        // Check garbage time starters comment eligibility (will be shown after time/score line)
        let garbageTimeTeam: Team | undefined = undefined
        if (currentQuarter >= 4 && Math.abs(team1.totalScore - team2.totalScore) >= Constants.DIFF2) {
            const temp = generateRandomNum(random)
            if (temp <= Constants.EXTRA_COMMENT) {
                garbageTimeTeam = team1
            } else if (temp <= 2 * Constants.EXTRA_COMMENT) {
                garbageTimeTeam = team2
            }
        }

        // Judge free throw chance (and-1)
        const andOneTemp = generateRandomNum(random, 1, 10000)
        const drawFoulPercent = calculateFoulPercent(distance, offensePlayer, defensePlayer, true)

        if (andOneTemp <= drawFoulPercent) {
            defensePlayer.foul++
            if (commentary && language) {
                getAndOneComment(offensePlayer.getDisplayName(language), random, language, commentary)
                // Add time/score line for the made field goal before the bonus free throw
                getTimeAndScore(quarterTime, currentQuarter, team1, team2, language, commentary)
            }
            judgeFoulOut(defensePlayer, defenseTeam, defenseTeamOnCourt, random, language, commentary)
            foulProtect(defensePlayer, defenseTeam, defenseTeamOnCourt, currentQuarter, random, language, commentary)

            const andOneResult = makeFreeThrow(
                random,
                offensePlayer,
                offenseTeamOnCourt,
                defenseTeamOnCourt,
                offenseTeam,
                1,
                quarterTime,
                currentQuarter,
                team1,
                team2,
                false,
                language,
                commentary
            )
            return convertFreeThrowToShotOutcome(andOneResult)
        }
        return { result: ShotResult.MADE_SHOT, garbageTimeTeam }
    }

    // Miss the shot
    else {
        const foulTemp = generateRandomNum(random, 1, 10000)
        const drawFoulPercent = calculateFoulPercent(distance, offensePlayer, defensePlayer, false)

        // Get a foul
        if (foulTemp <= drawFoulPercent) {
            // Flagrant foul
            if (generateRandomNum(random) <= Constants.FLAG_FOUL) {
                defensePlayer.flagFoul++
                judgeFoulOut(defensePlayer, defenseTeam, defenseTeamOnCourt, random, language, commentary)

                // Generate flagrant foul comment
                if (commentary && language) {
                    getFlagFoulComment(
                        offensePlayer.getDisplayName(language),
                        defensePlayer.getDisplayName(language),
                        random,
                        language,
                        commentary
                    )
                }

                // Two free throws, one shot
                const flagrantResult = makeFreeThrow(
                    random,
                    offensePlayer,
                    offenseTeamOnCourt,
                    defenseTeamOnCourt,
                    offenseTeam,
                    2,
                    quarterTime,
                    currentQuarter,
                    team1,
                    team2,
                    true,
                    language,
                    commentary
                )
                return convertFreeThrowToShotOutcome(flagrantResult)
            }

            // Challenge the foul
            if (
                currentQuarter >= Constants.CHALLENGE_START_QUARTER &&
                defenseTeam.canChallenge &&
                generateRandomNum(random) <= Constants.FOUL_CHALLENGE
            ) {
                // Generate challenge comment
                let challengeSuccess = false
                if (commentary && language) {
                    challengeSuccess = getChallengeComment(defenseTeam.name, random, language, commentary)
                } else {
                    challengeSuccess = generateRandomNum(random) <= Constants.CHALLENGE_SUCCESS
                }
                defenseTeam.canChallenge = false

                if (challengeSuccess) return { result: ShotResult.DEFENSIVE_REBOUND }
            }

            defensePlayer.foul++
            defenseTeam.quarterFoul++

            // Generate shooting foul comment
            if (commentary && language) {
                getFoulComment(
                    offensePlayer.getDisplayName(language),
                    defensePlayer.getDisplayName(language),
                    random,
                    language,
                    commentary
                )
            }

            judgeFoulOut(defensePlayer, defenseTeam, defenseTeamOnCourt, random, language, commentary)
            foulProtect(defensePlayer, defenseTeam, defenseTeamOnCourt, currentQuarter, random, language, commentary)

            let freeThrowResult: FreeThrowOutcome
            if (distance <= Constants.MAX_MID_SHOT)
                freeThrowResult = makeFreeThrow(
                    random,
                    offensePlayer,
                    offenseTeamOnCourt,
                    defenseTeamOnCourt,
                    offenseTeam,
                    2,
                    quarterTime,
                    currentQuarter,
                    team1,
                    team2,
                    false,
                    language,
                    commentary
                )
            else
                freeThrowResult = makeFreeThrow(
                    random,
                    offensePlayer,
                    offenseTeamOnCourt,
                    defenseTeamOnCourt,
                    offenseTeam,
                    3,
                    quarterTime,
                    currentQuarter,
                    team1,
                    team2,
                    false,
                    language,
                    commentary
                )

            return convertFreeThrowToShotOutcome(freeThrowResult)
        }

        offensePlayer.shotAttempted++
        if (distance >= Constants.THREE_POINT_LINE_DISTANCE) offensePlayer.threeAttempted++

        // Shot out of bound
        if (generateRandomNum(random) <= Constants.SHOT_OUT_OF_BOUND) {
            return { result: ShotResult.OUT_OF_BOUNDS }
        }

        const reboundOutcome = judgeRebound(random, offenseTeamOnCourt, defenseTeamOnCourt)
        return {
            result: reboundOutcome.isOffensiveRebound ? ShotResult.OFFENSIVE_REBOUND : ShotResult.DEFENSIVE_REBOUND,
            reboundOutcome,
        }
    }
}

// =============================================================================
// Player Minutes Tracking (T040)
// =============================================================================

/**
 * Update player minutes after a possession.
 *
 * @param teamOnCourt - Players on the court
 * @param playTime - Time elapsed in this possession (seconds)
 */
export function updatePlayerMinutes(teamOnCourt: Map<string, Player>, playTime: number): void {
    for (const player of teamOnCourt.values()) {
        player.hasBeenOnCourt = true
        player.secondsPlayed += playTime
        player.currentStintSeconds += playTime
    }
}

// =============================================================================
// Intelligent Substitution (T041)
// =============================================================================

/**
 * Get target minutes for a player based on durability, athleticism, and game situation.
 *
 * @param player - The player
 * @param isCloseGame - Whether the game is close (optional, for bonus minutes)
 * @returns Target minutes in seconds
 */
export function getTargetMinutes(player: Player, isCloseGame: boolean = false): number {
    if (player.rotationType !== 1) {
        // Not a starter
        return Constants.NON_STARTER_MAX_MINUTES
    }

    // Base minutes determined by durability
    let baseMinutes: number
    if (player.durability >= Constants.HIGH_DURABILITY_THRESHOLD) baseMinutes = Constants.HIGH_DURABILITY_MINUTES
    else if (player.durability >= Constants.MEDIUM_DURABILITY_THRESHOLD) baseMinutes = Constants.MEDIUM_DURABILITY_MINUTES
    else if (player.durability >= Constants.LOW_DURABILITY_THRESHOLD) baseMinutes = Constants.LOW_DURABILITY_MINUTES
    else baseMinutes = Constants.VERY_LOW_DURABILITY_MINUTES

    // Athleticism adjustment
    let athleticismAdjustment: number
    if (player.athleticism >= Constants.ATHLETICISM_ELITE_THRESHOLD) {
        athleticismAdjustment = Constants.ATHLETICISM_ELITE_BONUS
    } else if (player.athleticism >= Constants.ATHLETICISM_HIGH_THRESHOLD) {
        athleticismAdjustment = Constants.ATHLETICISM_HIGH_BONUS
    } else if (player.athleticism >= Constants.ATHLETICISM_ABOVE_AVG_THRESHOLD) {
        athleticismAdjustment = Constants.ATHLETICISM_ABOVE_AVG_PENALTY
    } else if (player.athleticism >= Constants.ATHLETICISM_AVG_THRESHOLD) {
        athleticismAdjustment = Constants.ATHLETICISM_AVG_PENALTY
    } else if (player.athleticism >= Constants.ATHLETICISM_BELOW_AVG_THRESHOLD) {
        athleticismAdjustment = Constants.ATHLETICISM_BELOW_AVG_PENALTY
    } else if (player.athleticism >= Constants.ATHLETICISM_LOW_THRESHOLD) {
        athleticismAdjustment = Constants.ATHLETICISM_LOW_PENALTY
    } else {
        athleticismAdjustment = Constants.ATHLETICISM_VERY_LOW_PENALTY
    }

    // Close game bonus - starters should play more in tight games
    const closeGameBonus = isCloseGame ? Constants.CLOSE_GAME_BONUS_MINUTES : 0

    const targetMinutes = baseMinutes + athleticismAdjustment + closeGameBonus
    return Math.max(targetMinutes, Constants.MIN_STARTER_MINUTES)
}

/**
 * Check if player should be subbed due to foul trouble
 */
export function shouldSubForFoulTrouble(player: Player, currentQuarter: number): boolean {
    if (currentQuarter === Constants.QUARTER_1 && player.foul >= Constants.QUARTER1_PROTECT) return true
    if (currentQuarter === Constants.QUARTER_2 && player.foul >= Constants.QUARTER2_PROTECT) return true
    if (currentQuarter >= Constants.QUARTER_3 && player.foul >= Constants.QUARTER3_PROTECT) return true
    return false
}

/**
 * Check if player's foul situation is safe for the current quarter
 */
export function isFoulSituationSafe(player: Player, currentQuarter: number): boolean {
    if (currentQuarter === Constants.QUARTER_1) return player.foul < Constants.QUARTER1_PROTECT
    if (currentQuarter === Constants.QUARTER_2) return player.foul < Constants.QUARTER2_PROTECT
    if (currentQuarter >= Constants.QUARTER_3) return player.foul < Constants.QUARTER3_PROTECT
    return true
}

/**
 * Check if player should be subbed due to fatigue
 */
export function shouldSubForFatigue(player: Player, isCloseGame: boolean): boolean {
    if (player.rotationType === 1) {
        // STARTER
        const maxStint = isCloseGame ? Constants.MAX_STARTER_STINT_CLOSE_GAME : Constants.MAX_STARTER_STINT_NORMAL_GAME
        return player.currentStintSeconds >= maxStint
    } else if (player.rotationType === 2) {
        // BENCH
        return player.currentStintSeconds >= Constants.MAX_BENCH_STINT
    }
    return false
}

/**
 * Check if player should be subbed due to poor performance
 */
export function shouldSubForPerformance(player: Player): boolean {
    if (player.shotAttempted >= Constants.MIN_SHOTS_FOR_HOT) {
        const shotPct = player.shotMade / player.shotAttempted
        if (shotPct <= Constants.COLD_SHOOTER_THRESHOLD) {
            return true
        }
    }
    return false
}

/**
 * Find best available substitute for a player
 */
export function findBestSubstitute(
    team: Team,
    currentPlayer: Player,
    gameTime: number,
    isCloseGame: boolean,
    currentQuarter: number
): Player | null {
    const pos = currentPlayer.position
    const currentRotation = currentPlayer.rotationType

    // Priority 1: Bring back starters if they've rested enough AND foul situation is safe
    if (currentRotation === 2 || currentRotation === 3) {
        // BENCH or DEEP_BENCH
        const starter = team.starters.get(pos)
        if (starter && starter.canOnCourt && !starter.isOnCourt) {
            const restTime = gameTime - starter.lastSubbedOutTime
            const minRest = isCloseGame ? Constants.MIN_REST_TIME_CLOSE_GAME : Constants.MIN_REST_TIME
            const targetMinutes = getTargetMinutes(starter, isCloseGame)

            // Only bring back starter if they haven't exceeded their target minutes (higher in close games)
            if (restTime >= minRest && starter.secondsPlayed < targetMinutes && isFoulSituationSafe(starter, currentQuarter)) {
                return starter
            }
        }
    }

    // Priority 2: Rotate to bench if starter needs rest
    if (currentRotation === 1) {
        // STARTER
        if (team.benches.has(pos)) {
            for (const benchPlayer of team.benches.get(pos)!) {
                if (benchPlayer.canOnCourt && !benchPlayer.isOnCourt) {
                    const restTime = gameTime - benchPlayer.lastSubbedOutTime
                    if (!benchPlayer.hasBeenOnCourt || restTime >= Constants.MIN_REST_TIME) {
                        return benchPlayer
                    }
                }
            }
        }
    }

    return null
}

/**
 * Intelligent substitution system that evaluates multiple factors
 *
 * @param random - The SeededRandom object
 * @param team - Team to check for substitutions
 * @param teamOnCourt - Current players on court
 * @param currentQuarter - Current quarter (1-4 for regulation, 5+ for OT)
 * @param quarterTime - Seconds remaining in quarter
 * @param gameTime - Total seconds elapsed in game (for fatigue tracking)
 * @param team1 - Team 1 reference (for score differential)
 * @param team2 - Team 2 reference (for score differential)
 * @param isGarbageTime - Whether the game is in garbage time
 * @returns true if substitutions were made, false otherwise
 */
export function checkIntelligentSubstitutions(
    random: SeededRandom,
    team: Team,
    teamOnCourt: Map<string, Player>,
    currentQuarter: number,
    quarterTime: number,
    gameTime: number,
    team1: Team,
    team2: Team,
    isGarbageTime: boolean,
    language?: Language,
    commentary?: CommentaryOutput
): boolean {
    const subContext: SubstitutionCommentaryContext = { announced: false }

    // Garbage time: prioritize giving deep bench players minutes
    if (isGarbageTime) {
        return checkGarbageTimeSubstitutions(random, team, teamOnCourt, gameTime, language, commentary, subContext)
    }

    // Q1 first 6 minutes: Keep all starters in (unless fouled out or injured)
    if (currentQuarter === Constants.QUARTER_1 && quarterTime > Constants.Q1_NO_SUB_TIME) {
        return false
    }

    // Overtime: only play starters unless injured/fouled out
    if (currentQuarter >= Constants.OVERTIME_QUARTER) {
        return checkOvertimeSubstitutions(team, teamOnCourt, gameTime, random, language, commentary, subContext)
    }

    let madeSubs = false
    const scoreDiff = Math.abs(team1.totalScore - team2.totalScore)
    const isClutchTime =
        currentQuarter === Constants.CLUTCH_QUARTER && quarterTime <= Constants.TIME_LEFT_CLUTCH && scoreDiff <= Constants.CLOSE_GAME_DIFF
    const isCloseGame = scoreDiff <= Constants.CLOSE_GAME_DIFF

    // Determine if this team is trailing
    const isTrailing = team.totalScore < (team === team1 ? team2.totalScore : team1.totalScore)

    // Use higher probabilities when trailing to get starters back faster
    const subCheckProb = isTrailing ? Constants.SUB_CHECK_PROBABILITY_TRAILING : Constants.SUB_CHECK_PROBABILITY
    const subDecisionProb = isTrailing ? Constants.SUB_DECISION_PROBABILITY_TRAILING : Constants.SUB_DECISION_PROBABILITY

    // Clutch time: keep best players in
    if (isClutchTime) {
        return ensureStartersInClutch(team, teamOnCourt, gameTime, random, language, commentary, subContext)
    }

    // Proactively check if rested starters with safe foul situation can return
    // This ensures foul-protected starters don't sit too long
    if (generateRandomNum(random, 1, 100) < subCheckProb) {
        for (const [pos, starter] of team.starters.entries()) {
            const currentPlayer = teamOnCourt.get(pos)

            if (starter && starter.canOnCourt && !starter.isOnCourt &&
                currentPlayer && currentPlayer.rotationType !== 1) { // 1 = STARTER

                const restTime = gameTime - starter.lastSubbedOutTime
                const minRest = isCloseGame ? Constants.MIN_REST_TIME_CLOSE_GAME : Constants.MIN_REST_TIME
                const targetMinutes = getTargetMinutes(starter, isCloseGame)

                // If starter has rested enough, is under target minutes (higher in close games), AND foul situation is safe
                if (restTime >= minRest && starter.secondsPlayed < targetMinutes && isFoulSituationSafe(starter, currentQuarter)) {
                    teamOnCourt.set(pos, starter)
                    currentPlayer.isOnCourt = false
                    currentPlayer.lastSubbedOutTime = gameTime
                    currentPlayer.currentStintSeconds = 0

                    starter.isOnCourt = true
                    starter.hasBeenOnCourt = true
                    starter.currentStintSeconds = 0

                    emitSubstitutionCommentary(team, starter, currentPlayer, random, language, commentary, subContext, true)
                    return true // Successfully brought back a starter
                }
            }
        }
    }

    // Random chance to check for substitutions
    if (generateRandomNum(random, 1, 100) >= subDecisionProb) {
        return false
    }

    // Find ONE player who most needs to be subbed
    let posToSub: string | null = null
    let highestPriority = 0

    for (const [pos, currentPlayer] of teamOnCourt.entries()) {
        let priority = 0

        // Critical: foul trouble (highest priority)
        if (shouldSubForFoulTrouble(currentPlayer, currentQuarter)) {
            priority = Constants.FOUL_TROUBLE_PRIORITY
        }
        // High: fatigue
        else if (shouldSubForFatigue(currentPlayer, isCloseGame)) {
            priority = Constants.FATIGUE_BASE_PRIORITY + Math.floor(currentPlayer.currentStintSeconds / Constants.FATIGUE_SECONDS_TO_PRIORITY)
        }
        // High: minutes cap (higher target in close games)
        else if (currentPlayer.secondsPlayed >= getTargetMinutes(currentPlayer, isCloseGame)) {
            priority = Constants.MINUTES_CAP_PRIORITY
        }
        // Medium: performance (cold shooter - only if not close game)
        else if (!isCloseGame && shouldSubForPerformance(currentPlayer)) {
            priority = Constants.PERFORMANCE_PRIORITY
        }

        if (priority > highestPriority) {
            highestPriority = priority
            posToSub = pos
        }
    }

    // Make ONE substitution if needed
    if (posToSub !== null && highestPriority > 0) {
        const currentPlayer = teamOnCourt.get(posToSub)!
        const newPlayer = findBestSubstitute(team, currentPlayer, gameTime, isCloseGame, currentQuarter)

        if (newPlayer !== null && newPlayer !== currentPlayer) {
            teamOnCourt.set(posToSub, newPlayer)
            currentPlayer.isOnCourt = false
            currentPlayer.lastSubbedOutTime = gameTime
            currentPlayer.currentStintSeconds = 0

            newPlayer.isOnCourt = true
            newPlayer.hasBeenOnCourt = true
            newPlayer.currentStintSeconds = 0

            madeSubs = true

            emitSubstitutionCommentary(team, newPlayer, currentPlayer, random, language, commentary, subContext, true)
        }
    }

    return madeSubs
}

/**
 * Check for garbage time substitutions
 */
function checkGarbageTimeSubstitutions(
    random: SeededRandom,
    team: Team,
    teamOnCourt: Map<string, Player>,
    gameTime: number,
    language?: Language,
    commentary?: CommentaryOutput,
    context?: SubstitutionCommentaryContext
): boolean {
    if (generateRandomNum(random, 1, 100) > Constants.GARBAGE_TIME_SUB_PROBABILITY) {
        return false
    }

    let madeSub = false

    for (const pos of teamOnCourt.keys()) {
        const currentPlayer = teamOnCourt.get(pos)!
        if (currentPlayer.rotationType === 3) continue // Already deep bench

        // Try to find a deep bench player
        const position = pos as Position
        if (team.rareBenches.has(position)) {
            for (const deepBench of team.rareBenches.get(position)!) {
                if (deepBench.canOnCourt && !deepBench.isOnCourt) {
                    teamOnCourt.set(pos, deepBench)
                    currentPlayer.isOnCourt = false
                    currentPlayer.lastSubbedOutTime = gameTime
                    currentPlayer.currentStintSeconds = 0

                    deepBench.isOnCourt = true
                    deepBench.hasBeenOnCourt = true
                    deepBench.currentStintSeconds = 0

                    madeSub = true
                    emitSubstitutionCommentary(team, deepBench, currentPlayer, random, language, commentary, context, true)
                    break
                }
            }
        }

        if (madeSub) break // One sub at a time
    }

    return madeSub
}

/**
 * Check overtime substitutions (only play starters)
 */
function checkOvertimeSubstitutions(
    team: Team,
    teamOnCourt: Map<string, Player>,
    gameTime: number,
    random?: SeededRandom,
    language?: Language,
    commentary?: CommentaryOutput,
    context?: SubstitutionCommentaryContext
): boolean {
    let madeSub = false

    for (const [pos, currentPlayer] of teamOnCourt.entries()) {
        if (currentPlayer.rotationType === 1 && currentPlayer.canOnCourt) continue // Starter already in

        const starter = team.starters.get(pos as Position)
        if (starter && starter.canOnCourt && !starter.isOnCourt) {
            teamOnCourt.set(pos, starter)
            currentPlayer.isOnCourt = false
            currentPlayer.lastSubbedOutTime = gameTime
            currentPlayer.currentStintSeconds = 0

            starter.isOnCourt = true
            starter.currentStintSeconds = 0
            starter.hasBeenOnCourt = true

            madeSub = true

            emitSubstitutionCommentary(team, starter, currentPlayer, random, language, commentary, context, true)
        }
    }

    return madeSub
}

/**
 * Ensure starters are in during clutch time
 */
function ensureStartersInClutch(
    team: Team,
    teamOnCourt: Map<string, Player>,
    gameTime: number,
    random?: SeededRandom,
    language?: Language,
    commentary?: CommentaryOutput,
    context?: SubstitutionCommentaryContext
): boolean {
    let madeSub = false

    for (const [pos, currentPlayer] of teamOnCourt.entries()) {
        if (currentPlayer.rotationType === 1 && currentPlayer.canOnCourt) continue // Starter already in

        const starter = team.starters.get(pos as Position)
        if (starter && starter.canOnCourt && !starter.isOnCourt) {
            teamOnCourt.set(pos, starter)
            currentPlayer.isOnCourt = false
            currentPlayer.lastSubbedOutTime = gameTime
            currentPlayer.currentStintSeconds = 0

            starter.isOnCourt = true
            starter.currentStintSeconds = 0
            starter.hasBeenOnCourt = true

            madeSub = true

            emitSubstitutionCommentary(team, starter, currentPlayer, random, language, commentary, context, true)
        }
    }

    return madeSub
}
