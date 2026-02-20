'use client';

import { useRouter } from 'next/navigation';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { ChalkButton } from '../shared/ChalkButton';
import { ChalkCard } from '../shared/ChalkCard';
import { ThemeSettings } from './ThemeSettings';
import { HouseRulesSection } from './HouseRulesSection';
import { TimerSettings } from './TimerSettings';
import { WinLimitSettings } from './WinLimitSettings';
import { SoundSettings } from './SoundSettings';
import { LeagueSettings } from './LeagueSettings';
import { DangerZone } from './DangerZone';

interface SettingsViewProps {
  tableId: string;
}

export function SettingsView({ tableId }: SettingsViewProps) {
  const router = useRouter();
  const { table } = useChalkTable();

  if (!table) return null;

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-gray-400">{table.name}</p>
        </div>
        <ChalkButton
          variant="ghost"
          onClick={() => router.push(`/kiosk/${tableId}`)}
        >
          ← Back to table
        </ChalkButton>
      </div>

      <ThemeSettings />
      <HouseRulesSection />
      <TimerSettings />
      <WinLimitSettings />
      <SoundSettings />
      <LeagueSettings />
      <DangerZone tableId={tableId} />
    </div>
  );
}
