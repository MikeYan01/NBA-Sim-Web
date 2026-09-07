import { describe, expect, it, vi } from 'vitest'
import { runPrediction } from '../../src/services/GameEngine'
import { Language } from '../../src/models/types'
import { ALL_TEAMS_EN } from '../../src/utils/Constants'
import { setupPredictionFixtures } from '../helpers/predictionFixtures'

setupPredictionFixtures()

describe('Prediction fast-season integration', () => {
  it('reproduces seeded results even after another prediction uses the cached rosters', async () => {
    const first = await runPrediction(5, { baseSeed: 12345 })
    await runPrediction(3, { baseSeed: 22222 })
    const repeated = await runPrediction(5, { baseSeed: 12345 })

    expect(repeated.championCounts).toEqual(first.championCounts)
    expect(repeated.rankings).toEqual(first.rankings)
  })

  it('matches a batch to consecutive seed ranges run separately', async () => {
    const batch = await runPrediction(5, { baseSeed: 42 })
    const firstPart = await runPrediction(2, { baseSeed: 42 })
    const secondPart = await runPrediction(3, { baseSeed: 44 })

    expect(batch.totalSimulations).toBe(firstPart.totalSimulations + secondPart.totalSimulations)
    for (const teamName of ALL_TEAMS_EN) {
      expect(batch.championCounts.get(teamName) ?? 0).toBe(
        (firstPart.championCounts.get(teamName) ?? 0) +
          (secondPart.championCounts.get(teamName) ?? 0)
      )
    }
  })

  it.each([
    { count: 10, baseSeed: 100000 },
    { count: 25, baseSeed: 999999 },
  ])(
    'accounts for all championships across $count real fast seasons',
    async ({ count, baseSeed }) => {
      const onProgress = vi.fn()

      const result = await runPrediction(count, { baseSeed, onProgress })

      expect(result.totalSimulations).toBe(count)
      expect([...result.championCounts.values()].reduce((sum, wins) => sum + wins, 0)).toBe(count)
      expect(result.championCounts.size).toBeGreaterThanOrEqual(1)
      expect(result.championCounts.size).toBeLessThanOrEqual(Math.min(count, ALL_TEAMS_EN.length))
      expect(result.rankings).toHaveLength(result.championCounts.size)
      expect(result.timeElapsed).toBeGreaterThan(0)
      expect(onProgress.mock.calls).toEqual(
        Array.from({ length: count }, (_, index) => [index + 1, count])
      )

      result.rankings.forEach((ranking, index) => {
        expect(ALL_TEAMS_EN).toContain(ranking.teamName)
        expect(ranking.rank).toBe(index + 1)
        expect(ranking.championships).toBeGreaterThan(0)
        expect(Number.isInteger(ranking.championships)).toBe(true)
        expect(ranking.championships).toBe(result.championCounts.get(ranking.teamName))
        expect(ranking.probability).toBeCloseTo((ranking.championships / count) * 100)
        if (index > 0) {
          expect(result.rankings[index - 1].championships).toBeGreaterThanOrEqual(
            ranking.championships
          )
        }
      })
      expect(result.rankings.reduce((sum, ranking) => sum + ranking.probability, 0)).toBeCloseTo(
        100
      )
    },
    60000
  )

  it('returns a single real champion with a 100 percent probability', async () => {
    const result = await runPrediction(1, { baseSeed: 1 })

    expect(result.totalSimulations).toBe(1)
    expect(result.championCounts.size).toBe(1)
    expect(result.rankings).toHaveLength(1)
    expect(result.rankings[0]).toEqual({
      rank: 1,
      teamName: expect.any(String),
      championships: 1,
      probability: 100,
    })
    expect(ALL_TEAMS_EN).toContain(result.rankings[0].teamName)
  })

  it('keeps seeded championship results independent of the display language', async () => {
    const english = await runPrediction(2, { baseSeed: 88888, language: Language.ENGLISH })
    const chinese = await runPrediction(2, { baseSeed: 88888, language: Language.CHINESE })

    expect(chinese.championCounts).toEqual(english.championCounts)
    expect(chinese.rankings).toEqual(english.rankings)
  })

  it('uses the current time as the seed when options are omitted', async () => {
    const baseSeed = 1700000000000
    const clock = vi.spyOn(Date, 'now').mockReturnValue(baseSeed)

    try {
      const defaultSeed = await runPrediction(1)
      const explicitSeed = await runPrediction(1, { baseSeed })

      expect(defaultSeed.championCounts).toEqual(explicitSeed.championCounts)
      expect(defaultSeed.rankings).toEqual(explicitSeed.rankings)
    } finally {
      clock.mockRestore()
    }
  })
})
