'use client';

import type { DivisionCode } from '@/lib/types';
import type { SubView } from '@/lib/router';
import SegmentedControl from '../ui/SegmentedControl';
import StatsTab from '../StatsTab';
import PlayersTab from '../PlayersTab';
import CompareTab from '../CompareTab';

type StatsSubView = 'leaderboards' | 'players' | 'compare';

const SEGMENTS = [
  { value: 'leaderboards' as const, label: 'Leaderboards' },
  { value: 'players' as const, label: 'Players' },
  { value: 'compare' as const, label: 'Compare' },
];

interface StatsContainerProps {
  subView?: SubView;
  onSubViewChange: (sv: SubView) => void;
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function StatsContainer({
  subView,
  onSubViewChange,
  selectedDiv,
  onTeamClick,
  onPlayerClick,
}: StatsContainerProps) {
  const active = (subView as StatsSubView) || 'leaderboards';

  return (
    <div className="space-y-4">
      <SegmentedControl
        segments={SEGMENTS}
        value={active}
        onChange={(v) => onSubViewChange(v)}
        className="w-full"
      />

      {active === 'leaderboards' && (
        <StatsTab
          selectedDiv={selectedDiv}
          onTeamClick={onTeamClick}
          onPlayerClick={onPlayerClick}
        />
      )}

      {active === 'players' && (
        <PlayersTab
          selectedDiv={selectedDiv}
          onTeamClick={onTeamClick}
          onPlayerClick={onPlayerClick}
        />
      )}

      {active === 'compare' && (
        <CompareTab selectedDiv={selectedDiv} />
      )}
    </div>
  );
}
