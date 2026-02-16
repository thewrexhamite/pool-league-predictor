'use client';

import { use } from 'react';
import { ChalkTableProvider } from '@/lib/chalk/table-provider';
import { JoinView } from '@/components/chalk/join/JoinView';

export default function JoinPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = use(params);

  return (
    <ChalkTableProvider tableId={tableId}>
      <JoinView />
    </ChalkTableProvider>
  );
}
