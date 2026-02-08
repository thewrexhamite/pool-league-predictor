'use client';

import { useState, useMemo } from 'react';
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

  // Get all players
  const allPlayers = useMemo(() => getAllLeaguePlayers(ds), [ds]);

  // Filter players in real-time based on search query (max 8 results for clean UI)
  const filteredPlayers = useMemo(() => {
    if (searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase().trim();
    return allPlayers
      .filter(player => {
        const nameMatch = player.name.toLowerCase().includes(query);
        const teamMatch = player.teams2526.some(team => team.toLowerCase().includes(query));
        return nameMatch || teamMatch;
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

  // If a player is selected, show stats card
  if (selectedPlayer) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <button
          onClick={() => setSelectedPlayer(null)}
          className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition"
        >
          <ArrowLeft size={16} /> Back to search
        </button>
        <h2 className="text-xl font-bold mb-4 text-white">{selectedPlayer}</h2>

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
                    {calcBayesianPct(selectedPlayerStats.total.w, selectedPlayerStats.total.p).toFixed(1)}%
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
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <h2 className="text-lg font-bold mb-4 text-white">Quick Lookup</h2>

      {/* Search input with large touch targets (min 44px height) */}
      <div className="relative w-full">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search players or teams..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-surface-border rounded-lg pl-12 pr-12 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-baize min-h-[44px]"
          autoFocus
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
              <p className="text-gray-400 text-sm mb-3">
                {filteredPlayers.length} {filteredPlayers.length === 1 ? 'player' : 'players'} found
              </p>
              <div className="max-h-[60vh] overflow-y-auto">
                {filteredPlayers.map(player => (
                  <div
                    key={player.name}
                    onClick={() => setSelectedPlayer(player.name)}
                    className="bg-surface border border-surface-border rounded-lg p-4 hover:border-baize transition cursor-pointer"
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
            <p className="text-gray-500 text-sm text-center py-8">
              No players found matching &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-gray-500 text-sm text-center py-8">
            Start typing to search for players or teams
          </p>
        </div>
      )}
    </div>
  );
}
