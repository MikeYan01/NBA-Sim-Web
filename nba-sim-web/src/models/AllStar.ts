/**
 * All-Star Game Module
 *
 * Handles All-Star player selection, team creation, and game hosting.
 * Selects 15 players per conference based on season stats and team record.
 */

import { Team } from './Team'
import { Player } from './Player'
import { SeasonStats, LeaderboardEntry } from './SeasonStats'
import { StandingsManager } from './Standings'
import { hostGame, GameRecapData } from './Game'
import { Conference, Language, Position, RotationType } from './types'
import { SeededRandom } from '../utils/SeededRandom'
import { EAST_TEAMS_EN, WEST_TEAMS_EN } from '../utils/Constants'

// =============================================================================
// Constants
// =============================================================================

const ALL_STAR_DATE = '02-14'

// =============================================================================
// All-Star Selection
// =============================================================================

interface AllStarCandidate {
    name: string
    englishName: string
    teamName: string
    position: Position
    score: number // composite selection score
}

/**
 * Calculate a composite All-Star selection score for a player.
 * Considers: points, assists, rebounds, team win percentage.
 */
function calculateAllStarScore(
    entry: LeaderboardEntry,
    standings: StandingsManager
): number {
    const pg = entry.perGame
    // Weighted composite: points most important, then assists, rebounds
    let score = pg.points * 2 + pg.assists * 1.5 + pg.rebounds * 1.2
        + pg.steals * 1.0 + pg.blocks * 1.0

    // Team record bonus: players on winning teams get a boost
    const record = standings.getTeamRecord(entry.teamName)
    if (record) {
        const totalGames = record.wins + record.losses
        if (totalGames > 0) {
            const winPct = record.wins / totalGames
            score *= (0.8 + winPct * 0.4) // 0.8x to 1.2x multiplier
        }
    }

    return score
}

/**
 * Select 15 All-Star players for a conference.
 * Quotas: C×3, PF/SF×6, PG/SG×6
 */
function selectConferenceAllStars(
    conference: Conference,
    stats: SeasonStats,
    standings: StandingsManager,
    teams: Map<string, Team>
): AllStarCandidate[] {
    const conferenceTeams = conference === Conference.EAST ? EAST_TEAMS_EN : WEST_TEAMS_EN

    // Get all players from this conference with their stats
    const allCandidates: AllStarCandidate[] = []
    const allLeaders = stats.getLeaders('points', 500) // get all tracked players

    for (const entry of allLeaders) {
        if (!conferenceTeams.includes(entry.teamName)) continue

        // Find the player's position from the team roster
        const team = teams.get(entry.teamName)
        if (!team) continue

        const player = team.players.find(p => p.name === entry.name)
        if (!player) continue

        allCandidates.push({
            name: entry.name,
            englishName: entry.englishName,
            teamName: entry.teamName,
            position: player.position,
            score: calculateAllStarScore(entry, standings),
        })
    }

    // Sort by score descending
    allCandidates.sort((a, b) => b.score - a.score)

    // Select by position quotas
    const selected: AllStarCandidate[] = []
    const used = new Set<string>()

    // Centers: pick top 3
    let centerCount = 0
    for (const c of allCandidates) {
        if (centerCount >= 3) break
        if (used.has(c.name)) continue
        if (c.position === 'C') {
            selected.push(c)
            used.add(c.name)
            centerCount++
        }
    }

    // Forwards (PF/SF): pick top 6
    let forwardCount = 0
    for (const c of allCandidates) {
        if (forwardCount >= 6) break
        if (used.has(c.name)) continue
        if (c.position === 'PF' || c.position === 'SF') {
            selected.push(c)
            used.add(c.name)
            forwardCount++
        }
    }

    // Guards (PG/SG): pick top 6
    let guardCount = 0
    for (const c of allCandidates) {
        if (guardCount >= 6) break
        if (used.has(c.name)) continue
        if (c.position === 'PG' || c.position === 'SG') {
            selected.push(c)
            used.add(c.name)
            guardCount++
        }
    }

    return selected
}

// =============================================================================
// All-Star Team Creation
// =============================================================================

/**
 * Create a cloned Player with a specific rotationType for the All-Star team.
 */
function clonePlayerWithRotation(original: Player, rotationType: RotationType): Player {
    return new Player(
        original.name,
        original.englishName,
        original.position,
        original.playerType,
        rotationType,
        original.rating,
        original.insideRating,
        original.midRating,
        original.threeRating,
        original.freeThrowPercent,
        original.interiorDefense,
        original.perimeterDefense,
        original.orbRating,
        original.drbRating,
        original.astRating,
        original.stlRating,
        original.blkRating,
        original.layupRating,
        original.standDunk,
        original.drivingDunk,
        original.athleticism,
        original.durability,
        original.offConst,
        original.defConst,
        original.drawFoul,
        original.teamName
    )
}

