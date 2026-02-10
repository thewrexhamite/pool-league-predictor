'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import type { TeamResult } from '@/lib/types';

interface TeamFormHeatmapProps {
  results: TeamResult[];
  showLegend?: boolean;
}

export default function TeamFormHeatmap({ results, showLegend = true }: TeamFormHeatmapProps) {
  // Show results in chronological order
  const chronological = useMemo(
    () => [...results].reverse(),
    [results]
  );

  if (chronological.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No results yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {chronological.map((r, i) => {
          const diff = r.teamScore - r.oppScore;
          const absDiff = Math.abs(diff);
          const intensity = absDiff <= 2 ? 'light' : absDiff <= 4 ? 'medium' : 'strong';

          return (
            <div
              key={`${r.date}-${r.opponent}-${i}`}
              className={clsx(
                'w-8 h-8 rounded flex items-center justify-center text-[9px] font-bold cursor-default',
                'border border-transparent hover:border-gray-500 transition',
                r.result === 'W' && intensity === 'light' && 'bg-win/20 text-win',
                r.result === 'W' && intensity === 'medium' && 'bg-win/40 text-win',
                r.result === 'W' && intensity === 'strong' && 'bg-win/60 text-white',
                r.result === 'L' && intensity === 'light' && 'bg-loss/20 text-loss',
                r.result === 'L' && intensity === 'medium' && 'bg-loss/40 text-loss',
                r.result === 'L' && intensity === 'strong' && 'bg-loss/60 text-white',
                r.result === 'D' && 'bg-gray-600/30 text-gray-400',
              )}
              title={`${r.date}: ${r.result} vs ${r.opponent} (${r.teamScore}-${r.oppScore})${r.isHome ? ' (H)' : ' (A)'}`}
            >
              {r.result}
            </div>
          );
        })}
      </div>
      {showLegend && (
        <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-win/40" />
            <span>Win</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-loss/40" />
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-gray-600/30" />
            <span>Draw</span>
          </div>
          <span className="text-gray-600">Intensity = margin of victory</span>
        </div>
      )}
    </div>
  );
}
