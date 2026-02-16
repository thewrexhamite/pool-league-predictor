'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTable } from '@/lib/chalk/firestore';
import { CHALK_DEFAULTS } from '@/lib/chalk/constants';

export default function CreateTablePage() {
  const router = useRouter();
  const [venueName, setVenueName] = useState('');
  const [tableName, setTableName] = useState('Table 1');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!venueName.trim()) {
      setError('Enter your venue name');
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
      const table = await createTable({
        venueName: venueName.trim(),
        tableName: tableName.trim() || 'Table 1',
        pin,
      });
      router.push(`/kiosk/${table.id}`);
    } catch {
      setError('Failed to create table. Please try again.');
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <button
            onClick={() => router.back()}
            className="chalk-touch text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold">Set Up Table</h1>
          <p className="text-gray-400">
            Create a new chalk board for your pool table.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="venue" className="block text-sm font-medium text-gray-300 mb-1">
              Venue name
            </label>
            <input
              id="venue"
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="The Red Lion"
              className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-lg text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="table-name" className="block text-sm font-medium text-gray-300 mb-1">
              Table name
            </label>
            <input
              id="table-name"
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Table 1"
              className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-lg text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-300 mb-1">
              Settings PIN ({CHALK_DEFAULTS.PIN_LENGTH} digits)
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={CHALK_DEFAULTS.PIN_LENGTH}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-lg text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none tracking-[0.5em] text-center"
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="confirm-pin" className="block text-sm font-medium text-gray-300 mb-1">
              Confirm PIN
            </label>
            <input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              maxLength={CHALK_DEFAULTS.PIN_LENGTH}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-lg text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none tracking-[0.5em] text-center"
              autoComplete="off"
            />
          </div>

          {error && (
            <p className="text-loss text-sm">{error}</p>
          )}

          <button
            onClick={handleCreate}
            disabled={creating}
            className="chalk-touch w-full rounded-xl bg-baize px-6 py-4 text-lg font-semibold text-fixed-black transition-colors hover:bg-baize-light active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating…' : 'Create Table'}
          </button>
        </div>
      </div>
    </div>
  );
}