/**
 * Build an All-Star Team from selected candidates.
 * Assigns 5 starters, 5 bench, 5 deep bench.
 */
function buildAllStarTeam(
    teamName: string,
    candidates: AllStarCandidate[],
    teams: Map<string, Team>
): Team {
    const allStarTeam = new Team(teamName)

    // Assign roles: first pick starters (one per position), then bench, then deep bench
    const starterPositions = new Set<Position>()
    const benchPositions = new Set<Position>()
    const starters: { candidate: AllStarCandidate; player: Player }[] = []
    const bench: { candidate: AllStarCandidate; player: Player }[] = []
    const deepBench: { candidate: AllStarCandidate; player: Player }[] = []

    // Find original player objects
    const candidatesWithPlayers = candidates.map(c => {
        const team = teams.get(c.teamName)!
        const player = team.players.find(p => p.name === c.name)!
        return { candidate: c, player }
    })

    // Pick 5 starters: one per position, highest scored first
    for (const cp of candidatesWithPlayers) {
        if (starters.length >= 5) break
        if (!starterPositions.has(cp.candidate.position)) {
            starterPositions.add(cp.candidate.position)
            starters.push(cp)
        }
    }

    // Pick 5 bench: one per position from remaining
    const starterNames = new Set(starters.map(s => s.candidate.name))
    for (const cp of candidatesWithPlayers) {
        if (bench.length >= 5) break
        if (starterNames.has(cp.candidate.name)) continue
        if (!benchPositions.has(cp.candidate.position)) {
            benchPositions.add(cp.candidate.position)
            bench.push(cp)
        }
    }

    // Remaining 5 go to deep bench
    const usedNames = new Set([
        ...starters.map(s => s.candidate.name),
        ...bench.map(b => b.candidate.name),
    ])
    for (const cp of candidatesWithPlayers) {
        if (deepBench.length >= 5) break
        if (usedNames.has(cp.candidate.name)) continue
        deepBench.push(cp)
    }

    // Create cloned players with appropriate rotation types and add to team
    for (const s of starters) {
        const cloned = clonePlayerWithRotation(s.player, RotationType.STARTER)
        allStarTeam.players.push(cloned)
        allStarTeam.starters.set(cloned.position, cloned)
        cloned.hasBeenOnCourt = true
    }

    for (const b of bench) {
        const cloned = clonePlayerWithRotation(b.player, RotationType.BENCH)
        allStarTeam.players.push(cloned)
        if (!allStarTeam.benches.has(cloned.position)) {
            allStarTeam.benches.set(cloned.position, [])
        }
        allStarTeam.benches.get(cloned.position)!.push(cloned)
    }

    for (const d of deepBench) {
        const cloned = clonePlayerWithRotation(d.player, RotationType.DEEP_BENCH)
        allStarTeam.players.push(cloned)
        if (!allStarTeam.rareBenches.has(cloned.position)) {
            allStarTeam.rareBenches.set(cloned.position, [])
        }
        allStarTeam.rareBenches.get(cloned.position)!.push(cloned)
    }

    return allStarTeam
}

// =============================================================================
// All-Star Game
// =============================================================================

/**
 * Host the All-Star game during the season.
 * Returns the game result with recap marked as All-Star.
 */
export function hostAllStarGame(
    stats: SeasonStats,
    standings: StandingsManager,
    teams: Map<string, Team>,
    random: SeededRandom,
    language: Language
): GameRecapData | null {
    // Select All-Star players
    const eastCandidates = selectConferenceAllStars(Conference.EAST, stats, standings, teams)
    const westCandidates = selectConferenceAllStars(Conference.WEST, stats, standings, teams)

    // Need at least 15 per conference
    if (eastCandidates.length < 15 || westCandidates.length < 15) {
        return null
    }

    // Build teams
    const eastTeam = buildAllStarTeam('East All-Stars', eastCandidates, teams)
    const westTeam = buildAllStarTeam('West All-Stars', westCandidates, teams)

    // Host the game (West=away/team1, East=home/team2, not playoff, is All-Star)
    const result = hostGame(westTeam, eastTeam, random, language, ALL_STAR_DATE, false, true)

    // Mark recap as All-Star
    if (result.recap) {
        result.recap.isAllStar = true
        // All-Star game has no W-L record
        result.recap.awayWins = 0
        result.recap.awayLosses = 0
        result.recap.homeWins = 0
        result.recap.homeLosses = 0
    }

    return result.recap ?? null
}
