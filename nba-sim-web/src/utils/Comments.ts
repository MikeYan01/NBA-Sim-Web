/**
 * Comments Module
 *
 * Generates live commentary for game events.
 * Migrated from Java Comments.java.
 *
 * This module provides functions to generate localized commentary
 * for various game events like jump balls, shots, rebounds, steals,
 * blocks, fouls, and substitutions.
 */

import type { SeededRandom } from './SeededRandom'
import type { Player } from '../models/Player'
import type { Team } from '../models/Team'
import { Language, DunkerType, ShotType } from '../models/types'
import type { ShotChoiceResult } from '../models/types'
import {
    getRandomComment,
    getFormattedComment,
    getAllComments,
} from '../services/CommentLoader'
import { getString } from '../services/LocalizationService'
import {
    getLocalizedTeamName,
    MAX_SB_LEN,
    SHOT_POSITION_PERCENT,
    TYPE_1_LAYUP,
    TYPE_1_DUNK,
    TYPE_2_LAYUP,
    TYPE_2_DUNK,
    TYPE_3_LAYUP,
    TYPE_3_DUNK,
    SHOT_CHOICE_THLD,
    CELEBRATE_HIGH_PERCENT,
    CELEBRATE_LOW_PERCENT,
    UPSET_HIGH_PERCENT,
    UPSET_LOW_PERCENT,
    MIN_GOOD_SCORE,
    MIN_SHOT_MADE,
    MIN_GOOD_SHOT_PERCENT,
    MIN_SHOT_ATTEMPTED,
    MAX_BAD_SHOT_PERCENT,
    MIN_THREE_SHOT,
    MAX_CLOSE_SHOT,
    CHALLENGE_SUCCESS,
} from './Constants'
import { generateRandomNum } from './Utilities'

/**
 * Commentary output collector.
 * Stores generated commentary lines for later retrieval.
 */
export interface CommentaryOutput {
    lines: string[]
    /** Score snapshots [team1Score, team2Score] for each line */
    scoreSnapshots: [number, number][]
    /** Time snapshots [quarter, timeRemaining] for each line */
    timeSnapshots: [number, number][]
    /** Current scores for tracking - set externally during game simulation */
    currentScore1?: number
    currentScore2?: number
    /** Current quarter for tracking - set externally during game simulation */
    currentQuarter?: number
    /** Current time remaining in quarter (seconds) - set externally during game simulation */
    currentTimeRemaining?: number
}

/**
 * Create a new commentary output collector.
 */
export function createCommentaryOutput(): CommentaryOutput {
    return { lines: [], scoreSnapshots: [], timeSnapshots: [], currentScore1: 0, currentScore2: 0, currentQuarter: 1, currentTimeRemaining: 720 }
}

/**
 * Add a line to the commentary output.
 * Records the current score and time snapshot for real-time display.
 */
function addLine(output: CommentaryOutput, line: string): void {
    output.lines.push(line)
    // Record current score snapshot for this line
    output.scoreSnapshots.push([output.currentScore1 ?? 0, output.currentScore2 ?? 0])
    // Record current time snapshot for this line
    output.timeSnapshots.push([output.currentQuarter ?? 1, output.currentTimeRemaining ?? 720])
}

/**
 * Pick a random string from an array of options.
 * @param corpus Array of possible comments
 * @param random Seeded random generator
 * @returns Randomly selected comment
 */
export function pickStringOutput(
    corpus: string[],
    random: SeededRandom
): string {
    if (corpus.length === 0) return ''
    const index = generateRandomNum(random, 1, corpus.length) - 1
    return corpus[index]
}

/**
 * Get player's last name from full name.
 * In Chinese mode, splits by middle dot (·).
 * In English mode, splits by space and handles suffixes like Jr., Sr., III, etc.
 *
 * @param name Player's full name
 * @param language Current language
 * @returns Player's last name
 */
export function getLastName(name: string, language: Language): string {
    const delimiter = language === Language.CHINESE ? '·' : ' '

    if (!name.includes(delimiter)) return name

    const parts = name.split(delimiter)

    // In English mode, check if last part is a suffix
    if (language === Language.ENGLISH) {
        const lastPart = parts[parts.length - 1]
        // Common name suffixes
        const suffixes = ['Jr.', 'Sr.', 'III', 'IV', 'II', 'V']
        if (suffixes.includes(lastPart) && parts.length >= 2) {
            return parts[parts.length - 2]
        }
    }

    return parts[parts.length - 1]
}

