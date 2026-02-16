'use client';

import { use } from 'react';
import { ChalkTableProvider } from '@/lib/chalk/table-provider';
import { PinGate } from '@/components/chalk/settings/PinGate';
import { SettingsView } from '@/components/chalk/settings/SettingsView';

export default function SettingsPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = use(params);

  return (
    <ChalkTableProvider tableId={tableId}>
      <PinGate>
        <SettingsView tableId={tableId} />
      </PinGate>
    </ChalkTableProvider>
  );
}
