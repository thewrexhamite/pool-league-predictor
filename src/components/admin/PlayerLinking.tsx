'use client';

import { useState, useMemo } from 'react';
import { Search, X, Link as LinkIcon, Users, Loader2, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { getAuthToken } from '@/lib/auth/admin-auth';
import type { Players2526Map } from '@/lib/types';

// Helper to make authenticated API calls
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
}

interface PlayerWithLeague {
  name: string;
  leagueId: string;
  leagueName: string;
  teams: string[];
  played: number;
  won: number;
  pct: number;
}

interface PlayerLinkingProps {
  playersDataByLeague: Map<string, { leagueName: string; players2526: Players2526Map }>;
}

export default function PlayerLinking({ playersDataByLeague }: PlayerLinkingProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Flatten all players across all leagues
  const allPlayers = useMemo<PlayerWithLeague[]>(() => {
    const players: PlayerWithLeague[] = [];

    playersDataByLeague.forEach((data, leagueId) => {
      Object.entries(data.players2526).forEach(([name, playerData]) => {
        players.push({
          name,
          leagueId,
          leagueName: data.leagueName,
          teams: playerData.teams.map(t => t.team),
          played: playerData.total.p,
          won: playerData.total.w,
          pct: playerData.total.pct,
        });
      });
    });

    return players.sort((a, b) => a.name.localeCompare(b.name));
  }, [playersDataByLeague]);

  // Filter players based on search query
  const filteredPlayers = useMemo(() => {
    if (searchQuery.length < 2) return allPlayers;

    const q = searchQuery.toLowerCase();
    return allPlayers.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.leagueName.toLowerCase().includes(q) ||
        p.teams.some(t => t.toLowerCase().includes(q))
    );
  }, [allPlayers, searchQuery]);

  // Group filtered players by name for duplicate detection
  const playersByName = useMemo(() => {
    const grouped = new Map<string, PlayerWithLeague[]>();
    filteredPlayers.forEach(p => {
      const key = p.name.toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(p);
    });
    return grouped;
  }, [filteredPlayers]);

  // Detect potential duplicates (same name in different leagues)
  const potentialDuplicates = useMemo(() => {
    return Array.from(playersByName.entries())
      .filter(([_, players]) => players.length > 1)
      .map(([name, players]) => ({ name, players }));
  }, [playersByName]);

  // Handle player selection
  const togglePlayerSelection = (playerId: string) => {
    const newSelected = new Set(selectedPlayers);
    if (newSelected.has(playerId)) {
      newSelected.delete(playerId);
    } else {
      newSelected.add(playerId);
    }
    setSelectedPlayers(newSelected);
  };

  // Handle linking selected players
  const handleLinkPlayers = async () => {
    if (selectedPlayers.size < 2) {
      setMessage({ type: 'error', text: 'Please select at least 2 players to link' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setIsLinking(true);
    setMessage(null);

    try {
      // Use the first selected player as the canonical ID
      const [canonical, ...linked] = Array.from(selectedPlayers);

      const response = await fetchWithAuth('/api/admin/players/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: canonical,
          linkedPlayers: linked,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link players');
      }

      setMessage({
        type: 'success',
        text: `Successfully linked ${selectedPlayers.size} players`,
      });
      setSelectedPlayers(new Set());
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to link players';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLinking(false);
    }
  };

  // Generate unique key for player (name + leagueId)
  const getPlayerKey = (player: PlayerWithLeague) => `${player.name}::${player.leagueId}`;

  // Select all players with the same name (for quick duplicate linking)
  const selectDuplicates = (name: string) => {
    const players = playersByName.get(name.toLowerCase()) || [];
    const newSelected = new Set(selectedPlayers);
    players.forEach(p => newSelected.add(getPlayerKey(p)));
    setSelectedPlayers(newSelected);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Player Linking</h2>
          <p className="text-sm text-gray-400 mt-1">
            Link player profiles across different leagues
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {allPlayers.length} players across {playersDataByLeague.size} leagues
        </div>
      </div>

      {/* Alert Messages */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={clsx(
              'rounded-lg p-4 flex items-center gap-2',
              message.type === 'success' ? 'bg-win/20 text-win' : 'bg-loss/20 text-loss'
            )}
          >
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Potential Duplicates Section */}
      {potentialDuplicates.length > 0 && (
        <div className="bg-info-muted/20 border border-info-muted/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="text-info" size={18} />
            <h3 className="text-sm font-semibold text-info">
              Potential Duplicates ({potentialDuplicates.length})
            </h3>
          </div>
          <div className="space-y-2">
            {potentialDuplicates.slice(0, 5).map(({ name, players }) => (
              <div
                key={name}
                className="bg-surface-card rounded p-3 flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-white">{players[0].name}</div>
                  <div className="text-xs text-gray-500">
                    Appears in: {players.map(p => p.leagueName).join(', ')}
                  </div>
                </div>
                <button
                  onClick={() => selectDuplicates(name)}
                  className="btn btn-sm btn-info"
                  disabled={isLinking}
                >
                  <LinkIcon size={14} />
                  Select All
                </button>
              </div>
            ))}
            {potentialDuplicates.length > 5 && (
              <p className="text-xs text-gray-500 text-center">
                ...and {potentialDuplicates.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Search and Actions */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Search players, leagues, or teams..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input input-bordered w-full pl-10 pr-10 bg-surface text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={handleLinkPlayers}
          disabled={selectedPlayers.size < 2 || isLinking}
          className={clsx(
            'btn btn-primary',
            (selectedPlayers.size < 2 || isLinking) && 'btn-disabled'
          )}
        >
          {isLinking ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Linking...
            </>
          ) : (
            <>
              <LinkIcon size={18} />
              Link {selectedPlayers.size > 0 ? `(${selectedPlayers.size})` : 'Players'}
            </>
          )}
        </button>
      </div>

      {/* Selected Players Info */}
      {selectedPlayers.size > 0 && (
        <div className="bg-surface-card rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedPlayers.size} player{selectedPlayers.size !== 1 ? 's' : ''} selected
          </div>
          <button
            onClick={() => setSelectedPlayers(new Set())}
            className="text-sm text-info hover:text-info-light transition"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Players Table */}
      <div className="bg-surface-card rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="border-b border-surface-border/30">
                <th className="bg-surface-elevated">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={
                      filteredPlayers.length > 0 &&
                      filteredPlayers.every(p => selectedPlayers.has(getPlayerKey(p)))
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        const newSelected = new Set(selectedPlayers);
                        filteredPlayers.forEach(p => newSelected.add(getPlayerKey(p)));
                        setSelectedPlayers(newSelected);
                      } else {
                        setSelectedPlayers(new Set());
                      }
                    }}
                  />
                </th>
                <th className="bg-surface-elevated text-gray-500 uppercase text-xs">Player</th>
                <th className="bg-surface-elevated text-gray-500 uppercase text-xs">League</th>
                <th className="bg-surface-elevated text-gray-500 uppercase text-xs">Teams</th>
                <th className="bg-surface-elevated text-gray-500 uppercase text-xs text-center">
                  P
                </th>
                <th className="bg-surface-elevated text-gray-500 uppercase text-xs text-center">
                  W
                </th>
                <th className="bg-surface-elevated text-gray-500 uppercase text-xs text-center">
                  Win%
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-8">
                    {searchQuery ? 'No players found matching your search' : 'No players available'}
                  </td>
                </tr>
              ) : (
                filteredPlayers.map(player => {
                  const key = getPlayerKey(player);
                  const isSelected = selectedPlayers.has(key);
                  const duplicates = playersByName.get(player.name.toLowerCase()) || [];
                  const isDuplicate = duplicates.length > 1;

                  return (
                    <tr
                      key={key}
                      className={clsx(
                        'border-b border-surface-border/20 hover:bg-surface-elevated/50 transition cursor-pointer',
                        isSelected && 'bg-info-muted/20',
                        isDuplicate && 'border-l-4 border-l-info-muted/50'
                      )}
                      onClick={() => togglePlayerSelection(key)}
                    >
                      <td>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm"
                          checked={isSelected}
                          onChange={() => togglePlayerSelection(key)}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td>
                        <div className="font-medium text-white flex items-center gap-2">
                          {player.name}
                          {isDuplicate && (
                            <span
                              className="badge badge-xs badge-info"
                              title={`Appears in ${duplicates.length} leagues`}
                            >
                              {duplicates.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-gray-400">{player.leagueName}</span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {player.teams.slice(0, 2).map((team, i) => (
                            <span
                              key={i}
                              className="text-xs bg-surface-elevated px-2 py-0.5 rounded-full text-gray-400"
                            >
                              {team}
                            </span>
                          ))}
                          {player.teams.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{player.teams.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center text-sm">{player.played}</td>
                      <td className="text-center text-sm text-win">{player.won}</td>
                      <td className="text-center">
                        <span className="font-medium text-white">
                          {player.pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div>
          Showing {filteredPlayers.length} of {allPlayers.length} players
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-info hover:text-info-light transition"
          >
            Clear search
          </button>
        )}
      </div>
    </div>
  );
}
