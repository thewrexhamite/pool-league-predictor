'use client';

import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Trophy, TrendingUp, Shield, Target } from 'lucide-react';
import type { SimulationResult } from '@/lib/types';

interface SeasonGoalsPanelProps {
  simResults: SimulationResult[] | null;
  team: string;
}

export default function SeasonGoalsPanel({ simResults, team }: SeasonGoalsPanelProps) {
  // Find team in simulation results
  const teamResult = simResults?.find(r => r.team === team);

  if (!teamResult) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={18} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-300">Season Goals</h3>
        </div>
        <div className="text-center py-6">
          <Target size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-sm text-gray-400">Run a simulation to see your season goals</p>
          <p className="text-xs text-gray-500 mt-1">
            Navigate to Simulate tab and click &quot;Run Season Simulation&quot;
          </p>
        </div>
      </div>
    );
  }

  const pTitle = parseFloat(teamResult.pTitle);
  const pTop2 = parseFloat(teamResult.pTop2);
  const pBot2 = parseFloat(teamResult.pBot2);

  // Helper to get color class based on probability
  const getColorClass = (value: number, thresholds: { high: number; medium: number }) => {
    if (value >= thresholds.high) return 'text-win';
    if (value >= thresholds.medium) return 'text-draw';
    return 'text-gray-400';
  };

  const getBarColorClass = (value: number, thresholds: { high: number; medium: number }) => {
    if (value >= thresholds.high) return 'bg-win';
    if (value >= thresholds.medium) return 'bg-draw';
    return 'bg-gray-600';
  };

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target size={18} className="text-accent" />
        <h3 className="text-sm font-semibold text-gray-300">Season Goals</h3>
      </div>

      {/* Current Points */}
      <div className="mb-4 p-3 bg-surface-elevated rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Current Points</span>
          <span className="text-xl font-bold text-white">{teamResult.currentPts}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-400">Average Projection</span>
          <span className="text-sm font-semibold text-accent">{teamResult.avgPts} pts</span>
        </div>
      </div>

      {/* Goals */}
      <div className="space-y-4">
        {/* Title Chance */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Trophy size={14} className="text-gold" />
              <span className="text-xs text-gray-300 font-medium">Win Title</span>
            </div>
            <span
              className={clsx(
                'text-lg font-bold',
                getColorClass(pTitle, { high: 20, medium: 5 })
              )}
            >
              {pTitle.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
            <motion.div
              className={clsx(
                'h-full rounded-full',
                getBarColorClass(pTitle, { high: 20, medium: 5 })
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pTitle, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Probability of finishing 1st and winning the division
          </p>
        </div>

        {/* Top 2 Chance */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-accent" />
              <span className="text-xs text-gray-300 font-medium">Top 2 Finish</span>
            </div>
            <span
              className={clsx(
                'text-lg font-bold',
                getColorClass(pTop2, { high: 40, medium: 15 })
              )}
            >
              {pTop2.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
            <motion.div
              className={clsx(
                'h-full rounded-full',
                getBarColorClass(pTop2, { high: 40, medium: 15 })
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pTop2, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Probability of promotion (top 2 finish)
          </p>
        </div>

        {/* Bottom 2 Risk */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Shield size={14} className="text-lose" />
              <span className="text-xs text-gray-300 font-medium">Relegation Risk</span>
            </div>
            <span
              className={clsx(
                'text-lg font-bold',
                // Inverted logic - lower is better for relegation risk
                pBot2 >= 40 ? 'text-lose' : pBot2 >= 15 ? 'text-draw' : 'text-win'
              )}
            >
              {pBot2.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
            <motion.div
              className={clsx(
                'h-full rounded-full',
                // Inverted logic - higher risk is worse (red)
                pBot2 >= 40 ? 'bg-lose' : pBot2 >= 15 ? 'bg-draw' : 'bg-gray-600'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pBot2, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-1">
            Probability of finishing in bottom 2 (relegation zone)
          </p>
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-4 p-2 bg-accent-muted/10 border border-accent/20 rounded text-[10px] text-gray-500">
        Based on 1,000 Monte Carlo simulations of remaining fixtures
      </div>
    </div>
  );
}
