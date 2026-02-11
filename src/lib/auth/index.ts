/**
 * Auth Module
 *
 * Firebase authentication with OAuth providers.
 */

// Context and hooks
export {
  AuthProvider,
  useAuth,
  useUser,
  useUserProfile,
  useIsAuthenticated,
} from './auth-context';

// Types
export type {
  ClaimedProfile,
  CaptainClaim,
  OnboardingProgress,
  UserSettings,
  UserProfile,
  AuthProvider as AuthProviderType,
} from './auth-utils';

// Utilities
export {
  signInWithProvider,
  signOut,
  ensureUserProfile,
  getUserProfile,
  updateUserProfile,
  addClaimedProfile,
  removeClaimedProfile,
  hasClaimedProfile,
  getCurrentUser,
  isAuthenticated,
  addCaptainClaim,
  removeCaptainClaim,
  verifyCaptainClaim,
  hasCaptainClaim,
  isVerifiedCaptain,
} from './auth-utils';
