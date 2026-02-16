'use client';

import type { ChalkTable } from '@/lib/chalk/types';

interface AttractModeProps {
  table: ChalkTable;
  onWake: () => void;
}

export function AttractMode({ table, onWake }: AttractModeProps) {
  return (
    <div
      className="chalk-kiosk flex items-center justify-center cursor-pointer"
      onClick={onWake}
    >
      <div className="text-center space-y-6 chalk-animate-fade">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">The Chalk</h1>
          <p className="text-xl text-gray-400">{table.venueName}</p>
        </div>

        <div className="w-24 h-24 mx-auto rounded-full border-2 border-baize/30 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="chalk-animate-pulse">
            <circle cx="20" cy="20" r="16" stroke="rgb(var(--baize))" strokeWidth="2" opacity="0.5" />
            <circle cx="20" cy="20" r="4" fill="rgb(var(--baize))" />
          </svg>
        </div>

        <p className="text-gray-500 text-lg">
          Tap anywhere to start playing
        </p>

        {table.sessionStats.gamesPlayed > 0 && (
          <div className="text-sm text-gray-600">
            {table.sessionStats.gamesPlayed} games played this session
            {table.sessionStats.kingOfTable && (
              <> — King: {table.sessionStats.kingOfTable.playerName}</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
