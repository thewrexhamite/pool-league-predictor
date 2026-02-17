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
        <div className="text-center space-y-[1.5vmin]">
          <p className="text-[3.7vmin] font-bold text-gray-500">No one in the queue</p>
          <p className="text-[1.9vmin] text-gray-600">
            Scan the QR code or use code <span className="text-baize font-mono">{table.shortCode}</span> to join
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-[2.2vmin] chalk-animate-fade">
      <h2 className="text-[2.8vmin] font-bold">Up Next</h2>
      <div className="space-y-[1.1vmin]">
        {waitingEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={clsx(
              'flex items-center gap-[2.2vmin] rounded-[1.1vmin] px-[2.2vmin] py-[1.5vmin] border',
              index === 0 && 'bg-baize/10 border-baize/30',
              index > 0 && 'bg-surface-card border-surface-border'
            )}
          >
            <span
              className={clsx(
                'w-[4.4vmin] h-[4.4vmin] rounded-[0.75vmin] flex items-center justify-center text-[1.9vmin] font-bold',
                index === 0 ? 'bg-baize text-fixed-black' : 'bg-surface-elevated text-gray-300'
              )}
            >
              {index + 1}
            </span>
            <span className="text-[2.2vmin] font-semibold flex-1">
              {entry.playerNames.join(' & ')}
            </span>
            {entry.gameMode !== 'singles' && (
              <span className="px-[1.1vmin] py-[0.4vmin] rounded-[0.75vmin] bg-surface-elevated text-[1.5vmin] text-gray-400">
                {GAME_MODE_LABELS[entry.gameMode]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
