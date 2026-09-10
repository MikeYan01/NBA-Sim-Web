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
    <div className="ui-page mx-auto w-full max-w-[1320px]">
      {/* Back Button */}
      <button
        onClick={() => navigate('/single-game')}
        className="ui-button ui-button-ghost mb-5 -ml-3 px-3 sm:mb-7"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('ui.gameView.backToSelection')}
      </button>

      {/* Scoreboard with Team Colors */}
      <div className="ui-panel mb-6 overflow-hidden sm:mb-7">
        {/* Team Color Header Bar */}
        {matchupColors && (
          <div
            className="h-1"
            style={{ background: matchupColors.matchupGradient }}
          />
        )}

        <div className="p-4 sm:p-8 lg:px-12 lg:py-9">
          <div className="mb-6 text-center sm:mb-8">
            <span className={clsx(
              "inline-block rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em]",
              isFinished
                ? "border-line bg-surface-raised text-muted"
                : "border-success/25 bg-success/10 text-success"
            )}>
              {isFinished ? t('ui.gameView.finalScore') : t('ui.gameView.liveSimulation')}
            </span>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-8">
            {/* Team 1 (Away) */}
            <div className="min-w-0 text-center">
              <div
                className={clsx(
                  "mb-3 inline-block min-w-[72px] max-w-full rounded-xl border border-line bg-surface-raised px-2 py-3 text-4xl font-medium leading-none tracking-[-0.05em] text-ink tabular-nums sm:min-w-[132px] sm:px-5 sm:py-4 sm:text-5xl lg:text-6xl",
                  isFinished && displayScore1 > displayScore2 ? "ring-2 ring-accent/80 ring-offset-4 ring-offset-surface" : ""
                )}
                style={matchupColors ? {
                  backgroundColor: `color-mix(in srgb, ${matchupColors.away.colors.primary} 16%, var(--ui-panel-raised))`,
                  borderColor: `color-mix(in srgb, ${matchupColors.away.colors.primary} 45%, var(--ui-border-strong))`,
                } : undefined}
              >
                {displayScore1}
              </div>
              <div className="break-words text-sm font-medium tracking-tight text-ink sm:text-lg">{team1LocalName}</div>
              <div className="mt-1.5 text-[11px] text-muted">{t('game.away')}</div>
            </div>

            {/* Divider with Time Display */}
            <div className="flex min-w-0 flex-col items-center gap-1 px-0 sm:px-3">
              {!isFinished ? (
                <span className="whitespace-nowrap rounded-lg border border-line bg-canvas px-2 py-2 text-[10px] font-medium text-muted tabular-nums sm:px-3 sm:text-sm">
                  {formatTimeDisplay(displayQuarter, displayTimeRemaining)}
                </span>
              ) : (
                <span className="text-lg font-medium text-faint">—</span>
              )}
            </div>

            {/* Team 2 (Home) */}
            <div className="min-w-0 text-center">
              <div
                className={clsx(
                  "mb-3 inline-block min-w-[72px] max-w-full rounded-xl border border-line bg-surface-raised px-2 py-3 text-4xl font-medium leading-none tracking-[-0.05em] text-ink tabular-nums sm:min-w-[132px] sm:px-5 sm:py-4 sm:text-5xl lg:text-6xl",
                  isFinished && displayScore2 > displayScore1 ? "ring-2 ring-accent/80 ring-offset-4 ring-offset-surface" : ""
                )}
                style={matchupColors ? {
                  backgroundColor: `color-mix(in srgb, ${matchupColors.home.colors.primary} 16%, var(--ui-panel-raised))`,
                  borderColor: `color-mix(in srgb, ${matchupColors.home.colors.primary} 45%, var(--ui-border-strong))`,
                } : undefined}
              >
                {displayScore2}
              </div>
              <div className="break-words text-sm font-medium tracking-tight text-ink sm:text-lg">{team2LocalName}</div>
              <div className="mt-1.5 text-[11px] text-muted">{t('game.home')}</div>
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
            team1Color={matchupColors?.away.colors.primary}
            team2Color={matchupColors?.home.colors.primary}
          />
        </div>
      )}

      {/* Content - Vertical Layout */}
      <div className="flex min-w-0 flex-col gap-6">
        {/* Play-by-Play */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Playback Controls */}
          <div className="ui-panel flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
            <div className="flex gap-1">
              <button
                onClick={togglePlay}
                className={clsx(
                  "ui-button size-11 p-0",
                  isFinished
                    ? "ui-button-primary"
                    : "ui-button-secondary"
                )}
                title={isFinished ? t('ui.gameView.controls.restart') : (isPlaying ? t('ui.gameView.controls.pause') : t('ui.gameView.controls.play'))}
              >
                {isFinished ? <RefreshCw className="w-4 h-4" /> : (isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />)}
              </button>
            </div>

            <div className="order-3 grid w-full min-w-0 grid-cols-4 gap-1 rounded-xl border border-line bg-canvas p-1 sm:order-none sm:flex sm:w-auto">
              {[
                { label: '1x', value: 800 },
                { label: '2x', value: 400 },
                { label: '4x', value: 200 },
                { label: '8x', value: 100 },
                { label: '16x', value: 50 },
                { label: '32x', value: 25 },
                { label: '64x', value: 12 }
              ].map((speed) => (
                <button
                  key={speed.label}
                  onClick={() => setSpeed(speed.value)}
                  className={clsx(
                    "ui-tab min-w-11 px-2 tabular-nums sm:px-2.5",
                    playbackSpeed === speed.value
                      ? "ui-tab-active"
                      : "text-muted"
                  )}
                >
                  {speed.label}
                </button>
              ))}
            </div>

            <button
              onClick={skipToEnd}
              className="ui-icon-button"
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
