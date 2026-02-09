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

  // Handle position lock/unlock toggle
  const handleToggleLock = (set: 1 | 2, position: number, playerName: string) => {
    setLockedPositions(prev => {
      const existingLock = prev.find(
        lock => lock.set === set && lock.position === position
      );

      if (existingLock) {
        // If already locked, unlock it
        return prev.filter(lock => !(lock.set === set && lock.position === position));
      } else {
        // Lock this position with this player
        return [...prev, { set, position, playerName }];
      }
    });
  };

  // Check if a position is locked
  const isPositionLocked = (set: 1 | 2, position: number): boolean => {
    return lockedPositions.some(lock => lock.set === set && lock.position === position);
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

  // Handle selecting an alternative lineup
  const handleSelectAlternative = (alternative: LineupAlternative) => {
    setOptimizedLineup(alternative.lineup);
    // Clear alternatives since we've selected one
    setAlternatives([]);
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

      {/* Lock/unlock position interface */}
      {optimizedLineup && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">
              Optimized Lineup
              {lockedPositions.length > 0 && (
                <span className="ml-2 text-xs text-amber-400">
                  ({lockedPositions.length} position{lockedPositions.length > 1 ? 's' : ''} locked)
                </span>
              )}
            </h3>
            {lockedPositions.length > 0 && (
              <button
                onClick={() => setLockedPositions([])}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition"
              >
                <Unlock size={14} />
                Unlock All
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Click the lock icon to lock a player in a specific position
          </p>

          {/* Set 1 */}
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-400 mb-2">Set 1</h4>
            <div className="space-y-2">
              {optimizedLineup.set1.map((playerName, idx) => {
                const position = idx + 1;
                const locked = isPositionLocked(1, position);
                const player = teamPlayers.find(p => p.name === playerName);

                return (
                  <div
                    key={`set1-${position}`}
                    className={clsx(
                      'flex items-center gap-3 p-2 rounded border transition',
                      locked
                        ? 'bg-amber-900/20 border-amber-600/30'
                        : 'bg-surface-elevated border-surface-border'
                    )}
                  >
                    <button
                      onClick={() => handleToggleLock(1, position, playerName)}
                      className={clsx(
                        'p-1 rounded transition',
                        locked
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-gray-500 hover:text-gray-400'
                      )}
                      title={locked ? 'Unlock position' : 'Lock position'}
                    >
                      {locked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <span className="text-xs text-gray-500 w-8">#{position}</span>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onPlayerClick(playerName)}
                        className="text-sm text-gray-200 hover:text-white transition truncate text-left w-full"
                      >
                        {playerName}
                      </button>
                      {player?.rating !== null && (
                        <div className="text-xs text-gray-400">
                          Skill: {player?.rating?.toFixed(0) || 'N/A'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Set 2 */}
          <div>
            <h4 className="text-xs font-medium text-gray-400 mb-2">Set 2</h4>
            <div className="space-y-2">
              {optimizedLineup.set2.map((playerName, idx) => {
                const position = idx + 1;
                const locked = isPositionLocked(2, position);
                const player = teamPlayers.find(p => p.name === playerName);

                return (
                  <div
                    key={`set2-${position}`}
                    className={clsx(
                      'flex items-center gap-3 p-2 rounded border transition',
                      locked
                        ? 'bg-amber-900/20 border-amber-600/30'
                        : 'bg-surface-elevated border-surface-border'
                    )}
                  >
                    <button
                      onClick={() => handleToggleLock(2, position, playerName)}
                      className={clsx(
                        'p-1 rounded transition',
                        locked
                          ? 'text-amber-400 hover:text-amber-300'
                          : 'text-gray-500 hover:text-gray-400'
                      )}
                      title={locked ? 'Unlock position' : 'Lock position'}
                    >
                      {locked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <span className="text-xs text-gray-500 w-8">#{position}</span>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onPlayerClick(playerName)}
                        className="text-sm text-gray-200 hover:text-white transition truncate text-left w-full"
                      >
                        {playerName}
                      </button>
                      {player?.rating !== null && (
                        <div className="text-xs text-gray-400">
                          Skill: {player?.rating?.toFixed(0) || 'N/A'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expected score */}
          <div className="mt-4 bg-surface/50 rounded-lg p-4 text-center">
            <span className="text-2xl font-bold text-white">
              {optimizedLineup.winProbability.expectedHome.toFixed(1)} - {optimizedLineup.winProbability.expectedAway.toFixed(1)}
            </span>
            <span className="text-gray-500 ml-2 text-sm">Expected Score</span>
          </div>

          {/* Win probability */}
          <div className="mt-3 p-3 bg-surface-elevated rounded border border-surface-border">
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide font-medium">Win Probability</div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-lg font-bold text-baize">
                  {(optimizedLineup.winProbability.pWin * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Win</div>
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-draw">
                  {(optimizedLineup.winProbability.pDraw * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Draw</div>
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-loss">
                  {(optimizedLineup.winProbability.pLoss * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Loss</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-surface-border">
              <div className="text-xs text-gray-500">
                Confidence: <span className="text-white font-medium">{(optimizedLineup.winProbability.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
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

      {/* Alternative lineups display */}
      {optimizedLineup && alternatives.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">
              Alternative Lineups
            </h3>
            <span className="text-xs text-gray-500">
              {alternatives.length} option{alternatives.length > 1 ? 's' : ''} found
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Explore alternative lineup configurations with different probability outcomes
          </p>
          <div className="space-y-4">
            {alternatives.map((alt) => {
              const diffPercentage = (alt.probabilityDiff * 100).toFixed(1);
              const isNegative = alt.probabilityDiff < 0;

              return (
                <div
                  key={`alt-${alt.rank}`}
                  className="bg-surface-elevated border border-surface-border rounded-lg p-4 hover:border-baize/50 transition"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Option #{alt.rank}
                      </span>
                      <span
                        className={clsx(
                          'text-xs font-medium',
                          isNegative ? 'text-loss' : 'text-baize'
                        )}
                      >
                        {isNegative ? '' : '+'}{diffPercentage}% Win
                      </span>
                    </div>
                    <button
                      onClick={() => handleSelectAlternative(alt)}
                      className="text-xs text-baize hover:text-baize-dark font-medium transition"
                    >
                      Use This Lineup
                    </button>
                  </div>

                  {/* Win probabilities comparison */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-surface-card rounded">
                      <div className="text-sm font-bold text-baize">
                        {(alt.lineup.winProbability.pWin * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Win</div>
                    </div>
                    <div className="text-center p-2 bg-surface-card rounded">
                      <div className="text-sm font-bold text-draw">
                        {(alt.lineup.winProbability.pDraw * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Draw</div>
                    </div>
                    <div className="text-center p-2 bg-surface-card rounded">
                      <div className="text-sm font-bold text-loss">
                        {(alt.lineup.winProbability.pLoss * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">Loss</div>
                    </div>
                  </div>

                  {/* Expected score */}
                  <div className="text-center py-2 mb-3 bg-surface-card rounded">
                    <span className="text-sm font-bold text-white">
                      {alt.lineup.winProbability.expectedHome.toFixed(1)} - {alt.lineup.winProbability.expectedAway.toFixed(1)}
                    </span>
                    <span className="text-gray-500 ml-2 text-xs">Expected Score</span>
                  </div>

                  {/* Lineup preview - compact view */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Set 1 */}
                    <div>
                      <div className="text-xs text-gray-400 mb-2 font-medium">Set 1</div>
                      <div className="space-y-1">
                        {alt.lineup.set1.map((playerName, idx) => {
                          const player = teamPlayers.find(p => p.name === playerName);
                          return (
                            <div
                              key={`alt-${alt.rank}-set1-${idx}`}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="text-gray-500 w-6">#{idx + 1}</span>
                              <button
                                onClick={() => onPlayerClick(playerName)}
                                className="text-gray-300 hover:text-white transition truncate text-left flex-1"
                              >
                                {playerName}
                              </button>
                              {player?.rating !== null && (
                                <span className="text-gray-500 text-xs">
                                  {player?.rating?.toFixed(0)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Set 2 */}
                    <div>
                      <div className="text-xs text-gray-400 mb-2 font-medium">Set 2</div>
                      <div className="space-y-1">
                        {alt.lineup.set2.map((playerName, idx) => {
                          const player = teamPlayers.find(p => p.name === playerName);
                          return (
                            <div
                              key={`alt-${alt.rank}-set2-${idx}`}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="text-gray-500 w-6">#{idx + 1}</span>
                              <button
                                onClick={() => onPlayerClick(playerName)}
                                className="text-gray-300 hover:text-white transition truncate text-left flex-1"
                              >
                                {playerName}
                              </button>
                              {player?.rating !== null && (
                                <span className="text-gray-500 text-xs">
                                  {player?.rating?.toFixed(0)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Confidence indicator */}
                  <div className="mt-3 pt-3 border-t border-surface-border text-xs text-gray-500">
                    Confidence: <span className="text-white font-medium">{(alt.lineup.winProbability.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
