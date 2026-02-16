'use client';

import type { ChalkTable } from '@/lib/chalk/types';
import { GAME_MODE_LABELS } from '@/lib/chalk/constants';
import { useGameTimer } from '@/hooks/chalk/use-game-timer';
import { CrownIcon } from '../shared/CrownIcon';
import clsx from 'clsx';

interface JoinQueueViewProps {
  table: ChalkTable;
}

export function JoinQueueView({ table }: JoinQueueViewProps) {
  const { display: gameTime } = useGameTimer(table.currentGame?.startedAt ?? null);
  const waitingEntries = table.queue.filter((e) => e.status !== 'on_hold');

  return (
    <div className="p-4 space-y-4">
      {/* Current game */}
      {table.currentGame && (
        <div className="rounded-xl bg-surface-card border border-surface-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              Now playing — {table.currentGame.mode}
            </p>
            <span className="text-sm font-mono text-baize">{gameTime}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold">
              {table.currentGame.players
                .filter((p) => p.side === 'holder')
                .map((p) => p.name)
                .join(' & ')}
            </span>
            <span className="text-gray-500">vs</span>
            <span className="font-semibold">
              {table.currentGame.players
                .filter((p) => p.side === 'challenger')
                .map((p) => p.name)
                .join(' & ')}
            </span>
          </div>
          {table.currentGame.consecutiveWins > 0 && (
            <p className="text-xs text-accent flex items-center gap-1">
              {table.currentGame.consecutiveWins >= 3 && <CrownIcon size={12} />}
              {table.currentGame.consecutiveWins} consecutive win{table.currentGame.consecutiveWins !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Queue */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          Queue ({waitingEntries.length})
        </h2>

        {waitingEntries.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            No one in the queue yet
          </p>
        ) : (
          <div className="space-y-1.5">
            {waitingEntries.map((entry, index) => (
              <div
                key={entry.id}
                className={clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 border',
                  index === 0 && !table.currentGame
                    ? 'bg-baize/10 border-baize/20'
                    : 'bg-surface-card border-surface-border'
                )}
              >
                <span
                  className={clsx(
                    'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                    index === 0 && !table.currentGame
                      ? 'bg-baize text-fixed-black'
                      : 'bg-surface-elevated text-gray-400'
                  )}
                >
                  {index + 1}
                </span>
                <span className="flex-1 font-medium text-sm">
                  {entry.playerNames.join(' & ')}
                </span>
                {entry.gameMode !== 'singles' && (
                  <span className="text-xs text-gray-500">
                    {GAME_MODE_LABELS[entry.gameMode]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session stats summary */}
      {table.sessionStats.gamesPlayed > 0 && (
        <div className="rounded-xl bg-surface-card border border-surface-border p-3">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Session</p>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-300">
              {table.sessionStats.gamesPlayed} game{table.sessionStats.gamesPlayed !== 1 ? 's' : ''}
            </span>
            {table.sessionStats.kingOfTable && (
              <span className="text-accent flex items-center gap-1">
                <CrownIcon size={12} />
                {table.sessionStats.kingOfTable.playerName}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
