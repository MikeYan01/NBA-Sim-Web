/**
 * Stats Formatter
 *
 * Utility module for formatting statistics output with internationalization support.
 * Provides functions to format stats in different languages using LocalizationService.
 *
 * Task T049: Implement StatsFormatter.ts for box score output
 */

import { getString } from '../services/LocalizationService'
import { Language } from '../models/types'

// =============================================================================
// Player Box Score Formatting
// =============================================================================

/**
 * Format player box score line for detailed rankings.
 *
 * @param rank - Player rank
 * @param displayName - Player display name
 * @param score - Points per game
 * @param reb - Rebounds per game
 * @param ast - Assists per game
 * @param stl - Steals per game
 * @param blk - Blocks per game
 * @param perShotMade - Field goals made per game
 * @param perShotAttempted - Field goals attempted per game
 * @param perThreeMade - Three pointers made per game
 * @param perThreeAttempted - Three pointers attempted per game
 * @param perFtMade - Free throws made per game
 * @param perFtAttempted - Free throws attempted per game
 * @param language - Language for localized strings
 * @returns Formatted player box score line
 */
export function formatPlayerBoxScore(
    rank: number,
    displayName: string,
    score: number,
    reb: number,
    ast: number,
    stl: number,
    blk: number,
    perShotMade: number,
    perShotAttempted: number,
    perThreeMade: number,
    perThreeAttempted: number,
    perFtMade: number,
    perFtAttempted: number,
    language: Language
): string {
    // Get localized labels
    const pointsShort = getString('stat.points.short', language)
    const reboundsShort = getString('stat.rebounds.short', language)
    const assistsShort = getString('stat.assists.short', language)
    const stealsShort = getString('stat.steals.short', language)
    const blocksShort = getString('stat.blocks.short', language)
    const fgLabel = getString('stat.fieldgoal.label', language)
    const threePtLabel = getString('stat.threepoint.label', language)
    const ftLabel = getString('stat.freethrow.label', language)

    // Build three-point stats string
    const threeStats =
        perThreeAttempted > 0
            ? `${threePtLabel}${perThreeMade.toFixed(1)}/${perThreeAttempted.toFixed(1)} ${((perThreeMade * 100.0) / perThreeAttempted).toFixed(2)}%`
            : `${threePtLabel}${perThreeMade.toFixed(1)}`

    // Build free throw stats string
    const ftStats =
        perFtAttempted > 0
            ? `${ftLabel}${perFtMade.toFixed(1)}/${perFtAttempted.toFixed(1)} ${((perFtMade * 100.0) / perFtAttempted).toFixed(2)}%`
            : `${ftLabel}${perFtMade.toFixed(1)}`

    // Build field goal percentage
    const fgPct = perShotAttempted > 0 ? ((perShotMade * 100.0) / perShotAttempted).toFixed(2) : '0.00'

    return `${rank} ${displayName} ${score.toFixed(1)}${pointsShort} ${reb.toFixed(1)}${reboundsShort} ${ast.toFixed(1)}${assistsShort} ${stl.toFixed(1)}${stealsShort} ${blk.toFixed(1)}${blocksShort}  ${fgLabel}${perShotMade.toFixed(1)}/${perShotAttempted.toFixed(1)} ${fgPct}%  ${threeStats}  ${ftStats}`
}

// =============================================================================
// Simple Rankings
// =============================================================================

/**
 * Format simple player ranking line (for 3PT% and FT% rankings).
 *
 * @param rank - Player rank
 * @param displayName - Player display name
 * @param value - Stat value (percentage)
 * @param language - Language for localized strings
 * @returns Formatted ranking line
 */
export function formatSimpleRanking(
    rank: number,
    displayName: string,
    value: number
): string {
    return `${rank} ${displayName}  ${value.toFixed(2)}`
}

// =============================================================================
// Standings
// =============================================================================

