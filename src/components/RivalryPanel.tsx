'use client';

import { Swords } from 'lucide-react';
import clsx from 'clsx';
import type { RivalryRecord } from '@/lib/types';

interface RivalryPanelProps {
  rivalries: RivalryRecord[];
  focusTeam?: string;
  onTeamClick: (team: string) => void;
}

export default function RivalryPanel({ rivalries, focusTeam, onTeamClick }: RivalryPanelProps) {
  if (rivalries.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No rivalry data available</p>
      </div>
    );
  }

  // If focusTeam is set, filter to rivalries involving that team
  const filtered = focusTeam
    ? rivalries.filter(r => r.teamA === focusTeam || r.teamB === focusTeam)
    : rivalries;

  return (
    <div className="space-y-2">
      {filtered.slice(0, 5).map((r) => {
        const isTeamA = focusTeam === r.teamA;
        const opponent = focusTeam ? (isTeamA ? r.teamB : r.teamA) : null;
        const myWins = focusTeam ? (isTeamA ? r.teamAWins : r.teamBWins) : r.teamAWins;
        const oppWins = focusTeam ? (isTeamA ? r.teamBWins : r.teamAWins) : r.teamBWins;
        const winning = myWins > oppWins;

        return (
          <div
            key={`${r.teamA}-${r.teamB}`}
            className="flex items-center gap-3 p-2 rounded-lg bg-surface-elevated/30"
          >
            <Swords size={14} className="text-accent flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {focusTeam ? (
                <button
                  onClick={() => onTeamClick(opponent!)}
                  className="text-sm font-medium text-info hover:text-info-light transition truncate block"
                >
                  vs {opponent}
                </button>
              ) : (
                <div className="text-sm">
                  <button onClick={() => onTeamClick(r.teamA)} className="font-medium text-info hover:text-info-light transition">{r.teamA}</button>
                  <span className="text-gray-500 mx-1">vs</span>
                  <button onClick={() => onTeamClick(r.teamB)} className="font-medium text-info hover:text-info-light transition">{r.teamB}</button>
                </div>
              )}
              <div className="text-[10px] text-gray-500">
                {r.matchesPlayed} matches | Last: {r.lastMet}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className={clsx(
                'text-sm font-bold',
                focusTeam && winning ? 'text-win' : focusTeam && !winning && myWins !== oppWins ? 'text-loss' : 'text-gray-300'
              )}>
                {myWins}-{oppWins}
              </span>
              {r.draws > 0 && <span className="text-xs text-gray-500 ml-1">({r.draws}D)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
