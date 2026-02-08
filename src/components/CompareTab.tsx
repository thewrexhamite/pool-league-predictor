'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, GitCompare, UserX } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode } from '@/lib/types';
import { getTeamPlayers, calcBayesianPct } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';

interface CompareTabProps {
  selectedDiv: DivisionCode;
}

interface PlayerOption {
  name: string;
  team: string;
  div: string;
  p: number;
  w: number;
  pct: number;
  adjPct: number;
}

export default function CompareTab({ selectedDiv }: CompareTabProps) {
  const [showAllDivisions, setShowAllDivisions] = useState(false);
  const [minGames, setMinGames] = useState(5);
  const [searchPlayerA, setSearchPlayerA] = useState('');
  const [searchPlayerB, setSearchPlayerB] = useState('');
  const [selectedPlayerA, setSelectedPlayerA] = useState<PlayerOption | null>(null);
  const [selectedPlayerB, setSelectedPlayerB] = useState<PlayerOption | null>(null);
  const { ds } = useActiveData();

  const divisionName = ds.divisions[selectedDiv]?.name || selectedDiv;

  // URL state management helpers
  function encodePlayerParam(player: PlayerOption): string {
    return `${encodeURIComponent(player.name)}@${encodeURIComponent(player.team)}`;
  }

  function decodePlayerParam(param: string): { name: string; team: string } | null {
    const parts = param.split('@');
    if (parts.length !== 2) return null;
    return {
      name: decodeURIComponent(parts[0]),
      team: decodeURIComponent(parts[1]),
    };
  }

  function updateURL() {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    const baseHash = `#/compare/${selectedDiv}`;

    if (!selectedPlayerA && !selectedPlayerB) {
      // Clear player params from URL
      if (hash !== baseHash) {
        window.history.replaceState(null, '', baseHash);
      }
      return;
    }

    let newHash = baseHash;
    if (selectedPlayerA) {
      newHash += `/${encodePlayerParam(selectedPlayerA)}`;
    } else {
      newHash += '/_'; // Placeholder for empty Player A
    }

    if (selectedPlayerB) {
      newHash += `/${encodePlayerParam(selectedPlayerB)}`;
    }

    if (hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }

  // Get all players based on division filter
  const allPlayers = useMemo(() => {
    const players: PlayerOption[] = [];
    const seen = new Set<string>();

    const divisions = showAllDivisions
      ? Object.keys(ds.divisions)
      : [selectedDiv];

    divisions.forEach(divCode => {
      const teams = ds.divisions[divCode]?.teams || [];
      teams.forEach(team => {
        const roster = getTeamPlayers(team, ds);
        roster.forEach(pl => {
          if (pl.s2526 && pl.s2526.p >= minGames && !seen.has(pl.name + ':' + team)) {
            seen.add(pl.name + ':' + team);
            const adjPct = calcBayesianPct(pl.s2526.w, pl.s2526.p);
            players.push({
              name: pl.name,
              team,
              div: divCode,
              p: pl.s2526.p,
              w: pl.s2526.w,
              pct: pl.s2526.pct,
              adjPct,
            });
          }
        });
      });
    });

    // Sort by adjusted percentage
    players.sort((a, b) => b.adjPct - a.adjPct);
    return players;
  }, [ds, selectedDiv, showAllDivisions, minGames]);

  // Initialize from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash.startsWith('#/compare/')) return;

    const parts = hash.slice(2).split('/'); // Remove #/ prefix
    // parts = ['compare', div, playerA?, playerB?]
    if (parts.length < 3) return;

    const playerAParam = parts[2];
    const playerBParam = parts[3];

    // Restore Player A
    if (playerAParam && playerAParam !== '_') {
      const decoded = decodePlayerParam(playerAParam);
      if (decoded) {
        const player = allPlayers.find(
          p => p.name === decoded.name && p.team === decoded.team
        );
        if (player) {
          setSelectedPlayerA(player);
        }
      }
    }

    // Restore Player B
    if (playerBParam && playerBParam !== '_') {
      const decoded = decodePlayerParam(playerBParam);
      if (decoded) {
        const player = allPlayers.find(
          p => p.name === decoded.name && p.team === decoded.team
        );
        if (player) {
          setSelectedPlayerB(player);
        }
      }
    }
  }, [allPlayers]); // Only run when allPlayers is ready

  // Update URL when selections change
  useEffect(() => {
    updateURL();
  }, [selectedPlayerA, selectedPlayerB, selectedDiv]);

  // Filter players for Player A dropdown (exclude Player B if selected)
  const filteredPlayersA = useMemo(() => {
    let players = allPlayers;

    // Exclude Player B if already selected
    if (selectedPlayerB) {
      players = players.filter(p =>
        !(p.name === selectedPlayerB.name && p.team === selectedPlayerB.team)
      );
    }

    // Apply search filter
    if (searchPlayerA.length >= 2) {
      const q = searchPlayerA.toLowerCase();
      players = players.filter(p =>
        p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)
      );
    }

    return players;
  }, [allPlayers, searchPlayerA, selectedPlayerB]);

  // Filter players for Player B dropdown (exclude Player A if selected)
  const filteredPlayersB = useMemo(() => {
    let players = allPlayers;

    // Exclude Player A if already selected
    if (selectedPlayerA) {
      players = players.filter(p =>
        !(p.name === selectedPlayerA.name && p.team === selectedPlayerA.team)
      );
    }

    // Apply search filter
    if (searchPlayerB.length >= 2) {
      const q = searchPlayerB.toLowerCase();
      players = players.filter(p =>
        p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)
      );
    }

    return players;
  }, [allPlayers, searchPlayerB, selectedPlayerA]);

  function handleSelectPlayerA(player: PlayerOption) {
    // Validate: prevent selecting the same player as Player B
    if (selectedPlayerB && player.name === selectedPlayerB.name && player.team === selectedPlayerB.team) {
      return;
    }
    setSelectedPlayerA(player);
    setSearchPlayerA('');
  }

  function handleSelectPlayerB(player: PlayerOption) {
    // Validate: prevent selecting the same player as Player A
    if (selectedPlayerA && player.name === selectedPlayerA.name && player.team === selectedPlayerA.team) {
      return;
    }
    setSelectedPlayerB(player);
    setSearchPlayerB('');
  }

  function handleClearPlayerA() {
    setSelectedPlayerA(null);
    setSearchPlayerA('');
  }

  function handleClearPlayerB() {
    setSelectedPlayerB(null);
    setSearchPlayerB('');
  }

  function handleClearAll() {
    setSelectedPlayerA(null);
    setSelectedPlayerB(null);
    setSearchPlayerA('');
    setSearchPlayerB('');
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            <GitCompare size={18} className="text-accent md:hidden" />
            <GitCompare size={20} className="text-accent hidden md:inline" />
            <span className="truncate">{showAllDivisions ? 'All Divisions' : divisionName} — Player Comparison</span>
          </h2>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Clear All button - only show when players are selected */}
            {(selectedPlayerA || selectedPlayerB) && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium bg-loss/20 text-loss hover:bg-loss/30 transition"
                title="Clear all selections"
              >
                <X size={14} />
                <span className="hidden sm:inline">Clear All</span>
                <span className="sm:hidden">Clear</span>
              </button>
            )}

            {/* Division filter */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAllDivisions(false)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                  !showAllDivisions ? 'bg-baize text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                )}
              >
                Division
              </button>
              <button
                onClick={() => setShowAllDivisions(true)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                  showAllDivisions ? 'bg-baize text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                )}
              >
                All
              </button>
            </div>

            {/* Min games filter */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Min:</span>
              {[1, 3, 5, 10].map(n => (
                <button
                  key={n}
                  onClick={() => setMinGames(n)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                    minGames === n ? 'bg-baize text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                  )}
                >
                  {n}+
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs md:text-sm text-gray-400">
          Select two players to compare their stats side-by-side
        </p>
      </div>

      {/* Player Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player A Selector */}
        <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
          <h3 className="text-sm font-semibold text-info mb-3">Player A</h3>

          {selectedPlayerA ? (
            <div className="bg-surface border border-surface-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate" title={selectedPlayerA.name}>{selectedPlayerA.name}</div>
                  <div className="text-xs text-gray-400 truncate" title={selectedPlayerA.team}>{selectedPlayerA.team}</div>
                </div>
                <button
                  onClick={handleClearPlayerA}
                  className="text-gray-500 hover:text-white transition ml-2 shrink-0"
                  title="Clear selection"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-xs flex-wrap">
                <span className="text-gray-500 whitespace-nowrap">
                  P: <span className="text-gray-300">{selectedPlayerA.p}</span>
                </span>
                <span className="text-gray-500 whitespace-nowrap">
                  W: <span className="text-win">{selectedPlayerA.w}</span>
                </span>
                <span className="text-gray-500 whitespace-nowrap">
                  Adj%: <span className="text-white font-bold">{selectedPlayerA.adjPct.toFixed(1)}%</span>
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchPlayerA}
                  onChange={e => setSearchPlayerA(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize"
                />
                {searchPlayerA && (
                  <button
                    onClick={() => setSearchPlayerA('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {searchPlayerA.length >= 2 ? (
                filteredPlayersA.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <UserX size={32} className="mx-auto text-gray-600 mb-2 md:mb-3" />
                    <p className="text-gray-500 text-xs md:text-sm">No players found</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {filteredPlayersA.slice(0, 20).map(player => (
                      <button
                        key={player.name + player.team}
                        onClick={() => handleSelectPlayerA(player)}
                        className="w-full text-left p-2 rounded-lg hover:bg-surface-elevated transition border-b border-surface-border/30 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-info truncate" title={player.name}>{player.name}</div>
                            <div className="text-xs text-gray-400 truncate" title={player.team}>{player.team}</div>
                          </div>
                          <div className="text-xs text-gray-500 shrink-0">
                            {player.adjPct.toFixed(1)}%
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-6 md:py-8">
                  <Search size={32} className="mx-auto text-gray-600 mb-2 md:mb-3" />
                  <p className="text-gray-500 text-xs md:text-sm">Type to search players</p>
                  <p className="text-gray-600 text-xs mt-1">{allPlayers.length} players available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Player B Selector */}
        <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
          <h3 className="text-sm font-semibold text-success mb-3">Player B</h3>

          {selectedPlayerB ? (
            <div className="bg-surface border border-surface-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate" title={selectedPlayerB.name}>{selectedPlayerB.name}</div>
                  <div className="text-xs text-gray-400 truncate" title={selectedPlayerB.team}>{selectedPlayerB.team}</div>
                </div>
                <button
                  onClick={handleClearPlayerB}
                  className="text-gray-500 hover:text-white transition ml-2 shrink-0"
                  title="Clear selection"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 md:gap-3 text-xs flex-wrap">
                <span className="text-gray-500 whitespace-nowrap">
                  P: <span className="text-gray-300">{selectedPlayerB.p}</span>
                </span>
                <span className="text-gray-500 whitespace-nowrap">
                  W: <span className="text-win">{selectedPlayerB.w}</span>
                </span>
                <span className="text-gray-500 whitespace-nowrap">
                  Adj%: <span className="text-white font-bold">{selectedPlayerB.adjPct.toFixed(1)}%</span>
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchPlayerB}
                  onChange={e => setSearchPlayerB(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize"
                />
                {searchPlayerB && (
                  <button
                    onClick={() => setSearchPlayerB('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {searchPlayerB.length >= 2 ? (
                filteredPlayersB.length === 0 ? (
                  <div className="text-center py-6 md:py-8">
                    <UserX size={32} className="mx-auto text-gray-600 mb-2 md:mb-3" />
                    <p className="text-gray-500 text-xs md:text-sm">No players found</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {filteredPlayersB.slice(0, 20).map(player => (
                      <button
                        key={player.name + player.team}
                        onClick={() => handleSelectPlayerB(player)}
                        className="w-full text-left p-2 rounded-lg hover:bg-surface-elevated transition border-b border-surface-border/30 last:border-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-success truncate" title={player.name}>{player.name}</div>
                            <div className="text-xs text-gray-400 truncate" title={player.team}>{player.team}</div>
                          </div>
                          <div className="text-xs text-gray-500 shrink-0">
                            {player.adjPct.toFixed(1)}%
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-6 md:py-8">
                  <Search size={32} className="mx-auto text-gray-600 mb-2 md:mb-3" />
                  <p className="text-gray-500 text-xs md:text-sm">Type to search players</p>
                  <p className="text-gray-600 text-xs mt-1">{allPlayers.length} players available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Placeholder for comparison display (will be implemented in later phases) */}
      {selectedPlayerA && selectedPlayerB && (
        <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
          <div className="text-center py-6 md:py-8">
            <GitCompare size={32} className="mx-auto text-accent mb-2 md:mb-3" />
            <p className="text-sm md:text-base text-white font-medium mb-1">
              Comparing {selectedPlayerA.name} vs {selectedPlayerB.name}
            </p>
            <p className="text-gray-500 text-xs md:text-sm">
              Detailed comparison coming soon
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
