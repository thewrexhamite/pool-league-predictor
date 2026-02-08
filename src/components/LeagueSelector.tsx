'use client';

import { motion } from 'framer-motion';
import { Trophy, ChevronRight } from 'lucide-react';
import { useLeague } from '@/lib/league-context';
import type { LeagueMeta, SeasonMeta } from '@/lib/types';

export default function LeagueSelector() {
  const { leagues, loading, selectLeague } = useLeague();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <div className="text-center mb-8">
            <div className="skeleton w-48 h-8 mx-auto mb-2" />
            <div className="skeleton w-64 h-4 mx-auto" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold">
              <span className="text-gray-100">Pool League </span>
              <span className="text-accent">Pro</span>
            </h1>
          </div>
          <p className="text-sm text-gray-500">
            Select a league and season to get started
          </p>
        </div>

        {/* League cards */}
        <div className="space-y-4">
          {leagues.map(league => (
            <LeagueCard key={league.id} league={league} onSelect={selectLeague} />
          ))}
        </div>

        {/* Empty state */}
        {leagues.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No leagues available</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

interface LeagueCardProps {
  league: LeagueMeta;
  onSelect: (leagueId: string, seasonId: string) => void;
}

function LeagueCard({ league, onSelect }: LeagueCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-card border border-surface-border rounded-lg overflow-hidden hover:border-accent/30 transition-colors"
    >
      <div className="px-5 py-4 border-b border-surface-border/50">
        <h2 className="font-semibold text-lg text-white">{league.name}</h2>
        {league.shortName !== league.name && (
          <p className="text-xs text-gray-500 mt-0.5">{league.shortName}</p>
        )}
      </div>
      <div className="p-2 space-y-1">
        {league.seasons.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            No seasons available
          </div>
        ) : (
          league.seasons.map(season => (
            <SeasonRow
              key={season.id}
              league={league}
              season={season}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </motion.div>
  );
}

interface SeasonRowProps {
  league: LeagueMeta;
  season: SeasonMeta;
  onSelect: (leagueId: string, seasonId: string) => void;
}

function SeasonRow({ league, season, onSelect }: SeasonRowProps) {
  return (
    <button
      onClick={() => onSelect(league.id, season.id)}
      className="w-full flex items-center justify-between px-4 py-3 rounded-md text-sm hover:bg-surface-elevated transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-300 font-medium">{season.label}</span>
        {season.current && (
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-baize/20 text-baize-light px-2 py-0.5 rounded">
            Current
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">
          {season.divisions.length} {season.divisions.length === 1 ? 'division' : 'divisions'}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-accent transition-colors" />
      </div>
    </button>
  );
}
