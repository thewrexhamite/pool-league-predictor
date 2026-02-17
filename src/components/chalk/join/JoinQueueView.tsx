'use client';

import { useState } from 'react';
import type { ChalkTable, QueueEntry } from '@/lib/chalk/types';
import { GAME_MODE_LABELS } from '@/lib/chalk/constants';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useQueueIdentity } from '@/hooks/chalk/use-queue-identity';
import { useGameTimer } from '@/hooks/chalk/use-game-timer';
import { useTableHistory } from '@/hooks/chalk/use-match-history';
import { CrownIcon } from '../shared/CrownIcon';
import { GameHistoryRow } from '../shared/GameHistoryRow';
import clsx from 'clsx';

interface JoinQueueViewProps {
  table: ChalkTable;
}

function ClaimButton({
  entry,
  playerName,
  userId,
}: {
  entry: QueueEntry;
  playerName: string;
  userId: string;
}) {
  const { claimQueueSpot } = useChalkTable();
  const [claiming, setClaiming] = useState(false);

  const isClaimed = entry.userIds?.[playerName];
  if (isClaimed) return null;

  async function handleClaim() {
    setClaiming(true);
    try {
      await claimQueueSpot(entry.id, playerName, userId);
    } catch {
      setClaiming(false);
    }
  }

  return (
    <button
      onClick={handleClaim}
      disabled={claiming}
      className="text-xs text-baize hover:text-baize-light transition-colors font-medium disabled:opacity-50"
    >
      {claiming ? '…' : "That's me"}
    </button>
  );
}

export function JoinQueueView({ table }: JoinQueueViewProps) {
  const { display: gameTime } = useGameTimer(table.currentGame?.startedAt ?? null);
  const { userId } = useQueueIdentity();
  const { games: recentGames, loading: historyLoading } = useTableHistory(table.id);
  const [showAllGames, setShowAllGames] = useState(false);
  const waitingEntries = table.queue.filter((e) => e.status === 'waiting');

  // Check if this user has already claimed any spot in the queue
  const alreadyClaimed = userId
    ? table.queue.some((e) =>
        e.userIds && Object.values(e.userIds).includes(userId)
      )
    : true;

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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.playerNames.map((name, i) => {
                      const claimed = entry.userIds?.[name];
                      const isMe = claimed === userId;
                      const canClaim = userId && !claimed && !alreadyClaimed;
                      return (
                        <span key={name} className="flex items-center gap-1.5">
                          {i > 0 && <span className="text-gray-500 text-xs">&</span>}
                          <span className="font-medium text-sm">{name}</span>
                          {isMe ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-baize shrink-0" title="You" />
                          ) : claimed ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0" title="Signed in" />
                          ) : canClaim ? (
                            <ClaimButton entry={entry} playerName={name} userId={userId} />
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                </div>
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

      {/* Recent Games */}
      {!historyLoading && recentGames.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
            Recent Games
          </h2>
          <div className="space-y-1.5">
            {(showAllGames ? recentGames : recentGames.slice(0, 3)).map((game) => (
              <GameHistoryRow key={game.id} game={game} compact />
            ))}
          </div>
          {recentGames.length > 3 && (
            <button
              onClick={() => setShowAllGames(!showAllGames)}
              className="text-xs text-baize hover:text-baize-light transition w-full text-center py-1"
            >
              {showAllGames ? 'Show less' : `Show all ${recentGames.length} games`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
