import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../stores/gameStore'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { useMatchupColors } from '../../hooks/useTeamColors'
import { ArrowLeft, Play, Pause, SkipForward, RefreshCw } from 'lucide-react'
import { BoxScore } from '../BoxScore/BoxScore'
import { PlayByPlay } from './PlayByPlay'
import { ScoreDifferentialChart } from './ScoreDifferentialChart'
import { clsx } from 'clsx'

export const GameView = () => {
  const { currentGame } = useGameStore()
  const { t, language } = useLocalization()
  const navigate = useNavigate()

  // Playback State - start from beginning with autoplay
  const [visibleLogCount, setVisibleLogCount] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(800) // Default to 1x speed
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!currentGame) {
      navigate('/single-game')
    } else if (!initializedRef.current) {
      // Start from beginning with autoplay on first load
      initializedRef.current = true
      setVisibleLogCount(0)
      setIsPlaying(true)
    }
  }, [currentGame, navigate])

  useEffect(() => {
    if (isPlaying && currentGame && visibleLogCount < currentGame.playByPlayLog.length) {
      timerRef.current = setInterval(() => {
        setVisibleLogCount(prev => {
          if (!currentGame || prev >= currentGame.playByPlayLog.length) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, playbackSpeed)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, playbackSpeed, currentGame, visibleLogCount])

  if (!currentGame) return null

  const handleReplay = () => {
    setVisibleLogCount(0)
    setIsPlaying(true)
  }

  const togglePlay = () => {
    if (visibleLogCount >= currentGame.playByPlayLog.length) {
      handleReplay()
    } else {
      setIsPlaying(!isPlaying)
    }
  }

  const setSpeed = (speed: number) => {
    setPlaybackSpeed(speed)
    if (!isPlaying && visibleLogCount < currentGame.playByPlayLog.length) {
      setIsPlaying(true)
    }
  }

  const skipToEnd = () => {
    setVisibleLogCount(currentGame.playByPlayLog.length)
    setIsPlaying(false)
  }

  const visibleLogs = currentGame.playByPlayLog.slice(0, visibleLogCount)
  const isFinished = visibleLogCount === currentGame.playByPlayLog.length

  // Get current scores from score snapshots (pre-calculated during game simulation)
  const getCurrentScores = (): [number, number] => {
    if (isFinished) {
      return [currentGame.team1Score, currentGame.team2Score]
    }
    if (visibleLogCount === 0) {
      return [0, 0]
    }
    // Use pre-calculated score snapshots if available
    if (currentGame.scoreSnapshots && currentGame.scoreSnapshots.length > 0) {
      const snapshotIndex = Math.min(visibleLogCount - 1, currentGame.scoreSnapshots.length - 1)
      return currentGame.scoreSnapshots[snapshotIndex]
    }
    return [0, 0]
  }

  // Get current quarter and time from time snapshots
  const getCurrentTime = (): [number, number] => {
    if (isFinished) {
      return [4, 0] // End of Q4 or later
    }
    if (visibleLogCount === 0) {
      return [1, 720] // Start of Q1, 12:00
    }
    // Use pre-calculated time snapshots if available
    if (currentGame.timeSnapshots && currentGame.timeSnapshots.length > 0) {
      const snapshotIndex = Math.min(visibleLogCount - 1, currentGame.timeSnapshots.length - 1)
      return currentGame.timeSnapshots[snapshotIndex]
    }
    return [1, 720]
  }

  const [displayScore1, displayScore2] = getCurrentScores()
  const [displayQuarter, displayTimeRemaining] = getCurrentTime()

  // Format time display
  const formatTimeDisplay = (quarter: number, timeRemaining: number): string => {
    const minutes = Math.floor(timeRemaining / 60)
    const seconds = timeRemaining % 60
    const quarterLabel = quarter <= 4 ? `Q${quarter}` : `OT${quarter - 4}`
    return `${quarterLabel} ${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const team1LocalName = getLocalizedTeamName(currentGame.team1Name, language)
  const team2LocalName = getLocalizedTeamName(currentGame.team2Name, language)

  // Team color theming
  const matchupColors = useMatchupColors(currentGame.team2Name, currentGame.team1Name) // home, away

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/single-game')}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('ui.gameView.backToSelection')}
      </button>

      {/* Scoreboard with Team Colors */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        {/* Team Color Header Bar */}
        {matchupColors && (
          <div
            className="h-2"
            style={{ background: matchupColors.matchupGradient }}
          />
        )}

        <div className="p-6 sm:p-8">
          <div className="text-center mb-6">
            <span className={clsx(
              "inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
              isFinished
                ? "bg-slate-100 text-slate-600"
                : "bg-green-100 text-green-700"
            )}>
              {isFinished ? t('ui.gameView.finalScore') : t('ui.gameView.liveSimulation')}
            </span>
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-8">
            {/* Team 1 (Away) */}
            <div className="flex-1 text-center">
              <div
                className={clsx(
                  "text-4xl sm:text-5xl lg:text-6xl font-bold mb-2 tabular-nums rounded-xl py-2 px-4 inline-block min-w-[120px]",
                  isFinished && displayScore1 > displayScore2 ? "ring-2 ring-yellow-400" : ""
                )}
                style={matchupColors?.awayScoreStyle}
              >
                {displayScore1}
              </div>
              <div className="text-base sm:text-lg text-slate-600 font-medium">{team1LocalName}</div>
              <div className="text-xs text-slate-400 mt-1">{t('game.away')}</div>
            </div>

            {/* Divider with Time Display */}
            <div className="flex flex-col items-center gap-1 px-4">
              {!isFinished ? (
                <span className="text-slate-500 text-sm font-mono tabular-nums bg-slate-100 px-2 py-1 rounded">
                  {formatTimeDisplay(displayQuarter, displayTimeRemaining)}
                </span>
              ) : (
                <span className="text-slate-300 text-lg font-medium">—</span>
              )}
            </div>

            {/* Team 2 (Home) */}
            <div className="flex-1 text-center">
              <div
                className={clsx(
                  "text-4xl sm:text-5xl lg:text-6xl font-bold mb-2 tabular-nums rounded-xl py-2 px-4 inline-block min-w-[120px]",
                  isFinished && displayScore2 > displayScore1 ? "ring-2 ring-yellow-400" : ""
                )}
                style={matchupColors?.homeScoreStyle}
              >
                {displayScore2}
              </div>
              <div className="text-base sm:text-lg text-slate-600 font-medium">{team2LocalName}</div>
              <div className="text-xs text-slate-400 mt-1">{t('game.home')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Score Differential Chart */}
      {currentGame.scoreSnapshots && currentGame.scoreSnapshots.length > 0 && (
        <div className="mb-6">
          <ScoreDifferentialChart
            scoreSnapshots={currentGame.scoreSnapshots}
            timeSnapshots={currentGame.timeSnapshots || []}
            visibleCount={visibleLogCount}
            team1Name={team1LocalName}
            team2Name={team2LocalName}
            team1Color={matchupColors?.awayColor}
            team2Color={matchupColors?.homeColor}
          />
        </div>
      )}

      {/* Content - Vertical Layout */}
      <div className="flex flex-col gap-6">
        {/* Play-by-Play */}
        <div className="flex flex-col gap-4">
          {/* Playback Controls */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={togglePlay}
                className={clsx(
                  "p-2 rounded-lg transition-colors",
                  isFinished
                    ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                    : "hover:bg-slate-100 text-slate-700"
                )}
                title={isFinished ? t('ui.gameView.controls.restart') : (isPlaying ? t('ui.gameView.controls.pause') : t('ui.gameView.controls.play'))}
              >
                {isFinished ? <RefreshCw className="w-4 h-4" /> : (isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />)}
              </button>
            </div>

            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {[
                { label: '1x', value: 800 },
                { label: '2x', value: 400 },
                { label: '4x', value: 200 },
                { label: '8x', value: 100 },
                { label: '16x', value: 50 },
                { label: '32x', value: 25 }
              ].map((speed) => (
                <button
                  key={speed.label}
                  onClick={() => setSpeed(speed.value)}
                  className={clsx(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-all",
                    playbackSpeed === speed.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {speed.label}
                </button>
              ))}
            </div>

            <button
              onClick={skipToEnd}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
              title={t('ui.gameView.controls.skipToEnd')}
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <PlayByPlay logs={visibleLogs} />
        </div>

        {/* Box Score - only show when game is finished */}
        {isFinished && (
          <div>
            <BoxScore boxScore={currentGame.boxScore} />
          </div>
        )}
      </div>
    </div>
  )
}
