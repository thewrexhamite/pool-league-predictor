'use client';

import clsx from 'clsx';

interface ConfidenceMeterProps {
  confidence: number; // 0-1
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.7) return 'bg-win';
  if (confidence >= 0.4) return 'bg-gold';
  return 'bg-loss';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return 'High confidence';
  if (confidence >= 0.4) return 'Moderate';
  return 'Low - limited data';
}

function getConfidenceTooltip(confidence: number): string {
  if (confidence >= 0.7) return 'Based on 10+ bridge players with sufficient game data';
  if (confidence >= 0.4) return 'Based on some bridge player data; more data would improve accuracy';
  return 'Very few bridge players available; using statistical estimates and tier-based defaults';
}

export default function ConfidenceMeter({ confidence, size = 'sm', showLabel = true }: ConfidenceMeterProps) {
  const barHeight = size === 'md' ? 'h-2' : 'h-1.5';
  const pct = Math.min(100, Math.max(0, confidence * 100));

  return (
    <div className="group relative" title={getConfidenceTooltip(confidence)}>
      <div className="flex items-center gap-2">
        <div className={clsx('flex-1 bg-surface rounded-full overflow-hidden', barHeight)}>
          <div
            className={clsx('h-full rounded-full transition-all', getConfidenceColor(confidence))}
            style={{ width: `${pct}%` }}
          />
        </div>
        {showLabel && (
          <span className={clsx(
            'text-xs whitespace-nowrap',
            confidence >= 0.7 ? 'text-win' : confidence >= 0.4 ? 'text-gold' : 'text-loss'
          )}>
            {getConfidenceLabel(confidence)}
          </span>
        )}
      </div>
    </div>
  );
}
