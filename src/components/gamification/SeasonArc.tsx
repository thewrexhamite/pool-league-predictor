'use client';

import clsx from 'clsx';
import type { SeasonSnapshot } from '@/lib/gamification/types';

interface SeasonArcProps {
  snapshot: SeasonSnapshot;
}

const PHASE_LABELS: Record<string, string> = {
  early: 'Early Season',
  mid: 'Mid-Season',
  late: 'Late Season',
  complete: 'Season Complete',
};

const PHASE_COLORS: Record<string, string> = {
  early: 'text-blue-400',
  mid: 'text-green-400',
  late: 'text-amber-400',
  complete: 'text-gray-300',
};

/**
 * Simple inline sparkline using SVG.
 */
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const width = 200;
  const height = 32;
  const padding = 2;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * plotWidth;
    const y = padding + plotHeight - ((v - min) / range) * plotHeight;
    return `${x},${y}`;
  }).join(' ');

  // Gradient color based on last value vs first
  const improving = data[data.length - 1] > data[0];

  return (
    <svg width={width} height={height} className="w-full max-w-[200px]" viewBox={`0 0 ${width} ${height}`}>
      {/* 50% line */}
      <line
        x1={padding}
        y1={padding + plotHeight - (((0.5 - min) / range) * plotHeight)}
        x2={width - padding}
        y2={padding + plotHeight - (((0.5 - min) / range) * plotHeight)}
        stroke="currentColor"
        strokeDasharray="2,4"
        className="text-gray-700"
        strokeWidth="0.5"
      />
      <polyline
        fill="none"
        stroke={improving ? '#4ade80' : '#fbbf24'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
      {/* End dot */}
      {data.length > 0 && (() => {
        const lastX = padding + ((data.length - 1) / (data.length - 1)) * plotWidth;
        const lastY = padding + plotHeight - ((data[data.length - 1] - min) / range) * plotHeight;
        return (
          <circle
            cx={lastX}
            cy={lastY}
            r="2"
            fill={improving ? '#4ade80' : '#fbbf24'}
          />
        );
      })()}
    </svg>
  );
}

export default function SeasonArc({ snapshot }: SeasonArcProps) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg p-4 space-y-3">
      {/* Phase + sparkline */}
      <div className="flex items-center justify-between">
        <div>
          <span className={clsx('text-xs font-medium', PHASE_COLORS[snapshot.phase])}>
            {PHASE_LABELS[snapshot.phase]}
          </span>
        </div>
        <Sparkline data={snapshot.rollingWinPct} />
      </div>

      {/* Narrative */}
      <p className="text-xs text-gray-400 leading-relaxed">
        {snapshot.narrative}
      </p>

      {/* Key moments */}
      {snapshot.keyMoments.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">
            Key Moments
          </div>
          {snapshot.keyMoments.slice(0, 3).map((moment, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="text-gray-600">{moment.date}</span>
              <span className={clsx(
                moment.type === 'streak' ? 'text-green-400' :
                  moment.type === 'form_change' ? 'text-amber-400' : 'text-gray-400'
              )}>
                {moment.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
