'use client';

import type { DivisionCode, StandingEntry, KnockoutCompetition } from '@/lib/types';
import type { SubView } from '@/lib/router';
import SegmentedControl from '../ui/SegmentedControl';
import FadeInOnScroll from '../ui/FadeInOnScroll';
import StandingsTab from '../StandingsTab';
import SimulateTab from '../SimulateTab';
import KnockoutBracket from '../KnockoutBracket';

type StandingsSubView = 'current' | 'projected' | 'power';

const SEGMENTS = [
  { value: 'current' as const, label: 'Current' },
  { value: 'projected' as const, label: 'Projected' },
  { value: 'power' as const, label: 'Power Rankings' },
];

interface StandingsContainerProps {
  subView?: SubView;
  onSubViewChange: (sv: SubView) => void;
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  myTeam: { team: string; div: DivisionCode } | null;
  onTeamClick: (team: string) => void;
  simulation: any;
  squadBuilder: any;
  timeMachineDate: string | null;
  onTimeMachineDateChange: (date: string | null) => void;
  availableDates: string[];
  knockouts: KnockoutCompetition[];
}

export default function StandingsContainer({
  subView,
  onSubViewChange,
  selectedDiv,
  standings,
  myTeam,
  onTeamClick,
  simulation,
  squadBuilder,
  timeMachineDate,
  onTimeMachineDateChange,
  availableDates,
  knockouts,
}: StandingsContainerProps) {
  // Check if selected division is a knockout competition
  const knockout = knockouts.find(k => k.code === selectedDiv);
  if (knockout) {
    return <KnockoutBracket competition={knockout} onTeamClick={onTeamClick} />;
  }

  const active = (subView as StandingsSubView) || 'current';

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

      {active === 'current' && (
        <StandingsTab
          selectedDiv={selectedDiv}
          standings={standings}
          myTeam={myTeam}
          onTeamClick={onTeamClick}
        />
      )}

      {active === 'projected' && (
        <SimulateTab
          selectedDiv={selectedDiv}
          simResults={simulation.simResults}
          isSimulating={simulation.isSimulating}
          whatIfResults={simulation.whatIfResults}
          whatIfSimResults={simulation.whatIfSimResults}
          squadOverrides={squadBuilder.squadOverrides}
          squadTopN={squadBuilder.squadTopN}
          myTeam={myTeam}
          onRunSimulation={simulation.runSimulation}
          onTeamClick={onTeamClick}
          timeMachineDate={timeMachineDate}
          onTimeMachineDateChange={onTimeMachineDateChange}
          availableDates={availableDates}
        />
      )}

      {active === 'power' && (
        <StandingsTab
          selectedDiv={selectedDiv}
          standings={standings}
          myTeam={myTeam}
          onTeamClick={onTeamClick}
        />
      )}
    </div>
  );
}
