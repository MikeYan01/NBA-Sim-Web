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
    team1Color = 'var(--ui-info)',
    team2Color = 'var(--ui-accent)',
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
            <div className="ui-panel min-w-0 p-4 sm:p-5">
                <div className="py-10 text-center text-sm text-faint">
                    {t('game.score_differential_waiting')}
                </div>
            </div>
        )
    }

    const lastDiff = chartConfig.lastDiff
    const leadingTeam = lastDiff > 0 ? team1Name : lastDiff < 0 ? team2Name : null
    const leadColor = lastDiff > 0 ? team1Color : team2Color

    return (
        <div className="ui-panel min-w-0 p-4 sm:p-5">
            {/* Header */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium tracking-tight text-ink">{t('game.score_differential_title')}</span>
                {leadingTeam && (
                    <span
                        className="max-w-full break-words rounded-lg border border-line px-3 py-1.5 text-xs font-medium tabular-nums"
                        style={{
                            backgroundColor: `color-mix(in srgb, ${leadColor} 16%, var(--ui-panel-raised))`,
                            color: `color-mix(in srgb, ${leadColor} 35%, var(--ui-text))`,
                        }}
                    >
                        {leadingTeam} +{Math.abs(lastDiff)}
                    </span>
                )}
                {!leadingTeam && lastDiff === 0 && (
                    <span className="rounded-lg border border-line bg-surface-raised px-3 py-1.5 text-xs font-medium text-muted">
                        {t('game.score_differential_tied')}
                    </span>
                )}
            </div>

            {/* Chart */}
            <div className="relative min-w-0">
                {/* Team labels - show actual max differential */}
                <div className="absolute left-0 top-0 flex h-36 flex-col justify-between py-2 pr-2 text-xs tabular-nums sm:h-40">
                    <span className="font-medium" style={{ color: `color-mix(in srgb, ${team1Color} 35%, var(--ui-text))` }}>+{Math.round(chartConfig.actualMaxDiff)}</span>
                    <span className="text-faint">0</span>
                    <span className="font-medium" style={{ color: `color-mix(in srgb, ${team2Color} 35%, var(--ui-text))` }}>-{Math.round(chartConfig.actualMaxDiff)}</span>
                </div>

                {/* SVG Chart */}
                <div className="relative ml-8 min-w-0">
                    <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="h-36 w-full rounded-lg border border-line bg-canvas sm:h-40"
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
                            stroke="var(--ui-border-strong)"
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
                                stroke="var(--ui-border)"
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
                                    fill={`color-mix(in srgb, ${team1Color} 60%, var(--ui-text))`}
                                    fillOpacity="0.18"
                                    clipPath="url(#positiveClip)"
                                />

                                {/* Negative area (Team 2 leading) */}
                                <path
                                    d={chartConfig.areaPath}
                                    fill={`color-mix(in srgb, ${team2Color} 60%, var(--ui-text))`}
                                    fillOpacity="0.18"
                                    clipPath="url(#negativeClip)"
                                />
                            </>
                        )}

                        {/* Line */}
                        <polyline
                            points={chartConfig.points}
                            fill="none"
                            stroke={`color-mix(in srgb, ${lastDiff >= 0 ? team1Color : team2Color} 50%, var(--ui-text))`}
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
                                className="absolute -translate-x-1/2 text-[10px] text-faint tabular-nums"
                                style={{ left: `${marker.x}%` }}
                            >
                                {marker.quarter <= 4 ? `Q${marker.quarter}` : `OT${marker.quarter - 4}`}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Team name labels at bottom */}
                <div className="ml-8 mt-8 flex flex-wrap justify-between gap-x-6 gap-y-3 text-xs">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="h-1.5 w-4 shrink-0 rounded-sm ring-1 ring-inset ring-ink/30" style={{ backgroundColor: team1Color }} />
                        <span className="min-w-0 break-words text-muted">{team1Name} {t('game.score_differential_leading')}</span>
                    </div>
                    <div className="ml-auto flex min-w-0 items-center gap-2 text-right">
                        <span className="min-w-0 break-words text-muted">{team2Name} {t('game.score_differential_leading')}</span>
                        <div className="h-1.5 w-4 shrink-0 rounded-sm ring-1 ring-inset ring-ink/30" style={{ backgroundColor: team2Color }} />
                    </div>
                </div>
            </div>
        </div>
    )
}
