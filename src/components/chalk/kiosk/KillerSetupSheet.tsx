'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ChalkTable } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import { CHALK_DEFAULTS } from '@/lib/chalk/constants';
import { ChalkButton } from '../shared/ChalkButton';
import { PlayerNameInput } from '../shared/PlayerNameInput';
import clsx from 'clsx';

interface KillerSetupSheetProps {
  table: ChalkTable;
  onClose: () => void;
}

export function KillerSetupSheet({ table, onClose }: KillerSetupSheetProps) {
  const { startKillerDirect } = useChalkTable();
  const { play } = useChalkSound(table.settings.soundEnabled, table.settings.soundVolume);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [lives, setLives] = useState<number>(CHALK_DEFAULTS.KILLER_DEFAULT_LIVES);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queuedNames = new Set(table.queue.flatMap((e) => e.playerNames));
  const canStart =
    selectedPlayers.length >= CHALK_DEFAULTS.KILLER_MIN_PLAYERS &&
    selectedPlayers.length <= CHALK_DEFAULTS.KILLER_MAX_PLAYERS;

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAddPlayer = useCallback((name: string) => {
    if (selectedPlayers.includes(name)) return;
    if (selectedPlayers.length >= CHALK_DEFAULTS.KILLER_MAX_PLAYERS) return;
    setSelectedPlayers((prev) => [...prev, name]);
    setError(null);
  }, [selectedPlayers]);

  const handleRemovePlayer = useCallback((name: string) => {
    setSelectedPlayers((prev) => prev.filter((n) => n !== name));
  }, []);

  const handleRandomizeOrder = useCallback(() => {
    setSelectedPlayers((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
  }, []);

  const handleStart = useCallback(async () => {
    if (!canStart) return;
    setStarting(true);
    setError(null);
    try {
      await startKillerDirect({ playerNames: selectedPlayers, lives });
      play('game_start');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start killer game';
      setError(message);
      play('error');
      setStarting(false);
    }
  }, [canStart, selectedPlayers, lives, startKillerDirect, onClose, play]);

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
        aria-label="Start Killer Game"
      >
        <div className="p-[2.2vmin] space-y-[1.85vmin]">
          {/* Handle bar */}
          <div className="flex justify-center">
            <div className="w-[4.4vmin] h-[0.37vmin] rounded-full bg-surface-border" />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-[1.9vmin] font-bold">Start Killer</h2>
            <button
              onClick={onClose}
              className="chalk-touch p-[0.75vmin] rounded-[0.7vmin] text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Lives selector */}
          <div className="space-y-[0.75vmin]">
            <label className="block text-[1.3vmin] font-medium text-gray-300">Lives per player</label>
            <div className="flex gap-[0.75vmin]">
              {[1, 2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  onClick={() => setLives(count)}
                  className={clsx(
                    'chalk-touch flex-1 py-[1.1vmin] rounded-[1.1vmin] border text-[1.5vmin] font-bold transition-colors',
                    lives === count
                      ? 'bg-loss/15 border-loss text-loss'
                      : 'bg-surface-elevated border-surface-border text-gray-400 hover:border-gray-500'
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Player names input */}
          <div className="space-y-[1.1vmin]">
            <label className="block text-[1.3vmin] font-medium text-gray-300">
              Players ({selectedPlayers.length}/{CHALK_DEFAULTS.KILLER_MAX_PLAYERS})
            </label>
            <PlayerNameInput
              onAdd={handleAddPlayer}
              recentNames={table.recentNames}
              excludeNames={selectedPlayers}
              placeholder="Add player"
            />

            {/* Selected players — numbered to show play order */}
            {selectedPlayers.length > 0 && (
              <div className="space-y-[0.55vmin]">
                {selectedPlayers.map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center gap-[1.1vmin] px-[1.1vmin] py-[0.55vmin] rounded-[0.7vmin] bg-baize/10"
                  >
                    <span className="text-[1.1vmin] text-gray-500 font-mono w-[2vmin] text-right">{i + 1}.</span>
                    <span className="flex-1 text-baize text-[1.3vmin] font-medium">
                      {name}
                      {queuedNames.has(name) && (
                        <span className="text-[1vmin] text-gray-400 ml-[0.5vmin]">(queued)</span>
                      )}
                    </span>
                    <button
                      onClick={() => handleRemovePlayer(name)}
                      className="text-gray-500 hover:text-white transition-colors"
                      aria-label={`Remove ${name}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M10 4L4 10M4 4l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Randomize order button */}
            {selectedPlayers.length >= CHALK_DEFAULTS.KILLER_MIN_PLAYERS && (
              <button
                onClick={handleRandomizeOrder}
                className="flex items-center justify-center gap-[0.7vmin] w-full py-[1vmin] rounded-[0.7vmin] border border-accent/30 bg-accent/10 text-accent text-[1.3vmin] font-semibold hover:bg-accent/20 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 4h3l2 3-2 3H2M14 4h-3l-2 3 2 3h3M5 4l6 6M11 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Randomize Order
              </button>
            )}
          </div>

          {/* Player count hint */}
          {selectedPlayers.length < CHALK_DEFAULTS.KILLER_MIN_PLAYERS && (
            <p className="text-[1.1vmin] text-gray-500 text-center">
              Need at least {CHALK_DEFAULTS.KILLER_MIN_PLAYERS} players to start
            </p>
          )}

          {/* Error */}
          {error && (
            <p className="text-loss text-[1.3vmin] chalk-animate-shake" role="alert">{error}</p>
          )}

          {/* Start button */}
          <ChalkButton
            fullWidth
            size="lg"
            onClick={handleStart}
            disabled={!canStart || starting}
          >
            {starting
              ? 'Starting…'
              : `Start Killer (${selectedPlayers.length} players)`}
          </ChalkButton>
        </div>
      </div>
    </>
  );
}