/**
 * Format standing line.
 *
 * @param rank - Team rank
 * @param teamName - Team name
 * @param wins - Number of wins
 * @param losses - Number of losses
 * @param winRate - Win rate percentage
 * @param language - Language for localized strings
 * @returns Formatted standing line
 */
export function formatStanding(
    rank: number,
    teamName: string,
    wins: number,
    losses: number,
    winRate: number,
    language: Language
): string {
    const winRateLabel = getString('stat.winrate', language)
    return `${rank} ${teamName}: ${wins}-${losses}  ${winRateLabel}${winRate.toFixed(2)}%`
}

/**
 * Format games back value.
 *
 * @param gamesBack - Games behind conference leader
 * @returns Formatted games back string (e.g., "-", "0.5", "3.0")
 */
export function formatGamesBack(gamesBack: number): string {
    if (gamesBack === 0) {
        return '-'
    }
    return gamesBack.toFixed(1)
}

/**
 * Format a complete standings entry with all columns.
 *
 * @param entry - Standing entry from StandingsManager
 * @param language - Language for localized strings
 * @returns Formatted standing line with rank, team, W-L, PCT, GB
 */
export function formatStandingEntry(
    entry: {
        rank: number
        teamName: string
        wins: number
        losses: number
        winPercentage: number
        gamesBack: number
    },
): string {
    const { rank, teamName, wins, losses, winPercentage, gamesBack } = entry
    const pct = winPercentage.toFixed(3).substring(1) // ".750" format
    const gb = formatGamesBack(gamesBack)

    // Pad columns for alignment
    const rankStr = String(rank).padStart(2)
    const teamStr = teamName.padEnd(15)
    const winsStr = String(wins).padStart(2)
    const lossesStr = String(losses).padStart(2)

    return `${rankStr}. ${teamStr} ${winsStr}-${lossesStr}  ${pct}  ${gb}`
}

/**
 * Format conference standings as a formatted table.
 *
 * @param conferenceName - "Eastern" or "Western"
 * @param standings - Array of standing entries for the conference
 * @param language - Language for localized strings
 * @returns Array of formatted lines for the conference standings
 */
export function formatConferenceStandings(
    conferenceName: string,
    standings: Array<{
        rank: number
        teamName: string
        wins: number
        losses: number
        winPercentage: number
        gamesBack: number
    }>,
    language: Language
): string[] {
    const lines: string[] = []

    // Header
    const conferenceLabel = getString('standings.conference', language) || 'Conference'
    lines.push(`=== ${conferenceName} ${conferenceLabel} ===`)
    lines.push('')

    // Column headers
    const headerLabels = {
        rank: '#',
        team: getString('standings.team', language) || 'Team',
        record: getString('standings.record', language) || 'W-L',
        pct: getString('stat.winrate', language) || 'PCT',
        gb: getString('standings.gamesback', language) || 'GB',
    }
    lines.push(`${headerLabels.rank.padStart(2)}  ${headerLabels.team.padEnd(15)} ${headerLabels.record.padStart(5)}  ${headerLabels.pct}  ${headerLabels.gb}`)
    lines.push('-'.repeat(40))

    // Each team
    for (const entry of standings) {
        lines.push(formatStandingEntry(entry))
    }

    return lines
}

// =============================================================================
// Game Recap Formatting
// =============================================================================

/**
 * Format game recap header.
 *
 * @param gameInfo - Game information string
 * @param language - Language for localized strings
 * @returns Formatted header
 */
export function formatGameRecapHeader(gameInfo: string, language: Language): string {
    const recapLabel = getString('game.recap', language)
    return `${recapLabel} - ${gameInfo}`
}

/**
 * Format final score line.
 *
 * @param winner - Winner team name
 * @param winScore - Winner's score
 * @param loser - Loser team name
 * @param loseScore - Loser's score
 * @param language - Language for localized strings
 * @returns Formatted final score line
 */
