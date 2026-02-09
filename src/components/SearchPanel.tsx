'use client';

import clsx from 'clsx';
import { Search, X, Trophy, Users } from 'lucide-react';
import type { DivisionCode } from '@/lib/types';

export interface SearchResult {
  type: 'team' | 'player';
  name: string;
  detail: string;
  div?: DivisionCode;
}

interface SearchPanelProps {
  searchQuery: string;
  searchOpen: boolean;
  searchFocusIndex: number;
  searchResults: SearchResult[];
  searchRef: React.RefObject<HTMLDivElement>;
  searchInputRef: React.RefObject<HTMLInputElement>;
  onSearchQueryChange: (query: string) => void;
  onSearchClear: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent) => void;
  onSearchSelect: (result: SearchResult) => void;
  variant?: 'desktop' | 'mobile';
}

export default function SearchPanel({
  searchQuery,
  searchOpen,
  searchFocusIndex,
  searchResults,
  searchRef,
  searchInputRef,
  onSearchQueryChange,
  onSearchClear,
  onSearchKeyDown,
  onSearchSelect,
  variant = 'desktop',
}: SearchPanelProps) {
  const isMobile = variant === 'mobile';

  return (
    <div className={clsx('relative', isMobile ? 'w-full' : '')} ref={searchRef}>
      <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search teams, players..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        onFocus={() => onSearchQueryChange(searchQuery)}
        onKeyDown={onSearchKeyDown}
        className={clsx(
          'bg-surface-card border border-surface-border rounded-lg pl-8 pr-8 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize',
          isMobile
            ? 'w-full py-2'
            : 'py-1.5 w-52 focus:w-72 transition-all'
        )}
      />
      {searchQuery && (
        <button
          onClick={onSearchClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
        >
          <X size={14} />
        </button>
      )}
      {searchOpen && searchResults.length > 0 && (
        <div
          className={clsx(
            'absolute top-full mt-1 w-full bg-surface-card border border-surface-border rounded-lg shadow-elevated overflow-hidden',
            isMobile && 'z-50'
          )}
        >
          {searchResults.map((r, i) => (
            <button
              key={r.type + r.name}
              onClick={() => onSearchSelect(r)}
              className={clsx(
                'w-full flex items-center gap-2 px-3 text-sm text-left hover:bg-surface-elevated transition',
                isMobile ? 'py-2.5' : 'py-2',
                i === searchFocusIndex && 'bg-surface-elevated'
              )}
            >
              {r.type === 'team' ? (
                <Trophy size={14} className="text-baize shrink-0" />
              ) : (
                <Users size={14} className="text-info shrink-0" />
              )}
              <span className="text-white flex-1 truncate">{r.name}</span>
              <span className="text-gray-500 text-xs shrink-0">{r.detail}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
