'use client';

import type { SessionStats } from '@/lib/chalk/types';
import { getLeaderboard } from '@/lib/chalk/stats-engine';
import { CrownIcon } from '../shared/CrownIcon';
import clsx from 'clsx';

interface LeaderboardProps {
  stats: SessionStats;
  compact?: boolean;
  title?: string;
}

export function Leaderboard({ stats, compact = false, title = "Today's Leaderboard" }: LeaderboardProps) {
  const leaderboard = getLeaderboard(stats);

  if (leaderboard.length === 0) return null;

  const maxItems = compact ? 5 : 20;

  return (
    <div className="space-y-[1.1vmin]">
      <h3 className={clsx('font-bold', compact ? 'text-[1.3vmin]' : 'text-[1.7vmin]')}>
        {title}
      </h3>
      <div className="space-y-[0.37vmin]">
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
                'flex items-center gap-[1.1vmin] rounded-[0.7vmin] px-[1.1vmin] py-[0.75vmin]',
                index === 0 && 'bg-accent/10',
                index > 0 && 'hover:bg-surface-elevated/50'
              )}
            >
              <span
                className={clsx(
                  'w-[2.2vmin] text-center font-bold text-[1.3vmin]',
                  index === 0 && 'text-accent',
                  index === 1 && 'text-gray-300',
                  index === 2 && 'text-amber-700',
                  index > 2 && 'text-gray-500'
                )}
              >
                {index + 1}
              </span>
              <span className="flex-1 font-medium truncate flex items-center gap-[0.55vmin] text-[1.5vmin]">
                {entry.name}
                {isKing && <CrownIcon size={14} />}
              </span>
              <span className="text-[1.3vmin] text-baize font-mono">{entry.stats.wins}W</span>
              <span className="text-[1.3vmin] text-loss font-mono">{entry.stats.losses}L</span>
              {!compact && (
                <span className="text-[1.3vmin] text-gray-500 font-mono w-[4.4vmin] text-right">
                  {winRate}%
                </span>
              )}
              {entry.stats.currentStreak > 1 && (
                <span className="text-[1.1vmin] px-[0.55vmin] py-[0.2vmin] rounded bg-baize/20 text-baize font-medium">
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
