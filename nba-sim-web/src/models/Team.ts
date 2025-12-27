/**
 * Team Class
 *
 * Represents an NBA team with roster management and game statistics.
 * Migrated from Java Team.java with identical roster loading and position grouping.
 */

import { Position, POSITIONS, TeamGameStats, TeamGameState, Language } from './types'
import { Player, PlayerCSVRow } from './Player'
import { RotationType } from './types'
import { ROSTER_PATH, getLocalizedTeamName, ALL_TEAMS_EN } from '../utils/Constants'
import { loadCSV } from '../services/ResourceLoader'

// Static cache for loaded team templates
const teamTemplateCache = new Map<string, Team>()

export class Team {
    // Team identity
    public readonly name: string // English name (used for roster file access)

    // Team statistics (reset each game)
    public totalScore: number = 0
    public totalRebound: number = 0
    public totalAssist: number = 0
    public totalSteal: number = 0
    public totalBlock: number = 0
    public totalFoul: number = 0
    public totalTurnover: number = 0
    public totalShotMade: number = 0
    public totalShotAttempted: number = 0
    public total3Made: number = 0
    public total3Attempted: number = 0
    public totalFreeMade: number = 0
    public totalFreeAttempted: number = 0
    public totalScoreAllowed: number = 0
    public opponentShotMade: number = 0
    public opponentShotAttempted: number = 0
    public opponent3Made: number = 0
    public opponent3Attempted: number = 0

    // Game state
    public quarterFoul: number = 0
    public hasBall: boolean = false
    public canChallenge: boolean = true

    // Roster
    public readonly players: Player[] = []
    public readonly starters: Map<Position, Player> = new Map()
    public readonly benches: Map<Position, Player[]> = new Map()
    public readonly rareBenches: Map<Position, Player[]> = new Map()

    /**
     * Create a new Team instance.
     * Use Team.loadFromCSV() for loading from roster file.
     */
    constructor(name: string) {
        this.name = name
    }

    /**
     * Factory method to load a team from a CSV roster file.
     * Uses caching to avoid redundant network requests.
     * Returns a fresh copy with reset stats for game use.
     * @param teamName The team name (English)
     * @returns A new Team instance with loaded roster
     */
    static async loadFromCSV(teamName: string): Promise<Team> {
        // Check cache first
        const cached = teamTemplateCache.get(teamName)
        if (cached) {
            // Return a fresh copy with reset stats
            return cached.clone()
        }

        // Load from CSV
        const team = new Team(teamName)
        const filePath = `${ROSTER_PATH}${teamName}.csv`

        const rows = await loadCSV<PlayerCSVRow>(filePath)

        for (const row of rows) {
            const player = Player.fromCSVRow(row, teamName)
            team.players.push(player)

            // Add player based on rotation type
            if (player.rotationType === RotationType.STARTER) {
                team.starters.set(player.position, player)
                player.hasBeenOnCourt = true
            } else if (player.rotationType === RotationType.BENCH) {
                if (!team.benches.has(player.position)) {
                    team.benches.set(player.position, [])
                }
                team.benches.get(player.position)!.push(player)
            } else if (player.rotationType === RotationType.DEEP_BENCH) {
                if (!team.rareBenches.has(player.position)) {
                    team.rareBenches.set(player.position, [])
                }
                team.rareBenches.get(player.position)!.push(player)
            }
        }

        // Sort benches by rating in descending order
        for (const players of team.benches.values()) {
            players.sort((a, b) => b.rating - a.rating)
        }
        for (const players of team.rareBenches.values()) {
            players.sort((a, b) => b.rating - a.rating)
        }

        // Cache the template
        teamTemplateCache.set(teamName, team)

        // Return a fresh copy
        return team.clone()
    }

    /**
     * Preload all NBA teams into cache.
     * Call this during initialization to avoid delays later.
     */
    static async preloadAllTeams(): Promise<void> {
        const loadPromises = ALL_TEAMS_EN.map(teamName => Team.loadFromCSV(teamName))
        await Promise.all(loadPromises)
    }

    /**
     * Check if all teams are cached.
     */
    static areTeamsCached(): boolean {
        return teamTemplateCache.size >= ALL_TEAMS_EN.length
    }

