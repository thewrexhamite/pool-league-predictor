'use client';

import { useMemo } from 'react';
import { Zap } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getClutchLeaderboard } from '@/lib/stats';

interface ClutchPerformersWidgetProps {
  selectedDiv: DivisionCode;
  onPlayerClick: (name: string) => void;
}

export default function ClutchPerformersWidget({ selectedDiv, onPlayerClick }: ClutchPerformersWidgetProps) {
  const { ds, frames } = useActiveData();

  const profiles = useMemo(
    () => getClutchLeaderboard(selectedDiv, ds, frames, ds.players2526, 6),
    [selectedDiv, ds, frames]
  );

  if (profiles.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">Not enough data for clutch analysis</p>
      </div>
    );
  }

  const clutchPlayers = profiles.filter(p => p.label === 'clutch').slice(0, 3);
  const chokePlayers = [...profiles].sort((a, b) => a.clutchRating - b.clutchRating).filter(p => p.label === 'choke').slice(0, 3);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Zap size={14} className="text-accent" />
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Clutch Performers</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] uppercase text-win font-semibold">Clutch</span>
          <div className="space-y-1.5 mt-1">
            {clutchPlayers.length === 0 ? (
              <p className="text-xs text-gray-600">No clutch players</p>
            ) : clutchPlayers.map((p) => (
              <button
                key={p.player}
                onClick={() => onPlayerClick(p.player)}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-elevated/50 transition text-left"
              >
                <span className="text-xs text-white truncate">{p.player}</span>
                <span className="text-xs text-win font-medium">+{(p.clutchRating * 100).toFixed(0)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-[10px] uppercase text-loss font-semibold">Under Pressure</span>
          <div className="space-y-1.5 mt-1">
            {chokePlayers.length === 0 ? (
              <p className="text-xs text-gray-600">No struggling players</p>
            ) : chokePlayers.map((p) => (
              <button
                key={p.player}
                onClick={() => onPlayerClick(p.player)}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-elevated/50 transition text-left"
              >
                <span className="text-xs text-white truncate">{p.player}</span>
                <span className="text-xs text-loss font-medium">{(p.clutchRating * 100).toFixed(0)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
