'use client';

import { use } from 'react';
import { ChalkTableProvider } from '@/lib/chalk/table-provider';
import { KioskView } from '@/components/chalk/kiosk/KioskView';

export default function KioskPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = use(params);

  return (
    <ChalkTableProvider tableId={tableId}>
      <KioskView />
    </ChalkTableProvider>
  );
}
