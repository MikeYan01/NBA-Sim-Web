import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { useState, type ComponentProps } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GameDetails, type GameDetailsTab } from '../../src/components/GameView/GameDetails'
import { GameRecapCard } from '../../src/components/Season/GameRecaps'
import { SeriesModal } from '../../src/components/Season/SeriesModal'
import { PlayoffBracket } from '../../src/components/Season/PlayoffBracket'
import type { GameRecapData, GameResult, TeamBoxScore } from '../../src/models/Game'
import type { PlayoffBracketResult, SeriesResult } from '../../src/models/Playoffs'
import { Conference, Language } from '../../src/models/types'
import { getString, setStringsForTesting } from '../../src/services/LocalizationService'
import { useLocalizationStore } from '../../src/stores/localizationStore'

const english: Parameters<typeof setStringsForTesting>[0] = JSON.parse(
  readFileSync(join(__dirname, '../../public/data/localization/strings_en_US.json'), 'utf8')
)
const chinese: Parameters<typeof setStringsForTesting>[1] = JSON.parse(
  readFileSync(join(__dirname, '../../public/data/localization/strings_zh_CN.json'), 'utf8')
)

function makeTeamBoxScore(teamName: string, name: string, points: number): TeamBoxScore {
  const stats = {
    points,
    rebounds: 2,
    assists: 1,
    steals: 0,
    blocks: 0,
    fgMade: points / 2,
    fgAttempted: 10,
    threeMade: 0,
    threeAttempted: 0,
    ftMade: 0,
    ftAttempted: 0,
    turnovers: 0,
    fouls: 0,
  }
  return {
    teamName,
    players: [{ ...stats, name, englishName: name, minutes: '20:00', isStarter: true }],
    totals: { ...stats, fgPct: points * 5, threePct: 0, ftPct: 0 },
  }
}

function makeGame(): GameResult {
  return {
    team1Name: 'Lakers',
    team2Name: 'Warriors',
    team1Score: 10,
    team2Score: 8,
    winner: 'Lakers',
    boxScore: {
      team1: makeTeamBoxScore('Lakers', 'Away scorer', 10),
      team2: makeTeamBoxScore('Warriors', 'Home scorer', 8),
    },
    playByPlayLog: ['Opening possession', 'Winning basket'],
    scoreSnapshots: [
      [0, 0],
      [8, 8],
      [10, 8],
    ],
    timeSnapshots: [
      [1, 720],
      [4, 20],
      [4, 0],
    ],
    flowInsights: {
      team1LargestLead: 2,
      team2LargestLead: 0,
      leadChanges: 0,
      timesTied: 1,
      team1MaxLeadTime: 'Q4 0:00',
      team2MaxLeadTime: 'Q1 12:00',
    },
    finalQuarter: 4,
    quarterScores: [
      [2, 4, 6, 10],
      [2, 4, 6, 8],
    ],
  }
}

function makeRecap(game: GameResult): GameRecapData {
  return {
    date: '12-12',
    awayTeam: game.team1Name,
    homeTeam: game.team2Name,
    awayScore: game.team1Score,
    homeScore: game.team2Score,
    awayFgPct: 50,
    homeFgPct: 40,
    away3pPct: 0,
    home3pPct: 0,
    awayTopPlayers: [],
    homeTopPlayers: [],
    awayWins: 1,
    awayLosses: 0,
    homeWins: 0,
    homeLosses: 1,
    flowInsights: game.flowInsights,
    finalQuarter: game.finalQuarter,
    playByPlayLog: game.playByPlayLog,
    boxScore: game.boxScore,
    scoreSnapshots: game.scoreSnapshots,
    timeSnapshots: game.timeSnapshots,
  }
}

function makeSeries(game: GameResult): SeriesResult {
  return {
    team1: game.team1Name,
    team2: game.team2Name,
    team1Wins: 4,
    team2Wins: 0,
    winner: game.team1Name,
    loser: game.team2Name,
    games: [game],
  }
}

function makePlayoffs(game: GameResult): PlayoffBracketResult {
  const series = makeSeries(game)
  return {
    playIn: {
      west: {
        conference: Conference.WEST,
        seed7: game.team1Name,
        seed8: game.team2Name,
        games: [
          {
            roundName: '7 vs 8',
            awayTeam: game.team1Name,
            homeTeam: game.team2Name,
            winner: game.team1Name,
            loser: game.team2Name,
            winnerStatus: 'Secured 7th seed',
            loserStatus: 'Advances to final',
            gameResult: game,
          },
        ],
      },
      east: { conference: Conference.EAST, seed7: 'Celtics', seed8: 'Knicks', games: [] },
    },
    firstRound: { roundName: 'First Round', series: Array.from({ length: 8 }, () => series) },
    confSemis: {
      roundName: 'Conference Semifinals',
      series: Array.from({ length: 4 }, () => series),
    },
    confFinals: { roundName: 'Conference Finals', series: [series, series] },
    finals: series,
    champion: game.team1Name,
    runnerUp: game.team2Name,
  }
}

