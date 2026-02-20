'use client';

import { useCallback } from 'react';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useDebouncedSetting } from '@/hooks/chalk/use-debounced-setting';
import { ChalkCard } from '../shared/ChalkCard';

export function TimerSettings() {
  const { table, updateSettings } = useChalkTable();
  if (!table) return null;

  return <TimerSettingsInner settings={table.settings} updateSettings={updateSettings} />;
}

function TimerSettingsInner({
  settings,
  updateSettings,
}: {
  settings: { noShowTimeoutSeconds: number; holdMaxMinutes: number; attractModeTimeoutMinutes: number };
  updateSettings: (s: Record<string, number>) => void;
}) {
  const saveNoShow = useCallback((v: number) => updateSettings({ noShowTimeoutSeconds: v }), [updateSettings]);
  const saveHold = useCallback((v: number) => updateSettings({ holdMaxMinutes: v }), [updateSettings]);
  const saveAttract = useCallback((v: number) => updateSettings({ attractModeTimeoutMinutes: v }), [updateSettings]);

  const [noShow, setNoShow] = useDebouncedSetting(settings.noShowTimeoutSeconds, saveNoShow);
  const [hold, setHold] = useDebouncedSetting(settings.holdMaxMinutes, saveHold);
  const [attract, setAttract] = useDebouncedSetting(settings.attractModeTimeoutMinutes, saveAttract);

  return (
    <ChalkCard padding="lg">
      <h2 className="text-lg font-bold mb-4">Timers</h2>

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">No-show timeout</label>
            <span className="text-sm text-gray-400">{noShow}s</span>
          </div>
          <input
            type="range"
            min={30}
            max={300}
            step={30}
            value={noShow}
            onChange={(e) => setNoShow(Number(e.target.value))}
            className="w-full accent-baize"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>30s</span>
            <span>5m</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">Max hold time</label>
            <span className="text-sm text-gray-400">{hold}m</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={hold}
            onChange={(e) => setHold(Number(e.target.value))}
            className="w-full accent-baize"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>5m</span>
            <span>60m</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-gray-300">Attract mode timeout</label>
            <span className="text-sm text-gray-400">
              {attract < 1 ? `${Math.round(attract * 60)}s` : `${attract}m`}
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={1800}
            step={10}
            value={Math.round(attract * 60)}
            onChange={(e) => setAttract(Number(e.target.value) / 60)}
            className="w-full accent-baize"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>10s</span>
            <span>30m</span>
          </div>
        </div>
      </div>
    </ChalkCard>
  );
}
