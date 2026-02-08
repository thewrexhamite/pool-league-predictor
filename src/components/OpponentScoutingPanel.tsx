'use client';

import { useMemo } from 'react';
import { Home, Plane, Crosshair, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import { generateScoutingReport } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';

interface OpponentScoutingPanelProps {
  opponent: string;
  onPlayerClick?: (name: string) => void;
}

export default function OpponentScoutingPanel({ opponent, onPlayerClick }: OpponentScoutingPanelProps) {
  const { ds, frames } = useActiveData();

  const scoutingReport = useMemo(() => {
    if (!opponent || frames.length === 0) return null;
    return generateScoutingReport(opponent, frames, ds.results, ds.players2526);
  }, [opponent, frames, ds.results, ds.players2526]);

  if (!scoutingReport) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Opponent Scouting Report</h3>
        <p className="text-gray-500 text-xs">No scouting data available</p>
      </div>
    );
  }

  const { teamForm, homeAway, setPerformance, bdStats, strongestPlayers, weakestPlayers, forfeitRate } = scoutingReport;

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Opponent Scouting Report</h3>

      {/* Team Form */}
      {teamForm.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Form</h4>
          <div className="flex gap-1">
            {teamForm.map((r, i) => (
              <span
                key={i}
                className={clsx(
                  'w-8 h-8 rounded text-xs font-bold flex items-center justify-center',
                  r === 'W' ? 'bg-win-muted text-win' : r === 'L' ? 'bg-loss-muted text-loss' : 'bg-surface-elevated text-draw'
                )}
              >
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Home/Away Split */}
      {(homeAway.home.p > 0 || homeAway.away.p > 0) && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Home / Away Split</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-1.5 justify-center mb-1">
                <Home size={14} className="text-win" />
                <span className="text-lg font-bold text-win">{homeAway.home.winPct.toFixed(0)}%</span>
              </div>
              <div className="text-[10px] text-gray-500 text-center">Home Win%</div>
              <div className="w-full bg-surface-elevated rounded-full h-1.5 mt-1.5">
                <div className="bg-win h-1.5 rounded-full" style={{ width: `${homeAway.home.winPct}%` }} />
              </div>
              <div className="text-[10px] text-gray-600 text-center mt-1">
                {homeAway.home.w}-{homeAway.home.d}-{homeAway.home.l}
              </div>
            </div>
            <div className="bg-surface rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-1.5 justify-center mb-1">
                <Plane size={14} className="text-loss" />
                <span className="text-lg font-bold text-loss">{homeAway.away.winPct.toFixed(0)}%</span>
              </div>
              <div className="text-[10px] text-gray-500 text-center">Away Win%</div>
              <div className="w-full bg-surface-elevated rounded-full h-1.5 mt-1.5">
                <div className="bg-loss h-1.5 rounded-full" style={{ width: `${homeAway.away.winPct}%` }} />
              </div>
              <div className="text-[10px] text-gray-600 text-center mt-1">
                {homeAway.away.w}-{homeAway.away.d}-{homeAway.away.l}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Performance */}
      {setPerformance && (setPerformance.set1.played > 0 || setPerformance.set2.played > 0) && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Set Performance</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-lg font-bold text-info">{setPerformance.set1.pct.toFixed(0)}%</div>
              <div className="text-[10px] text-gray-500">
                Set 1 ({setPerformance.set1.won}/{setPerformance.set1.played})
              </div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-lg font-bold text-accent">{setPerformance.set2.pct.toFixed(0)}%</div>
              <div className="text-[10px] text-gray-500">
                Set 2 ({setPerformance.set2.won}/{setPerformance.set2.played})
              </div>
            </div>
          </div>
          <div className="text-[10px] text-gray-600 text-center mt-1">
            {Math.abs(setPerformance.bias) < 3
              ? 'Balanced'
              : setPerformance.bias > 0
              ? `Stronger Set 1 (+${setPerformance.bias.toFixed(0)}pp)`
              : `Stronger Set 2 (${setPerformance.bias.toFixed(0)}pp)`}
          </div>
        </div>
      )}

      {/* Break & Dish Stats */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Break & Dish</h4>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Crosshair, label: 'BD+ /g', value: bdStats.bdFRate.toFixed(2), color: 'text-win' },
            { icon: Shield, label: 'BD- /g', value: bdStats.bdARate.toFixed(2), color: 'text-loss' },
            {
              icon: null,
              label: 'Net BD',
              value: `${bdStats.netBD > 0 ? '+' : ''}${bdStats.netBD}`,
              color: bdStats.netBD > 0 ? 'text-win' : bdStats.netBD < 0 ? 'text-loss' : 'text-gray-400',
            },
            { icon: null, label: 'Forf /g', value: forfeitRate.toFixed(2), color: 'text-gold' },
          ].map((s, i) => (
            <div key={i} className="bg-surface rounded-lg p-2 text-center shadow-card">
              <div className={clsx('text-sm font-bold', s.color)}>{s.value}</div>
              <div className="text-[9px] text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Strongest Players */}
      {strongestPlayers.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <TrendingUp size={12} className="text-win" />
            Key Threats
          </h4>
          <div className="space-y-1">
            {strongestPlayers.map((pl) => (
              <button
                key={pl.name}
                onClick={() => onPlayerClick?.(pl.name)}
                className="flex justify-between items-center text-xs bg-surface/50 rounded-lg p-2 w-full text-left hover:bg-surface-elevated/50 transition"
              >
                <span className="text-info font-medium">{pl.name}</span>
                <span className="text-gray-500">
                  <span className="text-white font-medium">{pl.adjPct.toFixed(0)}%</span>{' '}
                  <span className="text-gray-600">({pl.p}P)</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Weakest Players */}
      {weakestPlayers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <TrendingDown size={12} className="text-loss" />
            Vulnerable Players
          </h4>
          <div className="space-y-1">
            {weakestPlayers.map((pl) => (
              <button
                key={pl.name}
                onClick={() => onPlayerClick?.(pl.name)}
                className="flex justify-between items-center text-xs bg-surface/50 rounded-lg p-2 w-full text-left hover:bg-surface-elevated/50 transition"
              >
                <span className="text-info font-medium">{pl.name}</span>
                <span className="text-gray-500">
                  <span className="text-white font-medium">{pl.adjPct.toFixed(0)}%</span>{' '}
                  <span className="text-gray-600">({pl.p}P)</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
