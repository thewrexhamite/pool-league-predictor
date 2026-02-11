'use client';

import type { DivisionCode } from '@/lib/types';
import type { SubView } from '@/lib/router';
import SegmentedControl from '../ui/SegmentedControl';
import FadeInOnScroll from '../ui/FadeInOnScroll';
import StatsTab from '../StatsTab';
import PlayersTab from '../PlayersTab';
import CompareTab from '../CompareTab';
import GamificationHub from '../gamification/GamificationHub';
import { useIsAuthenticated } from '@/lib/auth';

type StatsSubView = 'leaderboards' | 'players' | 'compare' | 'gamification';

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
  const isAuthenticated = useIsAuthenticated();
  const active = (subView as StatsSubView) || 'leaderboards';

  const segments = isAuthenticated
    ? [...SEGMENTS, { value: 'gamification' as const, label: 'My Progress' }]
    : SEGMENTS;

  return (
    <div className="space-y-4">
      <FadeInOnScroll>
        <SegmentedControl
          segments={segments}
          value={active}
          onChange={(v) => onSubViewChange(v)}
          className="w-full"
        />
      </FadeInOnScroll>

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

      {active === 'gamification' && (
        <GamificationHub />
      )}
    </div>
  );
}
