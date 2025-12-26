/**
 * Core type definitions for NBA Simulation
 * Migrated from Java implementation
 */

/**
 * Represents a player's offensive playing style, affecting shot selection probabilities.
 * 
 * Shot Selection Impact (from Java Constants.java):
 * - Type 1 (All-Rounded): Even distribution across ranges
 * - Type 2 (Insider): 80%+ shots inside paint
 * - Type 3 (Mid-Range): 30% from mid-range
 * - Type 4 (Inside-Outside): 40% close, 15% mid, 45% three
 * - Type 5 (Outsider): 20% close, 20% mid, 60% three
 */
export enum PlayerType {
    ALL_ROUNDED = 1,
    INSIDER = 2,
    MID_RANGE = 3,
    INSIDE_OUTSIDE = 4,
    OUTSIDER = 5,
}

/**
 * Determined automatically from standDunk + drivingDunk ratings.
 */
export enum DunkerType {
    RARELY_DUNK = 1,   // standDunk + drivingDunk <= 60
    NORMAL = 2,        // 61-159 combined
    EXCELLENT = 3,     // >= 160 combined, or either >= 90
}

/**
 * Determines minutes allocation and substitution priority.
 */
export enum RotationType {
    STARTER = 1,       // 26-32 minutes target
    BENCH = 2,         // ~18 minutes target
    DEEP_BENCH = 3,    // Garbage time only
}

/**
 * Type of shot attempt.
 */
export enum ShotType {
    DUNK = 'DUNK',
    LAYUP = 'LAYUP',
    JUMPER = 'JUMPER',
}

/**
 * Result of getShotChoice - contains both the shot type enum for logic
 * and the movement string for commentary display.
 */
export interface ShotChoiceResult {
    /** The shot type (DUNK, LAYUP, or JUMPER) for game logic */
    shotType: ShotType
    /** The localized movement string for commentary display */
    movement: string
}

/**
 * Result of a lose ball check (turnover/steal evaluation).
 */
export enum LoseBallResult {
    NO_LOSE_BALL = 0,        // Continue with possession
    LOSE_BALL_NO_SCORE = 1,  // Turnover without fast break
    LOSE_BALL_AND_SCORE = 2, // Turnover with fast break score
    JUMP_BALL_WIN = 3,       // Won jump ball, keep possession
}

/**
 * Result of a block attempt.
 */
export enum BlockResult {
    NO_BLOCK = 0,
    BLOCK_OFFENSIVE_REBOUND = 1,
    BLOCK_DEFENSIVE_REBOUND = 2,
}

/**
 * Result of a foul check.
 */
export enum FoulResult {
    NO_FOUL = 0,
    OFFENSIVE_FOUL = 1,
    DEFENSIVE_FOUL = 2,
}

/**
 * Result of a shot attempt.
 */
export enum ShotResult {
    MADE_SHOT = 1,
    OFFENSIVE_REBOUND = 2,
    DEFENSIVE_REBOUND = 3,
    OUT_OF_BOUNDS = 4,
    /** Shot missed but made free throws after shooting foul */
    MADE_FREE_THROWS = 5,
}

/**
 * Result of a free throw attempt.
 */
export enum FreeThrowResult {
    ERROR = 0,
    MADE_LAST_FREE_THROW = 1,
    OFFENSIVE_REBOUND = 2,
    DEFENSIVE_REBOUND = 3,
}

/**
 * Supported languages for localization.
 */
export enum Language {
    CHINESE = 'zh_CN',
    ENGLISH = 'en_US',
}

/**
 * Conference for standings and playoffs.
 */
export enum Conference {
    EAST = 'East',
    WEST = 'West',
}

/**
 * Statistical categories for leaderboards.
 */
export enum StatCategory {
    POINTS = 'points',
    REBOUNDS = 'rebounds',
    ASSISTS = 'assists',
    STEALS = 'steals',
    BLOCKS = 'blocks',
    THREE_POINTERS = 'threePointers',
    FREE_THROWS = 'freeThrows',
    FIELD_GOAL_PERCENTAGE = 'fieldGoalPercentage',
    THREE_POINT_PERCENTAGE = 'threePointPercentage',
    FREE_THROW_PERCENTAGE = 'freeThrowPercentage',
}

/**
 * Player positions on the court.
 */
export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

/**
 * All court positions.
 */
export const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C'];

/**
 * CSV row structure for player data.
 */
