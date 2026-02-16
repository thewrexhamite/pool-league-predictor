'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { createVenue } from '@/lib/chalk/firestore';
import { ChalkButton } from '@/components/chalk/shared/ChalkButton';

export default function NewVenuePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      setError('Enter a venue name');
      return;
    }
    if (!user) {
      setError('You must be signed in');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const venue = await createVenue(
        { name: name.trim() },
        user.uid,
        user.displayName || user.email || 'Unknown'
      );
      router.push(`/manage/venue/${venue.id}`);
    } catch {
      setError('Failed to create venue. Please try again.');
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
          <h1 className="text-3xl font-bold">Create Venue</h1>
          <p className="text-gray-400">
            Give your venue a name. You can add tables after.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="venue-name"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Venue name
            </label>
            <input
              id="venue-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Red Lion"
              className="w-full rounded-xl bg-surface-elevated px-4 py-3 text-lg text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none"
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && <p className="text-loss text-sm">{error}</p>}

          <ChalkButton
            fullWidth
            size="lg"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Creating…' : 'Create Venue'}
          </ChalkButton>
        </div>
      </div>
    </div>
  );
}
