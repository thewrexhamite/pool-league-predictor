'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useWakeLock } from '@/hooks/chalk/use-wake-lock';
import { useIdleDetector } from '@/hooks/chalk/use-idle-detector';
import { ConnectionStatus } from '../shared/ConnectionStatus';
import { KioskHeader } from './KioskHeader';
import { QueuePanel } from './QueuePanel';
import { GamePanel } from './GamePanel';
import { AddToQueueSheet } from './AddToQueueSheet';
import { RegisterGameSheet } from './RegisterGameSheet';
import { KillerSetupSheet } from './KillerSetupSheet';
import { TournamentSetupSheet } from './TournamentSetupSheet';
import { AttractMode } from './AttractMode';

const CLAIM_PROMPT_TIMEOUT = 10_000;
const QUEUE_INTERSTITIAL_TIMEOUT = 15_000;
const LOCAL_ADD_SUPPRESS_MS = 3_000;
const ATTRACT_CYCLE_MS = 30_000;

export function KioskView() {
  const { table, loading, error, connectionStatus } = useChalkTable();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showRegisterSheet, setShowRegisterSheet] = useState(false);
  const [showKillerSetup, setShowKillerSetup] = useState(false);
  const [showTournamentSetup, setShowTournamentSetup] = useState(false);
  const [showClaimPrompt, setShowClaimPrompt] = useState(false);
  const [showQueueInterstitial, setShowQueueInterstitial] = useState(false);

  // Refs for tracking state transitions
  const prevQueueLengthRef = useRef<number>(0);
  const hasPromptedRef = useRef(false);
  const localAddTimestampRef = useRef<number>(0);

  useWakeLock();

  // Apply theme class to chalk-root
  const theme = table?.settings.theme ?? 'dark';
  useEffect(() => {
    const root = document.querySelector('.chalk-root');
    if (!root) return;
    if (theme === 'light') {
      root.classList.add('chalk-light');
    } else {
      root.classList.remove('chalk-light');
    }
    return () => { root.classList.remove('chalk-light'); };
  }, [theme]);

  const attractTimeout = table?.settings.attractModeTimeoutMinutes ?? 5;
  const { isIdle, wake } = useIdleDetector(attractTimeout);
  const [showAttract, setShowAttract] = useState(false);
  const [attractVisible, setAttractVisible] = useState(false);

  // Alternate between attract and main view every 30s while idle
  useEffect(() => {
    if (!isIdle) {
      // Fade out attract before unmounting
      setAttractVisible(false);
      const timer = setTimeout(() => setShowAttract(false), 1000);
      return () => clearTimeout(timer);
    }
    // Start with attract screen when going idle
    setShowAttract(true);
    // Trigger fade-in on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAttractVisible(true));
    });
    const interval = setInterval(() => {
      // Fade out, swap, fade in
      setAttractVisible(false);
      setTimeout(() => {
        setShowAttract((prev) => !prev);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setAttractVisible(true));
        });
      }, 1000);
    }, ATTRACT_CYCLE_MS);
    return () => clearInterval(interval);
  }, [isIdle]);

  // Handle wake from attract mode — show claim prompt if table is idle
  const handleWake = useCallback(() => {
    wake();
    if (table && !table.currentGame && table.queue.length === 0) {
      setShowClaimPrompt(true);
      hasPromptedRef.current = true;
    }
  }, [wake, table]);

  // Handle claim from attract mode — wake + open register sheet directly
  const handleClaim = useCallback(() => {
    wake();
    setShowRegisterSheet(true);
  }, [wake]);

  // Auto-dismiss claim prompt after timeout
  useEffect(() => {
    if (!showClaimPrompt) return;
    const timer = setTimeout(() => setShowClaimPrompt(false), CLAIM_PROMPT_TIMEOUT);
    return () => clearTimeout(timer);
  }, [showClaimPrompt]);

  // Detect queue 0→1 transition on idle table (reactive interstitial)
  useEffect(() => {
    if (!table) return;

    const prevLen = prevQueueLengthRef.current;
    const currLen = table.queue.length;
    prevQueueLengthRef.current = currLen;

    // Only trigger on 0 → 1+ transition
    if (prevLen !== 0 || currLen === 0) return;
    // Must have no current game
    if (table.currentGame) return;
    // Don't re-prompt in the same idle→active cycle
    if (hasPromptedRef.current) return;
    // Suppress if local add just happened
    if (Date.now() - localAddTimestampRef.current < LOCAL_ADD_SUPPRESS_MS) return;
    // Don't show while add sheet is open
    if (showAddSheet) return;

    setShowQueueInterstitial(true);
    hasPromptedRef.current = true;
  }, [table, showAddSheet]);

  // Auto-dismiss queue interstitial after timeout
  useEffect(() => {
    if (!showQueueInterstitial) return;
    const timer = setTimeout(() => setShowQueueInterstitial(false), QUEUE_INTERSTITIAL_TIMEOUT);
    return () => clearTimeout(timer);
  }, [showQueueInterstitial]);

  // Reset prompt flag when table goes idle
  useEffect(() => {
    if (isIdle) {
      hasPromptedRef.current = false;
    }
  }, [isIdle]);

  // Track local adds to suppress false-positive interstitials
  const handleCloseAddSheet = useCallback(() => {
    localAddTimestampRef.current = Date.now();
    setShowAddSheet(false);
  }, []);

  if (loading) {
    return (
      <div className="chalk-kiosk flex items-center justify-center">
        <div className="text-center space-y-[1.5vmin]">
          <div className="w-[4.5vmin] h-[4.5vmin] border-4 border-baize border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[1.5vmin] text-white/65">Loading table…</p>
        </div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="chalk-kiosk flex items-center justify-center">
        <div className="text-center space-y-[1.5vmin]">
          <p className="text-loss text-[1.9vmin]">{error ?? 'Table not found'}</p>
          <Link href="/kiosk" className="text-baize hover:underline text-[1.5vmin]">
            Back to setup
          </Link>
        </div>
      </div>
    );
  }

  if (isIdle && showAttract) {
    return (
      <div
        className="transition-opacity duration-1000 ease-in-out"
        style={{ opacity: attractVisible ? 1 : 0 }}
      >
        <AttractMode table={table} onWake={handleWake} onClaim={handleClaim} />
      </div>
    );
  }

  return (
    <div className="chalk-kiosk chalk-animate-fade">
      <ConnectionStatus status={connectionStatus} />
      <div className="chalk-kiosk-grid">
        <KioskHeader table={table} />
        <QueuePanel
          table={table}
          onAddPlayer={() => setShowAddSheet(true)}
          onStartKiller={() => setShowKillerSetup(true)}
          onStartTournament={() => setShowTournamentSetup(true)}
        />
        <GamePanel table={table} />
      </div>

      {/* "Already playing?" prompt on wake from attract mode */}
      {showClaimPrompt && !table.currentGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 chalk-animate-fade">
          <div className="bg-surface-card rounded-[1.5vmin] p-[3vmin] mx-[2.2vmin] max-w-[42vmin] w-full text-center space-y-[2.2vmin] border border-surface-border">
            <h2 className="text-[2.2vmin] font-bold">Already playing?</h2>
            <p className="text-[1.5vmin] text-white/65">
              If there&apos;s a game already in progress, register it so the queue works correctly.
            </p>
            <div className="flex gap-[1.1vmin]">
              <button
                onClick={() => {
                  setShowClaimPrompt(false);
                  setShowRegisterSheet(true);
                }}
                className="flex-1 py-[1.1vmin] px-[1.5vmin] rounded-[1.1vmin] bg-baize text-white font-semibold text-[1.7vmin] transition-colors hover:bg-baize/90"
              >
                Yes — register our game
              </button>
              <button
                onClick={() => setShowClaimPrompt(false)}
                className="flex-1 py-[1.1vmin] px-[1.5vmin] rounded-[1.1vmin] bg-surface-elevated font-semibold text-[1.7vmin] transition-colors hover:bg-surface-elevated/80 text-white/70"
              >
                No — table is free
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interstitial when first queue entry arrives on idle table */}
      {showQueueInterstitial && !table.currentGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 chalk-animate-fade">
          <div className="bg-surface-card rounded-[1.5vmin] p-[3vmin] mx-[2.2vmin] max-w-[42vmin] w-full text-center space-y-[2.2vmin] border border-surface-border">
            <h2 className="text-[2.2vmin] font-bold">Someone just joined the queue</h2>
            <p className="text-[1.5vmin] text-white/65">
              Is there a game already in progress at this table?
            </p>
            <div className="flex gap-[1.1vmin]">
              <button
                onClick={() => {
                  setShowQueueInterstitial(false);
                  setShowRegisterSheet(true);
                }}
                className="flex-1 py-[1.1vmin] px-[1.5vmin] rounded-[1.1vmin] bg-baize text-white font-semibold text-[1.7vmin] transition-colors hover:bg-baize/90"
              >
                Yes — register current players
              </button>
              <button
                onClick={() => setShowQueueInterstitial(false)}
                className="flex-1 py-[1.1vmin] px-[1.5vmin] rounded-[1.1vmin] bg-surface-elevated font-semibold text-[1.7vmin] transition-colors hover:bg-surface-elevated/80 text-white/70"
              >
                No — table was free
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddSheet && (
        <AddToQueueSheet
          table={table}
          onClose={handleCloseAddSheet}
        />
      )}

      {showRegisterSheet && (
        <RegisterGameSheet
          table={table}
          onClose={() => setShowRegisterSheet(false)}
        />
      )}

      {showKillerSetup && (
        <KillerSetupSheet
          table={table}
          onClose={() => setShowKillerSetup(false)}
        />
      )}

      {showTournamentSetup && (
        <TournamentSetupSheet
          table={table}
          onClose={() => setShowTournamentSetup(false)}
        />
      )}
    </div>
  );
}
