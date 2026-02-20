'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { QueueEntry, ChalkSettings, CurrentGame } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useNoShowTimer } from '@/hooks/chalk/use-no-show-timer';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import { ChalkButton } from '../shared/ChalkButton';
import clsx from 'clsx';

interface NoShowOverlayProps {
  entries: QueueEntry[];
  settings: ChalkSettings;
  currentGame: CurrentGame | null;
}

const AUTO_REMOVE_SECONDS = 15;

function getUrgencyColor(secondsLeft: number, total: number): string {
  const ratio = secondsLeft / total;
  if (ratio > 0.5) return 'text-baize'; // Green — plenty of time
  if (ratio > 0.25) return 'text-amber-400'; // Amber — hurry up
  return 'text-loss'; // Red — almost out of time
}

function getRingColor(secondsLeft: number, total: number): string {
  const ratio = secondsLeft / total;
  if (ratio > 0.5) return 'stroke-baize';
  if (ratio > 0.25) return 'stroke-amber-400';
  return 'stroke-loss';
}

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

  const totalSeconds = settings.noShowTimeoutSeconds;

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

  // Progress ring calculations (SVG viewBox is 100x100, radius 44 to fit stroke)
  const ringRadius = 44;
  const circumference = 2 * Math.PI * ringRadius;
  const progress = isExpired ? 0 : secondsLeft / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="chalk-no-show-overlay" role="alertdialog" aria-label="Players called to table">
      <div className="text-center space-y-[3vmin] chalk-animate-in max-w-[70vmin] mx-auto px-[3vmin]">

        {isExpired ? (
          /* ===== Expired: no-show resolution ===== */
          <div className="space-y-[2.5vmin]">
            <p className="text-[2.5vmin] font-bold text-loss uppercase tracking-[0.3vmin]">
              No Show
            </p>

            {/* Matchup display */}
            {isKiller || !holderNames || !challengerNames ? (
              <p className="text-[4.5vmin] font-bold text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>{allNames}</p>
            ) : (
              <div className="flex items-start gap-[3vmin] max-w-[85vmin]">
                <div className="flex-1 text-right min-w-0">
                  <p className="text-[4vmin] font-bold break-words text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>{holderNames}</p>
                </div>
                <span className="text-[4vmin] font-bold flex-shrink-0 text-white/50">vs</span>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[4vmin] font-bold break-words text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>{challengerNames}</p>
                </div>
              </div>
            )}

            <p className="text-[2vmin] text-white/70">Who didn&apos;t show up?</p>

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
                    <span className="text-[1.3vmin] text-white/50">{entry.side}</span>
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
                Move to back of queue
              </ChalkButton>
              <ChalkButton
                variant="ghost"
                size="lg"
                onClick={dismissNoShow}
              >
                All here
              </ChalkButton>
            </div>

            <p className="text-[1.3vmin] text-white/50">
              Auto-moving in {autoRemoveCountdown}s…
            </p>
          </div>
        ) : (
          /* ===== Countdown: waiting for players ===== */
          <div className="space-y-[2.5vmin]">
            {/* Bold header */}
            <p className={clsx(
              'text-[3vmin] font-bold uppercase tracking-[0.3vmin] chalk-animate-in',
              getUrgencyColor(secondsLeft, totalSeconds),
            )}>
              Players to the table!
            </p>

            {/* Matchup display — names are the hero */}
            {isKiller || !holderNames || !challengerNames ? (
              <p className="text-[4.5vmin] font-bold break-words text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>{allNames}</p>
            ) : (
              <>
                <div className="flex items-start gap-[3vmin] max-w-[85vmin]">
                  <div className="flex-1 text-right space-y-[0.5vmin] min-w-0">
                    <p className="text-[1.5vmin] uppercase tracking-wider text-white/50">Holder</p>
                    <p className="text-[4.5vmin] font-bold break-words text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>{holderNames}</p>
                  </div>
                  <span className="text-[4vmin] font-bold flex-shrink-0 mt-[2.5vmin] text-white/50">vs</span>
                  <div className="flex-1 text-left space-y-[0.5vmin] min-w-0">
                    <p className="text-[1.5vmin] uppercase tracking-wider text-white/50">Challenger</p>
                    <p className="text-[4.5vmin] font-bold break-words text-white" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>{challengerNames}</p>
                  </div>
                </div>
                {/* Badges below matchup — include holder name for context */}
                {(currentGame?.consecutiveWins || currentGame?.mode === 'challenge') && (
                  <div className="text-[1.5vmin] text-accent">
                    {currentGame?.consecutiveWins ? (
                      <span>{holderNames} — {currentGame.consecutiveWins} win{currentGame.consecutiveWins !== 1 ? 's' : ''} in a row</span>
                    ) : null}
                    {currentGame?.mode === 'challenge' && <span>Challenge match</span>}
                  </div>
                )}
              </>
            )}

            {/* Countdown with progress ring */}
            <div className="relative inline-flex items-center justify-center" style={{ width: '22vmin', height: '22vmin' }}>
              <svg
                className="absolute inset-0 transform -rotate-90"
                viewBox="0 0 100 100"
              >
                {/* Background ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-surface-border"
                />
                {/* Progress ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className={clsx('transition-all duration-1000 ease-linear', getRingColor(secondsLeft, totalSeconds))}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div
                className={clsx(
                  'absolute inset-0 flex flex-col items-center justify-center',
                  secondsLeft <= totalSeconds * 0.25 && 'animate-pulse',
                )}
              >
                <span
                  className={clsx(
                    'text-[6vmin] font-mono font-bold leading-none transition-colors duration-500',
                    getUrgencyColor(secondsLeft, totalSeconds),
                  )}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {secondsLeft}
                </span>
                <span className="text-[1.1vmin] mt-[0.4vmin] text-white/50">seconds</span>
              </div>
            </div>

            <ChalkButton size="lg" onClick={dismissNoShow}>
              They&apos;re here — start!
            </ChalkButton>
          </div>
        )}
      </div>
    </div>
  );
}
