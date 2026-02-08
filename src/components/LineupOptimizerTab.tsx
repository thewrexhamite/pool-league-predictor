'use client';

import { useState, useMemo, useEffect } from 'react';
import { Users, Lock, Unlock, Check, X } from 'lucide-react';
import clsx from 'clsx';
import type {
  DivisionCode,
  PlayerAvailability,
  LockedPosition,
  OptimizedLineup,
  LineupAlternative,
} from '@/lib/types';
import {
  filterAvailablePlayers,
  optimizeLineupWithLocks,
  calculateLineupWinProbability,
  generateAlternativeLineups,
} from '@/lib/lineup-optimizer';
import { getTeamPlayers } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';

interface LineupOptimizerTabProps {
  selectedDiv: DivisionCode;
  homeTeam: string;
  awayTeam: string;
  onHomeTeamChange: (team: string) => void;
  onAwayTeamChange: (team: string) => void;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function LineupOptimizerTab({
  selectedDiv,
  homeTeam,
  awayTeam,
  onHomeTeamChange,
  onAwayTeamChange,
  onTeamClick,
  onPlayerClick,
}: LineupOptimizerTabProps) {
  const { data: activeData, ds, frames } = useActiveData();
  const teams = ds.divisions[selectedDiv].teams;

  // State management
  const [playerAvailability, setPlayerAvailability] = useState<PlayerAvailability[]>([]);
  const [lockedPositions, setLockedPositions] = useState<LockedPosition[]>([]);
  const [optimizedLineup, setOptimizedLineup] = useState<OptimizedLineup | null>(null);
  const [alternatives, setAlternatives] = useState<LineupAlternative[]>([]);

  // Get team players for the selected home team
  const teamPlayers = useMemo(() => {
    if (!homeTeam) return [];
    return getTeamPlayers(homeTeam, ds);
  }, [homeTeam, ds]);

  // Initialize player availability when team changes
  useEffect(() => {
    if (teamPlayers.length > 0) {
      setPlayerAvailability(teamPlayers.map(p => ({ name: p.name, available: true })));
      setOptimizedLineup(null);
      setAlternatives([]);
    }
  }, [homeTeam, teamPlayers.length]);

  // Filter available players
  const availablePlayers = useMemo(() => {
    if (teamPlayers.length === 0 || playerAvailability.length === 0) return [];
    return filterAvailablePlayers(teamPlayers, playerAvailability);
  }, [teamPlayers, playerAvailability]);

  // Handle player availability toggle
  const handleTogglePlayer = (playerName: string) => {
    setPlayerAvailability(prev =>
      prev.map(p =>
        p.name === playerName ? { ...p, available: !p.available } : p
      )
    );
  };

  // Handle select all players
  const handleSelectAll = () => {
    setPlayerAvailability(prev => prev.map(p => ({ ...p, available: true })));
  };

  // Handle deselect all players
  const handleDeselectAll = () => {
    setPlayerAvailability(prev => prev.map(p => ({ ...p, available: false })));
  };

  // Handle optimize button click
  const handleOptimize = () => {
    if (!homeTeam || !awayTeam || availablePlayers.length < 10) return;

    // Optimize lineup with locked positions
    const lineup = optimizeLineupWithLocks(
      teamPlayers,
      playerAvailability,
      lockedPositions,
      homeTeam,
      awayTeam,
      true, // isHome
      frames,
      ds.players2526,
      ds
    );

    if (lineup) {
      setOptimizedLineup(lineup);

      // Generate alternatives
      const alts = generateAlternativeLineups(
        lineup,
        teamPlayers,
        playerAvailability,
        lockedPositions,
        homeTeam,
        awayTeam,
        true, // isHome
        frames,
        ds.players2526,
        ds,
        5 // Generate 5 alternatives
      );
      setAlternatives(alts);
    }
  };

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Users size={20} />
          Lineup Optimizer
        </h2>
      </div>

      <p className="text-gray-500 mb-4 text-sm">
        Select your team and opponent, mark available players, and get optimized lineup suggestions
      </p>

      {/* Team Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Your Team (Home)
          </label>
          <select
            value={homeTeam}
            onChange={(e) => onHomeTeamChange(e.target.value)}
            className="w-full bg-surface-elevated border border-surface-border rounded px-3 py-2 text-gray-200"
          >
            <option value="">Select your team</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Opponent (Away)
          </label>
          <select
            value={awayTeam}
            onChange={(e) => onAwayTeamChange(e.target.value)}
            className="w-full bg-surface-elevated border border-surface-border rounded px-3 py-2 text-gray-200"
          >
            <option value="">Select opponent</option>
            {teams.map((t) => (
              <option key={t} value={t} disabled={t === homeTeam}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Player availability selector */}
      {homeTeam && teamPlayers.length > 0 && playerAvailability.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">
              Player Availability ({availablePlayers.length} of {teamPlayers.length} available)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-1 text-xs text-baize hover:text-baize-dark transition"
              >
                <Check size={14} />
                All
              </button>
              <button
                onClick={handleDeselectAll}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition"
              >
                <X size={14} />
                None
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {teamPlayers.map((player) => {
              const availability = playerAvailability.find(p => p.name === player.name);
              const isAvailable = availability?.available ?? true;

              return (
                <label
                  key={player.name}
                  className={clsx(
                    'flex items-center gap-3 p-2 rounded border cursor-pointer transition',
                    isAvailable
                      ? 'bg-surface-elevated border-surface-border hover:border-baize'
                      : 'bg-surface-card border-surface-border opacity-60'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={() => handleTogglePlayer(player.name)}
                    className="w-4 h-4 rounded border-surface-border text-baize focus:ring-baize focus:ring-offset-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{player.name}</div>
                    {player.rating !== null && (
                      <div className="text-xs text-gray-400">
                        Skill: {player.rating.toFixed(0)}
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          {availablePlayers.length < 10 && (
            <div className="mt-2 text-xs text-amber-400">
              ⚠️ Need at least 10 available players to optimize
            </div>
          )}
        </div>
      )}

      {/* Placeholder for lock/unlock interface - to be implemented in subtask-2-3 */}
      {optimizedLineup && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Position Locking (to be implemented)
          </h3>
        </div>
      )}

      {/* Optimize button */}
      <button
        onClick={handleOptimize}
        disabled={!homeTeam || !awayTeam || availablePlayers.length < 10}
        className={clsx(
          'w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-lg mb-6 transition text-fixed-white',
          !homeTeam || !awayTeam || availablePlayers.length < 10
            ? 'bg-surface-elevated text-gray-400 cursor-not-allowed'
            : 'bg-baize hover:bg-baize-dark shadow-card'
        )}
      >
        <Users size={20} />
        Optimize Lineup
      </button>

      {/* Placeholder for optimized lineup display - to be implemented in subtask-2-4 */}
      {!optimizedLineup && homeTeam && awayTeam && (
        <div className="text-center py-8">
          <Users size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500 text-sm">
            Select teams and mark available players, then click Optimize to get lineup suggestions
          </p>
        </div>
      )}

      {/* Placeholder for alternative lineups - to be implemented in subtask-2-5 */}
      {optimizedLineup && alternatives.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Alternative Lineups (to be implemented)
          </h3>
        </div>
      )}
    </div>
  );
}
