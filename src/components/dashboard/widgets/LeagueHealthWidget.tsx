'use client';

import { useMemo } from 'react';
import { Heart } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { calcCompetitivenessIndex } from '@/lib/stats';

interface LeagueHealthWidgetProps {
  selectedDiv: DivisionCode;
}

export default function LeagueHealthWidget({ selectedDiv }: LeagueHealthWidgetProps) {
  const { ds } = useActiveData();

  const health = useMemo(
    () => calcCompetitivenessIndex(selectedDiv, ds),
    [selectedDiv, ds]
  );

  const compLabel = health.competitivenessIndex >= 70 ? 'Very Competitive'
    : health.competitivenessIndex >= 50 ? 'Competitive'
    : health.competitivenessIndex >= 30 ? 'Moderate'
    : 'Low Competition';

  const compColor = health.competitivenessIndex >= 70 ? 'text-win'
    : health.competitivenessIndex >= 50 ? 'text-accent'
    : health.competitivenessIndex >= 30 ? 'text-warning'
    : 'text-loss';

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <Heart size={14} className="text-accent" />
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">League Health</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <div className={clsx('text-2xl font-bold', compColor)}>
            {health.competitivenessIndex.toFixed(0)}
          </div>
          <div className="text-[10px] text-gray-500">Competitiveness</div>
          <div className={clsx('text-[10px] font-medium', compColor)}>{compLabel}</div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Parity</span>
            <span className="text-xs text-white font-medium">{health.parityIndex.toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Close Matches</span>
            <span className="text-xs text-white font-medium">{health.closeMatchPct.toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500">Pts Spread</span>
            <span className="text-xs text-white font-medium">{health.pointsSpread}</span>
          </div>
          {health.topHeavy && (
            <div className="text-[10px] text-warning">Top-heavy league</div>
          )}
        </div>
      </div>
    </div>
  );
}
