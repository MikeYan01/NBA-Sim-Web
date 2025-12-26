/**
 * Game Constants
 *
 * All game constants migrated from Java Constants.java.
 * These values control game mechanics, probability calculations,
 * substitution logic, and display settings.
 */

import { Language, Conference } from '../models/types'

// ============================================================================
// Dunk Constants
// ============================================================================

/** Lower bound for dunk sum (standDunk + drivingDunk) to be RARELY_DUNK */
export const DUNK_SUM_LB = 60

/** Upper bound for dunk sum to be EXCELLENT dunker */
export const DUNK_SUM_UB = 160

/** Threshold for individual dunk rating to be EXCELLENT */
export const DUNK_EXCEL_LB = 90

// ============================================================================
// Star Player Constants
// ============================================================================

/** Minimum rating to be considered a star player */
export const PLAYER_STAR_LB = 88

// ============================================================================
// Data Paths
// ============================================================================

/** Path to roster files (relative to public directory) */
export const ROSTER_PATH = '/data/rosters/'
export const ROSTER_EXTENSION = '.csv'

/** Path to comments files */
export const COMMENTS_PATH = '/data/comments/'

/** Path to localization files */
export const LOCALIZATION_PATH = '/data/localization/'

/** Path to schedule file */
export const SCHEDULE_PATH = '/data/schedule/schedule-82games.txt'

// ============================================================================
// Display Constants
// ============================================================================

/** Max ranks for tables */
export const MAX_PLAYER_RANK = 100
export const MAX_TEAM_RANK = 30

/** Max length of StringBuilder for live comments */
export const MAX_SB_LEN = 128

/** Percent to output shot position in live comments */
export const SHOT_POSITION_PERCENT = 30

// ============================================================================
// Dunk Percent Based on DunkerType
// ============================================================================

export const TYPE_1_LAYUP = 60
export const TYPE_1_DUNK = 10
export const TYPE_2_LAYUP = 50
export const TYPE_2_DUNK = 20
export const TYPE_3_LAYUP = 40
export const TYPE_3_DUNK = 30

// ============================================================================
// Shot Choice Comments
// ============================================================================

export const SHOT_CHOICE_THLD = 20

// ============================================================================
// Celebrate/Upset Comments
// ============================================================================

export const CELEBRATE_HIGH_PERCENT = 60
export const CELEBRATE_LOW_PERCENT = 20
export const UPSET_HIGH_PERCENT = 60
export const UPSET_LOW_PERCENT = 20

// ============================================================================
// Good/Bad Status Conditions
// ============================================================================

export const MIN_GOOD_SCORE = 30
export const MIN_SHOT_MADE = 7
export const MIN_GOOD_SHOT_PERCENT = 0.75
export const MIN_SHOT_ATTEMPTED = 7
export const MAX_BAD_SHOT_PERCENT = 0.2

// ============================================================================
// Outstanding Defensive Stats
// ============================================================================

export const MIN_OUTSTANDING_STEALS = 3
export const MIN_OUTSTANDING_BLOCKS = 3

// ============================================================================
// Year Constants
// ============================================================================

export const CURRENT_YEAR = `${new Date().getFullYear()}-`
export const NEXT_YEAR = `${new Date().getFullYear() + 1}-`

// ============================================================================
// Garbage Time Constants
// ============================================================================

export const DIFF1 = 30
export const TIME_LEFT1 = 720
export const DIFF2 = 18
export const TIME_LEFT2 = 360
export const DIFF3 = 9
export const TIME_LEFT3 = 60

// ============================================================================
// Clutch Time Constants
// ============================================================================

export const TIME_LEFT_CLUTCH = 360
export const CLOSE_GAME_DIFF = 12

// ============================================================================
// Intelligent Substitution System
// ============================================================================

// Target minutes for different rotation types (in seconds)
export const BENCH_TARGET_MINUTES = 18 * 60 // ~18 minutes

// Durability-based target minutes for starters (in seconds)
export const HIGH_DURABILITY_THRESHOLD = 90
export const HIGH_DURABILITY_MINUTES = 32 * 60 // 1920 seconds
export const MEDIUM_DURABILITY_THRESHOLD = 80
export const MEDIUM_DURABILITY_MINUTES = 30 * 60 // 1800 seconds
export const LOW_DURABILITY_THRESHOLD = 70
export const LOW_DURABILITY_MINUTES = 26 * 60 // 1560 seconds
export const VERY_LOW_DURABILITY_MINUTES = 22 * 60 // 1320 seconds
export const NON_STARTER_MAX_MINUTES = 35 * 60 // Bench players use high limit

