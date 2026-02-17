'use client';

import type { DivisionCode } from '@/lib/types';
import type { SubView } from '@/lib/router';
import SegmentedControl from '../ui/SegmentedControl';
import FadeInOnScroll from '../ui/FadeInOnScroll';
import CaptainDashboard from '../CaptainDashboard';
import LineupOptimizerTab from '../LineupOptimizerTab';
import SquadBuilderPanel from '../SquadBuilderPanel';

type MyTeamSubView = 'overview' | 'squad' | 'optimizer';

const SEGMENTS = [
  { value: 'overview' as const, label: 'Overview' },
  { value: 'squad' as const, label: 'Squad Builder' },
  { value: 'optimizer' as const, label: 'Optimizer' },
];

interface MyTeamContainerProps {
  subView?: SubView;
  onSubViewChange: (sv: SubView) => void;
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
  onSetMyTeam?: () => void;
  prediction: any;
  simulation: any;
  squadBuilder: any;
}

export default function MyTeamContainer({
  subView,
  onSubViewChange,
  selectedDiv,
  onTeamClick,
  onPlayerClick,
  onSetMyTeam,
  prediction,
  simulation,
  squadBuilder,
}: MyTeamContainerProps) {
  const active = (subView as MyTeamSubView) || 'overview';

  return (
    <div className="space-y-3 md:space-y-4">
      <FadeInOnScroll>
        <SegmentedControl
          segments={SEGMENTS}
          value={active}
          onChange={(v) => onSubViewChange(v)}
          className="w-full"
        />
      </FadeInOnScroll>

      {active === 'overview' && (
        <CaptainDashboard
          simResults={simulation.simResults}
          onTeamClick={onTeamClick}
          onPlayerClick={onPlayerClick}
          onSetMyTeam={onSetMyTeam}
        />
      )}

      {active === 'squad' && (
        <div className="card-interactive bg-surface-card rounded-card shadow-card p-3 md:p-6">
          <h2 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
            Squad Builder
          </h2>
          <SquadBuilderPanel
            selectedDiv={selectedDiv}
            squadOverrides={squadBuilder.squadOverrides}
            squadBuilderTeam={squadBuilder.squadBuilderTeam}
            squadPlayerSearch={squadBuilder.squadPlayerSearch}
            squadTopN={squadBuilder.squadTopN}
            onSquadBuilderTeamChange={squadBuilder.onSquadBuilderTeamChange}
            onSquadPlayerSearchChange={squadBuilder.onSquadPlayerSearchChange}
            onSquadTopNChange={squadBuilder.onSquadTopNChange}
            onAddSquadPlayer={squadBuilder.onAddSquadPlayer}
            onRemoveSquadPlayer={squadBuilder.onRemoveSquadPlayer}
            onRestoreSquadPlayer={squadBuilder.onRestoreSquadPlayer}
            onUnaddSquadPlayer={squadBuilder.onUnaddSquadPlayer}
            onClearAll={squadBuilder.onClearAll}
            onTeamClick={onTeamClick}
          />
        </div>
      )}

      {active === 'optimizer' && (
        <LineupOptimizerTab
          selectedDiv={selectedDiv}
          homeTeam={prediction.homeTeam}
          awayTeam={prediction.awayTeam}
          onHomeTeamChange={prediction.setHomeTeam}
          onAwayTeamChange={prediction.setAwayTeam}
          onTeamClick={onTeamClick}
          onPlayerClick={onPlayerClick}
        />
      )}
    </div>
  );
}
