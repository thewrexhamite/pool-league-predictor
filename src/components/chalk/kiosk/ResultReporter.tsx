'use client';

import { useState } from 'react';
import type { CurrentGame, PlayerSide, ChalkSettings } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import { ChalkButton } from '../shared/ChalkButton';

interface ResultReporterProps {
  game: CurrentGame;
  settings: ChalkSettings;
}

export function ResultReporter({ game, settings }: ResultReporterProps) {
  const { reportResult } = useChalkTable();
  const { play } = useChalkSound(settings.soundEnabled, settings.soundVolume);
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holderNames = game.players.filter((p) => p.side === 'holder').map((p) => p.name);
  const challengerNames = game.players.filter((p) => p.side === 'challenger').map((p) => p.name);

  async function handleReport(winningSide: PlayerSide) {
    setReporting(true);
    setError(null);
    const winnerNames = winningSide === 'holder' ? holderNames : challengerNames;
    try {
      await reportResult({ winningSide, winnerNames });
      play('game_end');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to report result';
      setError(message);
      play('error');
      setReporting(false);
    }
  }

  return (
    <div className="space-y-[1.1vmin]">
      <p className="text-center text-[1.3vmin] text-gray-400 uppercase tracking-wider">
        Who won?
      </p>
      <div className="flex gap-[1.5vmin]">
        <ChalkButton
          size="lg"
          onClick={() => handleReport('holder')}
          disabled={reporting}
          className="flex-1"
        >
          {reporting ? '…' : holderNames.join(' & ')}
        </ChalkButton>
        <ChalkButton
          size="lg"
          variant="secondary"
          onClick={() => handleReport('challenger')}
          disabled={reporting}
          className="flex-1"
        >
          {reporting ? '…' : challengerNames.join(' & ')}
        </ChalkButton>
      </div>
      {error && (
        <p className="text-loss text-[1.3vmin] text-center" role="alert">{error}</p>
      )}
    </div>
  );
}
