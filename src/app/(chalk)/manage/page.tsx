'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { OAuthButtons } from '@/components/auth/OAuthButtons';
import { getVenuesByOwner } from '@/lib/chalk/firestore';
import type { ChalkVenue } from '@/lib/chalk/types';
import { ChalkCard } from '@/components/chalk/shared/ChalkCard';
import { ChalkButton } from '@/components/chalk/shared/ChalkButton';

export default function ManagePage() {
  const { user, loading: authLoading } = useAuth();
  const [venues, setVenues] = useState<ChalkVenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    getVenuesByOwner(user.uid)
      .then(setVenues)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-baize border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Manage Tables</h1>
            <p className="text-gray-400">
              Sign in to create and manage your venue&apos;s pool tables.
            </p>
          </div>
          <OAuthButtons />
          <Link
            href="/kiosk"
            className="block text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Back to kiosk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Venues</h1>
          <p className="text-sm text-gray-400">
            {user.displayName || user.email}
          </p>
        </div>
        <Link href="/manage/venue/new">
          <ChalkButton>Create Venue</ChalkButton>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-baize border-t-transparent rounded-full animate-spin" />
        </div>
      ) : venues.length === 0 ? (
        <ChalkCard padding="lg" className="text-center">
          <div className="space-y-3 py-4">
            <p className="text-lg font-medium">No venues yet</p>
            <p className="text-gray-400 text-sm">
              Create a venue to group and manage your pool tables from one
              dashboard.
            </p>
            <Link href="/manage/venue/new">
              <ChalkButton>Create your first venue</ChalkButton>
            </Link>
          </div>
        </ChalkCard>
      ) : (
        <div className="space-y-3">
          {venues.map((venue) => (
            <Link key={venue.id} href={`/manage/venue/${venue.id}`}>
              <ChalkCard
                padding="lg"
                className="hover:border-baize/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">{venue.name}</p>
                    <p className="text-sm text-gray-400">
                      {venue.tableIds.length}{' '}
                      {venue.tableIds.length === 1 ? 'table' : 'tables'}
                    </p>
                  </div>
                  <span className="text-gray-500">→</span>
                </div>
              </ChalkCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