/**
 * Generates comments when two teams start jump ball.
 *
 * @param team1 Team 1
 * @param team2 Team 2
 * @param winTeam Team that wins jump ball
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getJumpBallComments(
    team1: Team,
    team2: Team,
    winTeam: Team,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const team1Display = getLocalizedTeamName(team1.name, language)
    const team2Display = getLocalizedTeamName(team2.name, language)
    const winTeamDisplay = getLocalizedTeamName(winTeam.name, language)

    const intro = getFormattedComment(
        'jumpBall.intro',
        random,
        language,
        { '0': team1Display, '1': team2Display }
    )
    const preparation = getRandomComment('jumpBall.preparation', random, language)
    const result = getFormattedComment(
        'jumpBall.teamResult',
        random,
        language,
        { '0': winTeamDisplay }
    )

    addLine(output, intro)
    addLine(output, preparation)
    addLine(output, result)
}

/**
 * Generates comments for two players jumping ball.
 *
 * @param offensePlayer Offense player name
 * @param defensePlayer Defense player name
 * @param winPlayer Player that wins the jump ball
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getJumpBallPlayerComments(
    offensePlayer: string,
    defensePlayer: string,
    winPlayer: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const offenseLastName = getLastName(offensePlayer, language)
    const defenseLastName = getLastName(defensePlayer, language)
    const winLastName = getLastName(winPlayer, language)

    const conflict = getFormattedComment(
        'jumpBall.conflict',
        random,
        language,
        { '0': offenseLastName, '1': defenseLastName }
    )
    const result = getFormattedComment(
        'jumpBall.playerResult',
        random,
        language,
        { '0': winLastName }
    )

    addLine(output, conflict)
    addLine(output, result)
}

/**
 * Generate shot position comments.
 *
 * @param random Seeded random generator
 * @param distance Shot distance
 * @param language Current language
 * @returns Player's shot position string
 */
export function getShotPosition(
    random: SeededRandom,
    distance: number,
    language: Language
): string {
    const degree = generateRandomNum(random, 1, 180)

    if (distance <= 10) return getRandomComment('shotPosition.underBasket', random, language)
    else if (degree <= 30 && distance <= 15) return getRandomComment('shotPosition.leftCornerPaint', random, language)
    else if (degree <= 30 && distance > 15) return getRandomComment('shotPosition.leftCorner', random, language)
    else if (degree <= 60 && distance <= 15) return getRandomComment('shotPosition.left45Paint', random, language)
    else if (degree <= 60 && distance > 15) return getRandomComment('shotPosition.left45', random, language)
    else if (degree <= 120 && distance <= 20) return getRandomComment('shotPosition.freeThrowLine', random, language)
    else if (degree <= 120 && distance > 20) return getRandomComment('shotPosition.topOfKey', random, language)
    else if (degree <= 150 && distance <= 15) return getRandomComment('shotPosition.right45Paint', random, language)
    else if (degree <= 150 && distance > 15) return getRandomComment('shotPosition.right45', random, language)
    else if (degree <= 180 && distance <= 15) return getRandomComment('shotPosition.rightCornerPaint', random, language)
    else return getRandomComment('shotPosition.rightCorner', random, language)
}

/**
 * Generate layup comments.
 *
 * @param random Seeded random generator
 * @param language Current language
 * @returns Layup movement string
 */
export function pickLayup(random: SeededRandom, language: Language): string {
    const resources = getAllComments('layup', language)
    return pickStringOutput(resources, random)
}

/**
 * Generate dunk comments.
 *
 * @param random Seeded random generator
 * @param dunkerType Player's dunker type
 * @param language Current language
 * @returns Dunk movement string
 */
export function pickDunk(
    random: SeededRandom,
    dunkerType: DunkerType,
    language: Language
): string {
    const path = dunkerType === DunkerType.EXCELLENT ? 'dunk.advanced' : 'dunk.basic'
    const resources = getAllComments(path, language)
    return pickStringOutput(resources, random)
}

/**
 * Generate shot comments.
 *
 * @param random Seeded random generator
 * @param distance Shot distance
 * @param language Current language
 * @returns Shot movement string
 */
export function pickShot(
    random: SeededRandom,
    distance: number,
    language: Language
): string {
    const path = distance >= SHOT_CHOICE_THLD ? 'shot.far' : 'shot.close'
    const resources = getAllComments(path, language)
    const suffix = distance >= MIN_THREE_SHOT
        ? getString('commentary.shot.threepoint_suffix', language)
        : ''
    const result = pickStringOutput(resources, random)
    return result + suffix
}

/**
 * Get shot choice (layup, dunk, or jumper) based on distance and player type.
 *
 * @param random Seeded random generator
 * @param player Player taking the shot
 * @param distance Shot distance
 * @param shotPos Shot position string
 * @param language Current language
 * @param output Commentary output collector
 * @returns ShotChoiceResult containing both the shotType enum and movement string
 */
