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
      <div className="text-center space-y-[3vmin] chalk-animate-fade">
        <h1 className="text-[9vmin] font-bold tracking-tight chalk-attract-title">Chalk It Up!</h1>
        <p className="text-[2.8vmin] text-gray-400">{table.venueName}</p>

        <p className="text-[3.3vmin] font-semibold text-baize mt-[3vmin]">Put your name down to play</p>

        <div className="mt-[4.5vmin] space-y-[1.5vmin]">
          <p className="text-[2.2vmin] text-gray-500">Scan to join the queue</p>
          <p className="text-[3.3vmin] font-mono text-baize">{table.shortCode}</p>
        </div>

        {table.sessionStats.gamesPlayed > 0 && table.sessionStats.kingOfTable && (
          <div className="mt-[3vmin] text-[1.9vmin] text-gray-500">
            King of the Table: <span className="text-accent font-medium">{table.sessionStats.kingOfTable.playerName}</span>
            {' '}({table.sessionStats.kingOfTable.consecutiveWins} wins)
          </div>
        )}
      </div>
    </div>
  );
}
