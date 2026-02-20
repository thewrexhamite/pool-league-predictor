'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ChalkTable, GameMode } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import { ChalkButton } from '../shared/ChalkButton';
import { PlayerNameInput } from '../shared/PlayerNameInput';
import { GameModeSelector } from './GameModeSelector';

interface RegisterGameSheetProps {
  table: ChalkTable;
  onClose: () => void;
}

export function RegisterGameSheet({ table, onClose }: RegisterGameSheetProps) {
  const { registerCurrentGame } = useChalkTable();
  const { play } = useChalkSound(table.settings.soundEnabled, table.settings.soundVolume);
  const [holderNames, setHolderNames] = useState<string[]>([]);
  const [challengerNames, setChallengerNames] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('singles');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiredPlayers = gameMode === 'doubles' ? 2 : 1;
  const canSubmit = holderNames.length >= requiredPlayers && challengerNames.length >= requiredPlayers;

  const allNames = [...holderNames, ...challengerNames];

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAddHolder = useCallback((name: string) => {
    if (allNames.includes(name)) return;
    setHolderNames((prev) => [...prev, name]);
    setError(null);
  }, [allNames]);

  const handleRemoveHolder = useCallback((name: string) => {
    setHolderNames((prev) => prev.filter((n) => n !== name));
  }, []);

  const handleAddChallenger = useCallback((name: string) => {
    if (allNames.includes(name)) return;
    setChallengerNames((prev) => [...prev, name]);
    setError(null);
  }, [allNames]);

  const handleRemoveChallenger = useCallback((name: string) => {
    setChallengerNames((prev) => prev.filter((n) => n !== name));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await registerCurrentGame({ holderNames, challengerNames, gameMode });
      play('queue_add');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register game';
      setError(message);
      play('error');
      setSubmitting(false);
    }
  }, [canSubmit, holderNames, challengerNames, gameMode, registerCurrentGame, onClose, play]);

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
        aria-label="Register current game"
      >
        <div className="p-[2.2vmin] space-y-[1.85vmin]">
          {/* Handle bar */}
          <div className="flex justify-center">
            <div className="w-[4.4vmin] h-[0.37vmin] rounded-full bg-surface-border" />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-[1.9vmin] font-bold">Who&apos;s playing right now?</h2>
            <button
              onClick={onClose}
              className="chalk-touch p-[0.75vmin] rounded-[0.7vmin] hover:text-white transition-colors" style={{ color: 'rgba(255,255,255,0.65)' }}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Game mode */}
          <GameModeSelector
            value={gameMode}
            onChange={setGameMode}
            availableModes={['singles', 'doubles']}
          />

          {/* Player/Team 1 */}
          <div className="space-y-[1.1vmin]">
            <label className="block text-[1.3vmin] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {gameMode === 'doubles' ? 'Team 1 (2 players)' : 'Player 1'}
            </label>
            <PlayerNameInput
              onAdd={handleAddHolder}
              recentNames={table.recentNames}
              excludeNames={allNames}
              placeholder={
                gameMode === 'doubles' && holderNames.length === 0
                  ? 'First player'
                  : gameMode === 'doubles' && holderNames.length === 1
                    ? 'Second player'
                    : 'Name'
              }
            />
            {holderNames.length > 0 && (
              <div className="flex flex-wrap gap-[0.75vmin]">
                {holderNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-[0.55vmin] px-[1.1vmin] py-[0.55vmin] rounded-[0.7vmin] bg-baize/20 text-baize text-[1.3vmin] font-medium"
                  >
                    {name}
                    <button
                      onClick={() => handleRemoveHolder(name)}
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

          {/* Player/Team 2 */}
          <div className="space-y-[1.1vmin]">
            <label className="block text-[1.3vmin] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {gameMode === 'doubles' ? 'Team 2 (2 players)' : 'Player 2'}
            </label>
            <PlayerNameInput
              onAdd={handleAddChallenger}
              recentNames={table.recentNames}
              excludeNames={allNames}
              placeholder={
                gameMode === 'doubles' && challengerNames.length === 0
                  ? 'First player'
                  : gameMode === 'doubles' && challengerNames.length === 1
                    ? 'Second player'
                    : 'Name'
              }
            />
            {challengerNames.length > 0 && (
              <div className="flex flex-wrap gap-[0.75vmin]">
                {challengerNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-[0.55vmin] px-[1.1vmin] py-[0.55vmin] rounded-[0.7vmin] bg-baize/20 text-baize text-[1.3vmin] font-medium"
                  >
                    {name}
                    <button
                      onClick={() => handleRemoveChallenger(name)}
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
            <p className="text-loss text-[1.3vmin] chalk-animate-shake" role="alert">{error}</p>
          )}

          {/* Submit */}
          <ChalkButton
            fullWidth
            size="lg"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? 'Registering...' : 'Register Game'}
          </ChalkButton>
        </div>
      </div>
    </>
  );
}
