'use client';

import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import type { ChalkTheme } from '@/lib/chalk/types';
import { ChalkCard } from '../shared/ChalkCard';
import clsx from 'clsx';

const THEME_OPTIONS: { value: ChalkTheme; label: string }[] = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

export function ThemeSettings() {
  const { table, updateSettings } = useChalkTable();
  if (!table) return null;

  const current = table.settings.theme ?? 'dark';

  return (
    <ChalkCard padding="lg">
      <h2 className="text-lg font-bold mb-4">Theme</h2>
      <div className="flex gap-2">
        {THEME_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateSettings({ theme: value })}
            className={clsx(
              'chalk-touch flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
              current === value
                ? 'bg-baize/15 border-baize text-baize'
                : 'bg-surface-elevated border-surface-border text-gray-400'
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </ChalkCard>
  );
}
