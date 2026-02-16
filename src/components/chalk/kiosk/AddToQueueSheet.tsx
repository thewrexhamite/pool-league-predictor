'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ChalkTable, GameMode } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import { CHALK_DEFAULTS } from '@/lib/chalk/constants';
import { ChalkButton } from '../shared/ChalkButton';
import { PlayerNameInput } from '../shared/PlayerNameInput';
import { GameModeSelector } from './GameModeSelector';

interface AddToQueueSheetProps {
  table: ChalkTable;
  onClose: () => void;
}

export function AddToQueueSheet({ table, onClose }: AddToQueueSheetProps) {
  const { addToQueue } = useChalkTable();
  const { play } = useChalkSound(table.settings.soundEnabled, table.settings.soundVolume);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('singles');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredPlayers = gameMode === 'doubles' ? 2 : 1;
  const canAdd = playerNames.length >= requiredPlayers;

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAddName = useCallback((name: string) => {
    if (playerNames.includes(name)) return;
    setPlayerNames((prev) => [...prev, name]);
    setError(null);
  }, [playerNames]);

  const handleRemoveName = useCallback((name: string) => {
    setPlayerNames((prev) => prev.filter((n) => n !== name));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canAdd) return;
    setAdding(true);
    setError(null);
    try {
      await addToQueue({ playerNames, gameMode });
      play('queue_add');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add to queue';
      setError(message);
      play('error');
      setAdding(false);
    }
  }, [canAdd, playerNames, gameMode, addToQueue, onClose, play]);

  const isFull = table.queue.length >= CHALK_DEFAULTS.MAX_QUEUE_SIZE;

  return (
    <>
      <div
        className="chalk-bottom-sheet-backdrop"
        onClick={onClose}
        role="presentation"
      />
      <div
        className="chalk-bottom-sheet chalk-animate-in"
        role="dialog"
        aria-label="Add to queue"
      >
        <div className="p-6 space-y-5">
          {/* Handle bar */}
          <div className="flex justify-center">
            <div className="w-12 h-1 rounded-full bg-surface-border" />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Add to Queue</h2>
            <button
              onClick={onClose}
              className="chalk-touch p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {isFull ? (
            <div className="text-center py-8">
              <p className="text-loss text-lg">Queue is full ({CHALK_DEFAULTS.MAX_QUEUE_SIZE} max)</p>
            </div>
          ) : (
            <>
              {/* Game mode */}
              <GameModeSelector value={gameMode} onChange={setGameMode} />

              {/* Player names */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  {gameMode === 'doubles' ? 'Team members (2 players)' : 'Player name'}
                </label>
                <PlayerNameInput
                  onAdd={handleAddName}
                  recentNames={table.recentNames}
                  excludeNames={playerNames}
                  placeholder={
                    gameMode === 'doubles' && playerNames.length === 0
                      ? 'First player'
                      : gameMode === 'doubles' && playerNames.length === 1
                        ? 'Second player'
                        : 'Your name'
                  }
                />

                {/* Added names */}
                {playerNames.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {playerNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-baize/20 text-baize text-sm font-medium"
                      >
                        {name}
                        <button
                          onClick={() => handleRemoveName(name)}
                          className="hover:text-white transition-colors"
                          aria-label={`Remove ${name}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <p className="text-loss text-sm chalk-animate-shake" role="alert">{error}</p>
              )}

              {/* Submit */}
              <ChalkButton
                fullWidth
                size="lg"
                onClick={handleSubmit}
                disabled={!canAdd || adding}
              >
                {adding
                  ? 'Adding…'
                  : `Chalk ${playerNames.length > 0 ? playerNames.join(' & ') : 'Name'} Up`}
              </ChalkButton>
            </>
          )}
        </div>
      </div>
    </>
  );
}
