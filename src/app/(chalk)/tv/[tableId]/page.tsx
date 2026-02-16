'use client';

import { use } from 'react';
import { ChalkTableProvider } from '@/lib/chalk/table-provider';
import { TVView } from '@/components/chalk/tv/TVView';

export default function TVPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = use(params);

  return (
    <ChalkTableProvider tableId={tableId}>
      <TVView />
    </ChalkTableProvider>
  );
}
