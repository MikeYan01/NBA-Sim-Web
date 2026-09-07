import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  initGameEngine,
  runPrediction,
  type PredictionOptions,
  type PredictionRanking,
  type PredictionResult,
} from '../../src/services/GameEngine'
import * as Season from '../../src/models/Season'
import { Team } from '../../src/models/Team'
import { Language, POSITIONS } from '../../src/models/types'
import { isInitialized as areCommentsInitialized } from '../../src/services/CommentLoader'
import {
  getString,
  isInitialized as isLocalizationInitialized,
} from '../../src/services/LocalizationService'
import {
  ALL_TEAMS_EN,
  COMMENTS_PATH,
  LOCALIZATION_PATH,
  ROSTER_PATH,
} from '../../src/utils/Constants'
import { setupPredictionFixtures } from '../helpers/predictionFixtures'

setupPredictionFixtures()

describe('GameEngine', () => {
  it('initializes localization, comments, and all team rosters only once', async () => {
    await initGameEngine()

    expect(isLocalizationInitialized()).toBe(true)
    expect(areCommentsInitialized()).toBe(true)
    expect(getString('game.home', Language.ENGLISH)).toBe('Home')
    expect(getString('game.home', Language.CHINESE)).toBe('\u4e3b\u573a')
    expect(Team.areTeamsCached()).toBe(true)
    expect(fetch).toHaveBeenCalledTimes(ALL_TEAMS_EN.length + 4)

    for (const locale of ['en_US', 'zh_CN']) {
      expect(fetch).toHaveBeenCalledWith(`${LOCALIZATION_PATH}strings_${locale}.json`)
      expect(fetch).toHaveBeenCalledWith(`${COMMENTS_PATH}comments_${locale}.json`)
    }

    const playerNames = new Set<string>()
    for (const teamName of ALL_TEAMS_EN) {
      expect(fetch).toHaveBeenCalledWith(`${ROSTER_PATH}${teamName}.csv`)
      const team = await Team.loadFromCSV(teamName)

      expect(team.players).toHaveLength(15)
      expect([...team.starters.keys()]).toEqual(POSITIONS)
      expect([...team.benches.keys()]).toEqual(POSITIONS)
      for (const player of team.players) {
        expect(player.teamName).toBe(teamName)
        expect(playerNames.has(player.englishName)).toBe(false)
        playerNames.add(player.englishName)
      }
    }

    await initGameEngine()

    expect(fetch).toHaveBeenCalledTimes(ALL_TEAMS_EN.length + 4)
  })

  describe('runPrediction', () => {
    beforeEach(() => {
      vi.spyOn(Season, 'runSeasonFast').mockResolvedValue('Lakers')
    })

    afterEach(() => {
      vi.mocked(Season.runSeasonFast).mockRestore()
    })

    it('returns a single championship with a 100 percent probability', async () => {
      const result: PredictionResult = await runPrediction(1, { baseSeed: 12345 })

      expect(result.totalSimulations).toBe(1)
      expect(result.championCounts).toEqual(new Map([['Lakers', 1]]))
      expect(result.rankings).toEqual([
        { rank: 1, teamName: 'Lakers', championships: 1, probability: 100 },
      ])
      expect(Number.isFinite(result.timeElapsed)).toBe(true)
      expect(result.timeElapsed).toBeGreaterThan(0)
    })

    it('aggregates ten seasons into sorted rankings and probability percentages', async () => {
      vi.mocked(Season.runSeasonFast)
        .mockResolvedValueOnce('Celtics')
        .mockResolvedValueOnce('Lakers')
        .mockResolvedValueOnce('Warriors')
        .mockResolvedValueOnce('Lakers')
        .mockResolvedValueOnce('Celtics')
        .mockResolvedValueOnce('Lakers')
        .mockResolvedValueOnce('Warriors')
        .mockResolvedValueOnce('Lakers')
        .mockResolvedValueOnce('Celtics')
        .mockResolvedValueOnce('Lakers')

      const result = await runPrediction(10, { baseSeed: 100 })
      const expectedRankings: PredictionRanking[] = [
        { rank: 1, teamName: 'Lakers', championships: 5, probability: 50 },
        { rank: 2, teamName: 'Celtics', championships: 3, probability: 30 },
        { rank: 3, teamName: 'Warriors', championships: 2, probability: 20 },
      ]

      expect(result.totalSimulations).toBe(10)
      expect(result.championCounts).toEqual(
        new Map([
          ['Celtics', 3],
          ['Lakers', 5],
          ['Warriors', 2],
        ])
      )
      expect(result.rankings).toEqual(expectedRankings)
      expect(Season.runSeasonFast).toHaveBeenCalledTimes(10)
    })

    it('passes sequential seeds to the fast season simulation', async () => {
      const options: PredictionOptions = { baseSeed: 42, language: Language.ENGLISH }

      await runPrediction(3, options)

      expect(vi.mocked(Season.runSeasonFast).mock.calls).toEqual([
        [{ seed: 42 }],
        [{ seed: 43 }],
        [{ seed: 44 }],
      ])
    })

    it('reports progress for every completed simulation', async () => {
      const onProgress = vi.fn<NonNullable<PredictionOptions['onProgress']>>()

      await runPrediction(3, { baseSeed: 12345, onProgress })

      expect(onProgress.mock.calls).toEqual([
        [1, 3],
        [2, 3],
        [3, 3],
      ])
    })

    it('returns empty results without simulating or reporting progress for zero seasons', async () => {
      const onProgress = vi.fn<NonNullable<PredictionOptions['onProgress']>>()

      const result = await runPrediction(0, { baseSeed: 42, onProgress })

      expect(result.totalSimulations).toBe(0)
      expect(result.championCounts).toEqual(new Map())
      expect(result.rankings).toEqual([])
      expect(Number.isFinite(result.timeElapsed)).toBe(true)
      expect(result.timeElapsed).toBeGreaterThanOrEqual(0)
      expect(Season.runSeasonFast).not.toHaveBeenCalled()
      expect(onProgress).not.toHaveBeenCalled()
    })

    it('propagates season failures without reporting an unfinished simulation', async () => {
      const error = new Error('Season simulation failed')
      const onProgress = vi.fn<NonNullable<PredictionOptions['onProgress']>>()
      vi.mocked(Season.runSeasonFast).mockRejectedValueOnce(error)

      await expect(runPrediction(3, { baseSeed: 42, onProgress })).rejects.toBe(error)

      expect(Season.runSeasonFast).toHaveBeenCalledTimes(1)
      expect(onProgress).not.toHaveBeenCalled()
    })
  })
})
