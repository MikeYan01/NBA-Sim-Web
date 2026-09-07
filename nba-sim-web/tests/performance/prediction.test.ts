import { describe, expect, it, vi } from 'vitest'
import { runPrediction } from '../../src/services/GameEngine'
import { setupPredictionFixtures } from '../helpers/predictionFixtures'

setupPredictionFixtures()

const ONE_MINUTE_MS = 60 * 1000
const TWO_AND_HALF_MINUTES_MS = 2.5 * 60 * 1000
const FIVE_MINUTES_MS = 5 * 60 * 1000

describe('Prediction fast-path performance with fixture seasons', () => {
  it.each([
    { count: 10, baseSeed: 12345, budget: ONE_MINUTE_MS },
    { count: 25, baseSeed: 54321, budget: TWO_AND_HALF_MINUTES_MS },
    { count: 50, baseSeed: 99999, budget: FIVE_MINUTES_MS },
  ])(
    'completes $count simulations within $budget ms',
    async ({ count, baseSeed, budget }) => {
      const onProgress = vi.fn()
      const startTime = performance.now()

      const result = await runPrediction(count, { baseSeed, onProgress })

      const elapsed = performance.now() - startTime
      expect(elapsed).toBeLessThan(budget)
      expect(result.totalSimulations).toBe(count)
      expect([...result.championCounts.values()].reduce((sum, wins) => sum + wins, 0)).toBe(count)
      expect(result.timeElapsed).toBeGreaterThan(0)
      expect(result.timeElapsed).toBeLessThanOrEqual(elapsed)
      expect(onProgress).toHaveBeenCalledTimes(count)
      expect(onProgress).toHaveBeenLastCalledWith(count, count)
    },
    FIVE_MINUTES_MS + 30000
  )

  it('keeps average single-season simulation time below 30 seconds', async () => {
    const times: number[] = []

    for (let index = 0; index < 5; index++) {
      const startTime = performance.now()
      const result = await runPrediction(1, { baseSeed: 10000 + index })
      times.push(performance.now() - startTime)

      expect(result.totalSimulations).toBe(1)
      expect(result.championCounts.size).toBe(1)
      expect(result.rankings[0].championships).toBe(1)
    }

    const averageTime = times.reduce((sum, elapsed) => sum + elapsed, 0) / times.length
    expect(averageTime).toBeLessThan(30000)
  }, 180000)
})
