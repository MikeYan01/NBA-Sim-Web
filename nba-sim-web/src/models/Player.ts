/**
 * Player Class
 *
 * Represents an NBA player with 25 skill ratings and game statistics.
 * Migrated from Java Player.java with identical attribute handling.
 */

import {
    PlayerType,
    DunkerType,
    RotationType,
    Language,
    Position,
    PlayerGameStats,
    PlayerMinutesTracking,
} from './types'
import { DUNK_SUM_LB, DUNK_SUM_UB, DUNK_EXCEL_LB, PLAYER_STAR_LB } from '../utils/Constants'

/**
 * CSV row structure for player data.
 */
export interface PlayerCSVRow {
    name: string
    englishName: string
    position: string
    playerType: string
    rotationType: string
    rating: string
    insideRating: string
    midRating: string
    threeRating: string
    freeThrowPercent: string
    interiorDefense: string
    perimeterDefense: string
    orbRating: string
    drbRating: string
    astRating: string
    stlRating: string
    blkRating: string
    layupRating: string
    standDunk: string
    drivingDunk: string
    athleticism: string
    durability: string
    offConst: string
    defConst: string
    drawFoul: string
}

export class Player {
    // Identity
    public readonly name: string // Chinese name
    public readonly englishName: string
    public readonly position: Position
    public teamName: string

    // Type classifications
    public readonly playerType: PlayerType
    public readonly dunkerType: DunkerType
    public readonly rotationType: RotationType

    // Ratings (25 attributes)
    public readonly rating: number
    public readonly insideRating: number
    public readonly midRating: number
    public readonly threeRating: number
    public readonly freeThrowPercent: number
    public readonly interiorDefense: number
    public readonly perimeterDefense: number
    public readonly orbRating: number
    public readonly drbRating: number
    public readonly astRating: number
    public readonly stlRating: number
    public readonly blkRating: number
    public readonly layupRating: number
    public readonly standDunk: number
    public readonly drivingDunk: number
    public readonly athleticism: number
    public readonly durability: number
    public readonly offConst: number
    public readonly defConst: number
    public readonly drawFoul: number

    // Derived attributes
    public readonly isStar: boolean

    // Game statistics (reset each game)
    public score: number = 0
    public rebound: number = 0
    public offensiveRebound: number = 0
    public defensiveRebound: number = 0
    public assist: number = 0
    public steal: number = 0
    public block: number = 0
    public shotMade: number = 0
    public shotAttempted: number = 0
    public threeMade: number = 0
    public threeAttempted: number = 0
    public freeThrowMade: number = 0
    public freeThrowAttempted: number = 0
    public turnover: number = 0
    public foul: number = 0
    public flagFoul: number = 0

    // Minutes tracking
    public secondsPlayed: number = 0
    public currentStintSeconds: number = 0
    public lastSubbedOutTime: number = 0

    // Court status
    public canOnCourt: boolean = true
    public hasBeenOnCourt: boolean = false
    public isOnCourt: boolean = false

