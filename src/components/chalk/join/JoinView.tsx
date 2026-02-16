'use client';

import { useState } from 'react';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { ConnectionStatus } from '../shared/ConnectionStatus';
import { JoinQueueView } from './JoinQueueView';
import { JoinAddSelf } from './JoinAddSelf';
import { ChalkButton } from '../shared/ChalkButton';

export function JoinView() {
  const { table, loading, error, connectionStatus } = useChalkTable();
  const [showAdd, setShowAdd] = useState(false);

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
        {showAdd ? (
          <JoinAddSelf
            table={table}
            onClose={() => setShowAdd(false)}
          />
        ) : (
          <ChalkButton fullWidth size="lg" onClick={() => setShowAdd(true)}>
            Chalk My Name Up
          </ChalkButton>
        )}
      </div>
    </div>
  );
}
