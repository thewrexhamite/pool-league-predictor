'use client';

import MyTeamDashboard from '@/components/MyTeamDashboard';
import type { DivisionCode, StandingEntry } from '@/lib/types';

interface MyTeamWidgetProps {
  team: string;
  div: DivisionCode;
  standings: StandingEntry[];
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
  onPredict: (home: string, away: string) => void;
}

export default function MyTeamWidget({
  team,
  div,
  standings,
  onTeamClick,
  onPlayerClick,
  onPredict,
}: MyTeamWidgetProps) {
  return (
    <MyTeamDashboard
      team={team}
      div={div}
      standings={standings}
      onTeamClick={onTeamClick}
      onPlayerClick={onPlayerClick}
      onPredict={onPredict}
    />
  );
}
