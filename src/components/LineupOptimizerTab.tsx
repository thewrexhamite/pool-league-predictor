'use client';

import { useState, useMemo } from 'react';
import { Users, Lock, Unlock } from 'lucide-react';
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
  useMemo(() => {
    if (teamPlayers.length > 0 && playerAvailability.length === 0) {
      setPlayerAvailability(teamPlayers.map(p => ({ name: p.name, available: true })));
    }
  }, [teamPlayers, playerAvailability.length]);

  // Filter available players
  const availablePlayers = useMemo(() => {
    if (teamPlayers.length === 0 || playerAvailability.length === 0) return [];
    return filterAvailablePlayers(teamPlayers, playerAvailability);
  }, [teamPlayers, playerAvailability]);

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

      {/* Placeholder for player availability selector - to be implemented in subtask-2-2 */}
      {homeTeam && teamPlayers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">
            Player Availability (to be implemented)
          </h3>
          <div className="text-gray-500 text-sm">
            {teamPlayers.length} players on roster
          </div>
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
