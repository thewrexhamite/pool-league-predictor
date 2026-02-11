'use client';

import clsx from 'clsx';
import type { FormIndicator } from '@/lib/gamification/types';

interface FormCardProps {
  indicator: FormIndicator;
}

export default function FormCard({ indicator }: FormCardProps) {
  const trendColor = indicator.trend === 'improving'
    ? 'text-green-400'
    : indicator.trend === 'declining'
      ? 'text-amber-400'
      : 'text-gray-400';

  const trendBg = indicator.trend === 'improving'
    ? 'bg-green-900/20'
    : indicator.trend === 'declining'
      ? 'bg-amber-900/20'
      : 'bg-surface-elevated/50';

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
          {indicator.metric}
        </span>
        <span className={clsx('text-sm font-mono', trendColor)}>
          {indicator.arrow}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-white">{indicator.value}</span>
        <span className={clsx('text-[10px] px-1.5 py-0.5 rounded', trendBg, trendColor)}>
          {indicator.trend}
        </span>
      </div>
      <div className="mt-1.5 text-[10px] text-gray-500">
        {indicator.divisionContext}
      </div>
      {/* Percentile bar */}
      <div className="mt-1.5 w-full h-1 bg-surface-elevated rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            indicator.percentile >= 75 ? 'bg-green-500' :
              indicator.percentile >= 50 ? 'bg-baize' :
                indicator.percentile >= 25 ? 'bg-amber-500' : 'bg-gray-500'
          )}
          style={{ width: `${indicator.percentile}%` }}
        />
      </div>
    </div>
  );
}
