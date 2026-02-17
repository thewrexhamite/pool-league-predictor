'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ChalkTable, ChalkVenue } from '@/lib/chalk/types';
import { useAuth } from '@/lib/auth';
import { getVenue } from '@/lib/chalk/firestore';
import { CrownIcon } from '../shared/CrownIcon';
import { PrivateModeToggle } from './PrivateModeToggle';

interface KioskHeaderProps {
  table: ChalkTable;
}

export function KioskHeader({ table }: KioskHeaderProps) {
  const { user } = useAuth();
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
          {table.venueId && user && (
            <Link
              href={`/manage/venue/${table.venueId}`}
              className="text-[1.6vmin] text-gray-500 hover:text-baize transition-colors"
            >
              Manage
            </Link>
          )}
          <PrivateModeToggle
            isPrivate={table.session.isPrivate}
            privatePlayerNames={table.session.privatePlayerNames}
          />
          <span className="text-[1.8vmin] text-gray-500">
            {table.sessionStats.gamesPlayed} game{table.sessionStats.gamesPlayed !== 1 ? 's' : ''}
          </span>
          <Link
            href={`/kiosk/${table.id}/settings`}
            className="chalk-touch rounded-[1vmin] p-[1vmin] text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors"
            aria-label="Table settings"
          >
            <svg className="w-[2.8vmin] h-[2.8vmin]" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M10 13a3 3 0 100-6 3 3 0 000 6z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M17.4 12.3a1.3 1.3 0 00.26 1.43l.05.05a1.58 1.58 0 01-1.12 2.7 1.58 1.58 0 01-1.12-.46l-.05-.05a1.3 1.3 0 00-1.43-.26 1.3 1.3 0 00-.79 1.19v.14a1.58 1.58 0 01-3.16 0v-.07A1.3 1.3 0 009.3 15.8a1.3 1.3 0 00-1.43.26l-.05.05a1.58 1.58 0 01-2.24-2.24l.05-.05a1.3 1.3 0 00.26-1.43 1.3 1.3 0 00-1.19-.79h-.14a1.58 1.58 0 010-3.16h.07A1.3 1.3 0 005.8 7.7a1.3 1.3 0 00-.26-1.43l-.05-.05a1.58 1.58 0 012.24-2.24l.05.05a1.3 1.3 0 001.43.26h.06a1.3 1.3 0 00.79-1.19v-.14a1.58 1.58 0 013.16 0v.07a1.3 1.3 0 00.79 1.19 1.3 1.3 0 001.43-.26l.05-.05a1.58 1.58 0 012.24 2.24l-.05.05a1.3 1.3 0 00-.26 1.43v.06a1.3 1.3 0 001.19.79h.14a1.58 1.58 0 010 3.16h-.07a1.3 1.3 0 00-1.19.79z"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
