import { useLocalization } from '../../hooks/useLocalization'
import { Language } from '../../models/types'
import { Globe } from 'lucide-react'
import { clsx } from 'clsx'

export const Settings = () => {
    const { language, setLanguage, t } = useLocalization()

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-slate-900 mb-8">{t('ui.menu.settings')}</h1>

            <div className="space-y-6">
                {/* Language Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                <Globe className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-900">Language / 语言</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setLanguage(Language.ENGLISH)}
                                className={clsx(
                                    "p-4 rounded-xl border-2 text-left transition-all",
                                    language === Language.ENGLISH
                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                                )}
                            >
                                <div className="font-semibold mb-1">English</div>
                                <div className="text-xs opacity-75">United States</div>
                            </button>

                            <button
                                onClick={() => setLanguage(Language.CHINESE)}
                                className={clsx(
                                    "p-4 rounded-xl border-2 text-left transition-all",
                                    language === Language.CHINESE
                                        ? "border-blue-600 bg-blue-50 text-blue-700"
                                        : "border-slate-200 hover:border-slate-300 text-slate-600"
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
