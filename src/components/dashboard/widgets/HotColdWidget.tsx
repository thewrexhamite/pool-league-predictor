'use client';

import { Flame, Snowflake, TrendingUp, TrendingDown } from 'lucide-react';

interface HotColdWidgetProps {
  bestFormTeam: string | undefined;
  worstFormTeam: string | undefined;
  hotPlayer: { name: string; pct: number } | null;
  coldPlayer: { name: string; pct: number } | null;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function HotColdWidget({
  bestFormTeam,
  worstFormTeam,
  hotPlayer,
  coldPlayer,
  onTeamClick,
  onPlayerClick,
}: HotColdWidgetProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-surface-card rounded-card shadow-card p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Flame size={14} className="text-win" />
          <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Best Form Team</span>
        </div>
        {bestFormTeam ? (
          <button onClick={() => onTeamClick(bestFormTeam)} className="text-sm font-medium text-white hover:text-info transition truncate block w-full text-left">
            {bestFormTeam}
          </button>
        ) : <span className="text-xs text-gray-500">-</span>}
      </div>
      <div className="bg-surface-card rounded-card shadow-card p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Snowflake size={14} className="text-loss" />
          <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Worst Form Team</span>
        </div>
        {worstFormTeam ? (
          <button onClick={() => onTeamClick(worstFormTeam)} className="text-sm font-medium text-white hover:text-info transition truncate block w-full text-left">
            {worstFormTeam}
          </button>
        ) : <span className="text-xs text-gray-500">-</span>}
      </div>
      <div className="bg-surface-card rounded-card shadow-card p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp size={14} className="text-win" />
          <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Hottest Player</span>
        </div>
        {hotPlayer ? (
          <button onClick={() => onPlayerClick(hotPlayer.name)} className="text-sm font-medium text-white hover:text-info transition truncate block w-full text-left">
            {hotPlayer.name} <span className="text-win text-xs">{hotPlayer.pct.toFixed(0)}%</span>
          </button>
        ) : <span className="text-xs text-gray-500">-</span>}
      </div>
      <div className="bg-surface-card rounded-card shadow-card p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingDown size={14} className="text-loss" />
          <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Coldest Player</span>
        </div>
        {coldPlayer ? (
          <button onClick={() => onPlayerClick(coldPlayer.name)} className="text-sm font-medium text-white hover:text-info transition truncate block w-full text-left">
            {coldPlayer.name} <span className="text-loss text-xs">{coldPlayer.pct.toFixed(0)}%</span>
          </button>
        ) : <span className="text-xs text-gray-500">-</span>}
      </div>
    </div>
  );
}
