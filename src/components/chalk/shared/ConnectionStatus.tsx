'use client';

import type { ConnectionStatus as ConnectionStatusType } from '@/lib/chalk/types';
import clsx from 'clsx';

interface ConnectionStatusProps {
  status: ConnectionStatusType;
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  if (status === 'connected') return null;

  return (
    <div
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium',
        status === 'disconnected' && 'bg-loss/90 text-white',
        status === 'reconnecting' && 'bg-accent/90 text-fixed-black'
      )}
    >
      {status === 'disconnected' && 'Offline — changes will sync when reconnected'}
      {status === 'reconnecting' && 'Reconnecting…'}
    </div>
  );
}