export function getShotChoice(
    random: SeededRandom,
    player: Player,
    distance: number,
    shotPos: string,
    language: Language,
    output: CommentaryOutput
): ShotChoiceResult {
    const temp = generateRandomNum(random)
    const dunkerType = player.dunkerType
    let movement = ''
    let shotType: ShotType = ShotType.JUMPER

    if (distance <= MAX_CLOSE_SHOT) {
        if (dunkerType === DunkerType.RARELY_DUNK) {
            if (temp <= TYPE_1_LAYUP) {
                movement = pickLayup(random, language)
                shotType = ShotType.LAYUP
            } else if (temp <= TYPE_1_LAYUP + TYPE_1_DUNK) {
                movement = pickDunk(random, dunkerType, language)
                shotType = ShotType.DUNK
            }
        } else if (dunkerType === DunkerType.NORMAL) {
            if (temp <= TYPE_2_LAYUP) {
                movement = pickLayup(random, language)
                shotType = ShotType.LAYUP
            } else if (temp <= TYPE_2_LAYUP + TYPE_2_DUNK) {
                movement = pickDunk(random, dunkerType, language)
                shotType = ShotType.DUNK
            }
        } else {
            if (temp <= TYPE_3_LAYUP) {
                movement = pickLayup(random, language)
                shotType = ShotType.LAYUP
            } else if (temp <= TYPE_3_LAYUP + TYPE_3_DUNK) {
                movement = pickDunk(random, dunkerType, language)
                shotType = ShotType.DUNK
            }
        }

        if (movement === '') {
            movement = pickShot(random, distance, language)
            shotType = ShotType.JUMPER
        }
    } else {
        movement = pickShot(random, distance, language)
        shotType = ShotType.JUMPER
    }

    // Build the comment string
    let sb = `${distance}${getString('commentary.distance.feet', language)}`
    // Only add shot position in Chinese mode with probability
    if (generateRandomNum(random) <= SHOT_POSITION_PERCENT && language === Language.CHINESE) {
        sb += shotPos
    }
    sb += movement + '!'

    addLine(output, sb)
    return { shotType, movement }
}

/**
 * Generate player celebration comments with a specified percentage.
 *
 * @param name Player's name
 * @param percent The percent to generate celebrate comment
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getCelebrateComment(
    name: string,
    percent: number,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    if (generateRandomNum(random) <= percent) {
        const lastName = getLastName(name, language)
        const comment = getFormattedComment(
            'celebrate',
            random,
            language,
            { '0': lastName }
        )
        addLine(output, comment)
    }
}

/**
 * Generate player upset comments with a specified percentage.
 *
 * @param name Player's name
 * @param percent The percent to generate upset comment
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getUpsetComment(
    name: string,
    percent: number,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    if (generateRandomNum(random) <= percent) {
        const lastName = getLastName(name, language)
        const comment = getFormattedComment(
            'upset',
            random,
            language,
            { '0': lastName }
        )
        addLine(output, comment)
    }
}

/**
 * Generate comments when player gets ball.
 *
 * @param teamName Offense team name
 * @param name Player name
 * @param defensePlayer Defense player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getBallComment(
    teamName: string,
    name: string,
    defensePlayer: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const lastName = getLastName(name, language)
    const defenseLastName = getLastName(defensePlayer, language)
    const teamDisplay = getLocalizedTeamName(teamName, language)

    const comment1 = getFormattedComment(
        'getBall.teamOffense',
        random,
        language,
        { '0': teamDisplay }
    )
    const comment2 = getFormattedComment(
        'getBall.playerReceive',
        random,
        language,
        { '0': lastName }
    )
    const comment3 = getFormattedComment(
        'getBall.defense',
        random,
        language,
        { '0': defenseLastName }
    )

    addLine(output, '')
    addLine(output, comment1)
    addLine(output, comment2)
    addLine(output, comment3)
}

/**
 * Generate player turnover comments.
 *
 * @param name Player's name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getTurnoverComment(
    name: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const lastName = getLastName(name, language)
    const comment = getFormattedComment(
        'turnover',
        random,
        language,
        { '0': lastName }
    )
    addLine(output, comment)
    getUpsetComment(name, UPSET_HIGH_PERCENT, random, language, output)
}

/**
 * Generate comments after a non fast-break turnover.
 *
 * @param team Team name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getNonFastBreak(
    team: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const teamDisplay = getLocalizedTeamName(team, language)
    const comment = getFormattedComment(
        'nonFastBreak',
        random,
        language,
        { '0': teamDisplay }
    )
    addLine(output, comment)
}

/**
 * Generate comments after a steal.
 *
 * @param offensePlayer Offense player name
 * @param defensePlayer Defense player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getStealComment(
    offensePlayer: string,
    defensePlayer: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const offenseLastName = getLastName(offensePlayer, language)
    const defenseLastName = getLastName(defensePlayer, language)
    const comment = getFormattedComment(
        'steal',
        random,
        language,
        { '0': defenseLastName, '1': offenseLastName }
    )
    addLine(output, comment)
}

/**
 * Generate comments after a block.
 *
 * @param defensePlayer Defense player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getBlockComment(
    defensePlayer: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const defenseLastName = getLastName(defensePlayer, language)
    const comment = getFormattedComment(
        'block',
        random,
        language,
        { '0': defenseLastName }
    )
    addLine(output, comment)
}

/**
 * Generate comments when player makes a free throw.
 *
 * @param count The number of ongoing free throw
 * @param onlyOneShot Whether only one free throw in total
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getMakeFreeThrowComment(
    count: number,
    onlyOneShot: boolean,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const countPrefix = onlyOneShot
        ? getString('commentary.freethrow.label', language)
        : `${count}${getString('commentary.freethrow.attempt_suffix', language)}`
    const resources = getAllComments('freeThrow.make', language)
    const result = countPrefix + pickStringOutput(resources, random)
    addLine(output, result)
}

/**
 * Generate comments when player misses a free throw.
 *
 * @param count The number of ongoing free throw
 * @param onlyOneShot Whether only one free throw in total
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getMissFreeThrowComment(
    count: number,
    onlyOneShot: boolean,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const countPrefix = onlyOneShot
        ? getString('commentary.freethrow.label', language)
        : `${count}${getString('commentary.freethrow.attempt_suffix', language)}`
    const resources = getAllComments('freeThrow.miss', language)
    const result = countPrefix + pickStringOutput(resources, random)
    addLine(output, result)
}

/**
 * Generate comments for starters in garbage time.
 *
 * @param team The team to be commented
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getStartersComment(
    team: Team,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const starterPositions = Array.from(team.starters.values())
    if (starterPositions.length === 0) return

    const randomIndex = generateRandomNum(random, 0, starterPositions.length - 1)
    const randomPlayer = starterPositions[randomIndex]
    const playerName = getLastName(randomPlayer.getDisplayName(language), language)
    const comment = getFormattedComment(
        'startersGarbageTime',
        random,
        language,
        { '0': playerName }
    )
    addLine(output, comment)
}

/**
 * Generate comments when player makes And-one shot.
 *
 * @param name Player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getAndOneComment(
    name: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const resources = getAllComments('andOne', language)
    addLine(output, pickStringOutput(resources, random))
    getCelebrateComment(name, CELEBRATE_HIGH_PERCENT, random, language, output)
}

/**
 * Generate comments when one team reaches quarter foul times bonus.
 *
 * @param offenseTeam Offense team name
 * @param defenseTeam Defense team name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getReachFoulTimes(
    offenseTeam: string,
    defenseTeam: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const offenseDisplay = getLocalizedTeamName(offenseTeam, language)
    const defenseDisplay = getLocalizedTeamName(defenseTeam, language)
    const comment = getFormattedComment(
        'reachFoulTimes',
        random,
        language,
        { '0': defenseDisplay, '1': offenseDisplay }
    )
    addLine(output, comment)
}

/**
 * Generate comments when the player draws a foul.
 *
 * @param offensePlayer Offense player name
 * @param defensePlayer Defense player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getFoulComment(
    offensePlayer: string,
    defensePlayer: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const offenseLastName = getLastName(offensePlayer, language)
    const defenseLastName = getLastName(defensePlayer, language)
    const comment = getFormattedComment(
        'foul.defensive',
        random,
        language,
        { '0': defenseLastName, '1': offenseLastName }
    )
    addLine(output, comment)
}

/**
 * Generate comments when the player draws a flagrant foul.
 *
 * @param offensePlayer Offense player name
 * @param defensePlayer Defense player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getFlagFoulComment(
    offensePlayer: string,
    defensePlayer: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const offenseLastName = getLastName(offensePlayer, language)
    const defenseLastName = getLastName(defensePlayer, language)
    const comment = getFormattedComment(
        'foul.flagrant',
        random,
        language,
        { '0': defenseLastName, '1': offenseLastName }
    )
    addLine(output, comment)
}

/**
 * Generate comments when the player prepares to go to the free throw line.
 *
 * @param player Free throw player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getFreeThrowPrepareComment(
    player: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const playerLastName = getLastName(player, language)
    const comment = getFormattedComment(
        'freeThrow.prepare',
        random,
        language,
        { '0': playerLastName }
    )
    addLine(output, comment)
}

/**
 * Generate foul challenge comments.
 *
 * @param teamName Challenge team name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 * @returns Whether the challenge succeeded
 */