// Athleticism-based target minutes adjustment for starters (in seconds)
export const ATHLETICISM_ELITE_THRESHOLD = 90
export const ATHLETICISM_ELITE_BONUS = 2 * 60 // +2 minutes
export const ATHLETICISM_HIGH_THRESHOLD = 85
export const ATHLETICISM_HIGH_BONUS = 1 * 60 // +1 minute
export const ATHLETICISM_ABOVE_AVG_THRESHOLD = 80
export const ATHLETICISM_ABOVE_AVG_PENALTY = -2 * 60 // -2 minutes
export const ATHLETICISM_AVG_THRESHOLD = 75
export const ATHLETICISM_AVG_PENALTY = -3 * 60 // -3 minutes
export const ATHLETICISM_BELOW_AVG_THRESHOLD = 70
export const ATHLETICISM_BELOW_AVG_PENALTY = -4 * 60 // -4 minutes
export const ATHLETICISM_LOW_THRESHOLD = 65
export const ATHLETICISM_LOW_PENALTY = -5 * 60 // -5 minutes
export const ATHLETICISM_VERY_LOW_PENALTY = -6 * 60 // -6 minutes
export const MIN_STARTER_MINUTES = 18 * 60 // Minimum 18 minutes for any starter

// Maximum continuous stint duration before rest needed (in seconds)
export const MAX_STARTER_STINT = 10 * 60 // 10 minutes
export const MAX_STARTER_STINT_CLOSE_GAME = 8 * 60 // 8 minutes in close games
export const MAX_STARTER_STINT_NORMAL_GAME = 6 * 60 // 6 minutes in normal games
export const MAX_BENCH_STINT = 6 * 60 // 6 minutes

// Minimum rest time between stints (in seconds)
export const MIN_REST_TIME = 2 * 60 // 2 minutes
export const MIN_REST_TIME_CLOSE_GAME = 1 * 60 // 1 minute in close games

// Bench player limits
export const BENCH_MINUTES_BUFFER = 5 * 60 // 5 minute buffer

// Performance-based thresholds
export const MIN_SHOTS_FOR_HOT = 4
export const COLD_SHOOTER_THRESHOLD = 0.3

// Injury probability constants
export const INJURY_BASE_PROBABILITY = 200
export const INJURY_PROBABILITY_DIVISOR = 1000000

// Substitution probabilities and priorities
export const SUB_CHECK_PROBABILITY = 40
export const SUB_DECISION_PROBABILITY = 20
export const GARBAGE_TIME_SUB_PROBABILITY = 100
export const FOUL_TROUBLE_PRIORITY = 100
export const MINUTES_CAP_PRIORITY = 80
export const FATIGUE_BASE_PRIORITY = 50
export const PERFORMANCE_PRIORITY = 30
export const FATIGUE_SECONDS_TO_PRIORITY = 60

// ============================================================================
// Quarter-Specific Settings
// ============================================================================

export const QUARTER_1 = 1
export const QUARTER_2 = 2
export const QUARTER_3 = 3
export const Q1_NO_SUB_TIME = 360 // No subs in first 6 minutes of Q1
export const OVERTIME_QUARTER = 5 // Overtime starts at quarter 5
export const CLUTCH_QUARTER = 4 // Clutch time in Q4

// ============================================================================
// Game Constants
// ============================================================================

export const FOULS_TO_FOUL_OUT = 6
export const FLAGRANT_FOULS_TO_EJECT = 2
export const BONUS_FOUL_THRESHOLD = 5 // Team in bonus at 5 fouls
export const JUMP_BALL_FIFTY_FIFTY = 50
export const THREE_POINT_LINE_DISTANCE = 23

// ============================================================================
// Offense Player Selection
// ============================================================================

export const MAJOR_SCORE_FACTOR = 0.55
export const MINOR_SCORE_FACTOR = 0.15
export const SINGLE_STAR_PERCENT_1 = 3
export const SINGLE_STAR_PERCENT_2 = 6
export const SINGLE_STAR_EXTRA = 22
export const GENERAL_THLD = 90
export const CLUTCH_PERCENT = 50
export const RATING_RANGE = 10
export const AST_SCALE = 2

// ============================================================================
// Rebound Distribution
// ============================================================================

export const REBOUND_POWER_SCALE = 0.8

