'use client';

/**
 * Auth Context
 *
 * React context for managing authentication state throughout the app.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import {
  signInWithProvider,
  signOut as authSignOut,
  getUserProfile,
  type AuthProvider,
  type UserProfile,
} from './auth-utils';

// ============================================================================
// Types
// ============================================================================

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
}

interface AuthContextValue extends AuthState {
  signIn: (provider: AuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  // Load user profile from Firestore
  const loadProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        user: null,
        profile: null,
        loading: false,
      }));
      return;
    }

    try {
      const profile = await getUserProfile(user.uid);
      setState({
        user,
        profile,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        user,
        profile: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to load profile'),
      });
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      loadProfile(user);
    });

    return () => unsubscribe();
  }, [loadProfile]);

  // Sign in with OAuth provider
  const signIn = useCallback(async (provider: AuthProvider) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const result = await signInWithProvider(provider);
      await loadProfile(result.user);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Sign in failed'),
      }));
      throw error;
    }
  }, [loadProfile]);

  // Sign out
  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      await authSignOut();
      setState({
        user: null,
        profile: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Sign out failed'),
      }));
      throw error;
    }
  }, []);

  // Refresh profile from Firestore
  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    await loadProfile(state.user);
  }, [state.user, loadProfile]);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Get just the current user (or null).
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * Get just the user profile (or null).
 */
export function useUserProfile(): UserProfile | null {
  const { profile } = useAuth();
  return profile;
}

/**
 * Check if user is authenticated.
 */
export function useIsAuthenticated(): boolean {
  const { user, loading } = useAuth();
  return !loading && user !== null;
}
