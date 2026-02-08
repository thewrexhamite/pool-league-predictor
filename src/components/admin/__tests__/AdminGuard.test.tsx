/**
 * AdminGuard Component Tests
 *
 * Tests for the AdminGuard component that protects admin routes
 */

import { render, screen } from '@testing-library/react';
import { AdminGuard } from '../AdminGuard';
import { useAuth } from '@/lib/auth';
import { useAdmin } from '@/hooks/use-admin';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/lib/auth';

// Mock the auth hooks
jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-admin', () => ({
  useAdmin: jest.fn(),
}));

// Mock the OAuthButtons component
jest.mock('../../auth/OAuthButtons', () => ({
  OAuthButtons: () => <div data-testid="oauth-buttons">OAuth Buttons</div>,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAdmin = useAdmin as jest.MockedFunction<typeof useAdmin>;

// Helper to create a mock Firebase user
const createMockUser = (uid: string, email: string): Partial<User> => ({
  uid,
  email,
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: jest.fn(),
  getIdToken: jest.fn(),
  getIdTokenResult: jest.fn(),
  reload: jest.fn(),
  toJSON: jest.fn(),
  displayName: null,
  phoneNumber: null,
  photoURL: null,
  providerId: 'firebase',
});

// Helper to create a mock user profile
const createMockProfile = (isAdmin: boolean): UserProfile => ({
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  claimedProfiles: [],
  createdAt: Date.now(),
  settings: {
    notifications: false,
    publicProfile: false,
  },
  isAdmin,
});

describe('AdminGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading spinner when auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: true,
      error: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    });
    mockUseAdmin.mockReturnValue({
      isAdmin: false,
      loading: true,
      profile: null,
    });

    const { container } = render(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('should show loading spinner when admin check is loading', () => {
    mockUseAuth.mockReturnValue({
      user: createMockUser('123', 'test@example.com') as User,
      profile: createMockProfile(false),
      loading: false,
      error: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    });
    mockUseAdmin.mockReturnValue({
      isAdmin: false,
      loading: true,
      profile: null,
    });

    const { container } = render(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );

    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('should show login form when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    });
    mockUseAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      profile: null,
    });

    render(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByText('Sign in to continue')).toBeTruthy();
    expect(screen.getByTestId('oauth-buttons')).toBeTruthy();
  });

  it('should show access denied when user is authenticated but not admin', () => {
    mockUseAuth.mockReturnValue({
      user: createMockUser('123', 'test@example.com') as User,
      profile: createMockProfile(false),
      loading: false,
      error: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    });
    mockUseAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      profile: createMockProfile(false),
    });

    render(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByText('Access Denied')).toBeTruthy();
    expect(screen.getByText('Admin access required')).toBeTruthy();
  });

  it('should render children when user is admin', () => {
    mockUseAuth.mockReturnValue({
      user: createMockUser('123', 'admin@example.com') as User,
      profile: createMockProfile(true),
      loading: false,
      error: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    });
    mockUseAdmin.mockReturnValue({
      isAdmin: true,
      loading: false,
      profile: createMockProfile(true),
    });

    render(
      <AdminGuard>
        <div>Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByText('Admin Content')).toBeTruthy();
    expect(screen.queryByText('Access Denied')).toBeNull();
    expect(screen.queryByText('Sign in to continue')).toBeNull();
  });

  it('should render custom fallback when provided and user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    });
    mockUseAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      profile: null,
    });

    render(
      <AdminGuard fallback={<div>Custom Fallback</div>}>
        <div>Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByText('Custom Fallback')).toBeTruthy();
    expect(screen.queryByText('Sign in to continue')).toBeNull();
  });

  it('should render custom fallback when provided and user is not admin', () => {
    mockUseAuth.mockReturnValue({
      user: createMockUser('123', 'test@example.com') as User,
      profile: createMockProfile(false),
      loading: false,
      error: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    });
    mockUseAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      profile: createMockProfile(false),
    });

    render(
      <AdminGuard fallback={<div>Custom Fallback</div>}>
        <div>Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByText('Custom Fallback')).toBeTruthy();
    expect(screen.queryByText('Access Denied')).toBeNull();
  });

  it('should use custom messages when provided', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    });
    mockUseAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      profile: null,
    });

    render(
      <AdminGuard message="Custom login message">
        <div>Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByText('Custom login message')).toBeTruthy();
  });

  it('should use custom access denied message when provided', () => {
    mockUseAuth.mockReturnValue({
      user: createMockUser('123', 'test@example.com') as User,
      profile: createMockProfile(false),
      loading: false,
      error: null,
      signIn: jest.fn(),
      signOut: jest.fn(),
      refreshProfile: jest.fn(),
    });
    mockUseAdmin.mockReturnValue({
      isAdmin: false,
      loading: false,
      profile: createMockProfile(false),
    });

    render(
      <AdminGuard accessDeniedMessage="You need special permissions">
        <div>Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByText('You need special permissions')).toBeTruthy();
  });
});
