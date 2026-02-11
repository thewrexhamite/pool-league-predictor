'use client';

import clsx from 'clsx';
import type { FormIndicator } from '@/lib/gamification/types';

interface ContextualComparisonProps {
  indicators: FormIndicator[];
}

export default function ContextualComparison({ indicators }: ContextualComparisonProps) {
  // Show the top 3 indicators by percentile
  const topIndicators = [...indicators]
    .sort((a, b) => b.percentile - a.percentile)
    .slice(0, 3);

  if (topIndicators.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {topIndicators.map(ind => (
        <div
          key={ind.metric}
          className="bg-surface-card border border-surface-border rounded-lg p-3"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-300">{ind.divisionContext}</span>
            <span className={clsx(
              'text-xs font-bold',
              ind.percentile >= 75 ? 'text-green-400' :
                ind.percentile >= 50 ? 'text-white' :
                  'text-gray-400'
            )}>
              {ind.value}
            </span>
          </div>
          {/* Position bar */}
          <div className="relative w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
            {/* Division average marker at 50% */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600" />
            {/* Player position */}
            <div
              className={clsx(
                'absolute top-0 h-full w-2 rounded-full',
                ind.percentile >= 75 ? 'bg-green-500' :
                  ind.percentile >= 50 ? 'bg-baize' :
                    ind.percentile >= 25 ? 'bg-amber-500' : 'bg-gray-500'
              )}
              style={{ left: `${Math.min(98, Math.max(2, ind.percentile))}%`, transform: 'translateX(-50%)' }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[9px] text-gray-600">
            <span>Bottom</span>
            <span>{ind.metric}</span>
            <span>Top</span>
          </div>
        </div>
      ))}
    </div>
  );
}
