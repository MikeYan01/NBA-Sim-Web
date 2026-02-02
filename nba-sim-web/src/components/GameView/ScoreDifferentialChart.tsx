import { useMemo } from 'react'
import { useLocalization } from '../../hooks/useLocalization'

interface ScoreDifferentialChartProps {
    scoreSnapshots: [number, number][]
    timeSnapshots: [number, number][]
    visibleCount: number
    team1Name: string
    team2Name: string
    team1Color?: string
    team2Color?: string
}

export const ScoreDifferentialChart = ({
    scoreSnapshots,
    timeSnapshots,
    visibleCount,
    team1Name,
    team2Name,
    team1Color = '#6366f1',
    team2Color = '#ef4444',
}: ScoreDifferentialChartProps) => {
    const { t } = useLocalization()

    const chartData = useMemo(() => {
        if (!scoreSnapshots || scoreSnapshots.length === 0) return []

        // Build differential data from score snapshots
        const data: { differential: number; quarter: number }[] = []
        const count = Math.min(visibleCount, scoreSnapshots.length)

        for (let i = 0; i < count; i++) {
            const [score1, score2] = scoreSnapshots[i]
            const differential = score1 - score2 // Positive = Team 1 leads, Negative = Team 2 leads
            const quarter = timeSnapshots?.[i]?.[0] ?? 1
            data.push({ differential, quarter })
        }

        return data
    }, [scoreSnapshots, timeSnapshots, visibleCount])

    // Calculate chart dimensions and scales
    const chartConfig = useMemo(() => {
        if (chartData.length === 0) {
            return { minDiff: -10, maxDiff: 10, actualMaxDiff: 10, points: '', zeroY: 50, paddedRange: 10, lastDiff: 0, areaPath: '' }
        }

        const differentials = chartData.map(d => d.differential)
        const maxDiff = Math.max(...differentials, 10)
        const minDiff = Math.min(...differentials, -10)

        // Calculate actual max differential for display
        const actualMaxDiff = Math.max(Math.abs(Math.max(...differentials)), Math.abs(Math.min(...differentials)))

        // Add padding to the range only if actual data exceeds default
        const range = Math.max(Math.abs(maxDiff), Math.abs(minDiff))
        const paddedRange = range > 10 ? range + 5 : 10

        // Chart dimensions (viewBox coordinates)
        const width = 100
        const height = 100
        const padding = { top: 10, bottom: 10, left: 0, right: 0 }
        const chartWidth = width - padding.left - padding.right
        const chartHeight = height - padding.top - padding.bottom

        // Calculate zero line position
        const zeroY = padding.top + (paddedRange / (2 * paddedRange)) * chartHeight

        // Generate SVG path points
        const points = chartData.map((d, i) => {
            const x = padding.left + (i / Math.max(chartData.length - 1, 1)) * chartWidth
            const y = padding.top + ((paddedRange - d.differential) / (2 * paddedRange)) * chartHeight
            return `${x},${y}`
        }).join(' ')

        // Generate fill area path
        const areaPath = chartData.length > 0
            ? `M ${padding.left},${zeroY} ` +
            chartData.map((d, i) => {
                const x = padding.left + (i / Math.max(chartData.length - 1, 1)) * chartWidth
                const y = padding.top + ((paddedRange - d.differential) / (2 * paddedRange)) * chartHeight
                return `L ${x},${y}`
            }).join(' ') +
            ` L ${padding.left + ((chartData.length - 1) / Math.max(chartData.length - 1, 1)) * chartWidth},${zeroY} Z`
            : ''

        return {
            minDiff: -paddedRange,
            maxDiff: paddedRange,
            actualMaxDiff,
            points,
            areaPath,
            zeroY,
            paddedRange,
            lastDiff: chartData.length > 0 ? chartData[chartData.length - 1].differential : 0,
        }
    }, [chartData])

    // Quarter markers - find approximate positions
    const quarterMarkers = useMemo(() => {
        if (!timeSnapshots || timeSnapshots.length === 0 || chartData.length === 0) return []

        const markers: { quarter: number; x: number }[] = []
        let lastQuarter = 0
        const count = Math.min(visibleCount, timeSnapshots.length)

        for (let i = 0; i < count; i++) {
            const quarter = timeSnapshots[i][0]
            if (quarter > lastQuarter) {
                const x = (i / Math.max(count - 1, 1)) * 100
                markers.push({ quarter, x })
                lastQuarter = quarter
            }
        }

        return markers
    }, [timeSnapshots, visibleCount, chartData.length])

    if (chartData.length < 2) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-center text-slate-400 text-sm py-8">
                    {t('game.score_differential_waiting')}
                </div>
            </div>
        )
    }

    const lastDiff = chartConfig.lastDiff
    const leadingTeam = lastDiff > 0 ? team1Name : lastDiff < 0 ? team2Name : null
    const leadColor = lastDiff > 0 ? team1Color : team2Color

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-600">{t('game.score_differential_title')}</span>
                {leadingTeam && (
                    <span
                        className="text-sm font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: `${leadColor}15`, color: leadColor }}
                    >
                        {leadingTeam} +{Math.abs(lastDiff)}
                    </span>
                )}
                {!leadingTeam && lastDiff === 0 && (
                    <span className="text-sm font-medium text-slate-500 px-2 py-0.5 rounded bg-slate-100">
                        {t('game.score_differential_tied')}
                    </span>
                )}
            </div>

            {/* Chart */}
            <div className="relative">
                {/* Team labels - show actual max differential */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs py-2 pr-2">
                    <span className="font-medium" style={{ color: team1Color }}>+{Math.round(chartConfig.actualMaxDiff)}</span>
                    <span className="text-slate-400">0</span>
                    <span className="font-medium" style={{ color: team2Color }}>-{Math.round(chartConfig.actualMaxDiff)}</span>
                </div>

                {/* SVG Chart */}
                <div className="ml-8 relative">
                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="w-full h-32"
                    >
                        {/* Gradient definitions */}
                        <defs>
                            <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={team1Color} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={team1Color} stopOpacity="0.05" />
                            </linearGradient>
                            <linearGradient id="negativeGradient" x1="0" y1="1" x2="0" y2="0">
                                <stop offset="0%" stopColor={team2Color} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={team2Color} stopOpacity="0.05" />
                            </linearGradient>
                        </defs>

                        {/* Zero line */}
                        <line
                            x1="0"
                            y1={chartConfig.zeroY}
                            x2="100"
                            y2={chartConfig.zeroY}
                            stroke="#94a3b8"
                            strokeWidth="0.5"
                            strokeDasharray="2,2"
                        />

                        {/* Quarter marker lines only */}
                        {quarterMarkers.slice(1).map((marker) => (
                            <line
                                key={marker.quarter}
                                x1={marker.x}
                                y1="10"
                                x2={marker.x}
                                y2="90"
                                stroke="#e2e8f0"
                                strokeWidth="0.5"
                                strokeDasharray="1,1"
                            />
                        ))}

                        {/* Fill area - split by positive/negative */}
                        {chartData.length > 1 && (
                            <>
                                {/* Clip paths for positive and negative areas */}
                                <clipPath id="positiveClip">
                                    <rect x="0" y="0" width="100" height={chartConfig.zeroY} />
                                </clipPath>
                                <clipPath id="negativeClip">
                                    <rect x="0" y={chartConfig.zeroY} width="100" height={100 - chartConfig.zeroY} />
                                </clipPath>

                                {/* Positive area (Team 1 leading) */}
                                <path
                                    d={chartConfig.areaPath}
                                    fill={`${team1Color}20`}
                                    clipPath="url(#positiveClip)"
                                />

                                {/* Negative area (Team 2 leading) */}
                                <path
                                    d={chartConfig.areaPath}
                                    fill={`${team2Color}20`}
                                    clipPath="url(#negativeClip)"
                                />
                            </>
                        )}

                        {/* Line */}
                        <polyline
                            points={chartConfig.points}
                            fill="none"
                            stroke={lastDiff >= 0 ? team1Color : team2Color}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>

                    {/* Quarter labels as HTML (to avoid SVG text distortion) */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-start pointer-events-none" style={{ transform: 'translateY(100%)' }}>
                        {quarterMarkers.slice(1).map((marker) => (
                            <span
                                key={marker.quarter}
                                className="absolute text-[10px] text-slate-400 -translate-x-1/2"
                                style={{ left: `${marker.x}%` }}
                            >
                                {marker.quarter <= 4 ? `Q${marker.quarter}` : `OT${marker.quarter - 4}`}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Team name labels at bottom */}
                <div className="flex justify-between mt-8 text-xs ml-8">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-1 rounded" style={{ backgroundColor: team1Color }} />
                        <span className="text-slate-500">{team1Name} {t('game.score_differential_leading')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-slate-500">{team2Name} {t('game.score_differential_leading')}</span>
                        <div className="w-3 h-1 rounded" style={{ backgroundColor: team2Color }} />
                    </div>
                </div>
            </div>
        </div>
    )
}
