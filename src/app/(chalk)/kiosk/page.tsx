'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getTableByShortCode } from '@/lib/chalk/firestore';
import { isValidShortCode, normalizeShortCode } from '@/lib/chalk/short-code';

export default function KioskSetupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleJoinByCode() {
    const normalized = normalizeShortCode(code);
    if (!isValidShortCode(normalized)) {
      setError('Invalid code format. Expected: CHALK-XXXX');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const table = await getTableByShortCode(normalized);
      if (!table) {
        setError('Table not found. Check the code and try again.');
        return;
      }
      router.push(`/kiosk/${table.id}`);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">The Chalk</h1>
          <p className="text-gray-400 text-lg">
            Digital queue for your pool table
          </p>
        </div>

        {/* Create new table */}
        <button
          onClick={() => router.push('/kiosk/create')}
          className="chalk-touch w-full rounded-xl bg-baize px-6 py-4 text-lg font-semibold text-fixed-black transition-colors hover:bg-baize-light active:scale-[0.98]"
        >
          Set Up New Table
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-surface-border" />
          <span className="text-gray-500 text-sm uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-surface-border" />
        </div>

        {/* Join by code */}
        <div className="space-y-3">
          <label htmlFor="table-code" className="block text-sm font-medium text-gray-300">
            Enter table code
          </label>
          <input
            id="table-code"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="CHALK-XXXX"
            className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-lg text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none"
            autoCapitalize="characters"
            autoComplete="off"
          />
          {error && (
            <p className="text-loss text-sm">{error}</p>
          )}
          <button
            onClick={handleJoinByCode}
            disabled={loading || !code.trim()}
            className="chalk-touch w-full rounded-xl bg-surface-elevated px-6 py-3 text-lg font-medium transition-colors hover:bg-surface-border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Looking up…' : 'Go to Table'}
          </button>
        </div>
      </div>
    </div>
  );
}
