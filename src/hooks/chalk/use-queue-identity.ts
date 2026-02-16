'use client';

import { useAuth } from '@/lib/auth';

export function useQueueIdentity() {
  const { user, profile, loading } = useAuth();

  // Resolve display name: claimed profile name > Google display name > null
  const claimedName = profile?.claimedProfiles?.[0]?.name ?? null;
  const displayName = claimedName || profile?.displayName || user?.displayName || null;
  const userId = user?.uid ?? null;
  const isResolved = !loading && !!displayName && !!userId;

  return { isResolved, displayName, userId, loading };
}
