'use client';

import { useMemo } from 'react';
import { Crown, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { calcPowerRankings } from '@/lib/stats';
import FadeInOnScroll from './ui/FadeInOnScroll';

const COMPONENT_LABELS = [
  { key: 'points' as const, label: 'Pts', color: 'bg-accent' },
  { key: 'form' as const, label: 'Form', color: 'bg-win' },
  { key: 'mov' as const, label: 'MoV', color: 'bg-info' },
  { key: 'sos' as const, label: 'SoS', color: 'bg-gold' },
  { key: 'trajectory' as const, label: 'Traj', color: 'bg-purple-500' },
];

const WEIGHTS = { points: 0.30, form: 0.25, mov: 0.20, sos: 0.15, trajectory: 0.10 };

interface PowerRankingsTabProps {
  selectedDiv: DivisionCode;
  myTeam: { team: string; div: DivisionCode } | null;
  onTeamClick: (team: string) => void;
}

export default function PowerRankingsTab({ selectedDiv, myTeam, onTeamClick }: PowerRankingsTabProps) {
  const { ds, frames } = useActiveData();

  const rankings = useMemo(
    () => calcPowerRankings(selectedDiv, ds, frames),
    [selectedDiv, ds, frames]
  );

  if (rankings.length === 0) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-8 text-center">
        <p className="text-gray-500 text-sm">No power rankings data available yet.</p>
      </div>
    );
  }

  return (
    <FadeInOnScroll>
      <div className="card-interactive bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crown size={18} className="text-accent" />
          <h2 className="text-lg font-bold text-white">Power Rankings</h2>
          <span className="text-gray-500 text-sm font-normal">— {ds.divisions[selectedDiv]?.name}</span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-[10px] text-gray-500">
          {COMPONENT_LABELS.map(c => (
            <span key={c.key} className="flex items-center gap-1">
              <span className={clsx('w-2 h-2 rounded-sm', c.color)} />
              {c.label} ({(WEIGHTS[c.key] * 100).toFixed(0)}%)
            </span>
          ))}
        </div>

        {/* Rankings table */}
        <div className="space-y-1.5">
          {rankings.map((r) => {
            const rankChange = r.previousRank !== null ? r.previousRank - r.rank : null;
            const isMyTeam = myTeam && r.team === myTeam.team && selectedDiv === myTeam.div;

            return (
              <button
                key={r.team}
                onClick={() => onTeamClick(r.team)}
                className={clsx(
                  'w-full flex items-center gap-3 p-3 rounded-lg hover:bg-surface-elevated/50 transition text-left',
                  isMyTeam && 'ring-1 ring-accent/30'
                )}
              >
                {/* Rank badge */}
                <span className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  r.rank === 1 ? 'bg-accent/20 text-accent' :
                  r.rank <= 3 ? 'bg-surface-elevated text-gray-300' :
                  'bg-surface text-gray-500'
                )}>
                  {r.rank}
                </span>

                {/* Movement arrows */}
                <span className="w-6 flex items-center justify-center shrink-0">
                  {rankChange !== null && rankChange !== 0 ? (
                    <span className={clsx(
                      'flex items-center text-xs',
                      rankChange > 0 ? 'text-win' : 'text-loss'
                    )}>
                      {rankChange > 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {Math.abs(rankChange)}
                    </span>
                  ) : rankChange === 0 ? (
                    <Minus size={12} className="text-gray-600" />
                  ) : null}
                </span>

                {/* Team name */}
                <span className="flex-1 text-sm font-medium text-white truncate min-w-0">
                  {r.team}
                </span>

                {/* Composite score */}
                <span className="text-sm font-bold text-gray-300 w-12 text-right shrink-0">
                  {(r.score * 100).toFixed(1)}
                </span>

                {/* Component breakdown bar */}
                <div className="hidden sm:flex w-32 h-3 rounded-full overflow-hidden bg-surface shrink-0" title={
                  COMPONENT_LABELS.map(c => `${c.label}: ${(r.components[c.key] * 100).toFixed(0)}`).join(' | ')
                }>
                  {COMPONENT_LABELS.map(c => (
                    <div
                      key={c.key}
                      className={clsx(c.color, 'h-full')}
                      style={{ width: `${(r.components[c.key] * WEIGHTS[c.key] / r.score) * 100}%` }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer explanation */}
        <p className="text-[10px] text-gray-600 mt-4 text-center">
          Composite score based on points, recent form, margin of victory, strength of schedule, and trajectory.
        </p>
      </div>
    </FadeInOnScroll>
  );
}
