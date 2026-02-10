'use client';

import { Home, Plane } from 'lucide-react';
import clsx from 'clsx';

interface HomeAwayRecord {
  p: number;
  w: number;
  pct: number;
}

interface HomeAwayPanelProps {
  title?: string;
  home: HomeAwayRecord;
  away: HomeAwayRecord;
  showBar?: boolean;
}

export default function HomeAwayPanel({ title, home, away, showBar = true }: HomeAwayPanelProps) {
  const maxPct = Math.max(home.pct, away.pct, 1);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4">
      {title && (
        <h3 className="text-sm font-semibold text-gray-300 mb-3">{title}</h3>
      )}
      <div className="space-y-3">
        {/* Home */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Home size={14} className="text-info" />
              <span className="text-xs text-gray-400">Home</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{home.w}/{home.p} games</span>
              <span className="text-sm font-bold text-white">{home.pct.toFixed(1)}%</span>
            </div>
          </div>
          {showBar && (
            <div className="w-full bg-surface rounded-full h-2">
              <div
                className="bg-info h-2 rounded-full transition-all"
                style={{ width: `${(home.pct / maxPct) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Away */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Plane size={14} className="text-warning" />
              <span className="text-xs text-gray-400">Away</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">{away.w}/{away.p} games</span>
              <span className="text-sm font-bold text-white">{away.pct.toFixed(1)}%</span>
            </div>
          </div>
          {showBar && (
            <div className="w-full bg-surface rounded-full h-2">
              <div
                className="bg-warning h-2 rounded-full transition-all"
                style={{ width: `${(away.pct / maxPct) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Advantage indicator */}
        {home.p >= 2 && away.p >= 2 && (
          <div className="text-xs text-gray-500 text-center pt-1">
            {Math.abs(home.pct - away.pct) < 5 ? (
              <span>No significant home/away bias</span>
            ) : home.pct > away.pct ? (
              <span className="text-info">+{(home.pct - away.pct).toFixed(1)}% home advantage</span>
            ) : (
              <span className="text-warning">+{(away.pct - home.pct).toFixed(1)}% better away</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
