'use client';

import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Trophy, TrendingUp, Target, Flame, Award } from 'lucide-react';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';

interface StatsTabProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function StatsTab({ selectedDiv, onTeamClick, onPlayerClick }: StatsTabProps) {
  const [minGames, setMinGames] = useState(5);
  const { ds } = useActiveData();

  const divisionName = ds.divisions[selectedDiv]?.name || selectedDiv;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy size={20} className="text-accent" />
            {divisionName} — League Statistics
          </h2>

          {/* Min games filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Min:</span>
            {[5, 10, 15, 20].map(n => (
              <button
                key={n}
                onClick={() => setMinGames(n)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                  minGames === n ? 'bg-baize text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                )}
              >
                {n}+
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-400">
          Comprehensive leaderboards and statistics across the league
        </p>
      </div>

      {/* Top Players Section - Placeholder */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-sm font-semibold text-accent mb-3 flex items-center gap-1.5">
          <Trophy size={16} />
          Top Players by Win %
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
        </div>
      </div>

      {/* Break & Dish Section - Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-win mb-3 flex items-center gap-1.5">
            <Target size={16} />
            Best Break & Dish (For)
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
          </div>
        </div>

        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-1.5">
            <Target size={16} />
            Best Break & Dish (Against)
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
          </div>
        </div>
      </div>

      {/* Team Records Section - Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-info mb-3 flex items-center gap-1.5">
            <Award size={16} />
            Best Home Records
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
          </div>
        </div>

        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-info mb-3 flex items-center gap-1.5">
            <Award size={16} />
            Best Away Records
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
          </div>
        </div>
      </div>

      {/* Most Improved Section - Placeholder */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-1.5">
          <TrendingUp size={16} />
          Most Improved Players
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
        </div>
      </div>

      {/* Win Streaks Section - Placeholder */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-sm font-semibold text-warning mb-3 flex items-center gap-1.5">
          <Flame size={16} />
          Longest Active Win Streaks
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
        </div>
      </div>
    </div>
  );
}
