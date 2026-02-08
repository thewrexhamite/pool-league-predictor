'use client';

import { useState, useMemo } from 'react';
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

  // Filter players for Player A dropdown
  const filteredPlayersA = useMemo(() => {
    if (searchPlayerA.length < 2) return allPlayers;
    const q = searchPlayerA.toLowerCase();
    return allPlayers.filter(p =>
      p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)
    );
  }, [allPlayers, searchPlayerA]);

  // Filter players for Player B dropdown
  const filteredPlayersB = useMemo(() => {
    if (searchPlayerB.length < 2) return allPlayers;
    const q = searchPlayerB.toLowerCase();
    return allPlayers.filter(p =>
      p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)
    );
  }, [allPlayers, searchPlayerB]);

  function handleSelectPlayerA(player: PlayerOption) {
    setSelectedPlayerA(player);
    setSearchPlayerA('');
  }

  function handleSelectPlayerB(player: PlayerOption) {
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GitCompare size={20} className="text-accent" />
            {showAllDivisions ? 'All Divisions' : divisionName} — Player Comparison
          </h2>

          <div className="flex items-center gap-3 flex-wrap">
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

        <p className="text-sm text-gray-400">
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
                <div>
                  <div className="font-medium text-white">{selectedPlayerA.name}</div>
                  <div className="text-xs text-gray-400">{selectedPlayerA.team}</div>
                </div>
                <button
                  onClick={handleClearPlayerA}
                  className="text-gray-500 hover:text-white transition"
                  title="Clear selection"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">
                  P: <span className="text-gray-300">{selectedPlayerA.p}</span>
                </span>
                <span className="text-gray-500">
                  W: <span className="text-win">{selectedPlayerA.w}</span>
                </span>
                <span className="text-gray-500">
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
                  <div className="text-center py-8">
                    <UserX size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-500 text-sm">No players found</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {filteredPlayersA.slice(0, 20).map(player => (
                      <button
                        key={player.name + player.team}
                        onClick={() => handleSelectPlayerA(player)}
                        className="w-full text-left p-2 rounded-lg hover:bg-surface-elevated transition border-b border-surface-border/30 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-info">{player.name}</div>
                            <div className="text-xs text-gray-400">{player.team}</div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {player.adjPct.toFixed(1)}%
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <Search size={40} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500 text-sm">Type to search players</p>
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
                <div>
                  <div className="font-medium text-white">{selectedPlayerB.name}</div>
                  <div className="text-xs text-gray-400">{selectedPlayerB.team}</div>
                </div>
                <button
                  onClick={handleClearPlayerB}
                  className="text-gray-500 hover:text-white transition"
                  title="Clear selection"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-500">
                  P: <span className="text-gray-300">{selectedPlayerB.p}</span>
                </span>
                <span className="text-gray-500">
                  W: <span className="text-win">{selectedPlayerB.w}</span>
                </span>
                <span className="text-gray-500">
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
                  <div className="text-center py-8">
                    <UserX size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-500 text-sm">No players found</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {filteredPlayersB.slice(0, 20).map(player => (
                      <button
                        key={player.name + player.team}
                        onClick={() => handleSelectPlayerB(player)}
                        className="w-full text-left p-2 rounded-lg hover:bg-surface-elevated transition border-b border-surface-border/30 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-success">{player.name}</div>
                            <div className="text-xs text-gray-400">{player.team}</div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {player.adjPct.toFixed(1)}%
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <Search size={40} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-500 text-sm">Type to search players</p>
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
          <div className="text-center py-8">
            <GitCompare size={40} className="mx-auto text-accent mb-3" />
            <p className="text-white font-medium mb-1">
              Comparing {selectedPlayerA.name} vs {selectedPlayerB.name}
            </p>
            <p className="text-gray-500 text-sm">
              Detailed comparison coming soon
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
