'use client';

import type { GameMode } from '@/lib/chalk/types';
import { GAME_MODE_LABELS } from '@/lib/chalk/constants';
import clsx from 'clsx';

interface GameModeSelectorProps {
  value: GameMode;
  onChange: (mode: GameMode) => void;
  availableModes?: GameMode[];
}

const MODE_DESCRIPTIONS: Record<GameMode, string> = {
  singles: '1v1',
  doubles: '2v2',
  killer: '3+ players',
  challenge: 'Skip queue',
};

export function GameModeSelector({
  value,
  onChange,
  availableModes = ['singles', 'doubles', 'killer', 'challenge'],
}: GameModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">Game mode</label>
      <div className={clsx('grid gap-2', availableModes.length <= 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {availableModes.map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={clsx(
              'chalk-touch flex flex-col items-center gap-0.5 p-3 rounded-xl border transition-colors',
              value === mode
                ? 'bg-baize/15 border-baize text-baize'
                : 'bg-surface-elevated border-surface-border text-gray-400 hover:border-gray-500'
            )}
          >
            <span className="font-semibold text-sm">{GAME_MODE_LABELS[mode]}</span>
            <span className="text-xs opacity-70">{MODE_DESCRIPTIONS[mode]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