export function formatFinalScore(
    winner: string,
    winScore: number,
    loser: string,
    loseScore: number,
    language: Language
): string {
    const finalScoreLabel = getString('game.finalscore', language)
    return `${finalScoreLabel}: ${winner} ${winScore} - ${loseScore} ${loser}`
}

/**
 * Format player performance line for recap.
 *
 * @param teamName - Team name
 * @param playerName - Player name
 * @param score - Points
 * @param reb - Rebounds
 * @param ast - Assists
 * @param language - Language for localized strings
 * @returns Formatted player performance line
 */
export function formatPlayerPerformance(
    teamName: string,
    playerName: string,
    score: number,
    reb: number,
    ast: number,
    language: Language
): string {
    const pointsShort = getString('stat.points.short', language)
    const reboundsShort = getString('stat.rebounds.short', language)
    const assistsShort = getString('stat.assists.short', language)
    return `${teamName}: ${playerName} - ${score}${pointsShort} ${reb}${reboundsShort} ${ast}${assistsShort}`
}

/**
 * Format final score with away/home notation.
 *
 * @param awayTeam - Away team name
 * @param awayScore - Away team score
 * @param homeTeam - Home team name
 * @param homeScore - Home team score
 * @param overtimeSuffix - OT suffix (e.g., "(OT)" or "")
 * @param language - Language for localized strings
 * @returns Formatted away/home score line
 */
export function formatAwayHomeScore(
    awayTeam: string,
    awayScore: number,
    homeTeam: string,
    homeScore: number,
    overtimeSuffix: string,
    language: Language
): string {
    const finalScoreLabel = getString('game.finalscore', language)
    const atLabel = getString('game.at', language)
    return `${finalScoreLabel}: ${awayTeam} ${awayScore} ${atLabel} ${homeTeam} ${homeScore}${overtimeSuffix}`
}

/**
 * Format shooting percentages line.
 *
 * @param awayFgPct - Away team field goal percentage
 * @param homeFgPct - Home team field goal percentage
 * @param away3PtPct - Away team three-point percentage
 * @param home3PtPct - Home team three-point percentage
 * @param language - Language for localized strings
 * @returns Formatted shooting stats line
 */
export function formatShootingStats(
    awayFgPct: number,
    homeFgPct: number,
    away3PtPct: number,
    home3PtPct: number,
    language: Language
): string {
    const fgPctLabel = getString('stat.fieldgoal.pct', language)
    const threePtPctLabel = getString('stat.threepoint.pct', language)
    return `${fgPctLabel}: ${awayFgPct.toFixed(1)}% vs ${homeFgPct.toFixed(1)}% | ${threePtPctLabel}: ${away3PtPct.toFixed(1)}% vs ${home3PtPct.toFixed(1)}%`
}

/**
 * Format team label (Away/Home).
 *
 * @param teamName - Team name
 * @param isAway - Whether team is away
 * @param language - Language for localized strings
 * @returns Formatted team label
 */
export function formatTeamLabel(teamName: string, isAway: boolean, language: Language): string {
    const locationLabel = isAway ? getString('game.away', language) : getString('game.home', language)
    return `  ${teamName} (${locationLabel}):`
}

/**
 * Format player stats line in recap (with badge).
 *
 * @param badge - Badge or icon string (e.g., star emoji)
 * @param playerName - Player name
 * @param score - Points
 * @param reb - Rebounds
 * @param ast - Assists
 * @param language - Language for localized strings
 * @returns Formatted player stats line
 */
export function formatPlayerStatsLine(
    badge: string,
    playerName: string,
    score: number,
    reb: number,
    ast: number,
    language: Language
): string {
    const pointsShort = getString('stat.points.short', language)
    const reboundsShort = getString('stat.rebounds.short', language)
    const assistsShort = getString('stat.assists.short', language)
    return `    ${badge}${playerName} - ${score}${pointsShort} ${reb}${reboundsShort} ${ast}${assistsShort}`
}

// =============================================================================
// Box Score Table Formatting (Web-Specific)
// =============================================================================

