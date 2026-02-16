'use client';

import type { ChalkTable } from '@/lib/chalk/types';
import { getLeaderboard } from '@/lib/chalk/stats-engine';
import { CrownIcon } from '../shared/CrownIcon';
import clsx from 'clsx';

interface TVLeaderboardProps {
  table: ChalkTable;
}

export function TVLeaderboard({ table }: TVLeaderboardProps) {
  const leaderboard = getLeaderboard(table.sessionStats);

  if (leaderboard.length === 0) return null;

  return (
    <div className="space-y-6 chalk-animate-fade">
      <h2 className="text-3xl font-bold">Leaderboard</h2>
      <div className="space-y-3">
        {leaderboard.slice(0, 10).map((entry, index) => {
          const isKing = table.sessionStats.kingOfTable?.playerName === entry.name;
          const winRate =
            entry.stats.gamesPlayed > 0
              ? Math.round((entry.stats.wins / entry.stats.gamesPlayed) * 100)
              : 0;

          return (
            <div
              key={entry.name}
              className={clsx(
                'flex items-center gap-6 rounded-xl px-6 py-4',
                index === 0 && 'bg-accent/10 border border-accent/20',
                index > 0 && 'bg-surface-card border border-surface-border'
              )}
            >
              <span
                className={clsx(
                  'w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold',
                  index === 0 && 'bg-accent/20 text-accent',
                  index === 1 && 'bg-gray-500/20 text-gray-300',
                  index === 2 && 'bg-amber-900/20 text-amber-600',
                  index > 2 && 'bg-surface-elevated text-gray-500'
                )}
              >
                {index + 1}
              </span>
              <span className="text-2xl font-semibold flex-1 flex items-center gap-3">
                {entry.name}
                {isKing && <CrownIcon size={24} />}
              </span>
              <div className="flex items-center gap-6 text-xl font-mono">
                <span className="text-baize">{entry.stats.wins}W</span>
                <span className="text-loss">{entry.stats.losses}L</span>
                <span className="text-gray-400">{winRate}%</span>
              </div>
              {entry.stats.currentStreak > 1 && (
                <span className="px-3 py-1 rounded-lg bg-baize/20 text-baize text-base font-medium">
                  {entry.stats.currentStreak} streak
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