// ============================================================================
// Position Selection
// ============================================================================

export const SAME_POS = 52
export const OTHER_POS = 12

// ============================================================================
// Lose Ball (Turnover/Steal)
// ============================================================================

export const JUMP_BALL_PLAY = 60
export const TURNOVER = 5
export const STEAL_BASE = 1
export const STEAL_RATING_SCALE = 4
export const STEAL_DEFENSE_SCALE = 2
export const STEAL_BONUS_SCALE1 = 1.15
export const STEAL_BONUS_SCALE2 = 1.3
export const STEAL_BONUS_SCALE3 = 1.4
export const STEAL_BONUS_SCALE4 = 1.5
export const STEAL_BONUS_THLD1 = 83
export const STEAL_BONUS_THLD2 = 87
export const STEAL_BONUS_THLD3 = 92
export const STEAL_BONUS_THLD4 = 95
export const NON_FASTBREAK = 30

// ============================================================================
// Block
// ============================================================================

export const BLOCK_RATING_SCALE = 3
export const BLOCK_BONUS_SCALE1 = 1.4
export const BLOCK_BONUS_SCALE2 = 1.7
export const BLOCK_BONUS_SCALE3 = 2.2
export const BLOCK_BONUS_SCALE4 = 3
export const BLOCK_BONUS_SCALE5 = 3.8
export const BLOCK_BONUS_THLD1 = 70
export const BLOCK_BONUS_THLD2 = 83
export const BLOCK_BONUS_THLD3 = 88
export const BLOCK_BONUS_THLD4 = 92
export const BLOCK_BONUS_THLD5 = 95
export const BLOCK_OUT_OF_BOUND = 40

// ============================================================================
// Rebound
// ============================================================================

export const ORB_WITH_BONUS = 15
export const ORB_WITHOUT_BONUS = 10
export const REBOUND_RATING_BONUS = 90
export const REBOUND_RATING_BONUS_PERCENT = 10

// ============================================================================
// Foul Protection
// ============================================================================

export const QUARTER1_PROTECT = 2
export const QUARTER2_PROTECT = 4
export const QUARTER3_PROTECT = 5

// ============================================================================
// Normal Foul
// ============================================================================

export const OFF_FOUL = 2
export const DEF_FOUL = 2

// ============================================================================
// Shot Distance Constants
// ============================================================================

export const MIN_CLOSE_SHOT = 1
export const PAINT_CLOSE_SHOT = 3
export const MAX_CLOSE_SHOT = 12
export const MIN_MID_SHOT = 13
export const MID_MID_SHOT = 20
export const MAX_MID_SHOT = 22
export const MIN_THREE_SHOT = 23
export const MID_THREE_SHOT = 26
export const MAX_THREE_SHOT = 35
export const MIN_DIST_CURVE = 28
export const DIST_CURVE_PERCENT = 90
export const DIST_CURVE = 5
export const DUNK_MAX_PERCENT = 90
export const DUNK_PERCENT_MULTIPLIER = 2.0
export const MIN_SHOT_PERCENT = 20
export const MAX_SHOT_PERCENT = 90

// ============================================================================
// Shot Choice Percentages
// ============================================================================

export const TYPE3_PERCENT = 30
export const TYPE4_CLOSE_SHOT = 40
export const TYPE4_MID_SHOT = 15
export const TYPE5_CLOSE_SHOT = 20
export const TYPE5_MID_SHOT = 20

// ============================================================================
// Initial Shot Percent Coefficients
// ============================================================================

export const INIT_CLOSE_SHOT_COFF = -0.2
export const INIT_CLOSE_SHOT_INTCP = 37
export const INIT_MID_SHOT_INTCP = 8
// Note: In Java, -31/81 is integer division = 0. We match that behavior.
export const INIT_THREE_SHOT_COFF = 0
export const INIT_THREE_SHOT_INTCP = 41

// ============================================================================
// Shot Percent Adjustment
// ============================================================================

export const DUNK_SCALE = 2.5
export const SHOT_COFF = 0.2
export const OFFENSE_BASE = 65

// ============================================================================
// Elite Playmaker Bonus
// ============================================================================

export const ELITE_PLAYMAKER_THRESHOLD = 90
export const ELITE_PLAYMAKER_SINGLE_BONUS = 1.0
export const ELITE_PLAYMAKER_DUAL_BONUS = 2.5

// ============================================================================
// Defense Player Effect
// ============================================================================

