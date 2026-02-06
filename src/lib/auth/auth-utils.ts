/**
 * Firebase Auth Utilities
 *
 * Helper functions for authentication operations.
 */

import {
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

// ============================================================================
// Types
// ============================================================================

/**
 * A claimed player profile - references a specific name in a league/season.
 */
export interface ClaimedProfile {
  league: string;
  season: string;
  name: string;
  claimedAt: number;
}

/**
 * User settings for preferences.
 */
export interface UserSettings {
  notifications: boolean;
  publicProfile: boolean;
}

/**
 * Firebase Auth user profile document.
 */
export interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string | null;
  claimedProfiles: ClaimedProfile[];
  createdAt: number;
  settings: UserSettings;
}

// ============================================================================
// Auth Providers
// ============================================================================

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({ prompt: 'select_account' });

const facebookProvider = new FacebookAuthProvider();

export type AuthProvider = 'google' | 'microsoft' | 'facebook';

// ============================================================================
// Sign In Functions
// ============================================================================

/**
 * Sign in with a specific OAuth provider.
 */
export async function signInWithProvider(
  providerType: AuthProvider
): Promise<UserCredential> {
  const auth = getAuth();

  let provider;
  switch (providerType) {
    case 'google':
      provider = googleProvider;
      break;
    case 'microsoft':
      provider = microsoftProvider;
      break;
    case 'facebook':
      provider = facebookProvider;
      break;
    default:
      throw new Error(`Unknown provider: ${providerType}`);
  }

  const result = await signInWithPopup(auth, provider);

  // Ensure user profile exists in Firestore
  await ensureUserProfile(result.user);

  return result;
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  const auth = getAuth();
  await firebaseSignOut(auth);
}

// ============================================================================
// User Profile Management
// ============================================================================

/**
 * Get or create a user profile in Firestore.
 */
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  }

  // Create new profile
  const defaultSettings: UserSettings = {
    notifications: false,
    publicProfile: true,
  };

  const profile: UserProfile = {
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL,
    claimedProfiles: [],
    createdAt: Date.now(),
    settings: defaultSettings,
  };

  await setDoc(userRef, profile);
  return profile;
}

/**
 * Get a user profile from Firestore.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return userSnap.data() as UserProfile;
}

/**
 * Update user profile fields.
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, updates);
}

/**
 * Add a claimed profile to user's account.
 */
export async function addClaimedProfile(
  userId: string,
  league: string,
  season: string,
  name: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const claim: ClaimedProfile = {
    league,
    season,
    name,
    claimedAt: Date.now(),
  };
  await updateDoc(userRef, {
    claimedProfiles: arrayUnion(claim),
  });
}

/**
 * Remove a claimed profile from user's account.
 */
export async function removeClaimedProfile(
  userId: string,
  league: string,
  season: string,
  name: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error('User profile not found');
  }

  const profile = userSnap.data() as UserProfile;
  const updatedProfiles = profile.claimedProfiles.filter(
    (p) => !(p.league === league && p.season === season && p.name === name)
  );

  await updateDoc(userRef, {
    claimedProfiles: updatedProfiles,
  });
}

/**
 * Check if a profile is claimed by any user.
 * Note: This would require a separate index or query strategy for production.
 * For now, we just check if the current user has claimed it.
 */
export function hasClaimedProfile(
  profile: UserProfile,
  league: string,
  season: string,
  name: string
): boolean {
  return profile.claimedProfiles.some(
    (p) => p.league === league && p.season === season && p.name === name
  );
}

// ============================================================================
// Auth State Helpers
// ============================================================================

/**
 * Get the current authenticated user.
 */
export function getCurrentUser(): User | null {
  const auth = getAuth();
  return auth.currentUser;
}

/**
 * Check if a user is authenticated.
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}
