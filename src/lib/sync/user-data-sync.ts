/**
 * User Data Sync Utilities
 *
 * Functions for syncing user data (My Team, What-If results, squad overrides)
 * to Firestore for cross-device persistence.
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { DivisionCode, WhatIfResult, SquadOverrides } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

/**
 * My Team selection - references a specific team in a division.
 */
export interface MyTeamData {
  team: string;
  div: DivisionCode;
}

/**
 * User session data - What-If scenarios and squad builder state.
 */
export interface UserSessionData {
  whatIfResults: WhatIfResult[];
  squadOverrides: SquadOverrides;
  selectedDiv: DivisionCode;
}

/**
 * Complete user data synced to Firestore.
 * Stored at: users/{userId}/userData/sync
 */
export interface UserData {
  myTeam: MyTeamData | null;
  session: UserSessionData;
  lastActive: number; // timestamp
}

// ============================================================================
// Firestore Sync Functions
// ============================================================================

/**
 * Get user data from Firestore.
 * Returns null if no data exists for this user.
 */
export async function getUserData(userId: string): Promise<UserData | null> {
  const userDataRef = doc(db, 'users', userId, 'userData', 'sync');
  const snap = await getDoc(userDataRef);

  if (!snap.exists()) {
    return null;
  }

  return snap.data() as UserData;
}

/**
 * Save complete user data to Firestore.
 * Overwrites existing data.
 */
export async function saveUserData(userId: string, data: UserData): Promise<void> {
  const userDataRef = doc(db, 'users', userId, 'userData', 'sync');
  await setDoc(userDataRef, {
    ...data,
    lastActive: Date.now(),
  });
}

/**
 * Merge partial user data updates into Firestore.
 * Only updates provided fields, preserves others.
 */
export async function mergeUserData(
  userId: string,
  partial: Partial<Omit<UserData, 'lastActive'>>
): Promise<void> {
  const userDataRef = doc(db, 'users', userId, 'userData', 'sync');

  // Check if document exists
  const snap = await getDoc(userDataRef);

  if (!snap.exists()) {
    // Create new document with partial data + defaults
    const defaultData: UserData = {
      myTeam: null,
      session: {
        whatIfResults: [],
        squadOverrides: {},
        selectedDiv: '',
      },
      lastActive: Date.now(),
      ...partial,
    };
    await setDoc(userDataRef, defaultData);
  } else {
    // Update existing document
    await updateDoc(userDataRef, {
      ...partial,
      lastActive: Date.now(),
    });
  }
}

/**
 * Save My Team selection to Firestore.
 */
export async function saveMyTeam(
  userId: string,
  team: string,
  div: DivisionCode
): Promise<void> {
  await mergeUserData(userId, {
    myTeam: { team, div },
  });
}

/**
 * Save user session data to Firestore.
 */
export async function saveUserSession(
  userId: string,
  session: UserSessionData
): Promise<void> {
  await mergeUserData(userId, { session });
}

/**
 * Clear My Team selection from Firestore.
 */
export async function clearMyTeam(userId: string): Promise<void> {
  await mergeUserData(userId, {
    myTeam: null,
  });
}