    /**
     * Create a new Player instance.
     * Use Player.fromCSVRow() for parsing CSV data.
     */
    constructor(
        name: string,
        englishName: string,
        position: Position,
        playerType: PlayerType,
        rotationType: RotationType,
        rating: number,
        insideRating: number,
        midRating: number,
        threeRating: number,
        freeThrowPercent: number,
        interiorDefense: number,
        perimeterDefense: number,
        orbRating: number,
        drbRating: number,
        astRating: number,
        stlRating: number,
        blkRating: number,
        layupRating: number,
        standDunk: number,
        drivingDunk: number,
        athleticism: number,
        durability: number,
        offConst: number,
        defConst: number,
        drawFoul: number,
        teamName: string
    ) {
        this.name = name
        this.englishName = englishName
        this.position = position
        this.playerType = playerType
        this.rotationType = rotationType
        this.rating = rating
        this.insideRating = insideRating
        this.midRating = midRating
        this.threeRating = threeRating
        this.freeThrowPercent = freeThrowPercent
        this.interiorDefense = interiorDefense
        this.perimeterDefense = perimeterDefense
        this.orbRating = orbRating
        this.drbRating = drbRating
        this.astRating = astRating
        this.stlRating = stlRating
        this.blkRating = blkRating
        this.layupRating = layupRating
        this.standDunk = standDunk
        this.drivingDunk = drivingDunk
        this.athleticism = athleticism
        this.durability = durability
        this.offConst = offConst
        this.defConst = defConst
        this.drawFoul = drawFoul
        this.teamName = teamName

        // Calculate dunker type based on dunk ratings
        // Type 1 - rarely dunk: standDunk + drivingDunk <= 60
        // Type 2 - normal: other cases
        // Type 3 - excellent: standDunk + drivingDunk >= 160, or one of them >= 90
        const dunkSum = this.standDunk + this.drivingDunk
        if (dunkSum <= DUNK_SUM_LB) {
            this.dunkerType = DunkerType.RARELY_DUNK
        } else if (
            dunkSum >= DUNK_SUM_UB ||
            this.standDunk >= DUNK_EXCEL_LB ||
            this.drivingDunk >= DUNK_EXCEL_LB
        ) {
            this.dunkerType = DunkerType.EXCELLENT
        } else {
            this.dunkerType = DunkerType.NORMAL
        }

        // Star player if rating >= 88
        this.isStar = this.rating >= PLAYER_STAR_LB
    }

    /**
     * Factory method to create a Player from CSV row data.
     * @param row CSV row with string values
     * @param teamName The team name
     * @returns A new Player instance
     */
    static fromCSVRow(row: PlayerCSVRow, teamName: string): Player {
        return new Player(
            row.name,
            row.englishName,
            row.position as Position,
            parseInt(row.playerType, 10) as PlayerType,
            parseInt(row.rotationType, 10) as RotationType,
            parseInt(row.rating, 10),
            parseInt(row.insideRating, 10),
            parseInt(row.midRating, 10),
            parseInt(row.threeRating, 10),
            parseFloat(row.freeThrowPercent),
            parseInt(row.interiorDefense, 10),
            parseInt(row.perimeterDefense, 10),
            parseInt(row.orbRating, 10),
            parseInt(row.drbRating, 10),
            parseInt(row.astRating, 10),
            parseInt(row.stlRating, 10),
            parseInt(row.blkRating, 10),
            parseInt(row.layupRating, 10),
            parseInt(row.standDunk, 10),
            parseInt(row.drivingDunk, 10),
            parseInt(row.athleticism, 10),
            parseInt(row.durability, 10),
            parseInt(row.offConst, 10),
            parseInt(row.defConst, 10),
            parseInt(row.drawFoul, 10),
            teamName
        )
    }

    /**
     * Get the display name for this player based on language.
     * @param language The language to use
     * @returns The localized player name
     */
    getDisplayName(language: Language): string {
        if (language === Language.ENGLISH) {
            return this.englishName
        }
        return this.name
    }

    /**
     * Get the last name of the player (for commentary).
     * @param language The language to use
     * @returns The last name portion
     */
    getLastName(language: Language): string {
        if (language === Language.ENGLISH) {
            const parts = this.englishName.split(' ')
            return parts[parts.length - 1]
        }
        // For Chinese names, return the full name (typically 2-3 characters)
        return this.name
    }

