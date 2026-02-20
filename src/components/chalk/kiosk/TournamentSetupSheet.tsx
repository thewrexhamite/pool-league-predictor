'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ChalkTable, TournamentFormat } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import { CHALK_DEFAULTS, TOURNAMENT_FORMAT_LABELS } from '@/lib/chalk/constants';
import { ChalkButton } from '../shared/ChalkButton';
import { PlayerNameInput } from '../shared/PlayerNameInput';
import clsx from 'clsx';

interface TournamentSetupSheetProps {
  table: ChalkTable;
  onClose: () => void;
}

const FORMAT_OPTIONS: Array<{
  value: TournamentFormat;
  label: string;
  description: string;
  minPlayers: number;
}> = [
  { value: 'knockout', label: 'Knockout', description: 'One loss and you\'re out', minPlayers: 3 },
  { value: 'round_robin', label: 'Round Robin', description: 'Everyone plays everyone', minPlayers: 3 },
  { value: 'group_knockout', label: 'Group + Knockout', description: 'Groups then knockout bracket', minPlayers: 5 },
];

function bestOfLabel(raceTo: number): string {
  if (raceTo === 1) return 'Single frame';
  return `Best of ${raceTo * 2 - 1}`;
}

export function TournamentSetupSheet({ table, onClose }: TournamentSetupSheetProps) {
  const { startTournament } = useChalkTable();
  const { play } = useChalkSound(table.settings.soundEnabled, table.settings.soundVolume);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [format, setFormat] = useState<TournamentFormat>('knockout');
  const [raceTo, setRaceTo] = useState(1);
  const [showMoreRaceTo, setShowMoreRaceTo] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerCount = selectedPlayers.length;
  const formatOption = FORMAT_OPTIONS.find((f) => f.value === format)!;
  const canStart =
    playerCount >= CHALK_DEFAULTS.TOURNAMENT_MIN_PLAYERS &&
    playerCount <= CHALK_DEFAULTS.TOURNAMENT_MAX_PLAYERS &&
    playerCount >= formatOption.minPlayers;

  // Escape key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Smart format suggestions when player count changes
  useEffect(() => {
    if (playerCount < 5 && format === 'group_knockout') {
      setFormat('knockout');
    }
  }, [playerCount, format]);

  const handleAddPlayer = useCallback((name: string) => {
    if (selectedPlayers.includes(name)) return;
    if (selectedPlayers.length >= CHALK_DEFAULTS.TOURNAMENT_MAX_PLAYERS) return;
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
      await startTournament({ playerNames: selectedPlayers, format, raceTo });
      play('game_start');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start tournament';
      setError(message);
      play('error');
      setStarting(false);
    }
  }, [canStart, selectedPlayers, format, raceTo, startTournament, onClose, play]);

  // Warning messages
  let warning: string | null = null;
  if (format === 'round_robin' && playerCount >= 9) {
    const matchCount = (playerCount * (playerCount - 1)) / 2;
    warning = `This will be ${matchCount} matches`;
  }

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
        aria-label="Start Tournament"
        style={{ maxHeight: '85vh', overflow: 'auto' }}
      >
        <div className="p-[2.2vmin] space-y-[1.85vmin]">
          {/* Handle bar */}
          <div className="flex justify-center">
            <div className="w-[4.4vmin] h-[0.37vmin] rounded-full bg-surface-border" />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-[1.9vmin] font-bold">Start Tournament</h2>
            <button
              onClick={onClose}
              className="chalk-touch p-[0.75vmin] rounded-[0.7vmin] text-white/65 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Format picker */}
          <div className="space-y-[0.75vmin]">
            <label className="block text-[1.3vmin] font-medium text-white/70">Format</label>
            <div className="flex gap-[0.75vmin]">
              {FORMAT_OPTIONS.map((opt) => {
                const disabled = playerCount > 0 && playerCount < opt.minPlayers;
                return (
                  <button
                    key={opt.value}
                    onClick={() => !disabled && setFormat(opt.value)}
                    disabled={disabled}
                    className={clsx(
                      'chalk-touch flex-1 py-[1.1vmin] px-[0.75vmin] rounded-[1.1vmin] border text-center transition-colors',
                      format === opt.value
                        ? 'bg-baize/15 border-baize text-baize'
                        : disabled
                        ? 'bg-surface-elevated border-surface-border opacity-40'
                        : 'bg-surface-elevated border-surface-border hover:border-white/30'
                    )}
                  >
                    <p className={`text-[1.3vmin] font-bold ${format !== opt.value && !disabled ? 'text-white/65' : ''}`}>{opt.label}</p>
                    <p className="text-[1vmin] mt-[0.2vmin] text-white/50">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Race-to picker */}
          <div className="space-y-[0.75vmin]">
            <label className="block text-[1.3vmin] font-medium text-white/70">
              Race to {raceTo} <span className="text-white/50">({bestOfLabel(raceTo)})</span>
            </label>
            <div className="flex gap-[0.75vmin]">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => setRaceTo(n)}
                  className={clsx(
                    'chalk-touch flex-1 py-[1.1vmin] rounded-[1.1vmin] border text-[1.5vmin] font-bold transition-colors',
                    raceTo === n
                      ? 'bg-accent/15 border-accent text-accent'
                      : 'bg-surface-elevated border-surface-border hover:border-white/30 text-white/65'
                  )}
                >
                  {n}
                </button>
              ))}
              {!showMoreRaceTo ? (
                <button
                  onClick={() => setShowMoreRaceTo(true)}
                  className="chalk-touch flex-1 py-[1.1vmin] rounded-[1.1vmin] border bg-surface-elevated border-surface-border text-[1.3vmin] font-medium hover:border-white/30 transition-colors text-white/50"
                >
                  More
                </button>
              ) : null}
            </div>
            {showMoreRaceTo && (
              <div className="flex gap-[0.75vmin]">
                {[8, 9, 10, 11, 12, 13].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRaceTo(n)}
                    className={clsx(
                      'chalk-touch flex-1 py-[1.1vmin] rounded-[1.1vmin] border text-[1.5vmin] font-bold transition-colors',
                      raceTo === n
                        ? 'bg-accent/15 border-accent text-accent'
                        : 'bg-surface-elevated border-surface-border hover:border-white/30 text-white/65'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Player names input */}
          <div className="space-y-[1.1vmin]">
            <label className="block text-[1.3vmin] font-medium text-white/70">
              Players ({playerCount}/{CHALK_DEFAULTS.TOURNAMENT_MAX_PLAYERS})
            </label>
            <PlayerNameInput
              onAdd={handleAddPlayer}
              recentNames={table.recentNames}
              excludeNames={selectedPlayers}
              placeholder="Add player"
            />

            {/* Selected players — numbered to show seeding order */}
            {selectedPlayers.length > 0 && (
              <div className="space-y-[0.55vmin]">
                {selectedPlayers.map((name, i) => (
                  <div
                    key={name}
                    className="flex items-center gap-[1.1vmin] px-[1.1vmin] py-[0.55vmin] rounded-[0.7vmin] bg-baize/10"
                  >
                    <span className="text-[1.1vmin] font-mono w-[2vmin] text-right text-white/50">{i + 1}.</span>
                    <span className="flex-1 text-baize text-[1.3vmin] font-medium">
                      {name}
                    </span>
                    <button
                      onClick={() => handleRemovePlayer(name)}
                      className="text-white/50 hover:text-white transition-colors"
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
            {playerCount >= CHALK_DEFAULTS.TOURNAMENT_MIN_PLAYERS && (
              <button
                onClick={handleRandomizeOrder}
                className="flex items-center justify-center gap-[0.7vmin] w-full py-[1vmin] rounded-[0.7vmin] border border-accent/30 bg-accent/10 text-accent text-[1.3vmin] font-semibold hover:bg-accent/20 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 4h3l2 3-2 3H2M14 4h-3l-2 3 2 3h3M5 4l6 6M11 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Randomize Seeding
              </button>
            )}
          </div>

          {/* Smart suggestions */}
          {playerCount >= 3 && playerCount <= 4 && format !== 'round_robin' && (
            <p className="text-[1.1vmin] text-accent text-center">
              Round Robin works great for {playerCount} players
            </p>
          )}
          {playerCount >= 5 && playerCount <= 8 && format !== 'group_knockout' && (
            <p className="text-[1.1vmin] text-accent text-center">
              Group + Knockout is recommended for {playerCount} players
            </p>
          )}

          {/* Warning */}
          {warning && (
            <p className="text-[1.1vmin] text-accent text-center">{warning}</p>
          )}

          {/* Player count hint */}
          {playerCount < CHALK_DEFAULTS.TOURNAMENT_MIN_PLAYERS && (
            <p className="text-[1.1vmin] text-center text-white/50">
              Need at least {CHALK_DEFAULTS.TOURNAMENT_MIN_PLAYERS} players to start
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
              ? 'Starting...'
              : `Start Tournament (${playerCount} players, ${TOURNAMENT_FORMAT_LABELS[format]}, ${bestOfLabel(raceTo)})`}
          </ChalkButton>
        </div>
      </div>
    </>
  );
}