export interface PlayerCSVRow {
    name: string;
    englishName: string;
    position: Position;
    playerType: number;
    rotationType: number;
    rating: number;
    insideRating: number;
    midRating: number;
    threeRating: number;
    freeThrowPercent: number;
    interiorDefense: number;
    perimeterDefense: number;
    orbRating: number;
    drbRating: number;
    astRating: number;
    stlRating: number;
    blkRating: number;
    layupRating: number;
    standDunk: number;
    drivingDunk: number;
    athleticism: number;
    durability: number;
    offConst: number;
    defConst: number;
    drawFoul: number;
}

/**
 * Game statistics tracked for each player during a game.
 */
export interface PlayerGameStats {
    score: number;
    rebound: number;
    offensiveRebound: number;
    defensiveRebound: number;
    assist: number;
    steal: number;
    block: number;
    shotMade: number;
    shotAttempted: number;
    threeMade: number;
    threeAttempted: number;
    freeThrowMade: number;
    freeThrowAttempted: number;
    turnover: number;
    foul: number;
    flagFoul: number;
}

/**
 * Minutes tracking for substitution management.
 */
export interface PlayerMinutesTracking {
    secondsPlayed: number;
    currentStintSeconds: number;
    lastSubbedOutTime: number;
    canOnCourt: boolean;
    hasBeenOnCourt: boolean;
    isOnCourt: boolean;
}

/**
 * Team game statistics.
 */
export interface TeamGameStats {
    totalScore: number;
    totalRebound: number;
    totalAssist: number;
    totalSteal: number;
    totalBlock: number;
    totalFoul: number;
    totalTurnover: number;
    totalShotMade: number;
    totalShotAttempted: number;
    total3Made: number;
    total3Attempted: number;
    totalFreeMade: number;
    totalFreeAttempted: number;
    totalScoreAllowed: number;
    opponentShotMade: number;
    opponentShotAttempted: number;
    opponent3Made: number;
    opponent3Attempted: number;
}

/**
 * Team game state during simulation.
 */
export interface TeamGameState {
    hasBall: boolean;
    canChallenge: boolean;
    quarterFoul: number;
}

/**
 * Result of a completed game.
 */
export interface GameResult {
    team1Name: string;
    team2Name: string;
    team1Score: number;
    team2Score: number;
    isOvertime: boolean;
    overtimePeriods: number;
    winner: string;
    loser: string;
    mvp?: string;
}

/**
 * Box score entry for a player.
 */
export interface BoxScoreEntry {
    playerName: string;
    englishName: string;
    position: Position;
    minutes: string;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fouls: number;
    fieldGoalsMade: number;
    fieldGoalsAttempted: number;
    threePointersMade: number;
    threePointersAttempted: number;
    freeThrowsMade: number;
    freeThrowsAttempted: number;
    plusMinus?: number;
}

/**
 * Complete box score for a game.
 */
export interface BoxScore {
    team1Name: string;
    team2Name: string;
    team1Score: number;
    team2Score: number;
    team1Players: BoxScoreEntry[];
    team2Players: BoxScoreEntry[];
    gameResult: GameResult;
}

/**
 * Game flow insights for display.
 */
export interface GameFlowInsights {
    team1LargestLead: number;
    team2LargestLead: number;
    leadChanges: number;
    timesTied: number;
}

/**
 * Standing entry for season standings.
 */
export interface StandingEntry {
    rank: number;
    teamName: string;
    wins: number;
    losses: number;
    winPercentage: number;
    gamesBack: number;
    conference: Conference;
}

/**
 * Stat entry for leaderboards.
 */
export interface StatEntry {
    rank: number;
    playerName: string;
    englishName: string;
    teamName: string;
    value: number;
    gamesPlayed: number;
    perGame?: number;
}

/**
 * Team stat entry for team leaderboards.
 */
export interface TeamStatEntry {
    rank: number;
    teamName: string;
    value: number;
    gamesPlayed: number;
    perGame?: number;
}

/**
 * Schedule entry for a game.
 */
export interface ScheduleEntry {
    date: string;
    awayTeam: string;
    homeTeam: string;
}

/**
 * Prediction result for championship prediction mode.
 */
export interface PredictionResult {
    teamName: string;
    championships: number;
    percentage: number;
}

/**
 * Series result for playoffs.
 */
export interface SeriesResult {
    team1Name: string;
    team2Name: string;
    team1Wins: number;
    team2Wins: number;
    winner: string;
    loser: string;
    seriesMVP?: string;
    games: GameResult[];
}

/**
 * Playoff bracket structure.
 */
export interface PlayoffBracket {
    round: number;
    conference: Conference;
    series: SeriesResult[];
}
