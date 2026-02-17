'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import type { ChalkTable } from '@/lib/chalk/types';
import { getVenue } from '@/lib/chalk/firestore';
import { CrownIcon } from '../shared/CrownIcon';

interface KioskHeaderProps {
  table: ChalkTable;
}

export function KioskHeader({ table }: KioskHeaderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!table.venueId) return;
    getVenue(table.venueId).then((venue) => {
      if (venue?.logoUrl) setLogoUrl(venue.logoUrl);
    });
  }, [table.venueId]);

  return (
    <header className="chalk-kiosk-header flex items-center bg-surface-card border-b border-surface-border">
      {logoUrl && (
        <div className="flex items-center justify-center self-stretch px-[2.5vmin] border-r border-surface-border bg-surface-elevated/30">
          <img
            src={logoUrl}
            alt="Venue logo"
            className="h-[9vmin] w-auto object-contain"
          />
        </div>
      )}
      <div className="flex-1 flex items-center justify-between px-[3vmin] py-[1.8vmin]">
        <div className="flex items-center gap-[2vmin]">
          <h1 className="text-[2.5vmin] font-bold leading-tight">{table.name}</h1>
          {table.sessionStats.kingOfTable && (
            <div className="flex items-center gap-[0.8vmin] px-[1.5vmin] py-[0.6vmin] rounded-full bg-accent/10 text-accent text-[1.8vmin] font-medium">
              <CrownIcon size={20} />
              <span>{table.sessionStats.kingOfTable.playerName}</span>
              <span className="text-accent/60">
                {table.sessionStats.kingOfTable.consecutiveWins}W
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-[1.8vmin]">
          <Link
            href={`/kiosk/${table.id}/settings`}
            className="chalk-touch rounded-[1vmin] p-[1vmin] text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors"
            aria-label="Table settings"
          >
            <Settings className="w-[2.8vmin] h-[2.8vmin]" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </header>
  );
}
