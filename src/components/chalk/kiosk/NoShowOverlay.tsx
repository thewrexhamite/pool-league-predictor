'use client';

import { useEffect, useRef } from 'react';
import type { QueueEntry, ChalkSettings, CurrentGame } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useNoShowTimer } from '@/hooks/chalk/use-no-show-timer';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import { ChalkButton } from '../shared/ChalkButton';

interface NoShowOverlayProps {
  entries: QueueEntry[];
  settings: ChalkSettings;
  currentGame: CurrentGame | null;
}

export function NoShowOverlay({ entries, settings, currentGame }: NoShowOverlayProps) {
  const { cancelGame, dismissNoShow } = useChalkTable();
  // Use the earliest deadline for the countdown
  const earliestDeadline = entries.reduce<number | null>(
    (min, e) => (e.noShowDeadline && (!min || e.noShowDeadline < min) ? e.noShowDeadline : min),
    null
  );
  const { secondsLeft, isExpired } = useNoShowTimer(earliestDeadline);
  const { play } = useChalkSound(settings.soundEnabled, settings.soundVolume);
  const soundPlayedRef = useRef(false);
  const autoCancelRef = useRef<ReturnType<typeof setTimeout>>();

  const holderNames = currentGame
    ? currentGame.players.filter((p) => p.side === 'holder').map((p) => p.name).join(' & ')
    : null;
  const challengerNames = currentGame
    ? currentGame.players.filter((p) => p.side === 'challenger').map((p) => p.name).join(' & ')
    : null;
  const isKiller = currentGame?.mode === 'killer';
  const allNames = entries.flatMap((e) => e.playerNames).join(', ');

  // Play no-show sound when timer expires
  useEffect(() => {
    if (isExpired && !soundPlayedRef.current) {
      play('no_show');
      soundPlayedRef.current = true;
    }
  }, [isExpired, play]);

  // Auto-cancel game after 15 seconds of no-show
  useEffect(() => {
    if (isExpired) {
      autoCancelRef.current = setTimeout(() => {
        cancelGame();
      }, 15000);
      return () => {
        if (autoCancelRef.current) clearTimeout(autoCancelRef.current);
      };
    }
  }, [isExpired, cancelGame]);

  if (secondsLeft === null) return null;

  return (
    <div className="chalk-no-show-overlay" role="alertdialog" aria-label="Players called to table">
      <div className="text-center space-y-[3vmin] chalk-animate-in max-w-[70vmin] mx-auto px-[3vmin]">
        <p className="text-[1.7vmin] text-gray-400 uppercase tracking-[0.3vmin]">
          {isExpired ? 'No show' : 'Next game'}
        </p>

        {/* Matchup display */}
        {isKiller || !holderNames || !challengerNames ? (
          <p className="text-[3.7vmin] font-bold">{allNames}</p>
        ) : (
          <div className="flex items-center gap-[3vmin]">
            <div className="flex-1 text-right">
              <p className="text-[3.3vmin] font-bold">{holderNames}</p>
              {currentGame?.consecutiveWins ? (
                <p className="text-[1.3vmin] text-accent mt-[0.4vmin]">
                  {currentGame.consecutiveWins} win{currentGame.consecutiveWins !== 1 ? 's' : ''} in a row
                </p>
              ) : null}
            </div>
            <span className="text-[3.7vmin] font-bold text-gray-600 flex-shrink-0">vs</span>
            <div className="flex-1 text-left">
              <p className="text-[3.3vmin] font-bold">{challengerNames}</p>
              {currentGame?.mode === 'challenge' && (
                <p className="text-[1.3vmin] text-accent mt-[0.4vmin]">Challenge match</p>
              )}
            </div>
          </div>
        )}

        {isExpired ? (
          <div className="space-y-[1.5vmin]">
            <p className="text-[2.2vmin] text-loss font-semibold" role="alert">Time&apos;s up!</p>
            <p className="text-[1.3vmin] text-gray-500">Auto-cancelling game in a few seconds…</p>
            <div className="flex gap-[1.5vmin] justify-center">
              <ChalkButton
                variant="danger"
                size="lg"
                onClick={cancelGame}
              >
                Cancel game now
              </ChalkButton>
            </div>
          </div>
        ) : (
          <div className="space-y-[1.5vmin]">
            <div
              className="text-[8vmin] font-mono font-bold text-accent leading-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {secondsLeft}
            </div>
            <p className="text-[1.7vmin] text-gray-400">seconds to get to the table</p>
            <ChalkButton size="lg" onClick={dismissNoShow}>
              They&apos;re here
            </ChalkButton>
          </div>
        )}
      </div>
    </div>
  );
}
