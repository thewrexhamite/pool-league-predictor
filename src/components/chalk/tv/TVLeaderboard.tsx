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
    <div className="space-y-[2.2vmin] chalk-animate-fade">
      <h2 className="text-[2.8vmin] font-bold">Leaderboard</h2>
      <div className="space-y-[1.1vmin]">
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
                'flex items-center gap-[2.2vmin] rounded-[1.1vmin] px-[2.2vmin] py-[1.5vmin]',
                index === 0 && 'bg-accent/10 border border-accent/20',
                index > 0 && 'bg-surface-card border border-surface-border'
              )}
            >
              <span
                className={clsx(
                  'w-[4.4vmin] h-[4.4vmin] rounded-[0.75vmin] flex items-center justify-center text-[1.9vmin] font-bold',
                  index === 0 && 'bg-accent/20 text-accent',
                  index === 1 && 'bg-gray-500/20 text-gray-300',
                  index === 2 && 'bg-amber-900/20 text-amber-600',
                  index > 2 && 'bg-surface-elevated text-gray-500'
                )}
              >
                {index + 1}
              </span>
              <span className="text-[2.2vmin] font-semibold flex-1 flex items-center gap-[1.1vmin]">
                {entry.name}
                {isKing && <CrownIcon size={24} />}
              </span>
              <div className="flex items-center gap-[2.2vmin] text-[1.9vmin] font-mono">
                <span className="text-baize">{entry.stats.wins}W</span>
                <span className="text-loss">{entry.stats.losses}L</span>
                <span className="text-gray-400">{winRate}%</span>
              </div>
              {entry.stats.currentStreak > 1 && (
                <span className="px-[1.1vmin] py-[0.4vmin] rounded-[0.75vmin] bg-baize/20 text-baize text-[1.5vmin] font-medium">
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
