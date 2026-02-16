'use client';

import { useMemo, useRef, useEffect } from 'react';
import clsx from 'clsx';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { useLeagueData } from '@/lib/data-provider';

interface DivisionBarProps {
  selectedDiv: DivisionCode;
  onDivisionChange: (div: DivisionCode) => void;
}

export default function DivisionBar({ selectedDiv, onDivisionChange }: DivisionBarProps) {
  const { ds } = useActiveData();
  const { data: leagueData } = useLeagueData();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const divisionCodes = useMemo(() => Object.keys(ds.divisions) as DivisionCode[], [ds.divisions]);
  const knockoutCodes = useMemo(
    () => new Set((leagueData.knockouts || []).map(k => k.code)),
    [leagueData.knockouts]
  );
  const leagueDivCodes = useMemo(
    () => divisionCodes.filter(c => !knockoutCodes.has(c)),
    [divisionCodes, knockoutCodes]
  );
  const cupDivCodes = useMemo(
    () => divisionCodes.filter(c => knockoutCodes.has(c)),
    [divisionCodes, knockoutCodes]
  );

  // Auto-scroll active pill into view
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedDiv]);

  if (divisionCodes.length <= 1) return null;

  return (
    <div className="md:hidden sticky top-[53px] z-30 bg-surface/95 backdrop-blur-sm border-b border-surface-border/50">
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none"
      >
        {leagueDivCodes.map((key) => (
          <button
            key={key}
            ref={selectedDiv === key ? activeRef : undefined}
            onClick={() => onDivisionChange(key)}
            className={clsx(
              'shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all',
              selectedDiv === key
                ? 'text-fixed-white shadow-sm'
                : 'bg-surface-card text-gray-400 hover:text-white'
            )}
            style={selectedDiv === key ? { backgroundColor: 'var(--league-primary)' } : undefined}
          >
            {key}
          </button>
        ))}
        {cupDivCodes.length > 0 && (
          <>
            <div className="shrink-0 w-px h-5 bg-surface-border/50" />
            {cupDivCodes.map((key) => (
              <button
                key={key}
                ref={selectedDiv === key ? activeRef : undefined}
                onClick={() => onDivisionChange(key)}
                className={clsx(
                  'shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all',
                  selectedDiv === key
                    ? 'text-fixed-white shadow-sm'
                    : 'bg-surface-card text-gray-400 hover:text-white'
                )}
                style={selectedDiv === key ? { backgroundColor: 'var(--league-primary)' } : undefined}
              >
                {ds.divisions[key]?.name || key}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
