import { useState, useEffect } from 'react'
import { initGameEngine, runPrediction, PredictionResult } from '../../services/GameEngine'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { Target, Play, Loader2, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

export const PredictionView = () => {
    const { t, language } = useLocalization()
    const [initialized, setInitialized] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [simulationCount, setSimulationCount] = useState(10)
    const [result, setResult] = useState<PredictionResult | null>(null)

    useEffect(() => {
        initGameEngine()
            .then(() => setInitialized(true))
            .catch((err) => setError(`Failed to initialize: ${err.message}`))
    }, [])

    const runPredictionSimulation = async () => {
        setLoading(true)
        setError(null)
        setResult(null)
        setProgress({ current: 0, total: simulationCount })

        try {
            const baseSeed = Math.floor(Math.random() * 1000000)
            const predictionResult = await runPrediction(simulationCount, {
                baseSeed,
                language,
                onProgress: (completed, total) => {
                    setProgress({ current: completed, total })
                },
            })
            setResult(predictionResult)
        } catch (err) {
            setError(`Prediction failed: ${err instanceof Error ? err.message : String(err)}`)
        } finally {
            setLoading(false)
        }
    }

    // Loading engine
    if (!initialized) {
        return (
            <div className="ui-page flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
                <p className="text-muted text-sm">{t('ui.prediction.loadingEngine')}</p>
            </div>
        )
    }

    // Start screen
    if (!result && !loading) {
        return (
            <div className="ui-page flex flex-col items-center justify-center min-h-[65vh] text-center px-2 sm:px-4">
                <div className="mb-7 w-16 h-16 bg-surface border border-line-strong rounded-full flex items-center justify-center">
                    <Target className="w-7 h-7 text-accent" />
                </div>
                <h1 className="ui-title sm:text-4xl mb-4">{t('ui.prediction.title')}</h1>
                <p className="text-muted text-sm leading-7 max-w-md mb-9">
                    {t('ui.prediction.subtitle')}
                </p>

                {/* Simulation count selector */}
                <div className="mb-6">
                    <label htmlFor="prediction-count" className="ui-section-label block mb-3">
                        {t('ui.prediction.simCount')}
                    </label>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {[10, 25, 100].map((count) => (
                            <button
                                key={count}
                                onClick={() => setSimulationCount(count)}
                                aria-pressed={simulationCount === count}
                                className={clsx(
                                    "ui-button min-w-14",
                                    simulationCount === count
                                        ? "ui-button-primary"
                                        : "ui-button-secondary"
                                )}
                            >
                                {count}
                            </button>
                        ))}
                        {/* Custom input */}
                        <div className="flex items-center gap-1">
                            <input
                                id="prediction-count"
                                type="number"
                                min="1"
                                max="1000"
                                value={![10, 25, 100].includes(simulationCount) ? simulationCount : ''}
                                placeholder={t('ui.prediction.custom')}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value, 10)
                                    if (!isNaN(value) && value >= 1 && value <= 1000) {
                                        setSimulationCount(value)
                                    }
                                }}
                                onFocus={() => {
                                    // When focusing custom input, keep current value if already custom
                                    if ([10, 25, 100].includes(simulationCount)) {
                                        // Will show placeholder, no change needed
                                    }
                                }}
                                className={clsx(
                                    "ui-input w-24 text-center",
                                    ![10, 25, 100].includes(simulationCount)
                                        ? "border-accent text-accent"
                                        : "hover:border-line-strong"
                                )}
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={runPredictionSimulation}
                    className="ui-button ui-button-primary px-7 mt-2"
                >
                    <Play className="w-5 h-5" />
                    {t('ui.prediction.startPrediction')}
                </button>

                {error && (
                    <div className="mt-4 p-3 bg-danger/10 border border-danger/25 text-danger rounded-lg text-sm">
                        {error}
                    </div>
                )}
            </div>
        )
    }

    // Loading screen
    if (loading) {
        const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
        return (
            <div className="ui-page flex flex-col items-center justify-center min-h-[65vh]">
                <div className="relative mb-6">
                    <div className="w-16 h-16 border-2 border-line rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-2 border-accent rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h2 className="text-xl font-medium text-ink">{t('ui.prediction.simulating')}</h2>

                {/* Progress percentage */}
                <div className="mt-5 text-5xl font-light tracking-tight text-accent tabular-nums">
                    {percentage}%
                </div>

                <p className="text-muted mt-3 text-sm text-center">
                    {t('ui.prediction.progress')}: {progress.current} / {progress.total} {t('ui.prediction.seasonsSimulated')}
                </p>

                {/* Progress bar */}
                <div className="w-80 max-w-full h-1.5 bg-line rounded-full mt-6 overflow-hidden">
                    <div
                        className="h-full bg-accent transition-[width] duration-300 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        )
    }

    if (!result) return null

    const medals = ['🥇', '🥈', '🥉']

    return (
        <div className="ui-page max-w-4xl mx-auto">
            {/* Header */}
            <div className="ui-page-header">
                <div>
                    <h1 className="ui-title">{t('ui.prediction.results')}</h1>
                    <p className="text-muted text-sm mt-2">
                        {result.totalSimulations} {t('ui.prediction.seasonsSimulated')} • {(result.timeElapsed / 1000).toFixed(1)}s
                    </p>
                </div>
                <button
                    onClick={runPredictionSimulation}
                    className="ui-button ui-button-secondary"
                >
                    <RefreshCw className="w-4 h-4" />
                    {t('ui.prediction.runAgain')}
                </button>
            </div>

            {/* Rankings */}
            <div className="ui-panel overflow-hidden">
                <div className="px-5 py-4 border-b border-line bg-surface-raised/50">
                    <h2 className="font-medium text-ink">{t('ui.prediction.championshipOdds')}</h2>
                </div>
                <div className="divide-y divide-line">
                    {result.rankings.map((ranking, index) => {
                        const isTop3 = index < 3
                        const barWidth = Math.max(ranking.probability, 2)

                        return (
                            <div
                                key={ranking.teamName}
                                className={clsx(
                                    "px-4 sm:px-5 py-4 flex items-center gap-3 sm:gap-4 transition-colors hover:bg-surface-hover",
                                    isTop3 && "bg-accent/5"
                                )}
                            >
                                <div className="w-8 shrink-0 text-center font-medium text-faint">
                                    {isTop3 ? medals[index] : `#${ranking.rank}`}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                                        <span className="font-medium text-sm text-ink">
                                            {getLocalizedTeamName(ranking.teamName, language)}
                                        </span>
                                        <span className="text-xs text-muted">
                                            {ranking.championships} {ranking.championships === 1 ? t('ui.prediction.title1') : t('ui.prediction.titles')}
                                        </span>
                                    </div>
                                    <div className="h-1.5 bg-line rounded-full overflow-hidden">
                                        <div
                                            className={clsx(
                                                "h-full transition-[width] duration-300 ease-out",
                                                isTop3 ? "bg-accent" : "bg-accent/40"
                                            )}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="w-14 sm:w-16 shrink-0 text-right font-medium text-ink tabular-nums">
                                    {ranking.probability.toFixed(1)}%
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
