'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { PlayerLabel } from '@/lib/gamification/types';

interface PlayerLabelsProps {
  active: PlayerLabel[];
  expired?: PlayerLabel[];
  showExpired?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  performance: 'bg-blue-900/30 text-blue-400 border-blue-800/30',
  consistency: 'bg-green-900/30 text-green-400 border-green-800/30',
  clutch: 'bg-amber-900/30 text-amber-400 border-amber-800/30',
  tactical: 'bg-purple-900/30 text-purple-400 border-purple-800/30',
  social: 'bg-cyan-900/30 text-cyan-400 border-cyan-800/30',
};

export default function PlayerLabels({ active, expired = [], showExpired = false }: PlayerLabelsProps) {
  const [selectedLabel, setSelectedLabel] = useState<PlayerLabel | null>(null);

  if (active.length === 0 && expired.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-xs">
        <p>No labels earned yet.</p>
        <p className="mt-1 text-[10px]">Labels are earned from real match data and recalculate weekly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Active labels */}
      <div className="flex flex-wrap gap-1.5">
        {active.map(label => (
          <button
            key={label.id}
            onClick={() => setSelectedLabel(selectedLabel?.id === label.id ? null : label)}
            className={clsx(
              'inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border transition',
              CATEGORY_COLORS[label.category] || 'bg-surface-elevated text-gray-300 border-surface-border',
              selectedLabel?.id === label.id && 'ring-1 ring-white/20',
            )}
          >
            {label.name}
          </button>
        ))}
      </div>

      {/* Expired labels (greyed out) */}
      {showExpired && expired.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {expired.map(label => (
            <span
              key={label.id}
              className="inline-flex items-center text-[10px] text-gray-600 px-2 py-0.5 rounded-full border border-surface-border/30 line-through"
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Selected label description */}
      {selectedLabel && (
        <div className="bg-surface-elevated/50 border border-surface-border/50 rounded-lg p-2.5 text-xs">
          <div className="font-medium text-white">{selectedLabel.name}</div>
          <div className="text-gray-400 mt-0.5">{selectedLabel.description}</div>
          <div className="text-[10px] text-gray-600 mt-1">
            Earned {new Date(selectedLabel.earnedAt).toLocaleDateString()} · Recalculates weekly
          </div>
        </div>
      )}
    </div>
  );
}
