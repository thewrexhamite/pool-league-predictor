'use client';

import { useState } from 'react';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useQueueIdentity } from '@/hooks/chalk/use-queue-identity';
import { ConnectionStatus } from '../shared/ConnectionStatus';
import { JoinQueueView } from './JoinQueueView';
import { JoinAddSelf } from './JoinAddSelf';
import { JoinQuickAdd } from './JoinQuickAdd';
import { ChalkButton } from '../shared/ChalkButton';

export function JoinView() {
  const { table, loading, error, connectionStatus } = useChalkTable();
  const { isResolved, displayName, userId } = useQueueIdentity();
  const [showManual, setShowManual] = useState(false);

  if (loading) {
    return (
      <div className="chalk-phone min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-baize border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="chalk-phone min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-loss text-lg">{error ?? 'Table not found'}</p>
          <p className="text-gray-400 text-sm">Check the QR code or link and try again.</p>
        </div>
      </div>
    );
  }

  const renderBottomAction = () => {
    // Manual mode — show JoinAddSelf (with prefill if authenticated)
    if (showManual) {
      return (
        <JoinAddSelf
          table={table}
          onClose={() => setShowManual(false)}
          prefillName={displayName}
          userId={userId}
        />
      );
    }

    // Authenticated with resolved name — show one-tap quick join
    if (isResolved && displayName && userId) {
      return (
        <JoinQuickAdd
          table={table}
          displayName={displayName}
          userId={userId}
          onSwitchToManual={() => setShowManual(true)}
        />
      );
    }

    // Anonymous / loading — show "Chalk My Name Up" button
    return (
      <ChalkButton fullWidth size="lg" onClick={() => setShowManual(true)}>
        Chalk My Name Up
      </ChalkButton>
    );
  };

  return (
    <div className="chalk-phone min-h-screen flex flex-col">
      <ConnectionStatus status={connectionStatus} />

      {/* Header */}
      <header className="px-4 py-3 border-b border-surface-border bg-surface-card">
        <h1 className="text-lg font-bold">{table.name}</h1>
        <p className="text-xs text-gray-400">{table.shortCode}</p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <JoinQueueView table={table} />
      </div>

      {/* Fixed bottom action */}
      <div className="p-4 border-t border-surface-border bg-surface-card">
        {renderBottomAction()}
      </div>
    </div>
  );
}
