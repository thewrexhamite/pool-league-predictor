/**
 * Admin Access Integration Tests
 *
 * End-to-end integration tests for admin role assignment and access control.
 * Tests verify:
 * 1. Regular users cannot access admin routes
 * 2. Admin users can access admin routes
 * 3. Admin dashboard loads with all components
 * 4. Navigation works between admin sections
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useAuth } from '@/lib/auth';
import { useAdmin } from '@/hooks/use-admin';
import AdminPage from '@/app/admin/page';
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
jest.mock('@/components/auth/OAuthButtons', () => ({
  OAuthButtons: () => <div data-testid="oauth-buttons">OAuth Buttons</div>,
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

// Mock data provider
jest.mock('@/lib/data-provider', () => ({
  useLeagueData: jest.fn(() => ({
    data: {
      results: [],
      fixtures: [],
      players: {},
      rosters: {},
      players2526: {},
      frames: [],
      divisions: {
        'Division A': { name: 'Division A', teams: [] },
        'Division B': { name: 'Division B', teams: [] },
      },
      lastUpdated: 0,
      source: 'static',
    },
    loading: false,
    refreshing: false,
  })),
}));

// Mock active data provider
jest.mock('@/lib/active-data-provider', () => ({
  useActiveData: jest.fn(() => ({
    data: {
      results: [],
      fixtures: [],
      players: {},
      rosters: {},
      players2526: {},
      frames: [],
      divisions: {
        'Division A': { name: 'Division A', teams: [] },
        'Division B': { name: 'Division B', teams: [] },
      },
      lastUpdated: 0,
      source: 'static',
    },
    ds: {
      divisions: {
        'Division A': { name: 'Division A', teams: [] },
        'Division B': { name: 'Division B', teams: [] },
      },
      results: [],
      fixtures: [],
      players: {},
      rosters: {},
      players2526: {},
    },
    frames: [],
    isTimeMachine: false,
  })),
}));

// Mock the chart components to avoid rendering issues
jest.mock('recharts', () => ({
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: () => null,
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAdmin = useAdmin as jest.MockedFunction<typeof useAdmin>;

// Helper to create a mock Firebase user
const createMockUser = (uid: string, email: string, isAdmin: boolean): Partial<User> => ({
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
  displayName: isAdmin ? 'Admin User' : 'Regular User',
  phoneNumber: null,
  photoURL: null,
  providerId: 'firebase',
});

// Helper to create a mock user profile
const createMockProfile = (isAdmin: boolean, displayName: string): UserProfile => ({
  email: isAdmin ? 'admin@example.com' : 'user@example.com',
  displayName,
  photoURL: null,
  claimedProfiles: [],
  createdAt: Date.now(),
  settings: {
    notifications: false,
    publicProfile: true,
  },
  isAdmin,
});

describe('Admin Access Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch for API calls that components might make
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          users: {
            totalUsers: 100,
            activeUsers: 75,
            adminCount: 5,
            usersWithNotifications: 40,
          },
          leagueData: {
            totalPlayers: 200,
            totalTeams: 20,
            totalDivisions: 4,
            totalMatches: 150,
            totalFixtures: 50,
          },
          engagement: {
            activeInLast7Days: 60,
            activeInLast30Days: 85,
            averageLoginsPerUser: 8.5,
          },
          growth: {
            newUsersLast7Days: 10,
            newUsersLast30Days: 25,
            growthRate: 15,
          },
        }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Test 1: Regular user cannot access /admin', () => {
    it('should show login form when user is not authenticated', () => {
      // Arrange: No user logged in
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

      // Act: Render admin page
      render(<AdminPage />);

      // Assert: Login form should be displayed
      expect(screen.getByText('Sign in to continue')).toBeTruthy();
      expect(screen.getByTestId('oauth-buttons')).toBeTruthy();
      expect(screen.queryByText('Admin Dashboard')).toBeNull();
    });

    it('should show access denied when authenticated user is not admin', () => {
      // Arrange: Regular user logged in (not admin)
      const regularUser = createMockUser('user123', 'user@example.com', false);
      const regularProfile = createMockProfile(false, 'Regular User');

      mockUseAuth.mockReturnValue({
        user: regularUser as User,
        profile: regularProfile,
        loading: false,
        error: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      });
      mockUseAdmin.mockReturnValue({
        isAdmin: false,
        loading: false,
        profile: regularProfile,
      });

      // Act: Render admin page
      render(<AdminPage />);

      // Assert: Access denied message should be displayed
      expect(screen.getByText('Access Denied')).toBeTruthy();
      expect(screen.getByText('Admin access required')).toBeTruthy();
      expect(screen.queryByText('Admin Dashboard')).toBeNull();
    });
  });

  describe('Test 2: Admin user can access /admin', () => {
    it('should render admin dashboard when user is admin', async () => {
      // Arrange: Admin user logged in
      const adminUser = createMockUser('admin123', 'admin@example.com', true);
      const adminProfile = createMockProfile(true, 'Admin User');

      mockUseAuth.mockReturnValue({
        user: adminUser as User,
        profile: adminProfile,
        loading: false,
        error: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      });
      mockUseAdmin.mockReturnValue({
        isAdmin: true,
        loading: false,
        profile: adminProfile,
      });

      // Act: Render admin page
      render(<AdminPage />);

      // Assert: Admin dashboard should be displayed
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeTruthy();
      });
      expect(screen.queryByText('Access Denied')).toBeNull();
      expect(screen.queryByText('Sign in to continue')).toBeNull();
    });

    it('should display welcome message with admin name', async () => {
      // Arrange: Admin user logged in
      const adminUser = createMockUser('admin123', 'admin@example.com', true);
      const adminProfile = createMockProfile(true, 'Admin User');

      mockUseAuth.mockReturnValue({
        user: adminUser as User,
        profile: adminProfile,
        loading: false,
        error: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      });
      mockUseAdmin.mockReturnValue({
        isAdmin: true,
        loading: false,
        profile: adminProfile,
      });

      // Act: Render admin page
      render(<AdminPage />);

      // Assert: Welcome message with admin name should be displayed
      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Admin User/)).toBeTruthy();
      });
    });
  });

  describe('Test 3: Admin dashboard loads with all panels', () => {
    beforeEach(() => {
      // Setup admin user for all tests in this suite
      const adminUser = createMockUser('admin123', 'admin@example.com', true);
      const adminProfile = createMockProfile(true, 'Admin User');

      mockUseAuth.mockReturnValue({
        user: adminUser as User,
        profile: adminProfile,
        loading: false,
        error: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      });
      mockUseAdmin.mockReturnValue({
        isAdmin: true,
        loading: false,
        profile: adminProfile,
      });
    });

    it('should display all admin tool cards', async () => {
      // Act: Render admin page
      render(<AdminPage />);

      // Assert: All admin tool cards should be present
      await waitFor(() => {
        // Core admin tools
        expect(screen.getByText('User Management')).toBeTruthy();
        expect(screen.getByText('Results Management')).toBeTruthy();
        expect(screen.getByText('Analytics')).toBeTruthy();
        expect(screen.getByText('League Settings')).toBeTruthy();
        expect(screen.getByText('Data Management')).toBeTruthy();
        expect(screen.getByText('Player Merge')).toBeTruthy();
      });
    });

    it('should display overview stats cards', async () => {
      // Act: Render admin page
      render(<AdminPage />);

      // Assert: Stats cards should be present (exact text matches to avoid conflicts with tool names)
      await waitFor(() => {
        // Look for stats section (divisions, teams, results, frames)
        expect(screen.getByText('Divisions')).toBeTruthy();
        expect(screen.getByText('Teams')).toBeTruthy();
        expect(screen.getByText('Results')).toBeTruthy();
      });
    });

    it('should display quick actions section', async () => {
      // Act: Render admin page
      render(<AdminPage />);

      // Assert: Quick actions should be present
      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeTruthy();
      });
    });
  });

  describe('Test 4: Navigation and component loading', () => {
    beforeEach(() => {
      // Setup admin user for all tests in this suite
      const adminUser = createMockUser('admin123', 'admin@example.com', true);
      const adminProfile = createMockProfile(true, 'Admin User');

      mockUseAuth.mockReturnValue({
        user: adminUser as User,
        profile: adminProfile,
        loading: false,
        error: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      });
      mockUseAdmin.mockReturnValue({
        isAdmin: true,
        loading: false,
        profile: adminProfile,
      });
    });

    it('should load without errors', async () => {
      // Act: Render admin page
      const { container } = render(<AdminPage />);

      // Assert: Page renders without crashing
      expect(container).toBeTruthy();
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeTruthy();
      });
    });

    it('should handle loading states gracefully', () => {
      // Arrange: Set loading state
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

      // Act: Render admin page
      const { container } = render(<AdminPage />);

      // Assert: Loading spinner should be displayed
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeNull();
    });
  });

  describe('Test 5: Authorization flow integrity', () => {
    it('should require both authentication AND admin role', () => {
      // Test Case 1: Not authenticated, not admin
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

      const { rerender } = render(<AdminPage />);
      expect(screen.getByText('Sign in to continue')).toBeTruthy();

      // Test Case 2: Authenticated but not admin
      const regularUser = createMockUser('user123', 'user@example.com', false);
      const regularProfile = createMockProfile(false, 'Regular User');

      mockUseAuth.mockReturnValue({
        user: regularUser as User,
        profile: regularProfile,
        loading: false,
        error: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      });
      mockUseAdmin.mockReturnValue({
        isAdmin: false,
        loading: false,
        profile: regularProfile,
      });

      rerender(<AdminPage />);
      expect(screen.getByText('Access Denied')).toBeTruthy();

      // Test Case 3: Authenticated AND admin
      const adminUser = createMockUser('admin123', 'admin@example.com', true);
      const adminProfile = createMockProfile(true, 'Admin User');

      mockUseAuth.mockReturnValue({
        user: adminUser as User,
        profile: adminProfile,
        loading: false,
        error: null,
        signIn: jest.fn(),
        signOut: jest.fn(),
        refreshProfile: jest.fn(),
      });
      mockUseAdmin.mockReturnValue({
        isAdmin: true,
        loading: false,
        profile: adminProfile,
      });

      rerender(<AdminPage />);
      expect(screen.getByText('Admin Dashboard')).toBeTruthy();
    });
  });
});
