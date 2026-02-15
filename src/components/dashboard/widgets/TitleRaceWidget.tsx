'use client';

import clsx from 'clsx';
import { TrendingUp } from 'lucide-react';
import type { DivisionCode, StandingEntry } from '@/lib/types';

interface TitleRaceWidgetProps {
  standings: StandingEntry[];
  leader: StandingEntry | undefined;
  teamForms: Record<string, { results: ('W' | 'L' | 'D')[]; pts: number }>;
  myTeam: { team: string; div: DivisionCode } | null;
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
}

export default function TitleRaceWidget({
  standings,
  leader,
  teamForms,
  myTeam,
  selectedDiv,
  onTeamClick,
}: TitleRaceWidgetProps) {
  return (
    <div className="bg-surface-card rounded-card shadow-card p-4">
      <h3 className="text-sm font-semibold text-win mb-3 flex items-center gap-1.5">
        <TrendingUp size={16} />
        Title Race
      </h3>
      <div className="space-y-2">
        {standings.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">No standings data yet.</p>
        )}
        {standings.slice(0, 4).map((s, i) => {
          const gap = leader ? leader.pts - s.pts : 0;
          const isMyTeam = myTeam?.team === s.team && myTeam?.div === selectedDiv;
          return (
            <button
              key={s.team}
              onClick={() => onTeamClick(s.team)}
              className={clsx(
                'w-full flex items-center gap-2 p-2 rounded-lg text-left transition hover:bg-surface-elevated',
                isMyTeam && 'ring-1 ring-accent/40 bg-accent-muted/10'
              )}
            >
              <span className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                i === 0 ? 'bg-gold text-surface' : 'bg-surface-elevated text-gray-400'
              )}>
                {i + 1}
              </span>
              <span className="flex-1 text-sm text-white font-medium truncate">{s.team}</span>
              <div className="flex items-center gap-1.5">
                {teamForms[s.team]?.results.map((r, j) => (
                  <span
                    key={j}
                    className={clsx(
                      'w-4 h-4 rounded-sm text-[9px] font-bold flex items-center justify-center',
                      r === 'W' ? 'bg-win-muted text-win' : r === 'L' ? 'bg-loss-muted text-loss' : 'bg-surface-elevated text-draw'
                    )}
                  >
                    {r}
                  </span>
                ))}
              </div>
              <span className="text-sm font-bold text-gold w-8 text-right">{s.pts}</span>
              <span className="text-xs text-gray-500 w-8 text-right">{gap > 0 ? `-${gap}` : ''}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
