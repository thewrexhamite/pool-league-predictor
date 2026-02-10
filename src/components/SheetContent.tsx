'use client';

import type { DivisionCode, StandingEntry } from '@/lib/types';
import { useDetailSheet } from './ui/DetailSheetProvider';
import TeamDetail from './TeamDetail';
import PlayerDetail from './PlayerDetail';

interface SheetContentProps {
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
}

export default function SheetContent({ selectedDiv, standings }: SheetContentProps) {
  const { current, close, openTeam, openPlayer } = useDetailSheet();

  if (!current) return null;

  if (current.type === 'team') {
    return (
      <TeamDetail
        team={current.name}
        selectedDiv={current.div as DivisionCode || selectedDiv}
        standings={standings}
        onBack={close}
        onTeamClick={(team) => openTeam(team)}
        onPlayerClick={(name) => openPlayer(name)}
      />
    );
  }

  if (current.type === 'player') {
    return (
      <PlayerDetail
        player={current.name}
        selectedTeam={null}
        onBack={close}
        onTeamClick={(team, div) => openTeam(team, div as DivisionCode)}
      />
    );
  }

  return null;
}