export const DEFENSE_COFF = 0.1
export const DEFENSE_BASE = 35

// ============================================================================
// Defense Density
// ============================================================================

export const DEFENSE_EASY = 10
export const DEFENSE_HARD = 50
export const DEFENSE_BUFF = 12

// ============================================================================
// Consistency
// ============================================================================

export const OFF_CONSISTENCY_COFF = 0.5
export const OFF_CONSISTENCY_MAX_BONUS = 2.5
export const DEF_CONSISTENCY_COFF = 0.4
export const DEF_CONSISTENCY_MAX_BONUS = 2
export const CONSISTENCY_BASE = 50

// ============================================================================
// Athleticism
// ============================================================================

export const ATHLETIC_COFF = 0.06

// ============================================================================
// Clutch Time
// ============================================================================

export const CLUTCH_OFF_CONST = 100
export const CLUTCH_SHOT_COFF = 0.6

// ============================================================================
// Status Comment Percent
// ============================================================================

export const STATUS_COMMENT_PERCENT = 40

// ============================================================================
// Extra Comment in Garbage Time
// ============================================================================

export const EXTRA_COMMENT = 15

// ============================================================================
// Assist Allocation
// ============================================================================

export const HIGH_BOTH_RATING = 25
export const HIGH_BOTH_RATING_THLD = 88
export const HIGHEST_RATING_PERCENT = 10
export const STAR_PLAYER_AST = 75
export const NON_STAR_PLAYER_AST = 95

// ============================================================================
// Foul Percentages
// ============================================================================

export const AND_ONE_CLOSE_BASE = 5
export const AND_ONE_MID_BASE = 2
export const AND_ONE_THREE_BASE = 1
export const NORMAL_CLOSE_BASE = 10
export const NORMAL_MID_BASE = 6
export const NORMAL_THREE_BASE = 2

// ============================================================================
// Foul Ratings and Scales
// ============================================================================

export const FOUL_RATING_THLD1 = 94
export const FOUL_RATING_THLD2 = 85
export const FOUL_COFF1 = 3.8
export const FOUL_COFF2 = 3.3
export const FOUL_COFF3 = 2.8
export const STAR_FOUL_SCALE = 1.15

// ============================================================================
// Flagrant Foul
// ============================================================================

export const FLAG_FOUL = 5

// ============================================================================
// Foul Challenge
// ============================================================================

export const CHALLENGE_START_QUARTER = 3
export const FOUL_CHALLENGE = 8
export const CHALLENGE_SUCCESS = 40

// ============================================================================
// Shot Out-of-Bound
// ============================================================================

export const SHOT_OUT_OF_BOUND = 3

// ============================================================================
// Team Name Arrays
// ============================================================================

/** Eastern Conference team names in Chinese */
export const EAST_TEAMS_ZH = [
    '76人',
    '公牛',
    '凯尔特人',
    '奇才',
    '黄蜂',
    '步行者',
    '活塞',
    '热火',
    '猛龙',
    '篮网',
    '尼克斯',
    '老鹰',
    '雄鹿',
    '骑士',
    '魔术',
]

/** Western Conference team names in Chinese */
export const WEST_TEAMS_ZH = [
    '勇士',
    '国王',
    '太阳',
    '开拓者',
    '快船',
    '掘金',
    '灰熊',
    '湖人',
    '火箭',
    '独行侠',
    '森林狼',
    '爵士',
    '雷霆',
    '马刺',
    '鹈鹕',
]

/** Eastern Conference team names in English */
export const EAST_TEAMS_EN = [
    '76ers',
    'Bulls',
    'Celtics',
    'Wizards',
    'Hornets',
    'Pacers',
    'Pistons',
    'Heat',
    'Raptors',
    'Nets',
    'Knicks',
    'Hawks',
    'Bucks',
    'Cavaliers',
    'Magic',
]

/** Western Conference team names in English */
export const WEST_TEAMS_EN = [
    'Warriors',
    'Kings',
    'Suns',
    'Trail Blazers',
    'Clippers',
    'Nuggets',
    'Grizzlies',
    'Lakers',
    'Rockets',
    'Mavericks',
    'Timberwolves',
    'Jazz',
    'Thunder',
    'Spurs',
    'Pelicans',
]

/** All team names in English (for roster file access) */
export const ALL_TEAMS_EN = [...EAST_TEAMS_EN, ...WEST_TEAMS_EN]