export function getChallengeComment(
    teamName: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): boolean {
    const teamDisplay = getLocalizedTeamName(teamName, language)
    const requestComment = getFormattedComment(
        'challenge.request',
        random,
        language,
        { '0': teamDisplay }
    )
    addLine(output, requestComment)

    // Challenge successful
    if (generateRandomNum(random) <= CHALLENGE_SUCCESS) {
        const successComment = getFormattedComment(
            'challenge.success',
            random,
            language,
            { '0': teamDisplay }
        )
        addLine(output, successComment)
        return true
    } else {
        const failComment = getFormattedComment(
            'challenge.failure',
            random,
            language,
            { '0': teamDisplay }
        )
        addLine(output, failComment)
        return false
    }
}

/**
 * Generate comments when player makes a shot.
 *
 * @param offenseName Offense player name
 * @param defenseName Defense player name
 * @param distance Shot distance
 * @param shotType The type of shot (DUNK, LAYUP, or JUMPER)
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getMakeShotsComment(
    offenseName: string,
    defenseName: string,
    distance: number,
    shotType: ShotType,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const defenseLastName = getLastName(defenseName, language)
    let comment: string

    if (shotType === ShotType.DUNK) {
        comment = getFormattedComment(
            'makeShot.dunk',
            random,
            language,
            { '0': defenseLastName }
        )
    } else if (distance < MIN_THREE_SHOT) {
        comment = getFormattedComment(
            'makeShot.twoPoint',
            random,
            language,
            { '0': defenseLastName }
        )
    } else {
        comment = getFormattedComment(
            'makeShot.threePoint',
            random,
            language,
            { '0': defenseLastName }
        )
    }

    addLine(output, comment)
    getCelebrateComment(offenseName, CELEBRATE_LOW_PERCENT, random, language, output)
}

/**
 * Generate comments when player misses a shot.
 *
 * @param shotType The type of shot (DUNK, LAYUP, or JUMPER)
 * @param offenseName Player's name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getMissShotsComment(
    shotType: ShotType,
    offenseName: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const offenseLastName = getLastName(offenseName, language)
    let comment: string

    if (shotType === ShotType.DUNK) {
        comment = getRandomComment('missShot.dunk', random, language)
    } else {
        comment = getRandomComment('missShot.normal', random, language)
    }

    addLine(output, comment)
    getUpsetComment(offenseLastName, UPSET_LOW_PERCENT, random, language, output)
}

/**
 * Generate comments when player plays well or plays bad.
 *
 * @param player Player object
 * @param isGoodStatus Whether the player is in good status
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getStatusComment(
    player: Player,
    isGoodStatus: boolean,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const shotPercent = player.shotAttempted > 0
        ? player.shotMade / player.shotAttempted
        : 0

    const shouldComment =
        (isGoodStatus &&
            (player.score >= MIN_GOOD_SCORE ||
                (player.shotMade >= MIN_SHOT_MADE && shotPercent >= MIN_GOOD_SHOT_PERCENT))) ||
        (!isGoodStatus &&
            (player.shotAttempted >= MIN_SHOT_ATTEMPTED && shotPercent <= MAX_BAD_SHOT_PERCENT))

    if (shouldComment) {
        const lastName = getLastName(player.getDisplayName(language), language)
        const category = isGoodStatus ? 'playerStatus.good' : 'playerStatus.bad'
        const comment = getFormattedComment(
            category,
            random,
            language,
            { '0': lastName }
        )

        const suffix =
            getString('commentary.player_status.currently', language) +
            player.shotAttempted +
            getString('commentary.player_status.fg_made', language) +
            player.shotMade +
            getString('commentary.player_status.fg_total', language) +
            player.score +
            getString('commentary.player_status.points_suffix', language)

        addLine(output, comment)
        addLine(output, suffix)
    }
}

/**
 * Generate comments when the player grabs a rebound.
 *
 * @param name Player name
 * @param isOrb Whether the rebound is offensive
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getReboundComment(
    name: string,
    isOrb: boolean,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const lastName = getLastName(name, language)
    const rebType = isOrb
        ? getString('commentary.rebound.offensive', language)
        : getString('commentary.rebound.defensive', language)
    const comment = getFormattedComment(
        'rebound',
        random,
        language,
        { '0': lastName, '1': rebType }
    )
    addLine(output, comment)
}

/**
 * Generate comments when the defense player blocks the ball out-of-bound.
 *
 * @param defenseName Defense player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getOutOfBound(
    defenseName: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const comment = getRandomComment('outOfBound', random, language)
    addLine(output, comment)
    getCelebrateComment(defenseName, CELEBRATE_HIGH_PERCENT, random, language, output)
}

/**
 * Generate comments when the offense player misses the shot and the ball is out-of-bound.
 *
 * @param offensePlayer Offense player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function shotOutOfBound(
    offensePlayer: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const comment = getRandomComment('shotOutOfBound', random, language)
    addLine(output, comment)
    getUpsetComment(offensePlayer, UPSET_LOW_PERCENT, random, language, output)
}

/**
 * Generate comments when the player gets injured.
 *
 * @param name Player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getInjuryComment(
    name: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const lastName = getLastName(name, language)
    const comment = getFormattedComment(
        'injury',
        random,
        language,
        { '0': lastName }
    )
    addLine(output, comment)
}

/**
 * Generate comments when the player makes fast-break after a turnover.
 *
 * @param teamName Team name
 * @param offensePlayer Offense player name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getFastBreak(
    teamName: string,
    offensePlayer: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const teamDisplay = getLocalizedTeamName(teamName, language)
    const offenseLastName = getLastName(offensePlayer, language)
    const comment = getFormattedComment(
        'fastBreak',
        random,
        language,
        { '0': teamDisplay, '1': offenseLastName }
    )
    addLine(output, comment)
    getCelebrateComment(offensePlayer, CELEBRATE_HIGH_PERCENT, random, language, output)
}

/**
 * Generate offensive foul comments.
 *
 * @param offensePlayer Offense player name
 * @param type Offensive foul type (1 - Charging, 2 - Illegal screen)
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getOffensiveFoul(
    offensePlayer: string,
    type: number,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const offenseLastName = getLastName(offensePlayer, language)
    let comment: string

    if (type === 1) {
        comment = getFormattedComment(
            'foul.offensive.charging',
            random,
            language,
            { '0': offenseLastName }
        )
    } else if (type === 2) {
        comment = getFormattedComment(
            'foul.offensive.illegalScreen',
            random,
            language,
            { '0': offenseLastName }
        )
    } else {
        return
    }

    addLine(output, comment)
    getUpsetComment(offensePlayer, UPSET_HIGH_PERCENT, random, language, output)
}

/**
 * Generate defensive foul comments.
 *
 * @param defensePlayer Defense player name
 * @param type Defensive foul type (1 - Blocking, 2 - Reach in)
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getDefensiveFoul(
    defensePlayer: string,
    type: number,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const defenseLastName = getLastName(defensePlayer, language)
    let comment: string

    if (type === 1) {
        comment = getFormattedComment(
            'foul.defensiveFoul.blocking',
            random,
            language,
            { '0': defenseLastName }
        )
    } else if (type === 2) {
        comment = getFormattedComment(
            'foul.defensiveFoul.reachIn',
            random,
            language,
            { '0': defenseLastName }
        )
    } else {
        return
    }

    addLine(output, comment)
    getUpsetComment(defensePlayer, UPSET_HIGH_PERCENT, random, language, output)
}

/**
 * Generate comments when a team substitutes players.
 *
 * @param teamName Team name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getSubstitutionComment(
    teamName: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const teamDisplay = getLocalizedTeamName(teamName, language)
    const comment = getFormattedComment(
        'substitution',
        random,
        language,
        { '0': teamDisplay }
    )
    addLine(output, '')
    addLine(output, comment)
}

/**
 * Generate comments when a player gets fouled out.
 *
 * @param name Player name
 * @param isNormalFoul Whether fouled out by normal foul (vs flagrant)
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getFoulOutComment(
    name: string,
    isNormalFoul: boolean,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const lastName = getLastName(name, language)
    const category = isNormalFoul ? 'foulOut.normal' : 'foulOut.flagrant'
    const comment = getFormattedComment(
        category,
        random,
        language,
        { '0': lastName }
    )
    addLine(output, comment)
}

/**
 * Generate comments when a player gets substituted to prevent too many fouls.
 *
 * @param name Player's name
 * @param random Seeded random generator
 * @param language Current language
 * @param output Commentary output collector
 */
