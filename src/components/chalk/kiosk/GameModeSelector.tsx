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
  tournament: 'Bracket/group',
};

export function GameModeSelector({
  value,
  onChange,
  availableModes = ['singles', 'doubles', 'killer', 'challenge'],
}: GameModeSelectorProps) {
  return (
    <div className="space-y-[0.75vmin]">
      <label className="block text-[1.3vmin] font-medium text-white/70">Game mode</label>
      <div className={clsx('grid gap-[0.75vmin]', availableModes.length <= 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {availableModes.map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={clsx(
              'chalk-touch flex flex-col items-center gap-[0.2vmin] p-[1.1vmin] rounded-[1.1vmin] border transition-colors',
              value === mode
                ? 'bg-baize/15 border-baize text-baize'
                : 'bg-surface-elevated border-surface-border hover:border-white/30 text-white/65'
            )}
          >
            <span className="font-semibold text-[1.3vmin]">{GAME_MODE_LABELS[mode]}</span>
            <span className="text-[1.1vmin] opacity-70">{MODE_DESCRIPTIONS[mode]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
