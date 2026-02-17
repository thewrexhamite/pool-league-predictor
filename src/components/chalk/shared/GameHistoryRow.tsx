'use client';

import type { GameHistoryRecord } from '@/lib/chalk/types';
import { GAME_MODE_LABELS } from '@/lib/chalk/constants';
import { CrownIcon } from './CrownIcon';
import clsx from 'clsx';

interface GameHistoryRowProps {
  game: GameHistoryRecord;
  highlightUid?: string;
  compact?: boolean;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getPlayerDisplay(game: GameHistoryRecord): string {
  if (game.mode === 'killer') {
    return game.players.map((p) => p.name).join(', ');
  }
  const holders = game.players.filter((p) => p.side === 'holder').map((p) => p.name);
  const challengers = game.players.filter((p) => p.side === 'challenger').map((p) => p.name);
  const holderStr = holders.join(' & ');
  const challengerStr = challengers.join(' & ');
  return `${holderStr} vs ${challengerStr}`;
}

function getWinLossForUid(game: GameHistoryRecord, uid: string): 'win' | 'loss' | null {
  if (!game.playerUids || !game.winner) return null;
  const uidEntries = Object.entries(game.playerUids);
  const userEntry = uidEntries.find(([, u]) => u === uid);
  if (!userEntry) return null;
  const [playerName] = userEntry;

  if (game.mode === 'killer') {
    return playerName === game.winner ? 'win' : 'loss';
  }

  const userPlayer = game.players.find((p) => p.name === playerName);
  if (!userPlayer) return null;
  return userPlayer.side === game.winnerSide ? 'win' : 'loss';
}

export function GameHistoryRow({ game, highlightUid, compact }: GameHistoryRowProps) {
  const result = highlightUid ? getWinLossForUid(game, highlightUid) : null;

  return (
    <div
      className={clsx(
        'bg-surface-card border border-surface-border rounded-lg px-3 py-2.5 border-l-2',
        result === 'win' && 'border-l-win',
        result === 'loss' && 'border-l-loss',
        !result && 'border-l-transparent'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx('text-sm', compact ? 'truncate' : '')}>
              {getPlayerDisplay(game)}
            </span>
            <span className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-surface rounded shrink-0">
              {GAME_MODE_LABELS[game.mode] ?? game.mode}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-500">{timeAgo(game.endedAt)}</span>
            <span className="text-[10px] text-gray-600">{formatDuration(game.duration)}</span>
            {game.consecutiveWins >= 3 && (
              <span className="flex items-center gap-0.5 text-[10px] text-accent">
                <CrownIcon size={10} />
                {game.consecutiveWins}
              </span>
            )}
          </div>
        </div>
        {game.winner && (
          <span className="text-xs text-gray-400 shrink-0">
            {game.winner}
          </span>
        )}
      </div>
    </div>
  );
}
