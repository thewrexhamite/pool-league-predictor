'use client';

import { use, useEffect } from 'react';
import { ChalkTableProvider } from '@/lib/chalk/table-provider';
import { KioskView } from '@/components/chalk/kiosk/KioskView';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { saveKioskConfig } from '@/hooks/chalk/use-kiosk-persistence';

function KioskWithPersistence() {
  const { table } = useChalkTable();

  useEffect(() => {
    if (table) {
      saveKioskConfig({
        tableId: table.id,
        tableName: table.name,
        venueId: table.venueId,
      });
    }
  }, [table?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <KioskView />;
}

export default function KioskPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = use(params);

  return (
    <ChalkTableProvider tableId={tableId}>
      <KioskWithPersistence />
    </ChalkTableProvider>
  );
}