export function getFoulProtectComment(
    name: string,
    random: SeededRandom,
    language: Language,
    output: CommentaryOutput
): void {
    const lastName = getLastName(name, language)
    const comment = getFormattedComment(
        'foulProtect',
        random,
        language,
        { '0': lastName }
    )
    addLine(output, comment)
}

/**
 * Generate comments when a player gets substituted.
 *
 * @param currentPlayer In player name
 * @param previousPlayer Out player name
 * @param language Current language
 * @param output Commentary output collector
 */
export function getSubstituteComment(
    currentPlayer: string,
    previousPlayer: string,
    language: Language,
    output: CommentaryOutput
): void {
    if (currentPlayer !== previousPlayer) {
        const result = `${currentPlayer}${getString('commentary.substitution.replace', language)}${previousPlayer}!`
        addLine(output, result)
    }
}

/**
 * Print substitution prefix to indicate substitutions are about to happen.
 *
 * @param teamName The name of the team making substitutions
 * @param language Current language
 * @param output Commentary output collector
 */
export function getSubstitutionPrefix(
    teamName: string,
    language: Language,
    output: CommentaryOutput
): void {
    const teamDisplay = getLocalizedTeamName(teamName, language)
    addLine(output, '')
    addLine(output, `════════════════ ${teamDisplay} ${getString('commentary.substitution.prefix', language)} ════════════════`)
}

