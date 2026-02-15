'use client';

import clsx from 'clsx';
import { TrendingDown } from 'lucide-react';
import type { DivisionCode, StandingEntry } from '@/lib/types';

interface RelegationWidgetProps {
  standings: StandingEntry[];
  teamForms: Record<string, { results: ('W' | 'L' | 'D')[]; pts: number }>;
  myTeam: { team: string; div: DivisionCode } | null;
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
}

export default function RelegationWidget({
  standings,
  teamForms,
  myTeam,
  selectedDiv,
  onTeamClick,
}: RelegationWidgetProps) {
  return (
    <div className="bg-surface-card rounded-card shadow-card p-4">
      <h3 className="text-sm font-semibold text-loss mb-3 flex items-center gap-1.5">
        <TrendingDown size={16} />
        Relegation Battle
      </h3>
      <div className="space-y-2">
        {standings.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">No standings data yet.</p>
        )}
        {standings.slice(-4).map((s, i) => {
          const pos = standings.length - 4 + i + 1;
          const safetyLine = standings.length > 2 ? standings[standings.length - 3].pts : 0;
          const gap = safetyLine - s.pts;
          const isMyTeam = myTeam?.team === s.team && myTeam?.div === selectedDiv;
          return (
            <button
              key={s.team}
              onClick={() => onTeamClick(s.team)}
              className={clsx(
                'w-full flex items-center gap-2 p-2 rounded-lg text-left transition hover:bg-surface-elevated',
                pos > standings.length - 2 && 'border-l-2 border-loss',
                isMyTeam && 'ring-1 ring-accent/40 bg-accent-muted/10'
              )}
            >
              <span className="w-6 h-6 rounded-full bg-surface-elevated flex items-center justify-center text-xs font-bold text-gray-400">
                {pos}
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
              <span className="text-xs text-loss w-10 text-right">{gap > 0 ? `-${gap}` : ''}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
