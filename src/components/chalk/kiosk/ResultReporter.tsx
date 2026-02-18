'use client';

import { useState } from 'react';
import type { CurrentGame, PlayerSide, ChalkSettings } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import clsx from 'clsx';

interface ResultReporterProps {
  game: CurrentGame;
  settings: ChalkSettings;
}

type Phase = 'select' | 'confirm' | 'celebration';

export function ResultReporter({ game, settings }: ResultReporterProps) {
  const { reportResult } = useChalkTable();
  const { play } = useChalkSound(settings.soundEnabled, settings.soundVolume);
  const [selected, setSelected] = useState<PlayerSide | null>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holderNames = game.players.filter((p) => p.side === 'holder').map((p) => p.name);
  const challengerNames = game.players.filter((p) => p.side === 'challenger').map((p) => p.name);

  function handleSelect(side: PlayerSide) {
    setSelected(side);
    setPhase('confirm');
    setError(null);
  }

  function handleCancel() {
    setSelected(null);
    setPhase('select');
    setError(null);
  }

  async function handleConfirm() {
    if (!selected) return;
    setReporting(true);
    setError(null);
    const winnerNames = selected === 'holder' ? holderNames : challengerNames;
    try {
      await reportResult({ winningSide: selected, winnerNames });
      setPhase('celebration');
      play('game_end');
      // Auto-dismiss celebration after 3 seconds
      setTimeout(() => {
        setPhase('select');
        setSelected(null);
      }, 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to report result';
      setError(message);
      play('error');
      setReporting(false);
    }
  }

  const winnerNames = selected === 'holder' ? holderNames : challengerNames;

  // Celebration overlay
  if (phase === 'celebration') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 chalk-animate-fade">
        <div className="text-center space-y-[2vmin] animate-in fade-in zoom-in duration-500">
          <div className="text-[6vmin]">🎱</div>
          <h2 className="text-[3.5vmin] font-bold text-baize">
            Congratulations!
          </h2>
          <p className="text-[2.5vmin] font-semibold text-white">
            {winnerNames.join(' & ')}
          </p>
          <p className="text-[1.7vmin] text-gray-400">wins the game</p>
        </div>
      </div>
    );
  }

  // Confirm step
  if (phase === 'confirm' && selected) {
    return (
      <div className="space-y-[1.5vmin]">
        <p className="text-center text-[1.5vmin] text-gray-300">
          <span className="text-baize font-semibold">{winnerNames.join(' & ')}</span> won?
        </p>
        <div className="flex gap-[1.5vmin] justify-center">
          <button
            onClick={handleConfirm}
            disabled={reporting}
            className={clsx(
              'chalk-touch px-[3vmin] py-[1.5vmin] text-[1.7vmin] font-semibold rounded-xl transition-all active:scale-[0.98]',
              'bg-baize text-fixed-black hover:bg-baize-light',
              reporting && 'opacity-50 cursor-not-allowed',
            )}
          >
            {reporting ? 'Saving…' : 'Confirm'}
          </button>
          <button
            onClick={handleCancel}
            disabled={reporting}
            className="chalk-touch px-[3vmin] py-[1.5vmin] text-[1.7vmin] font-semibold rounded-xl bg-surface-elevated text-gray-300 hover:bg-surface-border transition-all active:scale-[0.98]"
          >
            Go Back
          </button>
        </div>
        {error && (
          <p className="text-loss text-[1.3vmin] text-center" role="alert">{error}</p>
        )}
      </div>
    );
  }

  // Selection step — both buttons neutral by default
  return (
    <div className="space-y-[1.1vmin]">
      <p className="text-center text-[1.3vmin] text-gray-400 uppercase tracking-wider">
        Who won?
      </p>
      <div className="flex gap-[1.5vmin]">
        <button
          onClick={() => handleSelect('holder')}
          className={clsx(
            'chalk-touch flex-1 px-[2vmin] py-[1.5vmin] text-[1.7vmin] font-semibold rounded-xl border-2 transition-all active:scale-[0.98]',
            'border-surface-border bg-surface-card text-gray-300 hover:border-baize hover:text-baize',
          )}
        >
          {holderNames.join(' & ')}
        </button>
        <button
          onClick={() => handleSelect('challenger')}
          className={clsx(
            'chalk-touch flex-1 px-[2vmin] py-[1.5vmin] text-[1.7vmin] font-semibold rounded-xl border-2 transition-all active:scale-[0.98]',
            'border-surface-border bg-surface-card text-gray-300 hover:border-baize hover:text-baize',
          )}
        >
          {challengerNames.join(' & ')}
        </button>
      </div>
      {error && (
        <p className="text-loss text-[1.3vmin] text-center" role="alert">{error}</p>
      )}
    </div>
  );
}