/**
 * Print current time and score during game.
 * Always displays away team first, home team second.
 *
 * @param time Current quarter time left
 * @param currentQuarter Current quarter number
 * @param awayTeam The away team (displayed first)
 * @param homeTeam The home team (displayed second)
 * @param language Current language
 * @param output Commentary output collector
 */
export function getTimeAndScore(
    time: number,
    currentQuarter: number,
    awayTeam: Team,
    homeTeam: Team,
    language: Language,
    output: CommentaryOutput
): void {
    const minute = Math.floor(time / 60).toString()
    const second = (time % 60).toString().padStart(2, '0')

    let sb = ''
    if (currentQuarter <= 4) {
        sb += getString('commentary.time.quarter_prefix', language)
        sb += currentQuarter
        sb += getString('commentary.time.quarter_suffix', language)
        sb += ' '
    } else {
        sb += getString('commentary.time.overtime_prefix', language)
        sb += currentQuarter - 4
        sb += getString('commentary.time.quarter_suffix', language)
        sb += ' '
    }

    const awayTeamDisplay = getLocalizedTeamName(awayTeam.name, language)
    const homeTeamDisplay = getLocalizedTeamName(homeTeam.name, language)

    sb += `${minute}:${second}${getString('commentary.time.seconds', language)}  `
    sb += `${awayTeamDisplay} ${awayTeam.totalScore}:${homeTeam.totalScore} ${homeTeamDisplay}`

    addLine(output, sb)
}

/**
 * Generate comments when a quarter ends.
 * Always displays away team first, home team second.
 *
 * @param currentQuarter Current quarter number
 * @param awayTeam The away team (displayed first)
 * @param homeTeam The home team (displayed second)
 * @param language Current language
 * @param output Commentary output collector
 */
