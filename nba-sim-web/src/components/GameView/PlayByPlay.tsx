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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-[500px]">
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <h2 className="font-semibold text-slate-900 text-sm">{t('ui.gameView.playByPlay')}</h2>
            </div>
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 text-xs space-y-0.5"
            >
                {logs.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        {t('ui.gameView.controls.play')}...
                    </div>
                ) : (
                    logs.map((log, index) => (
                        <div
                            key={index}
                            className="py-1.5 px-2 rounded text-slate-600 hover:bg-slate-50 transition-colors leading-relaxed"
                        >
                            {log}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
