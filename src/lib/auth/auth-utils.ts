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
 * A captain claim for a team in a specific league/season.
 */
export interface CaptainClaim {
  league: string;
  season: string;
  team: string;
  division: string;
  claimedAt: number;
  verified: boolean;
  verifiedAt?: number;
  verifiedBy?: string;
}

/**
 * Onboarding progress tracking for new users.
 */
export interface OnboardingProgress {
  completedAt?: number;
  steps: {
    welcome: boolean;
    claimProfile: boolean;
    setMyTeam: boolean;
    enableNotifications: boolean;
  };
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
  captainClaims: CaptainClaim[];
  createdAt: number;
  settings: UserSettings;
  role?: 'user' | 'captain' | 'admin';
  isAdmin: boolean;
  onboarding?: OnboardingProgress;
  completedTutorials?: string[];
}

// ============================================================================
// Auth Providers
// ============================================================================

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export type AuthProvider = 'google';

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
    captainClaims: [],
    createdAt: Date.now(),
    settings: defaultSettings,
    isAdmin: false,
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
  const auth = getAuth();
  if (auth.currentUser) {
    await ensureUserProfile(auth.currentUser);
  }

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

// ============================================================================
// Admin Authorization
// ============================================================================

/**
 * Check if a user profile has admin privileges.
 */
export function isUserAdmin(profile: UserProfile | null): boolean {
  return profile?.isAdmin ?? false;
}

/**
 * Set admin status for a user.
 */
export async function setAdminStatus(
  userId: string,
  isAdmin: boolean
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { isAdmin });
}

// ============================================================================
// Captain Claim Management
// ============================================================================

/**
 * Add an unverified captain claim for a team.
 */
export async function addCaptainClaim(
  userId: string,
  league: string,
  season: string,
  team: string,
  division: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const claim: CaptainClaim = {
    league,
    season,
    team,
    division,
    claimedAt: Date.now(),
    verified: false,
  };
  await updateDoc(userRef, {
    captainClaims: arrayUnion(claim),
    role: 'captain',
  });
}

/**
 * Remove a captain claim.
 */
export async function removeCaptainClaim(
  userId: string,
  league: string,
  season: string,
  team: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User profile not found');

  const profile = userSnap.data() as UserProfile;
  const updatedClaims = (profile.captainClaims || []).filter(
    (c) => !(c.league === league && c.season === season && c.team === team)
  );

  const updates: Record<string, unknown> = { captainClaims: updatedClaims };
  if (updatedClaims.length === 0 && profile.role === 'captain') {
    updates.role = 'user';
  }
  await updateDoc(userRef, updates);
}

/**
 * Verify a captain claim (admin action).
 */
export async function verifyCaptainClaim(
  userId: string,
  league: string,
  season: string,
  team: string,
  adminUid: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error('User profile not found');

  const profile = userSnap.data() as UserProfile;
  const updatedClaims = (profile.captainClaims || []).map((c) => {
    if (c.league === league && c.season === season && c.team === team) {
      return { ...c, verified: true, verifiedAt: Date.now(), verifiedBy: adminUid };
    }
    return c;
  });

  await updateDoc(userRef, { captainClaims: updatedClaims });
}

/**
 * Check if a user has a captain claim for a specific team.
 */
export function hasCaptainClaim(
  profile: UserProfile,
  league: string,
  season: string,
  team: string
): boolean {
  return (profile.captainClaims || []).some(
    (c) => c.league === league && c.season === season && c.team === team
  );
}

/**
 * Check if a user is a verified captain for a specific team.
 */
export function isVerifiedCaptain(
  profile: UserProfile,
  league: string,
  season: string,
  team: string
): boolean {
  return (profile.captainClaims || []).some(
    (c) => c.league === league && c.season === season && c.team === team && c.verified
  );
}
