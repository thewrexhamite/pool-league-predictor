'use client';

import { useState, useEffect } from 'react';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useWakeLock } from '@/hooks/chalk/use-wake-lock';
import { useIdleDetector } from '@/hooks/chalk/use-idle-detector';
import { ConnectionStatus } from '../shared/ConnectionStatus';
import { TVQueueList } from './TVQueueList';
import { TVCurrentGame } from './TVCurrentGame';
import { TVLeaderboard } from './TVLeaderboard';
import { TVAttractMode } from './TVAttractMode';

type TVPanel = 'queue' | 'game' | 'leaderboard';

export function TVView() {
  const { table, loading, error, connectionStatus } = useChalkTable();
  const [activePanel, setActivePanel] = useState<TVPanel>('queue');

  useWakeLock();

  const attractTimeout = table?.settings.attractModeTimeoutMinutes ?? 5;
  const { isIdle, wake } = useIdleDetector(attractTimeout);

  // Auto-cycle panels every 10 seconds when no game
  const hasCurrentGame = !!table?.currentGame;
  const gamesPlayed = table?.sessionStats.gamesPlayed ?? 0;

  useEffect(() => {
    if (hasCurrentGame) {
      setActivePanel('game');
      return;
    }

    const panels: TVPanel[] = ['queue', 'leaderboard'];
    if (gamesPlayed === 0) {
      setActivePanel('queue');
      return;
    }

    setActivePanel(panels[0]);
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % panels.length;
      setActivePanel(panels[index]);
    }, 10000);

    return () => clearInterval(interval);
  }, [hasCurrentGame, gamesPlayed]);

  if (loading) {
    return (
      <div className="chalk-kiosk chalk-tv flex items-center justify-center">
        <div className="w-[6vmin] h-[6vmin] border-4 border-baize border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="chalk-kiosk chalk-tv flex items-center justify-center">
        <p className="text-loss text-[2.8vmin]">{error ?? 'Table not found'}</p>
      </div>
    );
  }

  if (isIdle && !table.currentGame && table.queue.length === 0) {
    return <TVAttractMode table={table} onWake={wake} />;
  }

  return (
    <div className="chalk-kiosk chalk-tv">
      <ConnectionStatus status={connectionStatus} />

      {/* Header */}
      <div className="flex items-center justify-between px-[3vmin] py-[1.5vmin] border-b border-surface-border">
        <div>
          <h1 className="text-[2.2vmin] font-bold">{table.name}</h1>
          <p className="text-[1.5vmin] text-gray-400">
            {table.sessionStats.gamesPlayed} games played
          </p>
        </div>
        <div className="text-right text-[1.5vmin] text-gray-400">
          <p>Join: <span className="text-baize font-mono">{table.shortCode}</span></p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden p-[3vmin]">
        {activePanel === 'game' && table.currentGame && (
          <TVCurrentGame table={table} />
        )}
        {activePanel === 'queue' && (
          <TVQueueList table={table} />
        )}
        {activePanel === 'leaderboard' && (
          <TVLeaderboard table={table} />
        )}
      </div>
    </div>
  );
}