    /**
     * Clone this team for use in a game.
     * Creates fresh players with reset stats.
     */
    clone(): Team {
        const cloned = new Team(this.name)

        // Clone players with fresh stats
        for (const player of this.players) {
            const clonedPlayer = player.clone()
            cloned.players.push(clonedPlayer)

            // Set up roster structure
            if (clonedPlayer.rotationType === RotationType.STARTER) {
                cloned.starters.set(clonedPlayer.position, clonedPlayer)
                clonedPlayer.hasBeenOnCourt = true
            } else if (clonedPlayer.rotationType === RotationType.BENCH) {
                if (!cloned.benches.has(clonedPlayer.position)) {
                    cloned.benches.set(clonedPlayer.position, [])
                }
                cloned.benches.get(clonedPlayer.position)!.push(clonedPlayer)
            } else if (clonedPlayer.rotationType === RotationType.DEEP_BENCH) {
                if (!cloned.rareBenches.has(clonedPlayer.position)) {
                    cloned.rareBenches.set(clonedPlayer.position, [])
                }
                cloned.rareBenches.get(clonedPlayer.position)!.push(clonedPlayer)
            }
        }

        // Sort benches by rating in descending order
        for (const players of cloned.benches.values()) {
            players.sort((a, b) => b.rating - a.rating)
        }
        for (const players of cloned.rareBenches.values()) {
            players.sort((a, b) => b.rating - a.rating)
        }

        return cloned
    }

    /**
     * Get the display name for this team based on language.
     * @param language The language to use
     * @returns The localized team name
     */
    getDisplayName(language: Language): string {
        return getLocalizedTeamName(this.name, language)
    }

    /**
     * Get the starter at a specific position.
     * @param position The court position
     * @returns The starting player at that position
     */
    getStarterByPosition(position: Position): Player | undefined {
        return this.starters.get(position)
    }

    /**
     * Get bench players at a specific position.
     * @param position The court position
     * @returns Array of bench players at that position
     */
    getBenchByPosition(position: Position): Player[] {
        return this.benches.get(position) ?? []
    }

    /**
     * Get deep bench players at a specific position.
     * @param position The court position
     * @returns Array of deep bench players at that position
     */
    getRareBenchByPosition(position: Position): Player[] {
        return this.rareBenches.get(position) ?? []
    }

    /**
     * Get all players currently on the court.
     * @returns Map of position to player on court
     */
    getPlayersOnCourt(): Map<Position, Player> {
        const onCourt = new Map<Position, Player>()

        for (const player of this.players) {
            if (player.isOnCourt) {
                onCourt.set(player.position, player)
            }
        }

        return onCourt
    }

    /**
     * Get all players on court as an array.
     * @returns Array of players currently on court
     */
    getPlayersOnCourtArray(): Player[] {
        return this.players.filter((p) => p.isOnCourt)
    }

    /**
     * Put starters on the court.
     * Called at the start of each game/quarter.
     */
    setStartersOnCourt(): void {
        // First, take everyone off court
        for (const player of this.players) {
            player.isOnCourt = false
        }

        // Put starters on court
        for (const starter of this.starters.values()) {
            starter.isOnCourt = true
        }
    }

    /**
     * Substitute a player.
     * @param playerOut The player leaving the court
     * @param playerIn The player entering the court
     * @param gameTimeSeconds Current game time in seconds
     */
    substitutePlayer(playerOut: Player, playerIn: Player, gameTimeSeconds: number): void {
        playerOut.isOnCourt = false
        playerOut.lastSubbedOutTime = gameTimeSeconds
        playerOut.currentStintSeconds = 0

        playerIn.isOnCourt = true
        playerIn.hasBeenOnCourt = true
        playerIn.currentStintSeconds = 0
    }

    /**
     * Reset all game statistics to zero.
     * Called at the start of each new game.
     */
    resetGameStats(): void {
        this.totalScore = 0
        this.totalRebound = 0
        this.totalAssist = 0
        this.totalSteal = 0
        this.totalBlock = 0
        this.totalFoul = 0
        this.totalTurnover = 0
        this.totalShotMade = 0
        this.totalShotAttempted = 0
        this.total3Made = 0
        this.total3Attempted = 0
        this.totalFreeMade = 0
        this.totalFreeAttempted = 0
        this.totalScoreAllowed = 0
        this.opponentShotMade = 0
        this.opponentShotAttempted = 0
        this.opponent3Made = 0
        this.opponent3Attempted = 0

        this.quarterFoul = 0
        this.hasBall = false
        this.canChallenge = true

        // Reset all player stats
        for (const player of this.players) {
            player.resetGameStats()
        }
    }

    /**
     * Reset quarter fouls to zero.
     * Called at the start of each quarter.
     */
    resetQuarterFouls(): void {
        this.quarterFoul = 0
    }

