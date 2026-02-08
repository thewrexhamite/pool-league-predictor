'use client';

import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { getPlayerStats, getPlayerStats2526, calcBayesianPct } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';

interface PlayerComparisonProps {
  player1: string;
  player2: string;
  onBack: () => void;
}

export default function PlayerComparison({ player1, player2, onBack }: PlayerComparisonProps) {
  const { ds } = useActiveData();
  const stats1 = getPlayerStats2526(player1, ds);
  const stats2 = getPlayerStats2526(player2, ds);
  const playerStats1 = getPlayerStats(player1, ds);
  const playerStats2 = getPlayerStats(player2, ds);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition">
        <ArrowLeft size={16} /> Back
      </button>

      <h2 className="text-xl font-bold mb-6 text-white text-center">Head-to-Head Comparison</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Player 1 */}
        <div className="bg-surface rounded-lg p-4 shadow-card">
          <h3 className="text-lg font-bold text-white text-center mb-4">{player1}</h3>
          {stats1 ? (
            <div className="space-y-3">
              {playerStats1?.rating && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{playerStats1.rating}</div>
                  <div className="text-[10px] text-gray-500">Rating</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats1.total.p}</div>
                <div className="text-[10px] text-gray-500">Played</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-win">{stats1.total.w}</div>
                <div className="text-[10px] text-gray-500">Won</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-info">{calcBayesianPct(stats1.total.w, stats1.total.p).toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">Adj%</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-400">{stats1.total.pct.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">Raw Win%</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center">No stats available</p>
          )}
        </div>

        {/* Player 2 */}
        <div className="bg-surface rounded-lg p-4 shadow-card">
          <h3 className="text-lg font-bold text-white text-center mb-4">{player2}</h3>
          {stats2 ? (
            <div className="space-y-3">
              {playerStats2?.rating && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{playerStats2.rating}</div>
                  <div className="text-[10px] text-gray-500">Rating</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats2.total.p}</div>
                <div className="text-[10px] text-gray-500">Played</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-win">{stats2.total.w}</div>
                <div className="text-[10px] text-gray-500">Won</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-info">{calcBayesianPct(stats2.total.w, stats2.total.p).toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">Adj%</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-400">{stats2.total.pct.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">Raw Win%</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center">No stats available</p>
          )}
        </div>
      </div>
    </div>
  );
}
