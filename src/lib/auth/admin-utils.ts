/**
 * Admin Authorization Utilities
 *
 * Helper functions for admin-specific operations and authorization checks.
 */

import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { UserProfile } from './auth-utils';

// ============================================================================
// Admin Authorization Checks
// ============================================================================

/**
 * Check if a user profile has admin privileges.
 */
export function isUserAdmin(profile: UserProfile | null): boolean {
  return profile?.isAdmin ?? false;
}

/**
 * Check if the current user profile has admin privileges.
 * This is a convenience wrapper around isUserAdmin.
 */
export function hasAdminAccess(profile: UserProfile | null): boolean {
  return isUserAdmin(profile);
}

// ============================================================================
// Admin Status Management
// ============================================================================

/**
 * Set admin status for a user.
 * Only callable by existing admins in production.
 */
export async function setAdminStatus(
  userId: string,
  isAdmin: boolean
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isAdmin });
}

/**
 * Grant admin privileges to a user.
 */
export async function grantAdminAccess(userId: string): Promise<void> {
  await setAdminStatus(userId, true);
}

/**
 * Revoke admin privileges from a user.
 */
export async function revokeAdminAccess(userId: string): Promise<void> {
  await setAdminStatus(userId, false);
}
