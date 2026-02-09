'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, GitMerge, AlertCircle, UserCheck, TrendingUp, ChevronDown, Loader2, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import type { LeaguePlayer } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getAllLeaguePlayers } from '@/lib/predictions';
import { useAuth } from '@/lib/auth';

interface PlayerMergePanelProps {
  // Reserved for future props
}

export default function PlayerMergePanel({}: PlayerMergePanelProps) {
  const { ds } = useActiveData();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<LeaguePlayer[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [mergeTarget, setMergeTarget] = useState<LeaguePlayer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get all league players
  const allPlayers = useMemo(() => getAllLeaguePlayers(ds), [ds]);

  // Filter players by search query
  const filteredPlayers = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return allPlayers
      .filter(p => p.name.toLowerCase().includes(q))
      .slice(0, 20); // Limit results
  }, [allPlayers, searchQuery]);

  // Toggle player selection
  const togglePlayer = (player: LeaguePlayer) => {
    if (selectedPlayers.find(p => p.name === player.name)) {
      setSelectedPlayers(prev => prev.filter(p => p.name !== player.name));
      if (mergeTarget?.name === player.name) {
        setMergeTarget(null);
      }
    } else {
      setSelectedPlayers(prev => [...prev, player]);
      // Auto-select first player as merge target
      if (selectedPlayers.length === 0) {
        setMergeTarget(player);
      }
    }
    setShowPreview(false);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedPlayers([]);
    setMergeTarget(null);
    setShowPreview(false);
    setError(null);
    setSuccess(null);
  };

  // Show merge preview
  const handleShowPreview = () => {
    if (selectedPlayers.length < 2) return;
    if (!mergeTarget) {
      setMergeTarget(selectedPlayers[0]);
    }
    setShowPreview(true);
  };

  // Handle merge confirmation
  const handleConfirmMerge = async () => {
    if (!mergeTarget || selectedPlayers.length < 2) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Get Firebase ID token
      const idToken = user ? await user.getIdToken() : null;
      if (!idToken) {
        setError('Authentication required. Please log in again.');
        setIsSubmitting(false);
        return;
      }

      // Prepare source player names (all except target)
      const sourcePlayerNames = selectedPlayers
        .filter(p => p.name !== mergeTarget.name)
        .map(p => p.name);

      // Call merge API
      const response = await fetch('/api/admin/players/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          seasonId: '2025-26',
          sourcePlayerNames,
          targetPlayerName: mergeTarget.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to merge players');
      }

      // Success!
      setSuccess(data.message || 'Players merged successfully');
      setShowPreview(false);

      // Clear selection after a brief delay
      setTimeout(() => {
        clearSelection();
        // Reload page to refresh player data
        window.location.reload();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate merged stats preview
  const mergedStats = useMemo(() => {
    if (selectedPlayers.length < 2) return null;

    const totalPlayed = selectedPlayers.reduce(
      (sum, p) => sum + (p.totalPlayed2526 || 0),
      0
    );
    const avgPct =
      selectedPlayers.reduce(
        (sum, p) => sum + (p.totalPct2526 || 0) * (p.totalPlayed2526 || 0),
        0
      ) / (totalPlayed || 1);
    const avgAdjPct =
      selectedPlayers.reduce(
        (sum, p) => sum + (p.adjPct2526 || 0) * (p.totalPlayed2526 || 0),
        0
      ) / (totalPlayed || 1);
    const allTeams = [...new Set(selectedPlayers.flatMap(p => p.teams2526))];
    const avgRating =
      selectedPlayers.reduce((sum, p) => sum + (p.rating || 0), 0) /
      selectedPlayers.filter(p => p.rating !== null).length;

    return {
      totalPlayed,
      avgPct,
      avgAdjPct,
      allTeams,
      avgRating: isNaN(avgRating) ? null : avgRating,
    };
  }, [selectedPlayers]);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <GitMerge className="w-5 h-5 text-pink-400" />
        <h2 className="text-lg font-bold text-white">Player Merge Tool</h2>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Search for duplicate player profiles and merge them into a single record. Select 2 or more players to merge.
      </p>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-900/20 rounded-lg p-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1">{error}</div>
              <button
                onClick={() => setError(null)}
                className="text-red-400/70 hover:text-red-400"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex items-start gap-2 text-sm text-green-400 bg-green-900/20 rounded-lg p-3">
              <CheckCircle size={16} className="mt-0.5 shrink-0" />
              <div className="flex-1">{success}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">
          Search Players
        </label>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Type player name (min 2 characters)..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search results */}
        {searchQuery.length >= 2 && (
          <div className="mt-2 bg-surface rounded-lg border border-surface-border max-h-60 overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No players found
              </div>
            ) : (
              <div className="divide-y divide-surface-border/30">
                {filteredPlayers.map(player => {
                  const isSelected = selectedPlayers.find(p => p.name === player.name);
                  return (
                    <button
                      key={player.name}
                      onClick={() => togglePlayer(player)}
                      className={clsx(
                        'w-full flex items-center justify-between p-3 text-left hover:bg-surface-elevated transition',
                        isSelected && 'bg-pink-900/20'
                      )}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white mb-0.5">
                          {player.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {player.teams2526.length > 0
                            ? player.teams2526.join(', ')
                            : 'No teams (24/25 only)'}
                        </div>
                      </div>
                      <div className="text-right mr-3">
                        {player.totalPlayed2526 !== null ? (
                          <>
                            <div className="text-sm font-bold text-info">
                              {player.adjPct2526?.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {player.totalPlayed2526}p
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-600">No 25/26 data</div>
                        )}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-pink-400 flex items-center justify-center">
                          <UserCheck size={12} className="text-fixed-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected players */}
      {selectedPlayers.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
              Selected Players ({selectedPlayers.length})
            </label>
            <button
              onClick={clearSelection}
              className="text-xs text-gray-500 hover:text-white transition"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {selectedPlayers.map(player => (
              <div
                key={player.name}
                className={clsx(
                  'flex items-center justify-between p-3 rounded-lg border transition',
                  mergeTarget?.name === player.name
                    ? 'border-pink-400 bg-pink-900/20'
                    : 'border-surface-border bg-surface'
                )}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-white mb-0.5">
                    {player.name}
                    {mergeTarget?.name === player.name && (
                      <span className="ml-2 text-xs text-pink-400 font-semibold">
                        (Primary)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {player.teams2526.length > 0
                      ? player.teams2526.join(', ')
                      : 'No teams'}
                    {player.totalPlayed2526 !== null &&
                      ` • ${player.totalPlayed2526}p • ${player.adjPct2526?.toFixed(1)}%`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMergeTarget(player)}
                    className={clsx(
                      'text-xs px-2 py-1 rounded transition',
                      mergeTarget?.name === player.name
                        ? 'bg-pink-400 text-fixed-white'
                        : 'bg-surface-elevated text-gray-400 hover:text-white'
                    )}
                  >
                    Set as primary
                  </button>
                  <button
                    onClick={() => togglePlayer(player)}
                    className="text-gray-500 hover:text-white transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {selectedPlayers.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleShowPreview}
            disabled={selectedPlayers.length < 2}
            className="flex items-center gap-2 px-4 py-2 bg-pink-900/30 text-pink-400 rounded-lg hover:bg-pink-900/50 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrendingUp size={14} />
            Show Merge Preview
          </button>
          {selectedPlayers.length < 2 && (
            <span className="text-xs text-gray-500">
              Select at least 2 players
            </span>
          )}
        </div>
      )}

      {/* Merge preview */}
      <AnimatePresence>
        {showPreview && selectedPlayers.length >= 2 && mergedStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-surface rounded-lg border border-pink-400/30 p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <GitMerge className="w-4 h-4 text-pink-400" />
                <h3 className="text-sm font-semibold text-white">Merge Preview</h3>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-900/20 rounded-lg p-3 mb-4">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium mb-1">Warning: This action cannot be undone</p>
                  <p className="text-yellow-400/80">
                    All selected players will be merged into{' '}
                    <span className="font-bold">{mergeTarget?.name}</span>. Historical stats and team associations will be combined.
                  </p>
                </div>
              </div>

              {/* Merged stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-white">
                    {mergedStats.totalPlayed}
                  </div>
                  <div className="text-[10px] text-gray-500">Total Games</div>
                </div>
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-info">
                    {mergedStats.avgAdjPct.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-gray-500">Avg Adj%</div>
                </div>
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-gray-400">
                    {mergedStats.avgPct.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-gray-500">Avg Win%</div>
                </div>
                <div className="bg-surface-elevated rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-white">
                    {mergedStats.allTeams.length}
                  </div>
                  <div className="text-[10px] text-gray-500">Teams</div>
                </div>
              </div>

              {/* Teams list */}
              {mergedStats.allTeams.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">Combined Teams:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {mergedStats.allTeams.map(team => (
                      <span
                        key={team}
                        className="text-xs bg-info-muted/30 text-info px-2 py-0.5 rounded-full"
                      >
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary player info */}
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">
                  Primary Player (data will be preserved under this name):
                </p>
                <div className="bg-surface-elevated rounded-lg p-3">
                  <div className="text-sm font-medium text-white">
                    {mergeTarget?.name}
                  </div>
                </div>
              </div>

              {/* Inline error message during merge */}
              {error && showPreview && (
                <div className="flex items-start gap-2 text-xs text-red-400 bg-red-900/20 rounded-lg p-3 mb-4">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-surface-border/30">
                <button
                  onClick={handleConfirmMerge}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-pink-900/30 text-pink-400 rounded-lg hover:bg-pink-900/50 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Merging...
                    </>
                  ) : (
                    <>
                      <GitMerge size={14} />
                      Confirm Merge
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-surface-elevated text-gray-400 rounded-lg hover:bg-surface transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {selectedPlayers.length === 0 && searchQuery.length < 2 && (
        <div className="text-center py-12">
          <GitMerge size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500 text-sm mb-1">No players selected</p>
          <p className="text-gray-600 text-xs">
            Search for players above to get started
          </p>
        </div>
      )}
    </div>
  );
}
