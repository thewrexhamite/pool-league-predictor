'use client';

import { useCallback } from 'react';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useDebouncedSetting } from '@/hooks/chalk/use-debounced-setting';
import { ChalkCard } from '../shared/ChalkCard';
import clsx from 'clsx';

export function WinLimitSettings() {
  const { table, updateSettings } = useChalkTable();
  if (!table) return null;

  return <WinLimitSettingsInner settings={table.settings} updateSettings={updateSettings} />;
}

function WinLimitSettingsInner({
  settings,
  updateSettings,
}: {
  settings: { winLimitEnabled: boolean; winLimitCount: number };
  updateSettings: (s: Record<string, unknown>) => void;
}) {
  const saveCount = useCallback((v: number) => updateSettings({ winLimitCount: v }), [updateSettings]);
  const [count, setCount] = useDebouncedSetting(settings.winLimitCount, saveCount);

  return (
    <ChalkCard padding="lg">
      <h2 className="text-lg font-bold mb-4">Win Limit</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable win limit</p>
            <p className="text-sm text-gray-400">
              Send holder to back after consecutive wins
            </p>
          </div>
          <button
            onClick={() => updateSettings({ winLimitEnabled: !settings.winLimitEnabled })}
            role="switch"
            aria-checked={settings.winLimitEnabled}
            className={clsx(
              'relative w-12 h-7 rounded-full transition-colors',
              settings.winLimitEnabled ? 'bg-baize' : 'bg-surface-border'
            )}
          >
            <span
              className={clsx(
                'absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform',
                settings.winLimitEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>

        {settings.winLimitEnabled && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">
                Win limit count
              </label>
              <span className="text-sm text-gray-400">{count} wins</span>
            </div>
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full accent-baize"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>2</span>
              <span>10</span>
            </div>
          </div>
        )}
      </div>
    </ChalkCard>
  );
}
