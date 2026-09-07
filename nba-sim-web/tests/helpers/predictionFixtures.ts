import Papa from 'papaparse'
import { beforeAll, vi } from 'vitest'
import type { PlayerCSVRow } from '../../src/models/Player'
import { PlayerType, POSITIONS, RotationType } from '../../src/models/types'
import {
  ALL_TEAMS_EN,
  COMMENTS_PATH,
  LOCALIZATION_PATH,
  ROSTER_PATH,
  SCHEDULE_PATH,
} from '../../src/utils/Constants'

function createRoster(teamName: string): PlayerCSVRow[] {
  const rotations = [
    { type: RotationType.STARTER, label: 'Starter', rating: 85 },
    { type: RotationType.BENCH, label: 'Bench', rating: 75 },
    { type: RotationType.DEEP_BENCH, label: 'Reserve', rating: 65 },
  ]

  return rotations.flatMap(({ type, label, rating }) =>
    POSITIONS.map((position, index) => ({
      name: `${teamName} ${label} ${position}`,
      englishName: `${teamName} ${label} ${position}`,
      position,
      playerType: String(PlayerType.ALL_ROUNDED),
      rotationType: String(type),
      rating: String(rating - index),
      insideRating: '80',
      midRating: '80',
      threeRating: '75',
      freeThrowPercent: '80',
      interiorDefense: '75',
      perimeterDefense: '75',
      orbRating: '50',
      drbRating: '70',
      astRating: '75',
      stlRating: '60',
      blkRating: '50',
      layupRating: '80',
      standDunk: '60',
      drivingDunk: '60',
      athleticism: '75',
      durability: '85',
      offConst: '80',
      defConst: '75',
      drawFoul: '50',
    }))
  )
}

const resources = new Map<string, string>(
  ALL_TEAMS_EN.map((teamName): [string, string] => [
    `${ROSTER_PATH}${teamName}.csv`,
    Papa.unparse(createRoster(teamName)),
  ])
)

// Every team plays home and away in this compact schedule; playoffs remain complete.
resources.set(
  SCHEDULE_PATH,
  [
    '10-21',
    ...ALL_TEAMS_EN.map(
      (teamName, index) => `${teamName} ${ALL_TEAMS_EN[(index + 1) % ALL_TEAMS_EN.length]}`
    ),
    '02-15',
    'ALL-STAR',
  ].join('\n')
)

resources.set(
  `${LOCALIZATION_PATH}strings_en_US.json`,
  JSON.stringify({
    game: { home: 'Home', away: 'Away', overtime: { suffix: 'OT' } },
  })
)
resources.set(
  `${LOCALIZATION_PATH}strings_zh_CN.json`,
  JSON.stringify({
    game: { home: '\u4e3b\u573a', away: '\u5ba2\u573a', overtime: { suffix: '\u52a0\u65f6' } },
  })
)
resources.set(
  `${COMMENTS_PATH}comments_en_US.json`,
  JSON.stringify({
    jumpBall: { win: ['{teamName} wins the jump ball.'] },
  })
)
resources.set(
  `${COMMENTS_PATH}comments_zh_CN.json`,
  JSON.stringify({
    jumpBall: { win: ['{teamName}\u8d62\u5f97\u8df3\u7403\u3002'] },
  })
)

export function setupPredictionFixtures(): void {
  beforeAll(() => {
    const fetchResource = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const resource = typeof input === 'string' ? resources.get(input) : undefined
      if (resource === undefined) {
        throw new Error(`Unexpected prediction resource: ${String(input)}`)
      }

      return new Response(resource)
    })

    return () => fetchResource.mockRestore()
  })
}
