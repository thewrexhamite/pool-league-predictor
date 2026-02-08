'use client';

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { useActiveData } from '@/lib/active-data-provider';
import { getAllLeaguePlayers } from '@/lib/predictions';
import type { LeaguePlayer } from '@/lib/types';

interface QuickLookupModeProps {
  onClose?: () => void;
}

export default function QuickLookupMode({ onClose }: QuickLookupModeProps) {
  const { ds } = useActiveData();
  const [searchQuery, setSearchQuery] = useState('');

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
