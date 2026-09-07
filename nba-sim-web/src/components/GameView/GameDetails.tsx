import { BarChart2, MessageSquareText, TrendingUp, type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import type { GameRecapData } from '../../models/Game'
import { useLocalization } from '../../hooks/useLocalization'
import { getLocalizedTeamName } from '../../utils/Constants'
import { getTeamColors } from '../../utils/teamColors'
import { BoxScore } from '../BoxScore/BoxScore'
import { ScoreDifferentialChart } from './ScoreDifferentialChart'

export type GameDetailsTab = 'commentary' | 'boxscore' | 'differential'

interface GameDetailsProps {
  game: Pick<GameRecapData, 'playByPlayLog' | 'boxScore' | 'scoreSnapshots' | 'timeSnapshots'>
  awayTeam: string
  homeTeam: string
  activeTab: GameDetailsTab
  onTabChange: (tab: GameDetailsTab) => void
  contentClassName?: string
}

export const GameDetails = ({
  game,
  awayTeam,
  homeTeam,
  activeTab,
  onTabChange,
  contentClassName,
}: GameDetailsProps) => {
  const { t, language } = useLocalization()
  const snapshots = game.scoreSnapshots
  const tabs: { id: GameDetailsTab; label: string; icon: LucideIcon; visible: boolean }[] = [
    {
      id: 'commentary',
      label: t('ui.season.recaps.commentary'),
      icon: MessageSquareText,
      visible: true,
    },
    {
      id: 'boxscore',
      label: t('ui.boxScore.title'),
      icon: BarChart2,
      visible: Boolean(game.boxScore),
    },
    {
      id: 'differential',
      label: t('game.score_differential_title'),
      icon: TrendingUp,
      visible: Boolean(snapshots?.length),
    },
  ]
  const panelClassName = clsx('flex-1 overflow-y-auto p-4', contentClassName)

  return (
    <>
      <div className="flex border-b border-slate-100 bg-slate-50">
        {tabs
          .filter((tab) => tab.visible)
          .map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              aria-pressed={activeTab === id}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                activeTab === id
                  ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
      </div>

      {/* Keep panels mounted to preserve scroll positions and widget state. */}
      <section
        aria-label={t('ui.season.recaps.commentary')}
        hidden={activeTab !== 'commentary'}
        className={panelClassName}
      >
        {game.playByPlayLog && (
          <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
            {game.playByPlayLog.join('\n')}
          </div>
        )}
      </section>
      <section
        aria-label={t('ui.boxScore.title')}
        hidden={activeTab !== 'boxscore'}
        className={panelClassName}
      >
        {game.boxScore && <BoxScore boxScore={game.boxScore} />}
      </section>
      <section
        aria-label={t('game.score_differential_title')}
        hidden={activeTab !== 'differential'}
        className={panelClassName}
      >
        {snapshots && snapshots.length > 0 && (
          <ScoreDifferentialChart
            scoreSnapshots={snapshots}
            timeSnapshots={game.timeSnapshots ?? []}
            visibleCount={snapshots.length}
            team1Name={getLocalizedTeamName(awayTeam, language)}
            team2Name={getLocalizedTeamName(homeTeam, language)}
            team1Color={getTeamColors(awayTeam).primary}
            team2Color={getTeamColors(homeTeam).primary}
          />
        )}
      </section>
    </>
  )
}
