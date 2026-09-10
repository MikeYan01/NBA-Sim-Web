import { useLocalization } from '../../hooks/useLocalization'
import { Language } from '../../models/types'
import { Globe } from 'lucide-react'
import { clsx } from 'clsx'

export const Settings = () => {
    const { language, setLanguage, t } = useLocalization()

    return (
        <div className="ui-page max-w-2xl mx-auto">
            <h1 className="ui-title mb-8">{t('ui.menu.settings')}</h1>

            <div className="space-y-6">
                {/* Language Settings */}
                <div className="ui-panel overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-accent/10 rounded-lg text-accent border border-accent/20">
                                <Globe className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-medium text-ink">Language / 语言</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setLanguage(Language.ENGLISH)}
                                aria-pressed={language === Language.ENGLISH}
                                className={clsx(
                                    "p-5 rounded-xl border text-left transition-colors cursor-pointer",
                                    language === Language.ENGLISH
                                        ? "border-accent/70 bg-accent/10 text-accent"
                                        : "border-line bg-canvas hover:border-line-strong hover:bg-surface-hover text-muted"
                                )}
                            >
                                <div className="font-semibold mb-1">English</div>
                                <div className="text-xs opacity-75">United States</div>
                            </button>

                            <button
                                onClick={() => setLanguage(Language.CHINESE)}
                                aria-pressed={language === Language.CHINESE}
                                className={clsx(
                                    "p-5 rounded-xl border text-left transition-colors cursor-pointer",
                                    language === Language.CHINESE
                                        ? "border-accent/70 bg-accent/10 text-accent"
                                        : "border-line bg-canvas hover:border-line-strong hover:bg-surface-hover text-muted"
                                )}
                            >
                                <div className="font-semibold mb-1">中文</div>
                                <div className="text-xs opacity-75">简体中文</div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
