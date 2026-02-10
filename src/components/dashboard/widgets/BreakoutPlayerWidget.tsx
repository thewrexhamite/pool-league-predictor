'use client';

import { useMemo } from 'react';
import { Rocket } from 'lucide-react';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getMostImprovedPlayers } from '@/lib/stats';

interface BreakoutPlayerWidgetProps {
  selectedDiv: DivisionCode;
  onPlayerClick: (name: string) => void;
}

export default function BreakoutPlayerWidget({ selectedDiv, onPlayerClick }: BreakoutPlayerWidgetProps) {
  const { ds } = useActiveData();

  const breakoutPlayers = useMemo(() => {
    const improved = getMostImprovedPlayers(ds.players2526, ds.players, selectedDiv, 10, 20);
    // Filter to true breakouts: improvement > 10pp and 10+ games
    return improved
      .filter(p => p.improvement > 10 && p.currentPlayed >= 10)
      .slice(0, 4);
  }, [ds.players2526, ds.players, selectedDiv]);

  if (breakoutPlayers.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No breakout players detected</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Rocket size={14} className="text-success" />
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Breakout Alert</span>
      </div>
      <div className="space-y-2">
        {breakoutPlayers.map((p) => (
          <button
            key={p.name}
            onClick={() => onPlayerClick(p.name)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-surface-elevated/50 transition text-left"
          >
            <div className="min-w-0">
              <span className="text-sm font-medium text-white block truncate">{p.name}</span>
              <span className="text-[10px] text-gray-500">{p.team}</span>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <span className="text-sm font-bold text-success">+{p.improvement.toFixed(0)}%</span>
              <span className="text-[10px] text-gray-500 block">{p.priorPct.toFixed(0)}% → {p.currentPct.toFixed(0)}%</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
