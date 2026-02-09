/**
 * Client-Side Admin Auth Helper
 *
 * Utilities for checking admin status and getting auth tokens.
 */

'use client';

import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Check if the current user is an admin.
 */
export async function isAdmin(): Promise<boolean> {
  const auth = getAuth();
  if (!auth.currentUser) return false;

  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return false;

    const userData = userSnap.data();
    return userData.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get auth token for API calls.
 */
export async function getAuthToken(): Promise<string | null> {
  const auth = getAuth();
  if (!auth.currentUser) return null;

  try {
    return await auth.currentUser.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}