    /**
     * Reset all game statistics to zero.
     * Called at the start of each new game.
     */
    resetGameStats(): void {
        this.score = 0
        this.rebound = 0
        this.offensiveRebound = 0
        this.defensiveRebound = 0
        this.assist = 0
        this.steal = 0
        this.block = 0
        this.shotMade = 0
        this.shotAttempted = 0
        this.threeMade = 0
        this.threeAttempted = 0
        this.freeThrowMade = 0
        this.freeThrowAttempted = 0
        this.turnover = 0
        this.foul = 0
        this.flagFoul = 0

        this.secondsPlayed = 0
        this.currentStintSeconds = 0
        this.lastSubbedOutTime = 0

        this.canOnCourt = true
        this.hasBeenOnCourt = this.rotationType === RotationType.STARTER
        this.isOnCourt = false
    }

    /**
     * Get the current game statistics.
     * @returns Player game stats object
     */
    getGameStats(): PlayerGameStats {
        return {
            score: this.score,
            rebound: this.rebound,
            offensiveRebound: this.offensiveRebound,
            defensiveRebound: this.defensiveRebound,
            assist: this.assist,
            steal: this.steal,
            block: this.block,
            shotMade: this.shotMade,
            shotAttempted: this.shotAttempted,
            threeMade: this.threeMade,
            threeAttempted: this.threeAttempted,
            freeThrowMade: this.freeThrowMade,
            freeThrowAttempted: this.freeThrowAttempted,
            turnover: this.turnover,
            foul: this.foul,
            flagFoul: this.flagFoul,
        }
    }

    /**
     * Get the current minutes tracking data.
     * @returns Minutes tracking object
     */
    getMinutesTracking(): PlayerMinutesTracking {
        return {
            secondsPlayed: this.secondsPlayed,
            currentStintSeconds: this.currentStintSeconds,
            lastSubbedOutTime: this.lastSubbedOutTime,
            canOnCourt: this.canOnCourt,
            hasBeenOnCourt: this.hasBeenOnCourt,
            isOnCourt: this.isOnCourt,
        }
    }

    /**
     * Format seconds played as MM:SS string.
     * @returns Formatted minutes string
     */
    getFormattedMinutes(): string {
        const totalMinutes = Math.floor(this.secondsPlayed / 60)
        const remainingSeconds = this.secondsPlayed % 60
        return `${totalMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    /**
     * Calculate field goal percentage.
     * @returns FG% as a number (0-100)
     */
    getFieldGoalPercentage(): number {
        if (this.shotAttempted === 0) return 0
        return (this.shotMade / this.shotAttempted) * 100
    }

    /**
     * Calculate three-point percentage.
     * @returns 3P% as a number (0-100)
     */
    getThreePointPercentage(): number {
        if (this.threeAttempted === 0) return 0
        return (this.threeMade / this.threeAttempted) * 100
    }

    /**
     * Calculate free throw percentage.
     * @returns FT% as a number (0-100)
     */
    getFreeThrowPercentage(): number {
        if (this.freeThrowAttempted === 0) return 0
        return (this.freeThrowMade / this.freeThrowAttempted) * 100
    }

    /**
     * Serialize player to JSON for debugging/state persistence.
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            englishName: this.englishName,
            position: this.position,
            teamName: this.teamName,
            playerType: this.playerType,
            dunkerType: this.dunkerType,
            rotationType: this.rotationType,
            rating: this.rating,
            isStar: this.isStar,
            gameStats: this.getGameStats(),
            minutesTracking: this.getMinutesTracking(),
        }
    }

    /**
     * Clone this player with fresh game stats.
     * Used for team caching to create fresh copies for each game.
     */
    clone(): Player {
        return new Player(
            this.name,
            this.englishName,
            this.position,
            this.playerType,
            this.rotationType,
            this.rating,
            this.insideRating,
            this.midRating,
            this.threeRating,
            this.freeThrowPercent,
            this.interiorDefense,
            this.perimeterDefense,
            this.orbRating,
            this.drbRating,
            this.astRating,
            this.stlRating,
            this.blkRating,
            this.layupRating,
            this.standDunk,
            this.drivingDunk,
            this.athleticism,
            this.durability,
            this.offConst,
            this.defConst,
            this.drawFoul,
            this.teamName
        )
    }
}
