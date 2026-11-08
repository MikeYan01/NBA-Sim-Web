import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { Standings } from '../../src/components/Standings/Standings'
import { Conference, Language, type StandingEntry } from '../../src/models/types'
import { EAST_TEAMS_EN, WEST_TEAMS_EN } from '../../src/utils/Constants'

vi.mock('../../src/hooks/useLocalization', () => ({
  useLocalization: () => ({ t: (key: string) => key, language: Language.ENGLISH }),
}))

const makeStandings = (names: string[], conference: Conference): StandingEntry[] =>
  names.map((teamName, index) => ({
    teamName,
    conference,
    rank: index + 1,
    wins: 60 - index,
    losses: 22 + index,
    winPercentage: (60 - index) / 82,
    gamesBack: index,
  }))

afterEach(cleanup)

describe('Standings', () => {
  it.each([Conference.WEST, Conference.EAST])(
    'distinguishes qualification groups and legends in the %s conference',
    (conference) => {
      render(
        <Standings
          east={makeStandings(EAST_TEAMS_EN, Conference.EAST)}
          west={makeStandings(WEST_TEAMS_EN, Conference.WEST)}
        />
      )
      if (conference === Conference.EAST) {
        fireEvent.click(screen.getByRole('button', { name: 'conference.east' }))
      }
      const rows = within(screen.getByRole('table')).getAllByRole('row')
      const teamNames = conference === Conference.EAST ? EAST_TEAMS_EN : WEST_TEAMS_EN
      expect(within(rows[1]).getByText(teamNames[0])).toBeInTheDocument()
      expect(rows[6]).toHaveClass('bg-success/10', 'hover:bg-success/15')
      expect(rows[7]).toHaveClass('bg-warning/20', 'hover:bg-warning/25', '[&>td]:border-t-2')
      expect(rows[10]).toHaveClass('bg-warning/20')
      expect(rows[11]).toHaveClass('[&>td]:border-t-2')
      expect(rows[11].className).not.toMatch(/bg-(success|warning)\//)
      expect(screen.getByText('ui.standings.legend.playoffs').previousElementSibling).toHaveClass(
        'bg-success/10'
      )
      expect(screen.getByText('ui.standings.legend.playIn').previousElementSibling).toHaveClass(
        'bg-warning/20'
      )
    }
  )
})
