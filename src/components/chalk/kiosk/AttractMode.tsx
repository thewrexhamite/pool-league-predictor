'use client';

import type { ChalkTable } from '@/lib/chalk/types';
import { QRCodeDisplay } from './QRCodeDisplay';

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
      <div className="text-center space-y-8 chalk-animate-fade">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold tracking-tight">The Chalk</h1>
          <p className="text-xl text-gray-400">{table.venueName}</p>
        </div>

        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-surface-card border border-surface-border">
          <QRCodeDisplay tableId={table.id} shortCode={table.shortCode} size={180} />
          <p className="text-baize font-semibold text-lg">Scan to join the queue</p>
        </div>

        <p className="text-gray-500 text-lg">
          or tap anywhere to start playing
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