export function quarterEnd(
    currentQuarter: number,
    awayTeam: Team,
    homeTeam: Team,
    language: Language,
    output: CommentaryOutput
): void {
    const awayTeamDisplay = getLocalizedTeamName(awayTeam.name, language)
    const homeTeamDisplay = getLocalizedTeamName(homeTeam.name, language)

    // Add empty line for visual separation
    addLine(output, '')

    // Quarter end announcement
    let endLine = getString('commentary.time.quarter_prefix', language)
    endLine += currentQuarter
    endLine += getString('commentary.time.quarter_suffix', language)
    endLine += getString('commentary.time.quarter_end', language)
    endLine += '!'
    addLine(output, endLine)

    // Current score line
    let scoreLine = getString('commentary.time.current_score', language)
    scoreLine += ' '
    scoreLine += `${awayTeamDisplay} ${awayTeam.totalScore}:${homeTeam.totalScore} ${homeTeamDisplay}`
    addLine(output, scoreLine)

    // Separator
    addLine(output, '')
    addLine(output, '==============================================')
    addLine(output, '')

    // Next quarter start announcement
    let startLine = getString('commentary.time.quarter_prefix', language)
    startLine += currentQuarter + 1
    startLine += getString('commentary.time.quarter_suffix', language)
    startLine += getString('commentary.time.game_start', language)
    startLine += '!'
    addLine(output, startLine)
}

/**
 * Generate comments when regular time ends (going to overtime).
 * Always displays away team first, home team second.
 *
 * @param awayTeam The away team (displayed first)
 * @param _homeTeam The home team (unused, score is same when tied)
 * @param language Current language
 * @param output Commentary output collector
 */
export function regularEnd(
    awayTeam: Team,
    _homeTeam: Team,
    language: Language,
    output: CommentaryOutput
): void {
    // Add empty line for visual separation
    addLine(output, '')

    // Time up announcement
    addLine(output, getString('commentary.regular_end.time_up', language) + '!')

    // Tied score announcement
    let tiedLine = getString('commentary.regular_end.tied_prefix', language)
    tiedLine += awayTeam.totalScore
    tiedLine += getString('commentary.regular_end.tied_suffix', language)
    tiedLine += '!'
    addLine(output, tiedLine)

    // Separator
    addLine(output, '')
    addLine(output, '==============================================')
    addLine(output, '')

    // Overtime start announcement
    addLine(output, getString('commentary.regular_end.overtime_start', language) + '!')
}

/**
 * Generate comments when the game ends.
 * Always displays away team first, home team second.
 *
 * @param awayTeam The away team (displayed first)
 * @param homeTeam The home team (displayed second)
 * @param awayScores Away team's scores at end of each quarter
 * @param homeScores Home team's scores at end of each quarter
 * @param language Current language
 * @param output Commentary output collector
 */
export function gameEnd(
    awayTeam: Team,
    homeTeam: Team,
    awayScores: number[],
    homeScores: number[],
    language: Language,
    output: CommentaryOutput
): void {
    const awayTeamDisplay = getLocalizedTeamName(awayTeam.name, language)
    const homeTeamDisplay = getLocalizedTeamName(homeTeam.name, language)

    // Separator
    addLine(output, '')
    addLine(output, '==============================================')
    addLine(output, '')

    // Full time announcement
    addLine(output, getString('commentary.game_end.full_time', language) + '!')

    // Final score
    let scoreLine = getString('commentary.game_end.final_score', language)
    scoreLine += ' '
    scoreLine += `${awayTeamDisplay} ${awayTeam.totalScore}:${homeTeam.totalScore} ${homeTeamDisplay}`
    addLine(output, scoreLine)

    const winTeam = awayTeam.totalScore >= homeTeam.totalScore ? awayTeamDisplay : homeTeamDisplay
    const loseTeam = awayTeam.totalScore >= homeTeam.totalScore ? homeTeamDisplay : awayTeamDisplay
    const scoreDiff = Math.abs(awayTeam.totalScore - homeTeam.totalScore)

    // Congratulations message
    let congratsLine = getString('commentary.game_end.congratulations', language)
    congratsLine += winTeam
    congratsLine += getString('commentary.game_end.win_by', language)
    congratsLine += scoreDiff
    congratsLine += getString('commentary.game_end.points_advantage', language)
    congratsLine += getString('commentary.game_end.defeat', language)
    congratsLine += loseTeam
    congratsLine += '!'
    addLine(output, congratsLine)

    // Quarter breakdown
    addLine(output, '')
    addLine(output, getString('commentary.game_end.quarter_details', language) + ':')

    // Away team quarter scores
    let awayLine = awayTeamDisplay + ': ' + awayScores[0]
    for (let i = 1; i < awayScores.length; i++) {
        awayLine += '\t' + (awayScores[i] - awayScores[i - 1])
    }
    addLine(output, awayLine)

    // Home team quarter scores
    let homeLine = homeTeamDisplay + ': ' + homeScores[0]
    for (let i = 1; i < homeScores.length; i++) {
        homeLine += '\t' + (homeScores[i] - homeScores[i - 1])
    }
    addLine(output, homeLine)
}

/**
 * Generate a player's stat line.
 *
 * @param player Player object
 * @param language Current language
 * @returns Formatted stat line string
 */
