'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useWakeLock } from '@/hooks/chalk/use-wake-lock';
import { useIdleDetector } from '@/hooks/chalk/use-idle-detector';
import { ConnectionStatus } from '../shared/ConnectionStatus';
import { KioskHeader } from './KioskHeader';
import { QueuePanel } from './QueuePanel';
import { GamePanel } from './GamePanel';
import { AddToQueueSheet } from './AddToQueueSheet';
import { AttractMode } from './AttractMode';

export function KioskView() {
  const { table, loading, error, connectionStatus } = useChalkTable();
  const [showAddSheet, setShowAddSheet] = useState(false);

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

  if (loading) {
    return (
      <div className="chalk-kiosk flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-baize border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-400">Loading table…</p>
        </div>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="chalk-kiosk flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-loss text-xl">{error ?? 'Table not found'}</p>
          <Link href="/kiosk" className="text-baize hover:underline">
            Back to setup
          </Link>
        </div>
      </div>
    );
  }

  if (isIdle && !table.currentGame && table.queue.length === 0) {
    return <AttractMode table={table} onWake={wake} />;
  }

  return (
    <div className="chalk-kiosk">
      <ConnectionStatus status={connectionStatus} />
      <div className="chalk-kiosk-grid">
        <KioskHeader table={table} />
        <QueuePanel
          table={table}
          onAddPlayer={() => setShowAddSheet(true)}
        />
        <GamePanel table={table} />
      </div>

      {showAddSheet && (
        <AddToQueueSheet
          table={table}
          onClose={() => setShowAddSheet(false)}
        />
      )}
    </div>
  );
}