    /**
     * Get the current game statistics.
     * @returns Team game stats object
     */
    getGameStats(): TeamGameStats {
        return {
            totalScore: this.totalScore,
            totalRebound: this.totalRebound,
            totalAssist: this.totalAssist,
            totalSteal: this.totalSteal,
            totalBlock: this.totalBlock,
            totalFoul: this.totalFoul,
            totalTurnover: this.totalTurnover,
            totalShotMade: this.totalShotMade,
            totalShotAttempted: this.totalShotAttempted,
            total3Made: this.total3Made,
            total3Attempted: this.total3Attempted,
            totalFreeMade: this.totalFreeMade,
            totalFreeAttempted: this.totalFreeAttempted,
            totalScoreAllowed: this.totalScoreAllowed,
            opponentShotMade: this.opponentShotMade,
            opponentShotAttempted: this.opponentShotAttempted,
            opponent3Made: this.opponent3Made,
            opponent3Attempted: this.opponent3Attempted,
        }
    }

    /**
     * Get the current game state.
     * @returns Team game state object
     */
    getGameState(): TeamGameState {
        return {
            hasBall: this.hasBall,
            canChallenge: this.canChallenge,
            quarterFoul: this.quarterFoul,
        }
    }

    /**
     * Calculate field goal percentage.
     * @returns FG% as a number (0-100)
     */
    getFieldGoalPercentage(): number {
        if (this.totalShotAttempted === 0) return 0
        return (this.totalShotMade / this.totalShotAttempted) * 100
    }

    /**
     * Calculate three-point percentage.
     * @returns 3P% as a number (0-100)
     */
    getThreePointPercentage(): number {
        if (this.total3Attempted === 0) return 0
        return (this.total3Made / this.total3Attempted) * 100
    }

    /**
     * Calculate free throw percentage.
     * @returns FT% as a number (0-100)
     */
    getFreeThrowPercentage(): number {
        if (this.totalFreeAttempted === 0) return 0
        return (this.totalFreeMade / this.totalFreeAttempted) * 100
    }

    /**
     * Get the roster count.
     * @returns Number of players on the roster
     */
    getRosterSize(): number {
        return this.players.length
    }

    /**
     * Find a player by name.
     * @param name Player name (Chinese or English)
     * @returns The player if found, undefined otherwise
     */
    findPlayer(name: string): Player | undefined {
        return this.players.find((p) => p.name === name || p.englishName === name)
    }

    /**
     * Get players sorted by a specific stat.
     * @param stat The stat to sort by
     * @param descending Sort in descending order (default: true)
     * @returns Sorted array of players
     */
    getPlayersSortedByStat(
        stat: keyof Player,
        descending: boolean = true
    ): Player[] {
        const sorted = [...this.players]
        sorted.sort((a, b) => {
            const aVal = a[stat] as number
            const bVal = b[stat] as number
            return descending ? bVal - aVal : aVal - bVal
        })
        return sorted
    }

    /**
     * Get the best available substitute for a position.
     * @param position The position to find a sub for
     * @param excludePlayer Player to exclude (usually the one being subbed out)
     * @returns The best available substitute, or undefined
     */
    getBestAvailableSub(position: Position, excludePlayer?: Player): Player | undefined {
        // First check bench players at the same position
        const benchPlayers = this.getBenchByPosition(position)
        for (const player of benchPlayers) {
            if (player.canOnCourt && !player.isOnCourt && player !== excludePlayer) {
                return player
            }
        }

        // Then check adjacent positions
        const positionIndex = POSITIONS.indexOf(position)
        const adjacentPositions: Position[] = []
        if (positionIndex > 0) adjacentPositions.push(POSITIONS[positionIndex - 1])
        if (positionIndex < POSITIONS.length - 1) adjacentPositions.push(POSITIONS[positionIndex + 1])

        for (const adjPos of adjacentPositions) {
            const adjBench = this.getBenchByPosition(adjPos)
            for (const player of adjBench) {
                if (player.canOnCourt && !player.isOnCourt && player !== excludePlayer) {
                    return player
                }
            }
        }

        // Finally check deep bench
        const rarePlayers = this.getRareBenchByPosition(position)
        for (const player of rarePlayers) {
            if (player.canOnCourt && !player.isOnCourt && player !== excludePlayer) {
                return player
            }
        }

        return undefined
    }

    /**
     * Serialize team to JSON for debugging/state persistence.
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            rosterSize: this.getRosterSize(),
            gameStats: this.getGameStats(),
            gameState: this.getGameState(),
            starters: Array.from(this.starters.entries()).map(([pos, p]) => ({
                position: pos,
                player: p.englishName,
            })),
        }
    }
}