export function getPlayerData(player: Player, language: Language): string {
    if (player.hasBeenOnCourt) {
        const minutes = Math.floor(player.secondsPlayed / 60)
        const seconds = player.secondsPlayed % 60

        let sb = `${player.getDisplayName(language)}: `
        sb += `${player.score}${getString('commentary.player_stats.points', language)}, `
        sb += `${player.rebound}${getString('commentary.player_stats.rebounds', language)}, `
        sb += `${player.assist}${getString('commentary.player_stats.assists', language)}, `
        sb += `${player.steal}${getString('commentary.player_stats.steals', language)}, `
        sb += `${player.block}${getString('commentary.player_stats.blocks', language)}, `
        sb += `${player.turnover}${getString('commentary.player_stats.turnovers', language)}, `
        sb += `${player.foul}${getString('commentary.player_stats.fouls', language)} `
        sb += `${getString('commentary.player_stats.fieldgoals', language)}`
        sb += `${player.shotMade}-${player.shotAttempted}, `
        sb += `${getString('commentary.player_stats.threepointers', language)}`
        sb += `${player.threeMade}-${player.threeAttempted}, `
        sb += `${getString('commentary.player_stats.freethrows', language)}`
        sb += `${player.freeThrowMade}-${player.freeThrowAttempted} `
        sb += `${getString('commentary.player_stats.playing_time', language)} `
        sb += `${minutes}${getString('commentary.player_stats.minutes', language)}`
        sb += `${seconds}${getString('commentary.player_stats.seconds', language)}`

        return sb
    } else {
        return `${player.getDisplayName(language)}: ${getString('commentary.player_stats.dnp', language)}`
    }
}

/**
 * Generate team stat summary.
 *
 * @param team Team object
 * @param language Current language
 * @param output Commentary output collector
 */
export function getTeamData(
    team: Team,
    language: Language,
    output: CommentaryOutput
): void {
    const teamDisplay = getLocalizedTeamName(team.name, language)

    // Header
    addLine(output, '')
    addLine(output, `${teamDisplay}${getString('commentary.team_stats.header', language)}:`)

    // Individual player stats and accumulate totals
    let totalRebound = 0
    let totalAssist = 0
    let totalSteal = 0
    let totalBlock = 0
    let totalFoul = 0
    let totalTurnover = 0
    let totalShotAttempted = 0
    let totalShotMade = 0
    let total3Attempted = 0
    let total3Made = 0
    let totalFreeAttempted = 0
    let totalFreeMade = 0

    for (const player of team.players) {
        addLine(output, getPlayerData(player, language))
        totalRebound += player.rebound
        totalAssist += player.assist
        totalSteal += player.steal
        totalBlock += player.block
        totalFoul += player.foul
        totalTurnover += player.turnover
        totalShotAttempted += player.shotAttempted
        totalShotMade += player.shotMade
        total3Attempted += player.threeAttempted
        total3Made += player.threeMade
        totalFreeAttempted += player.freeThrowAttempted
        totalFreeMade += player.freeThrowMade
    }

    // Update team totals from player stats
    team.totalRebound = totalRebound
    team.totalAssist = totalAssist
    team.totalSteal = totalSteal
    team.totalBlock = totalBlock
    team.totalFoul = totalFoul
    team.totalTurnover = totalTurnover
    team.totalShotAttempted = totalShotAttempted
    team.totalShotMade = totalShotMade
    team.total3Attempted = total3Attempted
    team.total3Made = total3Made
    team.totalFreeAttempted = totalFreeAttempted
    team.totalFreeMade = totalFreeMade

    // Team totals
    addLine(output, '')
    let sb = `${teamDisplay}${getString('commentary.team_stats.total', language)}:\n`
    sb += `${team.totalScore}${getString('commentary.player_stats.points', language)}, `
    sb += `${totalRebound}${getString('commentary.player_stats.rebounds', language)}, `
    sb += `${totalAssist}${getString('commentary.player_stats.assists', language)}, `
    sb += `${totalSteal}${getString('commentary.player_stats.steals', language)}, `
    sb += `${totalBlock}${getString('commentary.player_stats.blocks', language)}, `
    sb += `${totalTurnover}${getString('commentary.player_stats.turnovers', language)}, `
    sb += `${totalFoul}${getString('commentary.player_stats.fouls', language)}\n`

    // Percentages
    const totalShotPercentage = totalShotAttempted !== 0
        ? (totalShotMade * 100.0 / totalShotAttempted).toFixed(2)
        : '0.00'
    const total3Percentage = total3Attempted !== 0
        ? (total3Made * 100.0 / total3Attempted).toFixed(2)
        : '0.00'
    const totalFreePercentage = totalFreeAttempted !== 0
        ? (totalFreeMade * 100.0 / totalFreeAttempted).toFixed(2)
        : '0.00'

    sb += `${getString('commentary.player_stats.fieldgoals', language)}: `
    sb += `${totalShotMade}-${totalShotAttempted}(${totalShotPercentage}%)  `
    sb += `${getString('commentary.player_stats.threepointers', language)}: `
    sb += `${total3Made}-${total3Attempted}(${total3Percentage}%)  `
    sb += `${getString('commentary.player_stats.freethrows', language)}: `
    sb += `${totalFreeMade}-${totalFreeAttempted}(${totalFreePercentage}%)`

    addLine(output, sb)
}

// Re-export utility functions
export { MAX_SB_LEN }
