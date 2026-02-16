'use client';

import Link from 'next/link';
import type { ChalkTable } from '@/lib/chalk/types';
import { ChalkCard } from '../shared/ChalkCard';

interface VenueTableCardProps {
  table: ChalkTable;
}

const statusConfig = {
  idle: { dot: 'bg-gray-400', label: 'Idle' },
  active: { dot: 'bg-baize', label: 'Active' },
  private: { dot: 'bg-purple-400', label: 'Private' },
} as const;

export function VenueTableCard({ table }: VenueTableCardProps) {
  const status = statusConfig[table.status];

  return (
    <ChalkCard padding="md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.dot}`} />
          <div className="min-w-0">
            <p className="font-medium truncate">
              {table.settings.tableName || table.name}
            </p>
            <p className="text-xs text-gray-500">{table.shortCode}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right text-sm">
            <p className="text-gray-300">
              {table.queue.length} in queue
            </p>
            <p className="text-gray-500">
              {table.sessionStats.gamesPlayed} game
              {table.sessionStats.gamesPlayed !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href={`/kiosk/${table.id}`}
            className="text-xs text-baize hover:text-baize-light transition-colors whitespace-nowrap"
          >
            Open Kiosk →
          </Link>
        </div>
      </div>
    </ChalkCard>
  );
}
