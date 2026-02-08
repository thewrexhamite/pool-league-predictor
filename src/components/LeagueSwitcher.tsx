'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import type { LeagueMeta } from '@/lib/types';

interface LeagueSwitcherProps {
  leagues: LeagueMeta[];
  selectedLeagueId: string;
  onSelect: (leagueId: string) => void;
  variant?: 'desktop' | 'mobile';
}

export default function LeagueSwitcher({ leagues, selectedLeagueId, onSelect, variant = 'desktop' }: LeagueSwitcherProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId);

  // Click-outside to close dropdown
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const handleSelect = (leagueId: string) => {
    onSelect(leagueId);
    setDropdownOpen(false);
  };

  if (leagues.length === 0) return null;
  if (leagues.length === 1 && variant === 'desktop') return null;

  // Desktop dropdown variant
  if (variant === 'desktop') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(prev => !prev)}
          className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition px-1.5 py-0.5 rounded border border-surface-border/50 hover:border-surface-border"
        >
          {selectedLeague?.shortName}
          <ChevronDown size={10} className={clsx('transition-transform', dropdownOpen && 'rotate-180')} />
        </button>
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1 bg-surface-card border border-surface-border rounded-lg shadow-elevated z-50 min-w-[160px] overflow-hidden">
            {leagues.map(l => {
              const isActive = l.id === selectedLeagueId;
              return (
                <button
                  key={l.id}
                  onClick={() => handleSelect(l.id)}
                  className={clsx(
                    'w-full text-left px-3 py-2 text-xs transition hover:bg-surface-elevated',
                    isActive ? 'font-bold' : 'text-gray-300'
                  )}
                  style={isActive ? { color: 'var(--league-primary)' } : undefined}
                >
                  {l.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Mobile pill variant
  return (
    <div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">League</div>
      <div className="flex gap-1">
        {leagues.map(l => (
          <button
            key={l.id}
            onClick={() => handleSelect(l.id)}
            className={clsx(
              'flex-1 py-1.5 rounded-lg text-xs font-medium transition text-center',
              l.id === selectedLeagueId
                ? 'text-fixed-white'
                : 'bg-surface-card text-gray-400'
            )}
            style={l.id === selectedLeagueId ? { backgroundColor: 'var(--league-primary)' } : undefined}
          >
            {l.shortName}
          </button>
        ))}
      </div>
    </div>
  );
}
