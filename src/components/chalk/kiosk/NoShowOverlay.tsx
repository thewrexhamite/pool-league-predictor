'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
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

const AUTO_REMOVE_SECONDS = 15;

export function NoShowOverlay({ entries, settings, currentGame }: NoShowOverlayProps) {
  const { dismissNoShow, resolveNoShows } = useChalkTable();
  // Use the earliest deadline for the countdown
  const earliestDeadline = entries.reduce<number | null>(
    (min, e) => (e.noShowDeadline && (!min || e.noShowDeadline < min) ? e.noShowDeadline : min),
    null
  );
  const { secondsLeft, isExpired } = useNoShowTimer(earliestDeadline);
  const { play } = useChalkSound(settings.soundEnabled, settings.soundVolume);
  const soundPlayedRef = useRef(false);
  const autoRemoveRef = useRef<ReturnType<typeof setTimeout>>();
  const autoRemoveIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const [autoRemoveCountdown, setAutoRemoveCountdown] = useState(AUTO_REMOVE_SECONDS);

  // Distinct queue entries involved in this game
  const calledEntries = useMemo(() => {
    if (!currentGame) return [];
    const seen = new Set<string>();
    const result: { entryId: string; names: string; side: string }[] = [];
    for (const player of currentGame.players) {
      if (seen.has(player.queueEntryId)) continue;
      seen.add(player.queueEntryId);
      const entryPlayers = currentGame.players.filter((p) => p.queueEntryId === player.queueEntryId);
      const names = entryPlayers.map((p) => p.name).join(' & ');
      const side = currentGame.mode === 'killer'
        ? ''
        : entryPlayers[0].side === 'holder' ? 'holder' : 'challenger';
      result.push({ entryId: player.queueEntryId, names, side });
    }
    return result;
  }, [currentGame]);

  // No-show checkbox state — all checked by default when expired
  const [noShowIds, setNoShowIds] = useState<Set<string>>(new Set());
  const expiredInitRef = useRef(false);
  useEffect(() => {
    if (isExpired && !expiredInitRef.current) {
      expiredInitRef.current = true;
      setNoShowIds(new Set(calledEntries.map((e) => e.entryId)));
    }
  }, [isExpired, calledEntries]);

  const toggleNoShow = useCallback((entryId: string) => {
    setNoShowIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  }, []);

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

  // Stable ref for noShowIds so auto-remove timer uses latest value
  const noShowIdsRef = useRef(noShowIds);
  noShowIdsRef.current = noShowIds;

  // Auto-remove after 15 seconds of no-show
  useEffect(() => {
    if (isExpired) {
      setAutoRemoveCountdown(AUTO_REMOVE_SECONDS);
      autoRemoveIntervalRef.current = setInterval(() => {
        setAutoRemoveCountdown((prev) => {
          if (prev <= 1) return 0;
          return prev - 1;
        });
      }, 1000);
      autoRemoveRef.current = setTimeout(() => {
        resolveNoShows([...noShowIdsRef.current]);
      }, AUTO_REMOVE_SECONDS * 1000);
      return () => {
        if (autoRemoveRef.current) clearTimeout(autoRemoveRef.current);
        if (autoRemoveIntervalRef.current) clearInterval(autoRemoveIntervalRef.current);
      };
    }
  }, [isExpired, resolveNoShows]);

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
          <div className="space-y-[2vmin]">
            <p className="text-[2vmin] text-gray-300">Who didn&apos;t show up?</p>

            {/* Per-entry checkboxes */}
            <div className="space-y-[1.5vmin] text-left max-w-[50vmin] mx-auto">
              {calledEntries.map((entry) => (
                <label
                  key={entry.entryId}
                  className="flex items-center gap-[1.5vmin] cursor-pointer select-none px-[2vmin] py-[1.2vmin] rounded-xl bg-surface-elevated/50 hover:bg-surface-elevated transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={noShowIds.has(entry.entryId)}
                    onChange={() => toggleNoShow(entry.entryId)}
                    className="w-[2.5vmin] h-[2.5vmin] accent-loss rounded flex-shrink-0"
                  />
                  <span className="text-[2vmin] font-semibold flex-1">{entry.names}</span>
                  {entry.side && (
                    <span className="text-[1.3vmin] text-gray-500">{entry.side}</span>
                  )}
                </label>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-[1.5vmin] justify-center">
              <ChalkButton
                variant="danger"
                size="lg"
                onClick={() => resolveNoShows([...noShowIds])}
                disabled={noShowIds.size === 0}
              >
                Remove no-shows
              </ChalkButton>
              <ChalkButton
                variant="ghost"
                size="lg"
                onClick={dismissNoShow}
              >
                All here
              </ChalkButton>
            </div>

            <p className="text-[1.3vmin] text-gray-500">
              Auto-removing in {autoRemoveCountdown}s…
            </p>
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
