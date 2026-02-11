'use client';

import type { DivisionCode } from '@/lib/types';
import type { SubView } from '@/lib/router';
import SegmentedControl from '../ui/SegmentedControl';
import FadeInOnScroll from '../ui/FadeInOnScroll';
import CaptainDashboard from '../CaptainDashboard';
import LineupOptimizerTab from '../LineupOptimizerTab';

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
    <div className="space-y-4">
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
        <CaptainDashboard
          simResults={simulation.simResults}
          onTeamClick={onTeamClick}
          onPlayerClick={onPlayerClick}
          onSetMyTeam={onSetMyTeam}
        />
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
