'use client';

import { useMemo } from 'react';
import { Crown, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { calcPowerRankings } from '@/lib/stats';

interface PowerRankingsWidgetProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
}

export default function PowerRankingsWidget({ selectedDiv, onTeamClick }: PowerRankingsWidgetProps) {
  const { ds, frames } = useActiveData();

  const rankings = useMemo(
    () => calcPowerRankings(selectedDiv, ds, frames).slice(0, 5),
    [selectedDiv, ds, frames]
  );

  if (rankings.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Crown size={14} className="text-accent" />
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Power Rankings</span>
      </div>
      <div className="space-y-2">
        {rankings.map((r) => {
          const rankChange = r.previousRank !== null ? r.previousRank - r.rank : null;
          return (
            <button
              key={r.team}
              onClick={() => onTeamClick(r.team)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-surface-elevated/50 transition text-left"
            >
              <span className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                r.rank === 1 ? 'bg-accent/20 text-accent' :
                r.rank <= 3 ? 'bg-surface-elevated text-gray-300' :
                'bg-surface text-gray-500'
              )}>
                {r.rank}
              </span>
              <span className="flex-1 text-sm font-medium text-white truncate">{r.team}</span>
              <span className="text-xs text-gray-400">{(r.score * 100).toFixed(1)}</span>
              {rankChange !== null && rankChange !== 0 && (
                <span className={clsx(
                  'flex items-center text-xs',
                  rankChange > 0 ? 'text-win' : 'text-loss'
                )}>
                  {rankChange > 0 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {Math.abs(rankChange)}
                </span>
              )}
              {rankChange === 0 && (
                <Minus size={12} className="text-gray-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
