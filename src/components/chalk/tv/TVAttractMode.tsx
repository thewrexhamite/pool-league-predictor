'use client';

import type { ChalkTable } from '@/lib/chalk/types';

interface TVAttractModeProps {
  table: ChalkTable;
  onWake: () => void;
}

export function TVAttractMode({ table, onWake }: TVAttractModeProps) {
  return (
    <div
      className="chalk-kiosk chalk-tv flex items-center justify-center cursor-pointer"
      onClick={onWake}
    >
      <div className="text-center space-y-8 chalk-animate-fade">
        <h1 className="text-8xl font-bold tracking-tight chalk-attract-title">Chalk It Up!</h1>
        <p className="text-3xl text-gray-400">{table.venueName}</p>

        <p className="text-4xl font-semibold text-baize mt-8">Put your name down to play</p>

        <div className="mt-12 space-y-4">
          <p className="text-2xl text-gray-500">Scan to join the queue</p>
          <p className="text-4xl font-mono text-baize">{table.shortCode}</p>
        </div>

        {table.sessionStats.gamesPlayed > 0 && table.sessionStats.kingOfTable && (
          <div className="mt-8 text-xl text-gray-500">
            King of the Table: <span className="text-accent font-medium">{table.sessionStats.kingOfTable.playerName}</span>
            {' '}({table.sessionStats.kingOfTable.consecutiveWins} wins)
          </div>
        )}
      </div>
    </div>
  );
}
