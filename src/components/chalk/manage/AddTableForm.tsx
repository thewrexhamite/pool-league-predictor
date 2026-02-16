'use client';

import { useState } from 'react';
import { createTable } from '@/lib/chalk/firestore';
import { CHALK_DEFAULTS } from '@/lib/chalk/constants';
import { ChalkButton } from '../shared/ChalkButton';
import { ChalkCard } from '../shared/ChalkCard';

interface AddTableFormProps {
  venueId: string;
  venueName: string;
  onAdded: () => void;
}

export function AddTableForm({ venueId, venueName, onAdded }: AddTableFormProps) {
  const [tableName, setTableName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!tableName.trim()) {
      setError('Enter a table name');
      return;
    }
    if (pin.length !== CHALK_DEFAULTS.PIN_LENGTH) {
      setError(`PIN must be ${CHALK_DEFAULTS.PIN_LENGTH} digits`);
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs don\'t match');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await createTable({
        venueName,
        tableName: tableName.trim(),
        pin,
        venueId,
      });
      setTableName('');
      setPin('');
      setConfirmPin('');
      onAdded();
    } catch {
      setError('Failed to create table. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <ChalkCard padding="lg">
      <h3 className="font-semibold mb-3">Add New Table</h3>
      <div className="space-y-3">
        <input
          type="text"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          placeholder="Table name (e.g. Table 1)"
          className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none"
          autoComplete="off"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="password"
            inputMode="numeric"
            maxLength={CHALK_DEFAULTS.PIN_LENGTH}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="PIN"
            className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none tracking-[0.5em] text-center"
            autoComplete="off"
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={CHALK_DEFAULTS.PIN_LENGTH}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Confirm"
            className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none tracking-[0.5em] text-center"
            autoComplete="off"
          />
        </div>
        {error && <p className="text-loss text-sm">{error}</p>}
        <ChalkButton
          fullWidth
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? 'Creating…' : 'Add Table'}
        </ChalkButton>
      </div>
    </ChalkCard>
  );
}
