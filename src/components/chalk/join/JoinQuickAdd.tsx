'use client';

import { useState, useCallback } from 'react';
import type { ChalkTable, GameMode } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { ChalkButton } from '../shared/ChalkButton';

interface JoinQuickAddProps {
  table: ChalkTable;
  displayName: string;
  userId: string;
  onSwitchToManual: () => void;
}

export function JoinQuickAdd({ table, displayName, userId, onSwitchToManual }: JoinQuickAddProps) {
  const { addToQueue } = useChalkTable();
  const [gameMode, setGameMode] = useState<GameMode>('singles');
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = useCallback(async () => {
    setAdding(true);
    setError(null);
    try {
      await addToQueue({ playerNames: [displayName], gameMode, userId });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join queue');
      setAdding(false);
    }
  }, [displayName, gameMode, userId, addToQueue]);

  if (success) {
    return (
      <div className="text-center space-y-1 py-2">
        <p className="text-baize font-semibold">You&apos;re in the queue!</p>
        <p className="text-xs text-gray-400">Joined as {displayName}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ChalkButton fullWidth size="lg" onClick={handleJoin} disabled={adding}>
        {adding ? 'Joining...' : `Join as ${displayName}`}
      </ChalkButton>

      {/* Game mode */}
      <div className="flex gap-1.5">
        {(['singles', 'challenge'] as GameMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setGameMode(mode)}
            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              gameMode === mode
                ? 'bg-baize/15 border-baize text-baize'
                : 'bg-surface-elevated border-surface-border text-gray-400'
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      <button
        onClick={onSwitchToManual}
        className="w-full text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
      >
        Use a different name
      </button>

      {error && <p className="text-loss text-xs">{error}</p>}
    </div>
  );
}
