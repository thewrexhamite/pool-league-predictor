'use client';

import type { ChalkTable } from '@/lib/chalk/types';
import { GAME_MODE_LABELS } from '@/lib/chalk/constants';
import clsx from 'clsx';

interface TVQueueListProps {
  table: ChalkTable;
}

export function TVQueueList({ table }: TVQueueListProps) {
  const waitingEntries = table.queue.filter((e) => e.status === 'waiting');

  if (waitingEntries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-4xl font-bold text-gray-500">No one in the queue</p>
          <p className="text-xl text-gray-600">
            Scan the QR code or use code <span className="text-baize font-mono">{table.shortCode}</span> to join
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 chalk-animate-fade">
      <h2 className="text-3xl font-bold">Up Next</h2>
      <div className="space-y-3">
        {waitingEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={clsx(
              'flex items-center gap-6 rounded-xl px-6 py-4 border',
              index === 0 && 'bg-baize/10 border-baize/30',
              index > 0 && 'bg-surface-card border-surface-border'
            )}
          >
            <span
              className={clsx(
                'w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold',
                index === 0 ? 'bg-baize text-fixed-black' : 'bg-surface-elevated text-gray-300'
              )}
            >
              {index + 1}
            </span>
            <span className="text-2xl font-semibold flex-1">
              {entry.playerNames.join(' & ')}
            </span>
            {entry.gameMode !== 'singles' && (
              <span className="px-3 py-1 rounded-lg bg-surface-elevated text-base text-gray-400">
                {GAME_MODE_LABELS[entry.gameMode]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
