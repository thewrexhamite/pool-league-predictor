'use client';

import { useEffect, useRef } from 'react';
import type { QueueEntry, ChalkSettings } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useNoShowTimer } from '@/hooks/chalk/use-no-show-timer';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import { ChalkButton } from '../shared/ChalkButton';

interface NoShowOverlayProps {
  entries: QueueEntry[];
  settings: ChalkSettings;
}

export function NoShowOverlay({ entries, settings }: NoShowOverlayProps) {
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

  const allNames = entries.flatMap((e) => e.playerNames).join(' & ');

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
      <div className="text-center space-y-[2.2vmin] chalk-animate-in">
        <div className="space-y-[0.75vmin]">
          <p className="text-[1.3vmin] text-gray-400 uppercase tracking-wider">Calling</p>
          <p className="text-[3.7vmin] font-bold">{allNames}</p>
        </div>

        {isExpired ? (
          <div className="space-y-[1.5vmin]">
            <p className="text-[1.9vmin] text-loss" role="alert">No show!</p>
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
              className="text-[6.7vmin] font-mono font-bold text-accent"
              aria-live="polite"
              aria-atomic="true"
            >
              {secondsLeft}
            </div>
            <p className="text-[1.5vmin] text-gray-400">seconds to get to the table</p>
            <ChalkButton size="lg" onClick={dismissNoShow}>
              They&apos;re here
            </ChalkButton>
          </div>
        )}
      </div>
    </div>
  );
}
