'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Users, CheckCircle, XCircle, Info } from 'lucide-react';
import { useActiveData } from '@/lib/active-data-provider';
import { getTeamPlayers } from '@/lib/predictions';
import { usePlayerAvailability } from '@/hooks/use-player-availability';

interface PlayerAvailabilityManagerProps {
  team: string;
  fixtureDate: string | null;
}

export default function PlayerAvailabilityManager({
  team,
  fixtureDate,
}: PlayerAvailabilityManagerProps) {
  const { ds } = useActiveData();
  const { availability, setAvailability } = usePlayerAvailability(fixtureDate);

  // Get team players
  const players = useMemo(() => {
    const teamPlayers = getTeamPlayers(team, ds);
    // Filter to only players with 25/26 season data
    return teamPlayers
      .filter(p => p.s2526 && p.s2526.p > 0)
      .sort((a, b) => {
        const aPlayed = a.s2526?.p ?? 0;
        const bPlayed = b.s2526?.p ?? 0;
        return bPlayed - aPlayed;
      });
  }, [team, ds]);

  // Build availability map for quick lookup
  const availabilityMap = useMemo(() => {
    const map = new Map<string, boolean>();
    availability.forEach(a => {
      map.set(a.playerId, a.available);
    });
    return map;
  }, [availability]);

  // Handle toggle
  const handleToggle = (playerId: string, playerName: string, currentlyAvailable: boolean) => {
    if (!fixtureDate) return;
    setAvailability(fixtureDate, playerId, playerName, !currentlyAvailable);
  };

  if (!fixtureDate) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-white">
              No Upcoming Fixture
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Player availability tracking will appear when you have an upcoming fixture.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-white">
              No Squad Data
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              No players found for this team in the current season.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const availableCount = players.filter(p => availabilityMap.get(p.name) === true).length;
  const unavailableCount = players.filter(p => availabilityMap.get(p.name) === false).length;
  const unmarkedCount = players.length - availableCount - unavailableCount;

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-accent" />
          <h3 className="text-base font-semibold text-white">
            Player Availability
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-win" />
            <span className="text-gray-400">{availableCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-loss" />
            <span className="text-gray-400">{unavailableCount}</span>
          </div>
          {unmarkedCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-3.5 h-3.5 rounded-full bg-gray-500" />
              <span className="text-gray-400">{unmarkedCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Players List */}
      <div className="space-y-2">
        <AnimatePresence>
          {players.map((player) => {
            const playerId = player.name;
            const isAvailable = availabilityMap.get(playerId);
            const played = player.s2526?.p ?? 0;
            const winPct = player.s2526?.pct ?? 0;

            return (
              <motion.div
                key={playerId}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="bg-surface-elevated border border-surface-border rounded-lg p-3"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h4 className="text-sm font-medium text-white truncate">
                        {player.name}
                      </h4>
                      {isAvailable === true && (
                        <CheckCircle className="w-4 h-4 text-win flex-shrink-0" />
                      )}
                      {isAvailable === false && (
                        <XCircle className="w-4 h-4 text-loss flex-shrink-0" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {played} {played === 1 ? 'match' : 'matches'} • {winPct.toFixed(0)}% win rate
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(playerId, player.name, isAvailable === true)}
                    className={clsx(
                      'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-card',
                      isAvailable === true
                        ? 'bg-win'
                        : isAvailable === false
                        ? 'bg-loss'
                        : 'bg-gray-500'
                    )}
                    role="switch"
                    aria-checked={isAvailable === true}
                    aria-label={`Toggle availability for ${player.name}`}
                  >
                    <span
                      className={clsx(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        isAvailable === true ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Help Text */}
      <div className="mt-4 pt-3 border-t border-surface-border">
        <p className="text-xs text-gray-500">
          Tap the toggle to mark players as available (green) or unavailable (red) for this fixture.
        </p>
      </div>
    </div>
  );
}
