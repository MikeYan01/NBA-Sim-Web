import { useEffect, useRef } from 'react'
import { useLocalization } from '../../hooks/useLocalization'

interface PlayByPlayProps {
    logs: string[]
}

export const PlayByPlay = ({ logs }: PlayByPlayProps) => {
    const { t } = useLocalization()
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [logs])

    return (
        <div className="ui-panel flex h-[500px] min-w-0 flex-col overflow-hidden">
            <div className="border-b border-line bg-surface-raised px-5 py-4">
                <h2 className="text-sm font-medium tracking-tight text-ink">{t('ui.gameView.playByPlay')}</h2>
            </div>
            <div
                ref={scrollRef}
                className="min-h-0 min-w-0 flex-1 space-y-1 overflow-y-auto p-3 text-xs sm:p-4 sm:text-[13px]"
            >
                {logs.length === 0 ? (
                    <div className="py-10 text-center text-faint">
                        {t('ui.gameView.controls.play')}...
                    </div>
                ) : (
                    logs.map((log, index) => (
                        <div
                            key={index}
                            className="break-words rounded-lg px-3 py-2 leading-relaxed text-muted transition-colors duration-200 ease-[var(--ui-ease)] hover:bg-surface-hover hover:text-ink"
                        >
                            {log}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
