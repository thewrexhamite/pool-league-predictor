'use client';

import type { SessionStats } from '@/lib/chalk/types';
import { getLeaderboard } from '@/lib/chalk/stats-engine';
import { CrownIcon } from '../shared/CrownIcon';
import clsx from 'clsx';

interface LeaderboardProps {
  stats: SessionStats;
  compact?: boolean;
}

export function Leaderboard({ stats, compact = false }: LeaderboardProps) {
  const leaderboard = getLeaderboard(stats);

  if (leaderboard.length === 0) return null;

  const maxItems = compact ? 5 : 20;

  return (
    <div className="space-y-3">
      <h3 className={clsx('font-bold', compact ? 'text-sm' : 'text-lg')}>
        Session Leaderboard
      </h3>
      <div className="space-y-1">
        {leaderboard.slice(0, maxItems).map((entry, index) => {
          const isKing = stats.kingOfTable?.playerName === entry.name;
          const winRate =
            entry.stats.gamesPlayed > 0
              ? Math.round((entry.stats.wins / entry.stats.gamesPlayed) * 100)
              : 0;

          return (
            <div
              key={entry.name}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2',
                index === 0 && 'bg-accent/10',
                index > 0 && 'hover:bg-surface-elevated/50'
              )}
            >
              <span
                className={clsx(
                  'w-6 text-center font-bold text-sm',
                  index === 0 && 'text-accent',
                  index === 1 && 'text-gray-300',
                  index === 2 && 'text-amber-700',
                  index > 2 && 'text-gray-500'
                )}
              >
                {index + 1}
              </span>
              <span className="flex-1 font-medium truncate flex items-center gap-1.5">
                {entry.name}
                {isKing && <CrownIcon size={14} />}
              </span>
              <span className="text-sm text-baize font-mono">{entry.stats.wins}W</span>
              <span className="text-sm text-loss font-mono">{entry.stats.losses}L</span>
              {!compact && (
                <span className="text-sm text-gray-500 font-mono w-12 text-right">
                  {winRate}%
                </span>
              )}
              {entry.stats.currentStreak > 1 && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-baize/20 text-baize font-medium">
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
