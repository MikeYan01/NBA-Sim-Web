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
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
                <p className="text-slate-500">{t('ui.prediction.loadingEngine')}</p>
            </div>
        )
    }

    // Start screen
    if (!result && !loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="mb-6 w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Target className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-3">{t('ui.prediction.title')}</h1>
                <p className="text-slate-500 max-w-md mb-8">
                    {t('ui.prediction.subtitle')}
                </p>

                {/* Simulation count selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                        {t('ui.prediction.simCount')}
                    </label>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                        {[10, 25, 100].map((count) => (
                            <button
                                key={count}
                                onClick={() => setSimulationCount(count)}
                                className={clsx(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                    simulationCount === count
                                        ? "bg-purple-500 text-white shadow-md"
                                        : "bg-white text-slate-600 border border-slate-200 hover:border-purple-300"
                                )}
                            >
                                {count}
                            </button>
                        ))}
                        {/* Custom input */}
                        <div className="flex items-center gap-1">
                            <input
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
                                    "w-20 px-3 py-2 rounded-lg text-sm font-medium transition-all text-center",
                                    ![10, 25, 100].includes(simulationCount)
                                        ? "bg-purple-500 text-white shadow-md border-purple-500"
                                        : "bg-white text-slate-600 border border-slate-200 hover:border-purple-300"
                                )}
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={runPredictionSimulation}
                    className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-200 hover:shadow-xl"
                >
                    <Play className="w-5 h-5" />
                    {t('ui.prediction.startPrediction')}
                </button>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
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
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-purple-200 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h2 className="text-xl font-semibold text-slate-900">{t('ui.prediction.simulating')}</h2>

                {/* Progress percentage */}
                <div className="mt-4 text-4xl font-bold text-purple-600 tabular-nums">
                    {percentage}%
                </div>

                <p className="text-slate-500 mt-2 text-sm">
                    {t('ui.prediction.progress')}: {progress.current} / {progress.total} {t('ui.prediction.seasonsSimulated')}
                </p>

                {/* Progress bar */}
                <div className="w-80 h-3 bg-slate-200 rounded-full mt-4 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-150 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        )
    }

    if (!result) return null

    const medals = ['🥇', '🥈', '🥉']

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{t('ui.prediction.results')}</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {result.totalSimulations} {t('ui.prediction.seasonsSimulated')} • {(result.timeElapsed / 1000).toFixed(1)}s
                    </p>
                </div>
                <button
                    onClick={runPredictionSimulation}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 hover:border-slate-300 transition-all text-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    {t('ui.prediction.runAgain')}
                </button>
            </div>

            {/* Rankings */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <h2 className="font-semibold text-slate-900">{t('ui.prediction.championshipOdds')}</h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {result.rankings.map((ranking, index) => {
                        const isTop3 = index < 3
                        const barWidth = Math.max(ranking.probability, 2)

                        return (
                            <div
                                key={ranking.teamName}
                                className={clsx(
                                    "px-4 py-3 flex items-center gap-4",
                                    isTop3 && "bg-amber-50/30"
                                )}
                            >
                                <div className="w-8 text-center font-medium text-slate-400">
                                    {isTop3 ? medals[index] : `#${ranking.rank}`}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-slate-900">
                                            {getLocalizedTeamName(ranking.teamName, language)}
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            {ranking.championships} {ranking.championships === 1 ? t('ui.prediction.title1') : t('ui.prediction.titles')}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={clsx(
                                                "h-full transition-all",
                                                isTop3 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-slate-300"
                                            )}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="w-16 text-right font-bold text-slate-900">
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
