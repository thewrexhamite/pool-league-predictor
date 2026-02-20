'use client';

import { useCallback, useRef } from 'react';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useDebouncedSetting } from '@/hooks/chalk/use-debounced-setting';
import { CHALK_DEFAULTS } from '@/lib/chalk/constants';
import { ChalkCard } from '../shared/ChalkCard';

const SLIDE_LABELS: Record<string, string> = {
  qr: 'QR Code',
  stats: "Today's Stats",
  hero: 'Pool League Pro',
  king: 'King of the Table',
  live_game: 'Live Game',
  table_free: 'Table Free',
  fun_stats: "Today's Numbers",
  league_standings: 'League Standings',
};

const SLIDE_KEYS = Object.keys(SLIDE_LABELS);

const DEFAULT_DURATION = CHALK_DEFAULTS.ATTRACT_SLIDE_DURATION_SECONDS;

function SlideRow({
  slideKey,
  label,
  duration,
  onChange,
}: {
  slideKey: string;
  label: string;
  duration: number;
  onChange: (key: string, value: number) => void;
}) {
  const save = useCallback(
    (v: number) => onChange(slideKey, v),
    [slideKey, onChange],
  );
  const [local, setLocal] = useDebouncedSetting(duration, save);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-sm text-gray-400">{local}s</span>
      </div>
      <input
        type="range"
        min={5}
        max={60}
        step={1}
        value={local}
        onChange={(e) => setLocal(Number(e.target.value))}
        className="w-full accent-baize"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>5s</span>
        <span>60s</span>
      </div>
    </div>
  );
}

export function AttractSlideSettings() {
  const { table, updateSettings } = useChalkTable();
  if (!table) return null;

  return (
    <AttractSlideSettingsInner
      durations={table.settings.attractSlideDurations}
      updateSettings={updateSettings}
    />
  );
}

function AttractSlideSettingsInner({
  durations,
  updateSettings,
}: {
  durations: Partial<Record<string, number>> | undefined;
  updateSettings: (s: Record<string, unknown>) => void;
}) {
  // Use a ref to hold the latest durations so the callback doesn't depend on it
  const durationsRef = useRef(durations);
  durationsRef.current = durations;

  const handleChange = useCallback(
    (key: string, value: number) => {
      updateSettings({
        attractSlideDurations: {
          ...durationsRef.current,
          [key]: value,
        },
      });
    },
    [updateSettings],
  );

  return (
    <ChalkCard padding="lg">
      <h2 className="text-lg font-bold mb-1">Attract Screen Slide Durations</h2>
      <p className="text-sm text-gray-400 mb-4">
        How long each slide shows before rotating to the next.
      </p>

      <div className="space-y-5">
        {SLIDE_KEYS.map((key) => (
          <SlideRow
            key={key}
            slideKey={key}
            label={SLIDE_LABELS[key]}
            duration={durations?.[key] ?? DEFAULT_DURATION}
            onChange={handleChange}
          />
        ))}
      </div>
    </ChalkCard>
  );
}