/**
 * Format minutes played as a string (MM:SS).
 *
 * @param seconds - Total seconds played
 * @returns Formatted minutes string
 */
export function formatMinutes(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Format a percentage value.
 *
 * @param value - Percentage value (0-100)
 * @param decimalPlaces - Number of decimal places (default 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimalPlaces = 1): string {
    if (isNaN(value) || !isFinite(value)) {
        return '-'
    }
    return `${value.toFixed(decimalPlaces)}%`
}

/**
 * Format a shooting stat (made/attempted).
 *
 * @param made - Shots made
 * @param attempted - Shots attempted
 * @returns Formatted shooting stat string
 */
export function formatShootingStat(made: number, attempted: number): string {
    return `${made}/${attempted}`
}

/**
 * Calculate and format shooting percentage.
 *
 * @param made - Shots made
 * @param attempted - Shots attempted
 * @returns Formatted percentage string
 */
export function formatShootingPercentage(made: number, attempted: number): string {
    if (attempted === 0) {
        return '-'
    }
    const percentage = (made / attempted) * 100
    return formatPercentage(percentage)
}

// =============================================================================
// Game Score Summary
// =============================================================================

/**
 * Format quarter-by-quarter score summary.
 *
 * @param team1Name - Team 1 name
 * @param team2Name - Team 2 name
 * @param team1QuarterScores - Team 1 cumulative scores by quarter
 * @param team2QuarterScores - Team 2 cumulative scores by quarter
 * @returns Formatted quarter summary as array of lines
 */
export function formatQuarterSummary(
    team1Name: string,
    team2Name: string,
    team1QuarterScores: number[],
    team2QuarterScores: number[]
): string[] {
    const lines: string[] = []

    // Convert cumulative scores to per-quarter scores
    const team1PerQuarter: number[] = []
    const team2PerQuarter: number[] = []

    for (let i = 0; i < team1QuarterScores.length; i++) {
        const prev1 = i > 0 ? team1QuarterScores[i - 1] : 0
        const prev2 = i > 0 ? team2QuarterScores[i - 1] : 0
        team1PerQuarter.push(team1QuarterScores[i] - prev1)
        team2PerQuarter.push(team2QuarterScores[i] - prev2)
    }

    // Header
    const numPeriods = team1QuarterScores.length
    const periodHeaders = []
    for (let i = 1; i <= numPeriods; i++) {
        if (i <= 4) {
            periodHeaders.push(`Q${i}`)
        } else {
            periodHeaders.push(`OT${i - 4}`)
        }
    }
    periodHeaders.push('Total')

    lines.push(['Team', ...periodHeaders].join('\t'))

    // Team 1 line
    const team1Final = team1QuarterScores[team1QuarterScores.length - 1]
    lines.push([team1Name, ...team1PerQuarter.map(String), String(team1Final)].join('\t'))

    // Team 2 line
    const team2Final = team2QuarterScores[team2QuarterScores.length - 1]
    lines.push([team2Name, ...team2PerQuarter.map(String), String(team2Final)].join('\t'))

    return lines
}

// =============================================================================
// Leaderboard Formatting
// =============================================================================

/**
 * Format a single leaderboard entry.
 *
 * @param rank - Player rank
 * @param playerName - Player display name
 * @param teamName - Team name
 * @param value - Stat value (per game)
 * @param _language - Language for localized strings
 * @returns Formatted leaderboard entry line
 */
export function formatLeaderboardEntry(
    rank: number,
    playerName: string,
    teamName: string,
    value: number
): string {
    const rankStr = String(rank).padStart(2)
    const nameStr = playerName.padEnd(20)
    const teamStr = teamName.padEnd(15)
    return `${rankStr}. ${nameStr} ${teamStr} ${value.toFixed(1)}`
}

/**
 * Format a complete leaderboard for a stat category.
 *
 * @param categoryLabel - Display label for the category (e.g., "Points Per Game")
 * @param entries - Array of leaderboard entries
 * @param language - Language for localized strings
 * @returns Array of formatted lines for the leaderboard
 */
export function formatLeaderboard(
    categoryLabel: string,
    entries: Array<{
        name: string
        englishName: string
        teamName: string
        value: number
    }>,
    language: Language
): string[] {
    const lines: string[] = []

    // Header
    lines.push(`=== ${categoryLabel} ===`)
    lines.push('')

    // Column headers
    const playerLabel = getString('leaderboard.player', language) || 'Player'
    const teamLabel = getString('standings.team', language) || 'Team'
    const valueLabel = getString('leaderboard.value', language) || 'Value'
    lines.push(`${'#'.padStart(2)}  ${playerLabel.padEnd(20)} ${teamLabel.padEnd(15)} ${valueLabel}`)
    lines.push('-'.repeat(50))

    // Each entry
    entries.forEach((entry, index) => {
        lines.push(formatLeaderboardEntry(
            index + 1,
            entry.name,
            entry.teamName,
            entry.value
        ))
    })

    return lines
}

/**
 * Get stat category display label.
 *
 * @param category - Stat category key
 * @param language - Language for localized strings
 * @returns Localized display label for the category
 */
export function getStatCategoryLabel(
    category: 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'threesMade' | 'freeThrowsMade' | 'minutesPlayed',
    language: Language
): string {
    const labels: Record<string, string> = {
        points: getString('stat.points', language) || 'Points',
        rebounds: getString('stat.rebounds', language) || 'Rebounds',
        assists: getString('stat.assists', language) || 'Assists',
        steals: getString('stat.steals', language) || 'Steals',
        blocks: getString('stat.blocks', language) || 'Blocks',
        threesMade: getString('stat.threepoint.made', language) || '3PT Made',
        freeThrowsMade: getString('stat.freethrow.made', language) || 'FT Made',
        minutesPlayed: getString('stat.minutes', language) || 'Minutes',
    }
    return labels[category] || category
}

// =============================================================================
// Season Summary Formatting
// =============================================================================

/**
 * Format a season summary header.
 *
 * @param seasonYear - Year or descriptor (e.g., "2023-24")
 * @param language - Language for localized strings
 * @returns Formatted season header
 */
export function formatSeasonHeader(seasonYear: string, language: Language): string {
    const seasonLabel = getString('season.title', language) || 'NBA Season'
    return `======== ${seasonLabel} ${seasonYear} ========`
}

/**
 * Format playoff series result.
 *
 * @param winner - Series winner team name
 * @param loser - Series loser team name
 * @param winnerWins - Winner's series wins
 * @param loserWins - Loser's series wins
 * @param language - Language for localized strings
 * @returns Formatted series result line
 */
export function formatSeriesResult(
    winner: string,
    loser: string,
    winnerWins: number,
    loserWins: number
): string {
    return `${winner} def. ${loser} ${winnerWins}-${loserWins}`
}

/**
 * Format championship result.
 *
 * @param champion - Champion team name
 * @param runnerUp - Runner-up team name
 * @param championWins - Champion's series wins
 * @param runnerUpWins - Runner-up's series wins
 * @param mvpName - Finals MVP name
 * @param language - Language for localized strings
 * @returns Array of formatted championship lines
 */
export function formatChampionshipResult(
    champion: string,
    runnerUp: string,
    championWins: number,
    runnerUpWins: number,
    mvpName: string,
    language: Language
): string[] {
    const lines: string[] = []

    const championLabel = getString('playoffs.champion', language) || 'NBA Champion'
    const finalsLabel = getString('playoffs.finals', language) || 'NBA Finals'
    const mvpLabel = getString('playoffs.mvp', language) || 'Finals MVP'

    lines.push(`🏆 ${championLabel}: ${champion}`)
    lines.push(`${finalsLabel}: ${champion} def. ${runnerUp} ${championWins}-${runnerUpWins}`)
    lines.push(`${mvpLabel}: ${mvpName}`)

    return lines
}