// ============================================================================
// Team Name Mapping
// ============================================================================

/** Chinese to English team name mapping */
const TEAM_NAME_ZH_TO_EN: Record<string, string> = {}

/** English to Chinese team name mapping */
const TEAM_NAME_EN_TO_ZH: Record<string, string> = {}

// Initialize bidirectional team name mappings
const TEAM_MAPPINGS: [string, string][] = [
    // Eastern Conference
    ['76人', '76ers'],
    ['公牛', 'Bulls'],
    ['凯尔特人', 'Celtics'],
    ['奇才', 'Wizards'],
    ['黄蜂', 'Hornets'],
    ['步行者', 'Pacers'],
    ['活塞', 'Pistons'],
    ['热火', 'Heat'],
    ['猛龙', 'Raptors'],
    ['篮网', 'Nets'],
    ['尼克斯', 'Knicks'],
    ['老鹰', 'Hawks'],
    ['雄鹿', 'Bucks'],
    ['骑士', 'Cavaliers'],
    ['魔术', 'Magic'],
    // Western Conference
    ['勇士', 'Warriors'],
    ['国王', 'Kings'],
    ['太阳', 'Suns'],
    ['开拓者', 'Trail Blazers'],
    ['快船', 'Clippers'],
    ['掘金', 'Nuggets'],
    ['灰熊', 'Grizzlies'],
    ['湖人', 'Lakers'],
    ['火箭', 'Rockets'],
    ['独行侠', 'Mavericks'],
    ['森林狼', 'Timberwolves'],
    ['爵士', 'Jazz'],
    ['雷霆', 'Thunder'],
    ['马刺', 'Spurs'],
    ['鹈鹕', 'Pelicans'],
]

for (const [zh, en] of TEAM_MAPPINGS) {
    TEAM_NAME_ZH_TO_EN[zh] = en
    TEAM_NAME_EN_TO_ZH[en] = zh
}

/** Team to conference mapping */
const TEAM_CONFERENCE: Record<string, Conference> = {}

for (const team of EAST_TEAMS_EN) {
    TEAM_CONFERENCE[team] = Conference.EAST
}
for (const team of WEST_TEAMS_EN) {
    TEAM_CONFERENCE[team] = Conference.WEST
}

// ============================================================================
// Team Name Functions
// ============================================================================

/**
 * Get the roster filename for a team.
 * Always returns English filename regardless of display language.
 * @param teamName Team name in any language
 * @returns CSV filename for the team (always English)
 */
export function getTeamRosterFilename(teamName: string): string {
    const rosterName = translateToEnglish(teamName)
    return rosterName + ROSTER_EXTENSION
}

/**
 * Translate team name from Chinese to English.
 * @param chineseName Chinese team name
 * @returns English team name, or original if not found
 */
export function translateToEnglish(chineseName: string): string {
    return TEAM_NAME_ZH_TO_EN[chineseName] ?? chineseName
}

/**
 * Translate team name from English to Chinese.
 * @param englishName English team name
 * @returns Chinese team name, or original if not found
 */
export function translateToChinese(englishName: string): string {
    return TEAM_NAME_EN_TO_ZH[englishName] ?? englishName
}

/**
 * Get localized team name based on current language setting.
 * @param englishName English team name (from Team.name)
 * @param language Current language setting
 * @returns Localized team name
 */
export function getLocalizedTeamName(englishName: string, language: Language): string {
    if (language === Language.CHINESE) {
        return translateToChinese(englishName)
    }
    return englishName
}

/**
 * Get team names based on language.
 * @param language Current language setting
 * @returns Object with east and west team arrays
 */
export function getTeamsByLanguage(language: Language): {
    east: string[]
    west: string[]
} {
    if (language === Language.ENGLISH) {
        return { east: EAST_TEAMS_EN, west: WEST_TEAMS_EN }
    }
    return { east: EAST_TEAMS_ZH, west: WEST_TEAMS_ZH }
}

/**
 * Get the conference for a team.
 * @param teamName Team name in English
 * @returns Conference (East or West)
 */
export function getTeamConference(teamName: string): Conference {
    return TEAM_CONFERENCE[teamName] ?? Conference.EAST
}

/**
 * Check if a team name is valid.
 * @param teamName Team name in any language
 * @returns True if the team exists
 */
export function isValidTeam(teamName: string): boolean {
    const englishName = translateToEnglish(teamName)
    return ALL_TEAMS_EN.includes(englishName)
}
