'use client';

import { useState, type ReactNode } from 'react';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { verifyPin } from '@/lib/chalk/pin-utils';
import { ChalkPinPad } from '../shared/ChalkPinPad';

interface PinGateProps {
  children: ReactNode;
}

export function PinGate({ children }: PinGateProps) {
  const { table, loading } = useChalkTable();
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !table) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-baize border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  async function handlePinSubmit(pin: string) {
    const valid = await verifyPin(pin, table!.settings.pinHash);
    if (valid) {
      setUnlocked(true);
      setError(null);
    } else {
      setError('Incorrect PIN');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <ChalkPinPad
        onSubmit={handlePinSubmit}
        error={error}
        title="Enter Settings PIN"
      />
    </div>
  );
}