type DetailsInput = Pick<ComponentProps<typeof GameDetails>, 'game' | 'contentClassName'>

function DetailsHarness({ game, contentClassName }: DetailsInput) {
  const [activeTab, setActiveTab] = useState<GameDetailsTab>('commentary')
  return (
    <GameDetails
      game={game}
      awayTeam="Lakers"
      homeTeam="Warriors"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      contentClassName={contentClassName}
    />
  )
}

beforeEach(() => {
  setStringsForTesting(english, chinese)
  useLocalizationStore.getState().setLanguage(Language.ENGLISH)
  useLocalizationStore.setState({ isInitialized: true })
  HTMLElement.prototype.scrollIntoView = vi.fn()
})

describe('GameDetails', () => {
  it('shows only the tabs supported by the game data', () => {
    render(<DetailsHarness game={{ playByPlayLog: ['Opening possession'] }} />)

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: getString('ui.season.recaps.commentary') })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Opening possession')).toBeVisible()
  })

  it('does not offer a differential chart for empty snapshots', () => {
    render(<DetailsHarness game={{ ...makeGame(), scoreSnapshots: [] }} />)

    expect(screen.getByRole('button', { name: getString('ui.boxScore.title') })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: getString('game.score_differential_title') })
    ).not.toBeInTheDocument()
  })

  it('renders the chart with localized teams even without time snapshots', () => {
    render(<DetailsHarness game={{ ...makeGame(), timeSnapshots: undefined }} />)
    fireEvent.click(
      screen.getByRole('button', { name: getString('game.score_differential_title') })
    )

    const chart = screen.getByRole('region', { name: getString('game.score_differential_title') })
    expect(chart).toBeVisible()
    expect(within(chart).getAllByText(/Lakers/).length).toBeGreaterThan(0)
    expect(within(chart).getAllByText(/Warriors/).length).toBeGreaterThan(0)
  })

  it('uses the same translated tab labels when the language changes', () => {
    render(<DetailsHarness game={makeGame()} />)

    act(() => useLocalizationStore.getState().setLanguage(Language.CHINESE))

    expect(
      screen.getByRole('button', { name: getString('ui.season.recaps.commentary') })
    ).toBeVisible()
    expect(screen.getByRole('button', { name: getString('ui.boxScore.title') })).toBeVisible()
    expect(
      screen.getByRole('button', { name: getString('game.score_differential_title') })
    ).toBeVisible()
  })

  it('keeps the caller-provided content height limit', () => {
    render(<DetailsHarness game={makeGame()} contentClassName="max-h-[600px]" />)

    expect(
      screen.getByRole('region', { name: getString('ui.season.recaps.commentary') })
    ).toHaveClass('max-h-[600px]')
  })
})

describe.each(['regular season', 'playoff series', 'play-in'] as const)(
  '%s game details',
  (surface) => {
    it('preserves panel scroll and box-score state across tabs, and tab choice after reopening', () => {
      const game = makeGame()
      if (surface === 'regular season') {
        render(<GameRecapCard recap={makeRecap(game)} />)
      } else if (surface === 'playoff series') {
        render(
          <SeriesModal
            series={makeSeries(game)}
            seriesTitle="Conference Finals"
            onClose={vi.fn()}
          />
        )
      } else {
        render(<PlayoffBracket playoffs={makePlayoffs(game)} />)
      }

      const openDetails = () => {
        fireEvent.click(screen.getByText(getString('ui.common.expand')))
      }
      openDetails()
      fireEvent.click(screen.getByRole('button', { name: getString('ui.boxScore.title') }))

      const boxScore = screen.getByRole('region', { name: getString('ui.boxScore.title') })
      boxScore.scrollTop = 75
      fireEvent.click(within(boxScore).getByRole('button', { name: game.team2Name }))
      expect(within(boxScore).getByText('Home scorer')).toBeVisible()

      fireEvent.click(
        screen.getByRole('button', { name: getString('ui.season.recaps.commentary') })
      )
      expect(boxScore).not.toBeVisible()
      fireEvent.click(screen.getByRole('button', { name: getString('ui.boxScore.title') }))

      expect(screen.getByRole('region', { name: getString('ui.boxScore.title') })).toBe(boxScore)
      expect(boxScore.scrollTop).toBe(75)
      expect(within(boxScore).getByText('Home scorer')).toBeVisible()

      if (surface === 'playoff series') {
        fireEvent.click(screen.getByRole('button', { name: /^G1/ }))
      } else {
        fireEvent.click(screen.getByRole('button', { name: getString('ui.common.close') }))
      }
      expect(
        screen.queryByRole('region', { name: getString('ui.boxScore.title') })
      ).not.toBeInTheDocument()

      openDetails()
      expect(screen.getByRole('button', { name: getString('ui.boxScore.title') })).toHaveAttribute(
        'aria-pressed',
        'true'
      )
      expect(screen.getByRole('region', { name: getString('ui.boxScore.title') })).toBeVisible()
    })
  }
)
