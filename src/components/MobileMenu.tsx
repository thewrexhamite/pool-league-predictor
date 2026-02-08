'use client';

import { RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Search, X, Star, Clock, RefreshCw, Trophy, Users } from 'lucide-react';
import type { DivisionCode } from '@/lib/types';
import type { Divisions } from '@/lib/types';
import ThemeToggle from './ThemeToggle';
import { UserMenu } from './auth';

interface SearchResult {
  type: 'team' | 'player';
  name: string;
  detail: string;
  div?: DivisionCode;
}

interface LeagueInfo {
  id: string;
  name: string;
  shortName: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  menuRef: RefObject<HTMLDivElement>;
  // Search
  searchQuery: string;
  searchOpen: boolean;
  searchResults: SearchResult[];
  searchRef: RefObject<HTMLDivElement>;
  searchInputRef: RefObject<HTMLInputElement>;
  searchFocusIndex: number;
  onSearchQueryChange: (query: string) => void;
  onSearchFocus: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent) => void;
  onSearchSelect: (result: SearchResult) => void;
  onSearchClear: () => void;
  // Leagues
  leagues: LeagueInfo[];
  selectedLeagueId: string | null;
  onSwitchLeague: (leagueId: string) => void;
  // Divisions
  divisions: Divisions;
  selectedDiv: DivisionCode;
  onDivisionChange: (div: DivisionCode) => void;
  // My Team
  myTeam: { team: string; div: DivisionCode } | null;
  onMyTeamClick: () => void;
  // Time Machine
  timeMachineDate: string | null;
  timeMachineOpen: boolean;
  availableDates: string[];
  onTimeMachineToggle: () => void;
  onTimeMachineDateSelect: (date: string | null) => void;
  // User/Auth
  onLoginClick: () => void;
  onNotificationSettingsClick: () => void;
  // Data freshness
  timeAgo: string | null;
  refreshing: boolean;
}

export default function MobileMenu({
  isOpen,
  menuRef,
  searchQuery,
  searchOpen,
  searchResults,
  searchRef,
  searchInputRef,
  searchFocusIndex,
  onSearchQueryChange,
  onSearchFocus,
  onSearchKeyDown,
  onSearchSelect,
  onSearchClear,
  leagues,
  selectedLeagueId,
  onSwitchLeague,
  divisions,
  selectedDiv,
  onDivisionChange,
  myTeam,
  onMyTeamClick,
  timeMachineDate,
  timeMachineOpen,
  availableDates,
  onTimeMachineToggle,
  onTimeMachineDateSelect,
  onLoginClick,
  onNotificationSettingsClick,
  timeAgo,
  refreshing,
}: MobileMenuProps) {
  const divisionCodes = Object.keys(divisions) as DivisionCode[];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden overflow-hidden"
        >
          <div className="pt-3 pb-2 space-y-3 border-t border-surface-border/50 mt-2">
            {/* Search */}
            <div className="relative" ref={searchRef}>
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search teams, players..."
                value={searchQuery}
                onChange={e => onSearchQueryChange(e.target.value)}
                onFocus={onSearchFocus}
                onKeyDown={onSearchKeyDown}
                className="w-full bg-surface-card border border-surface-border rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize"
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
                <div className="absolute top-full mt-1 w-full bg-surface-card border border-surface-border rounded-lg shadow-elevated overflow-hidden z-50">
                  {searchResults.map((r, i) => (
                    <button
                      key={r.type + r.name}
                      onClick={() => onSearchSelect(r)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-surface-elevated transition',
                        i === searchFocusIndex && 'bg-surface-elevated'
                      )}
                    >
                      {r.type === 'team' ? <Trophy size={14} className="text-baize shrink-0" /> : <Users size={14} className="text-info shrink-0" />}
                      <span className="text-white flex-1 truncate">{r.name}</span>
                      <span className="text-gray-500 text-xs">{r.detail}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* League switcher */}
            {leagues.length > 1 && selectedLeagueId && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">League</div>
                <div className="flex gap-1">
                  {leagues.map(l => (
                    <button
                      key={l.id}
                      onClick={() => onSwitchLeague(l.id)}
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
            )}

            {/* Division pills */}
            {divisionCodes.length > 0 && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Division</div>
                <div className="flex gap-1">
                  {divisionCodes.map((key) => (
                    <button
                      key={key}
                      onClick={() => onDivisionChange(key)}
                      className={clsx(
                        'flex-1 py-1.5 rounded-lg text-xs font-medium transition text-center',
                        selectedDiv === key
                          ? 'text-fixed-white'
                          : 'bg-surface-card text-gray-400'
                      )}
                      style={selectedDiv === key ? { backgroundColor: 'var(--league-primary)' } : undefined}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* My Team + Time Machine side by side */}
            <div className="flex gap-2">
              <button
                onClick={onMyTeamClick}
                className="flex-1 flex items-center justify-center gap-1.5 bg-surface-card border border-surface-border rounded-lg py-2 text-xs text-gray-300 hover:text-white transition"
              >
                <Star size={14} className={myTeam ? 'text-accent fill-current' : 'text-gray-400'} />
                {myTeam ? myTeam.team : 'Set My Team'}
              </button>
              <button
                onClick={onTimeMachineToggle}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-1.5 bg-surface-card border border-surface-border rounded-lg py-2 text-xs transition',
                  timeMachineDate ? 'text-accent border-accent/30' : 'text-gray-300 hover:text-white'
                )}
              >
                <Clock size={14} />
                {timeMachineDate || 'Time Machine'}
              </button>
            </div>

            {/* Theme picker */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Theme</div>
              <ThemeToggle variant="segmented" />
            </div>

            {/* Account */}
            <div className="flex items-center justify-between bg-surface-card border border-surface-border rounded-lg px-3 py-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Account</span>
              <UserMenu
                onLoginClick={onLoginClick}
                onNotificationSettingsClick={onNotificationSettingsClick}
              />
            </div>

            {/* Inline Time Machine date picker */}
            {timeMachineOpen && (
              <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
                <div className="p-2 border-b border-surface-border/30">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Time Machine</div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <button
                    onClick={() => onTimeMachineDateSelect(null)}
                    className={clsx(
                      'w-full text-left px-3 py-1.5 text-xs transition hover:bg-surface-elevated',
                      !timeMachineDate ? 'text-baize font-bold' : 'text-gray-300'
                    )}
                  >
                    Present (live)
                  </button>
                  {[...availableDates].reverse().map(date => (
                    <button
                      key={date}
                      onClick={() => onTimeMachineDateSelect(date)}
                      className={clsx(
                        'w-full text-left px-3 py-1.5 text-xs transition hover:bg-surface-elevated',
                        timeMachineDate === date ? 'text-accent font-bold' : 'text-gray-400'
                      )}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Data freshness */}
            {timeAgo && (
              <div className={clsx(
                'flex items-center justify-center gap-1 text-xs text-gray-500',
                refreshing && 'animate-pulse-subtle'
              )}>
                <RefreshCw size={10} className={clsx(refreshing && 'animate-spin')} />
                Data updated {timeAgo}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
