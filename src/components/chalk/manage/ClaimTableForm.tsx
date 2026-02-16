'use client';

import { useState } from 'react';
import { claimTable } from '@/lib/chalk/firestore';
import { CHALK_DEFAULTS } from '@/lib/chalk/constants';
import { normalizeShortCode } from '@/lib/chalk/short-code';
import { ChalkButton } from '../shared/ChalkButton';
import { ChalkCard } from '../shared/ChalkCard';

interface ClaimTableFormProps {
  venueId: string;
  onClaimed: () => void;
}

export function ClaimTableForm({ venueId, onClaimed }: ClaimTableFormProps) {
  const [shortCode, setShortCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  async function handleClaim() {
    const normalized = normalizeShortCode(shortCode);
    if (!normalized) {
      setError('Enter the table code');
      return;
    }
    if (pin.length !== CHALK_DEFAULTS.PIN_LENGTH) {
      setError(`PIN must be ${CHALK_DEFAULTS.PIN_LENGTH} digits`);
      return;
    }

    setClaiming(true);
    setError(null);

    try {
      await claimTable(venueId, normalized, pin);
      setShortCode('');
      setPin('');
      onClaimed();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to claim table'
      );
    } finally {
      setClaiming(false);
    }
  }

  return (
    <ChalkCard padding="lg">
      <h3 className="font-semibold mb-3">Claim Existing Table</h3>
      <p className="text-sm text-gray-400 mb-3">
        Enter the short code and PIN of an existing table to add it to this
        venue.
      </p>
      <div className="space-y-3">
        <input
          type="text"
          value={shortCode}
          onChange={(e) => setShortCode(e.target.value.toUpperCase())}
          placeholder="CHALK-XXXX"
          className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none"
          autoCapitalize="characters"
          autoComplete="off"
        />
        <input
          type="password"
          inputMode="numeric"
          maxLength={CHALK_DEFAULTS.PIN_LENGTH}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="Table PIN"
          className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none tracking-[0.5em] text-center"
          autoComplete="off"
        />
        {error && <p className="text-loss text-sm">{error}</p>}
        <ChalkButton
          variant="secondary"
          fullWidth
          onClick={handleClaim}
          disabled={claiming}
        >
          {claiming ? 'Claiming…' : 'Claim Table'}
        </ChalkButton>
      </div>
    </ChalkCard>
  );
}
