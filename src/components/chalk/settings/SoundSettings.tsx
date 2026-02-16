'use client';

import { useCallback } from 'react';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useDebouncedSetting } from '@/hooks/chalk/use-debounced-setting';
import { ChalkCard } from '../shared/ChalkCard';
import clsx from 'clsx';

export function SoundSettings() {
  const { table, updateSettings } = useChalkTable();
  if (!table) return null;

  return <SoundSettingsInner settings={table.settings} updateSettings={updateSettings} />;
}

function SoundSettingsInner({
  settings,
  updateSettings,
}: {
  settings: { soundEnabled: boolean; soundVolume: number };
  updateSettings: (s: Record<string, unknown>) => void;
}) {
  const saveVolume = useCallback((v: number) => updateSettings({ soundVolume: v }), [updateSettings]);
  const [volume, setVolume] = useDebouncedSetting(settings.soundVolume, saveVolume);

  return (
    <ChalkCard padding="lg">
      <h2 className="text-lg font-bold mb-4">Sound</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-medium">Sound effects</p>
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            role="switch"
            aria-checked={settings.soundEnabled}
            className={clsx(
              'relative w-12 h-7 rounded-full transition-colors',
              settings.soundEnabled ? 'bg-baize' : 'bg-surface-border'
            )}
          >
            <span
              className={clsx(
                'absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform',
                settings.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>

        {settings.soundEnabled && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-300">Volume</label>
              <span className="text-sm text-gray-400">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-baize"
            />
          </div>
        )}
      </div>
    </ChalkCard>
  );
}
