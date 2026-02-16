'use client';

import { useState, useCallback } from 'react';
import type { ChalkTable, GameMode } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { ChalkButton } from '../shared/ChalkButton';

interface JoinAddSelfProps {
  table: ChalkTable;
  onClose: () => void;
}

export function JoinAddSelf({ table, onClose }: JoinAddSelfProps) {
  const { addToQueue } = useChalkTable();
  const [name, setName] = useState('');
  const [gameMode, setGameMode] = useState<GameMode>('singles');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setAdding(true);
    setError(null);
    try {
      await addToQueue({ playerNames: [trimmed], gameMode });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to queue');
      setAdding(false);
    }
  }, [name, gameMode, addToQueue, onClose]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Your name"
          maxLength={30}
          className="flex-1 rounded-xl bg-surface-elevated px-4 py-3 text-base text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none"
          autoComplete="off"
          autoCapitalize="words"
          autoFocus
        />
        <ChalkButton onClick={handleSubmit} disabled={!name.trim() || adding}>
          {adding ? '…' : 'Join'}
        </ChalkButton>
        <ChalkButton variant="ghost" onClick={onClose}>
          Cancel
        </ChalkButton>
      </div>

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

      {/* Recent names for quick tap */}
      {table.recentNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {table.recentNames.slice(0, 8).map((recentName) => (
            <button
              key={recentName}
              onClick={() => setName(recentName)}
              className="px-2.5 py-1 rounded-lg bg-surface-elevated text-xs text-gray-300 hover:bg-baize/20 hover:text-baize transition-colors"
            >
              {recentName}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-loss text-xs">{error}</p>}
    </div>
  );
}
