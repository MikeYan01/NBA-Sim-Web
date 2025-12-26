import { Link } from 'react-router-dom'
import { useLocalization } from '../../hooks/useLocalization'
import { Zap, Calendar, Target, ChevronRight } from 'lucide-react'

export const Home = () => {
    const { t } = useLocalization()

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-4">
            {/* Hero */}
            <div className="mb-12">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-4">
                    {t('ui.home.title')}
                </h1>
                <p className="text-lg sm:text-xl text-slate-500 max-w-xl mx-auto leading-relaxed">
                    {t('ui.home.subtitle')}
                </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-4xl">
                {/* Quick Match Card */}
                <Link
                    to="/single-game"
                    className="group relative flex flex-col p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-100/50 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 text-left">
                        {t('ui.home.startSingle')}
                    </h3>
                    <p className="text-sm text-slate-500 text-left">
                        {t('ui.home.singleDesc')}
                    </p>
                </Link>

                {/* Full Season Card */}
                <Link
                    to="/season"
                    className="group relative flex flex-col p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-sm">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 text-left">
                        {t('ui.home.startSeason')}
                    </h3>
                    <p className="text-sm text-slate-500 text-left">
                        {t('ui.home.seasonDesc')}
                    </p>
                </Link>

                {/* Prediction Card */}
                <Link
                    to="/prediction"
                    className="group relative flex flex-col p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-500 rounded-xl flex items-center justify-center shadow-sm">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 text-left">
                        {t('ui.home.startPrediction')}
                    </h3>
                    <p className="text-sm text-slate-500 text-left">
                        {t('ui.home.predictionDesc')}
                    </p>
                </Link>
            </div>
        </div>
    )
}
