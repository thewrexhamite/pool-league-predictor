'use client';

import { useMemo } from 'react';
import { Users, TrendingUp, Swords } from 'lucide-react';
import clsx from 'clsx';
import { suggestLineup } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';

interface LineupRecommendationPanelProps {
  team: string;
  opponent: string;
  isHome: boolean;
  onPlayerClick?: (name: string) => void;
}

export default function LineupRecommendationPanel({ team, opponent, isHome, onPlayerClick }: LineupRecommendationPanelProps) {
  const { ds, frames } = useActiveData();

  const lineup = useMemo(() => {
    if (!team || !opponent || frames.length === 0) return null;
    return suggestLineup(team, opponent, isHome, frames, ds.players2526, ds.rosters);
  }, [team, opponent, isHome, frames, ds.players2526, ds.rosters]);

  if (!lineup) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Recommended Lineup</h3>
        <p className="text-gray-500 text-xs">No lineup data available</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-info" />
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Recommended Lineup</h3>
      </div>

      {/* Set 1 */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Set 1</h4>
        <div className="space-y-1">
          {lineup.set1.map((player, i) => (
            <button
              key={player.name}
              onClick={() => onPlayerClick?.(player.name)}
              className="flex justify-between items-center text-xs bg-surface/50 rounded-lg p-2 w-full text-left hover:bg-surface-elevated/50 transition"
            >
              <span className="flex items-center gap-2">
                <span className="text-gray-600 font-mono text-[10px] w-4">{i + 1}.</span>
                <span className="text-info font-medium">{player.name}</span>
                {player.h2hAdvantage !== 0 && (
                  <span className="flex items-center gap-0.5">
                    <Swords size={10} className={player.h2hAdvantage > 0 ? 'text-win' : 'text-loss'} />
                    <span className={clsx(
                      'text-[10px] font-semibold',
                      player.h2hAdvantage > 0 ? 'text-win' : 'text-loss'
                    )}>
                      {player.h2hAdvantage > 0 ? '+' : ''}{player.h2hAdvantage}
                    </span>
                  </span>
                )}
                {player.formPct !== null && player.formPct >= 65 && (
                  <span className="flex items-center gap-0.5">
                    <TrendingUp size={10} className="text-gold" />
                    <span className="text-[10px] text-gold font-semibold">Hot</span>
                  </span>
                )}
              </span>
              <span className="text-gray-500">
                <span className="text-white font-medium">{player.score.toFixed(0)}</span>
                {player.formPct !== null && (
                  <span className="text-gray-600 ml-2 text-[10px]">F:{player.formPct.toFixed(0)}%</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Set 2 */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Set 2</h4>
        <div className="space-y-1">
          {lineup.set2.map((player, i) => (
            <button
              key={player.name}
              onClick={() => onPlayerClick?.(player.name)}
              className="flex justify-between items-center text-xs bg-surface/50 rounded-lg p-2 w-full text-left hover:bg-surface-elevated/50 transition"
            >
              <span className="flex items-center gap-2">
                <span className="text-gray-600 font-mono text-[10px] w-4">{i + 1}.</span>
                <span className="text-info font-medium">{player.name}</span>
                {player.h2hAdvantage !== 0 && (
                  <span className="flex items-center gap-0.5">
                    <Swords size={10} className={player.h2hAdvantage > 0 ? 'text-win' : 'text-loss'} />
                    <span className={clsx(
                      'text-[10px] font-semibold',
                      player.h2hAdvantage > 0 ? 'text-win' : 'text-loss'
                    )}>
                      {player.h2hAdvantage > 0 ? '+' : ''}{player.h2hAdvantage}
                    </span>
                  </span>
                )}
                {player.formPct !== null && player.formPct >= 65 && (
                  <span className="flex items-center gap-0.5">
                    <TrendingUp size={10} className="text-gold" />
                    <span className="text-[10px] text-gold font-semibold">Hot</span>
                  </span>
                )}
              </span>
              <span className="text-gray-500">
                <span className="text-white font-medium">{player.score.toFixed(0)}</span>
                {player.formPct !== null && (
                  <span className="text-gray-600 ml-2 text-[10px]">F:{player.formPct.toFixed(0)}%</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Insights */}
      {lineup.insights.length > 0 && (
        <div className="bg-surface/50 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Strategic Insights</h4>
          <div className="space-y-1">
            {lineup.insights.map((insight, i) => (
              <div key={i} className="text-[11px] text-gold/80 flex items-start gap-1.5">
                <span className="text-gold/40 mt-0.5">•</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
