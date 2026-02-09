'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, X, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { useActiveData } from '@/lib/active-data-provider';
import { getAllLeaguePlayers, getPlayerStats2526, calcPlayerForm, calcBayesianPct } from '@/lib/predictions';
import type { LeaguePlayer } from '@/lib/types';

interface QuickLookupModeProps {
  onClose?: () => void;
}

export default function QuickLookupMode({ onClose }: QuickLookupModeProps) {
  const { ds, frames } = useActiveData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Get all players - pure client-side, no API calls (offline-safe)
  const allPlayers = useMemo(() => getAllLeaguePlayers(ds), [ds]);

  // Filter players in real-time based on search query (max 8 results for clean UI)
  // Optimized for sub-500ms response time with early returns
  const filteredPlayers = useMemo(() => {
    if (searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase().trim();
    return allPlayers
      .filter(player => {
        // Early return on name match - avoid checking teams if name matches
        if (player.name.toLowerCase().includes(query)) return true;
        // Only check teams if name didn't match
        return player.teams2526.some(team => team.toLowerCase().includes(query));
      })
      .slice(0, 8);
  }, [searchQuery, allPlayers]);

  // Calculate stats for selected player
  const selectedPlayerStats = useMemo(() => {
    if (!selectedPlayer) return null;
    return getPlayerStats2526(selectedPlayer, ds);
  }, [selectedPlayer, ds]);

  const selectedPlayerForm = useMemo(() => {
    if (!selectedPlayer || frames.length === 0) return null;
    return calcPlayerForm(selectedPlayer, frames);
  }, [selectedPlayer, frames]);

  // Memoize Bayesian rating calculation to avoid recomputing on every render
  const selectedPlayerBayesianRating = useMemo(() => {
    if (!selectedPlayerStats) return null;
    return calcBayesianPct(selectedPlayerStats.total.w, selectedPlayerStats.total.p);
  }, [selectedPlayerStats]);

  // Reset focused index when search query changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Escape key - close modal or go back to search
    if (e.key === 'Escape') {
      e.preventDefault();
      if (selectedPlayer) {
        setSelectedPlayer(null);
      } else if (onClose) {
        onClose();
      }
      return;
    }

    // Only handle arrow keys and Enter when we have results and no player selected
    if (selectedPlayer || filteredPlayers.length === 0) return;

    // Arrow Down - move focus down
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const next = prev < filteredPlayers.length - 1 ? prev + 1 : 0;
        resultsRef.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return next;
      });
    }

    // Arrow Up - move focus up
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredPlayers.length - 1;
        resultsRef.current[next]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return next;
      });
    }

    // Enter - select focused result
    if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < filteredPlayers.length) {
      e.preventDefault();
      setSelectedPlayer(filteredPlayers[focusedIndex].name);
    }
  }, [selectedPlayer, filteredPlayers, focusedIndex, onClose]);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // If a player is selected, show stats card
  if (selectedPlayer) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6" role="dialog" aria-label="Player Details">
        <button
          onClick={() => setSelectedPlayer(null)}
          className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition"
          aria-label="Back to search"
        >
          <ArrowLeft size={16} /> Back to search
        </button>
        <h2 className="text-xl font-bold mb-4 text-white" id="player-name">{selectedPlayer}</h2>

        {/* Stats Card */}
        {selectedPlayerStats && (
          <div className="space-y-4">
            {/* Current Season Overview */}
            <div className="bg-surface rounded-lg p-4 shadow-card">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">25/26 Season</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{selectedPlayerStats.total.p}</div>
                  <div className="text-[10px] text-gray-500">Played</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-win">{selectedPlayerStats.total.w}</div>
                  <div className="text-[10px] text-gray-500">Won</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-baize">
                    {selectedPlayerBayesianRating?.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-gray-500">Rating</div>
                </div>
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm text-gray-400">
                  Win% {selectedPlayerStats.total.pct.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Form */}
            {selectedPlayerForm && (
              <div className="bg-surface rounded-lg p-4 shadow-card">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  Current Form
                  <span className={clsx(
                    'text-xs font-medium',
                    selectedPlayerForm.trend === 'hot' ? 'text-win' : selectedPlayerForm.trend === 'cold' ? 'text-loss' : 'text-gray-500'
                  )}>
                    {selectedPlayerForm.trend === 'hot' && <TrendingUp size={14} className="inline" />}
                    {selectedPlayerForm.trend === 'cold' && <TrendingDown size={14} className="inline" />}
                    {' '}{selectedPlayerForm.trend === 'hot' ? 'Hot' : selectedPlayerForm.trend === 'cold' ? 'Cold' : 'Steady'}
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-xl font-bold text-info">{selectedPlayerForm.last5.pct.toFixed(0)}%</div>
                    <div className="text-[10px] text-gray-500">
                      Last 5 ({selectedPlayerForm.last5.w}/{selectedPlayerForm.last5.p})
                    </div>
                    <div className="w-full bg-surface-elevated rounded-full h-1.5 mt-2">
                      <div className="bg-info h-1.5 rounded-full" style={{ width: `${selectedPlayerForm.last5.pct}%` }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-accent">{selectedPlayerForm.last10.pct.toFixed(0)}%</div>
                    <div className="text-[10px] text-gray-500">
                      Last 10 ({selectedPlayerForm.last10.w}/{selectedPlayerForm.last10.p})
                    </div>
                    <div className="w-full bg-surface-elevated rounded-full h-1.5 mt-2">
                      <div className="bg-accent h-1.5 rounded-full" style={{ width: `${selectedPlayerForm.last10.pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Teams */}
            {selectedPlayerStats.teams.length > 0 && (
              <div className="bg-surface rounded-lg p-4 shadow-card">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Teams</h3>
                <div className="space-y-2">
                  {selectedPlayerStats.teams.map((team, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-white">
                        {team.team}
                        {team.cup && <span className="ml-1 text-gold text-[9px]">Cup</span>}
                      </span>
                      <span className="text-gray-400">
                        {team.w}/{team.p} ({team.pct.toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6" role="dialog" aria-label="Quick Lookup">
      <h2 className="text-lg font-bold mb-4 text-white" id="quick-lookup-title">Quick Lookup</h2>

      {/* Search input with large touch targets (min 44px height) */}
      <div className="relative w-full">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search players or teams..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-surface-border rounded-lg pl-12 pr-12 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-baize min-h-[44px]"
          autoFocus
          aria-label="Search players or teams"
          aria-describedby="search-instructions"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-activedescendant={focusedIndex >= 0 ? `result-${focusedIndex}` : undefined}
          role="combobox"
          aria-expanded={filteredPlayers.length > 0}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
            aria-label="Clear search"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchQuery.length >= 2 ? (
        <div className="mt-4">
          {filteredPlayers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm mb-3" role="status" aria-live="polite">
                {filteredPlayers.length} {filteredPlayers.length === 1 ? 'player' : 'players'} found
              </p>
              <div
                id="search-results"
                className="max-h-[60vh] overflow-y-auto"
                role="listbox"
                aria-label="Search results"
              >
                {filteredPlayers.map((player, index) => (
                  <div
                    key={player.name}
                    id={`result-${index}`}
                    ref={el => { resultsRef.current[index] = el; }}
                    onClick={() => setSelectedPlayer(player.name)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedPlayer(player.name);
                      }
                    }}
                    className={clsx(
                      'bg-surface border rounded-lg p-4 transition cursor-pointer mb-2',
                      focusedIndex === index
                        ? 'border-baize ring-2 ring-baize ring-opacity-50'
                        : 'border-surface-border hover:border-baize'
                    )}
                    role="option"
                    aria-selected={focusedIndex === index}
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{player.name}</h3>
                        {player.teams2526.length > 0 && (
                          <p className="text-sm text-gray-400 mt-1 truncate">
                            {player.teams2526.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 text-right flex-shrink-0">
                        {player.adjPct2526 !== null && (
                          <p className="text-lg font-bold text-baize">
                            {player.adjPct2526.toFixed(1)}%
                          </p>
                        )}
                        {player.totalPlayed2526 !== null && player.totalPlayed2526 > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {player.totalPlayed2526} {player.totalPlayed2526 === 1 ? 'game' : 'games'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8" role="status">
              No players found matching &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p id="search-instructions" className="text-gray-500 text-sm text-center py-8">
            Start typing to search for players or teams. Use arrow keys to navigate, Enter to select, Escape to close.
          </p>
        </div>
      )}
    </div>
  );
}
