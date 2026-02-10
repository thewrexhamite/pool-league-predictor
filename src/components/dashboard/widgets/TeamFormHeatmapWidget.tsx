'use client';

import { useMemo } from 'react';
import { Grid3x3 } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getTeamResults } from '@/lib/predictions';

interface TeamFormHeatmapWidgetProps {
  team: string;
  div: DivisionCode;
  onTeamClick: (team: string) => void;
}

export default function TeamFormHeatmapWidget({ team, div, onTeamClick }: TeamFormHeatmapWidgetProps) {
  const { ds } = useActiveData();

  const results = useMemo(
    () => getTeamResults(team, ds).reverse(), // chronological order
    [team, ds]
  );

  if (results.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No results yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Grid3x3 size={14} className="text-accent" />
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">{team} Form</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {results.map((r, i) => {
          const diff = r.teamScore - r.oppScore;
          const absDiff = Math.abs(diff);
          // Intensity: 1-2 frame diff = light, 3-4 = medium, 5+ = strong
          const intensity = absDiff <= 2 ? 'light' : absDiff <= 4 ? 'medium' : 'strong';

          return (
            <div
              key={`${r.date}-${r.opponent}-${i}`}
              className={clsx(
                'w-7 h-7 rounded flex items-center justify-center text-[9px] font-bold cursor-default',
                r.result === 'W' && intensity === 'light' && 'bg-win/20 text-win',
                r.result === 'W' && intensity === 'medium' && 'bg-win/40 text-win',
                r.result === 'W' && intensity === 'strong' && 'bg-win/60 text-white',
                r.result === 'L' && intensity === 'light' && 'bg-loss/20 text-loss',
                r.result === 'L' && intensity === 'medium' && 'bg-loss/40 text-loss',
                r.result === 'L' && intensity === 'strong' && 'bg-loss/60 text-white',
                r.result === 'D' && 'bg-gray-600/30 text-gray-400',
              )}
              title={`${r.date}: ${r.result} vs ${r.opponent} (${r.teamScore}-${r.oppScore})`}
            >
              {r.result}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[9px] text-gray-600">
        <span>W = Win</span>
        <span>L = Loss</span>
        <span>D = Draw</span>
        <span>Intensity = margin</span>
      </div>
    </div>
  );
}
