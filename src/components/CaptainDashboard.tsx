'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Calendar,
  Clock,
  MapPin,
  Home,
  Plane,
  Info,
} from 'lucide-react';
import type { SimulationResult } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { useMyTeam } from '@/hooks/use-my-team';
import { getRemainingFixtures, parseDate } from '@/lib/predictions';
import OpponentScoutingPanel from './OpponentScoutingPanel';
import LineupRecommendationPanel from './LineupRecommendationPanel';
import PlayerAvailabilityManager from './PlayerAvailabilityManager';
import SeasonGoalsPanel from './SeasonGoalsPanel';

interface CaptainDashboardProps {
  simResults: SimulationResult[] | null;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function CaptainDashboard({
  simResults,
  onTeamClick,
  onPlayerClick,
}: CaptainDashboardProps) {
  const { ds } = useActiveData();
  const { myTeam } = useMyTeam();
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Get next fixture
  const nextFixture = useMemo(() => {
    if (!myTeam) return null;
    const remaining = getRemainingFixtures(myTeam.div, ds);
    const teamFixtures = remaining
      .filter(f => f.home === myTeam.team || f.away === myTeam.team)
      .sort((a, b) => parseDate(a.date).localeCompare(parseDate(b.date)));
    return teamFixtures[0] || null;
  }, [myTeam, ds]);

  // Determine opponent and home/away status
  const opponent = useMemo(() => {
    if (!nextFixture || !myTeam) return null;
    return nextFixture.home === myTeam.team ? nextFixture.away : nextFixture.home;
  }, [nextFixture, myTeam]);

  const isHome = useMemo(() => {
    if (!nextFixture || !myTeam) return false;
    return nextFixture.home === myTeam.team;
  }, [nextFixture, myTeam]);

  // Countdown timer
  useEffect(() => {
    if (!nextFixture) return;

    const updateCountdown = () => {
      const fixtureDate = parseDate(nextFixture.date);
      const now = new Date();
      const diff = new Date(fixtureDate).getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Match day!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [nextFixture]);

  // Show message if no team is claimed
  if (!myTeam) {
    return (
      <div className="space-y-4">
        <div className="bg-surface-card rounded-card shadow-card p-6">
          <div className="flex items-start gap-4">
            <Info className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Claim Your Team
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                The Captain&apos;s Dashboard is your mission control for match preparation.
                To use it, you need to claim a team first.
              </p>
              <p className="text-xs text-gray-500">
                Navigate to the <span className="text-accent font-medium">My Team</span> tab
                and click on your team name to claim it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const divisionName = ds.divisions[myTeam.div]?.name ?? myTeam.div;

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-surface-card rounded-card shadow-card p-4"
      >
        <h2 className="text-lg font-bold text-white mb-1">Captain&apos;s Dashboard</h2>
        <p className="text-sm text-gray-400">
          {myTeam.team} • {divisionName}
        </p>
      </motion.div>

      {/* Next Fixture Card */}
      {nextFixture ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-gradient-to-br from-surface-card to-surface-elevated rounded-card shadow-card p-4 md:p-6 border border-accent/20"
        >
          {/* Fixture Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent" />
              <h3 className="text-base font-semibold text-white">Next Fixture</h3>
            </div>
            {timeLeft && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-muted/20 border border-accent/30 rounded-lg">
                <Clock className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-accent">{timeLeft}</span>
              </div>
            )}
          </div>

          {/* Match Details */}
          <div className="bg-surface rounded-lg p-4 mb-4">
            <div className="flex items-center justify-center gap-4">
              {/* Home Team */}
              <button
                onClick={() => onTeamClick(nextFixture.home)}
                className={clsx(
                  'flex-1 text-center p-3 rounded-lg transition hover:bg-surface-elevated',
                  nextFixture.home === myTeam.team && 'ring-2 ring-accent/40 bg-accent-muted/10'
                )}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Home className="w-4 h-4 text-win" />
                  {nextFixture.home === myTeam.team && (
                    <span className="text-xs font-semibold text-accent uppercase tracking-wide">You</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-white">{nextFixture.home}</p>
              </button>

              {/* VS */}
              <div className="flex-shrink-0 px-3 py-1.5 bg-surface-elevated rounded text-xs font-bold text-gray-400">
                VS
              </div>

              {/* Away Team */}
              <button
                onClick={() => onTeamClick(nextFixture.away)}
                className={clsx(
                  'flex-1 text-center p-3 rounded-lg transition hover:bg-surface-elevated',
                  nextFixture.away === myTeam.team && 'ring-2 ring-accent/40 bg-accent-muted/10'
                )}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Plane className="w-4 h-4 text-loss" />
                  {nextFixture.away === myTeam.team && (
                    <span className="text-xs font-semibold text-accent uppercase tracking-wide">You</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-white">{nextFixture.away}</p>
              </button>
            </div>

            {/* Date & Venue */}
            <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{nextFixture.date}</span>
              </div>
              {nextFixture.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{nextFixture.venue}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-surface-card rounded-card shadow-card p-4"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-white">
                No Upcoming Fixtures
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                All fixtures for this season have been completed.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Player Availability */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <PlayerAvailabilityManager
          team={myTeam.team}
          fixtureDate={nextFixture?.date ?? null}
        />
      </motion.div>

      {/* Opponent Scouting & Lineup - Only show if we have a next fixture */}
      {opponent && nextFixture && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <OpponentScoutingPanel
              opponent={opponent}
              onPlayerClick={onPlayerClick}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <LineupRecommendationPanel
              team={myTeam.team}
              opponent={opponent}
              isHome={isHome}
              onPlayerClick={onPlayerClick}
            />
          </motion.div>
        </>
      )}

      {/* Season Goals */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <SeasonGoalsPanel
          simResults={simResults}
          team={myTeam.team}
        />
      </motion.div>
    </div>
  );
}
