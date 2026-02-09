'use client';

import { useMemo } from 'react';
import { useUserProfile } from '@/lib/auth/auth-context';
import { isUserAdmin } from '@/lib/auth/admin-utils';

/**
 * Hook for checking admin authorization status.
 *
 * Returns admin status and related utilities for the current user.
 *
 * @example
 * ```tsx
 * function AdminPanel() {
 *   const { isAdmin, loading } = useAdmin();
 *
 *   if (loading) return <div>Loading...</div>;
 *   if (!isAdmin) return <div>Access denied</div>;
 *
 *   return <div>Admin content</div>;
 * }
 * ```
 */
export function useAdmin() {
  const profile = useUserProfile();

  const isAdmin = useMemo(() => {
    return isUserAdmin(profile);
  }, [profile]);

  const loading = profile === undefined;

  return {
    isAdmin,
    loading,
    profile,
  };
}
