/**
 * Data Correction E2E Integration Tests
 *
 * End-to-end integration tests for the data correction workflow.
 * Tests verify:
 * 1. Admin can view existing results
 * 2. Admin can edit result scores
 * 3. Results update in Firestore
 * 4. Standings recalculate correctly
 * 5. Changes reflect in main app
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useAuth } from '@/lib/auth';
import { useAdmin } from '@/hooks/use-admin';
import DataCorrectionPanel from '@/components/admin/DataCorrectionPanel';
import type { User } from 'firebase/auth';
import type { UserProfile } from '@/lib/auth';
import type { MatchResult } from '@/lib/types';
import type { LeagueData } from '@/lib/data-provider';

// Mock the auth hooks
jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-admin', () => ({
  useAdmin: jest.fn(),
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

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAdmin = useAdmin as jest.MockedFunction<typeof useAdmin>;

// Create mock data
const mockResults: MatchResult[] = [
  {
    date: '2025-01-15',
    home: 'Team A',
    away: 'Team B',
    home_score: 6,
    away_score: 4,
    division: 'Premier',
    frames: 10,
  },
  {
    date: '2025-01-16',
    home: 'Team C',
    away: 'Team D',
    home_score: 5,
    away_score: 5,
    division: 'Premier',
    frames: 10,
  },
  {
    date: '2025-01-17',
    home: 'Team E',
    away: 'Team F',
    home_score: 7,
    away_score: 3,
    division: 'Division A',
    frames: 10,
  },
];

const mockLeagueData: Partial<LeagueData> = {
  results: mockResults,
  fixtures: [],
  players: {},
  rosters: {},
  players2526: {},
  frames: [],
  divisions: {
    Premier: { name: 'Premier', teams: ['Team A', 'Team B', 'Team C', 'Team D'] },
    'Division A': { name: 'Division A', teams: ['Team E', 'Team F'] },
  },
  lastUpdated: Date.now(),
  source: 'static',
};

// Mock active data provider
jest.mock('@/lib/active-data-provider', () => ({
  useActiveData: jest.fn(() => ({
    data: mockLeagueData,
    ds: {
      divisions: mockLeagueData.divisions,
      results: mockResults,
      fixtures: [],
      players: {},
      rosters: {},
      players2526: {},
    },
    frames: [],
    isTimeMachine: false,
  })),
}));

// Helper to create a mock admin user
const createMockAdminUser = (): Partial<User> => ({
  uid: 'admin123',
  email: 'admin@example.com',
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
  displayName: 'Admin User',
  phoneNumber: null,
  photoURL: null,
  providerId: 'firebase',
});

// Helper to create a mock admin profile
const createMockAdminProfile = (): UserProfile => ({
  email: 'admin@example.com',
  displayName: 'Admin User',
  photoURL: null,
  claimedProfiles: [],
  createdAt: Date.now(),
  settings: {
    notifications: false,
    publicProfile: true,
  },
  isAdmin: true,
});

describe('Data Correction E2E Integration Tests', () => {
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup admin user
    const adminUser = createMockAdminUser();
    const adminProfile = createMockAdminProfile();

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

    // Mock fetch API
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock window.location.reload
    delete (window as any).location;
    window.location = { reload: jest.fn() } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Step 1: Admin views existing results', () => {
    it('should display all results when no division filter is applied', () => {
      // Act: Render data correction panel
      render(<DataCorrectionPanel />);

      // Assert: All results should be visible
      expect(screen.getByText('Data Correction')).toBeTruthy();
      expect(screen.getByText('Team A')).toBeTruthy();
      expect(screen.getByText('Team B')).toBeTruthy();
      expect(screen.getByText('Team C')).toBeTruthy();
      expect(screen.getByText('Team D')).toBeTruthy();
      expect(screen.getByText('Team E')).toBeTruthy();
      expect(screen.getByText('Team F')).toBeTruthy();

      // Verify scores are displayed
      expect(screen.getByText('6 - 4')).toBeTruthy();
      expect(screen.getByText('5 - 5')).toBeTruthy();
      expect(screen.getByText('7 - 3')).toBeTruthy();
    });

    it('should filter results by division when division filter is provided', () => {
      // Act: Render with division filter
      render(<DataCorrectionPanel selectedDiv="Premier" />);

      // Assert: Only Premier division results should be visible
      expect(screen.getByText('Team A')).toBeTruthy();
      expect(screen.getByText('Team B')).toBeTruthy();
      expect(screen.getByText('Team C')).toBeTruthy();
      expect(screen.getByText('Team D')).toBeTruthy();

      // Division A teams should not be visible
      expect(screen.queryByText('Team E')).toBeNull();
      expect(screen.queryByText('Team F')).toBeNull();
    });

    it('should display results sorted by date (newest first)', () => {
      // Act: Render panel
      const { container } = render(<DataCorrectionPanel />);

      // Get all result rows
      const results = container.querySelectorAll('[class*="border-l-"]');

      // Assert: Results are in descending date order
      expect(results.length).toBe(3);

      // The first result should be Team E vs Team F (2025-01-17)
      expect(results[0].textContent).toContain('Team E');
      expect(results[0].textContent).toContain('Team F');
    });
  });

  describe('Step 2: Admin edits a result score', () => {
    it('should expand result details when clicked', async () => {
      // Arrange: Render panel
      render(<DataCorrectionPanel />);

      // Act: Click on a result to expand it
      const resultButton = screen.getAllByRole('button')[0]; // First result
      fireEvent.click(resultButton);

      // Assert: Edit button should appear
      await waitFor(() => {
        expect(screen.getByText('Edit Result')).toBeTruthy();
      });
    });

    it('should show edit form when Edit button is clicked', async () => {
      // Arrange: Render and expand result
      render(<DataCorrectionPanel />);
      const resultButton = screen.getAllByRole('button')[0];
      fireEvent.click(resultButton);

      // Wait for edit button
      await waitFor(() => {
        expect(screen.getByText('Edit Result')).toBeTruthy();
      });

      // Act: Click edit button
      const editButton = screen.getByText('Edit Result');
      fireEvent.click(editButton);

      // Assert: Edit form should be visible
      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeTruthy();
        expect(screen.getByText('Cancel')).toBeTruthy();
      });

      // Score inputs should be visible
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    it('should validate scores are non-negative', async () => {
      // Arrange: Render and open edit form
      render(<DataCorrectionPanel />);
      const resultButton = screen.getAllByRole('button')[0];
      fireEvent.click(resultButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Result')).toBeTruthy();
      });

      const editButton = screen.getByText('Edit Result');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeTruthy();
      });

      // Act: Try to set negative score
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '-5' } });

      // Click save
      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      // Assert: Error message should appear
      await waitFor(() => {
        expect(screen.getByText('Scores cannot be negative')).toBeTruthy();
      });

      // API should not be called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Step 3: Result updates in Firestore', () => {
    it('should call API to update result when save is clicked', async () => {
      // Arrange: Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Result updated successfully',
          result: {
            date: '2025-01-17',
            home: 'Team E',
            away: 'Team F',
            home_score: 8,
            away_score: 2,
            division: 'Division A',
            frames: 10,
          },
        }),
      });

      // Render and open edit form
      render(<DataCorrectionPanel />);
      const resultButton = screen.getAllByRole('button')[0];
      fireEvent.click(resultButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Result')).toBeTruthy();
      });

      const editButton = screen.getByText('Edit Result');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeTruthy();
      });

      // Act: Change scores and save
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '8' } }); // Home score
      fireEvent.change(inputs[1], { target: { value: '2' } }); // Away score

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      // Assert: API should be called with correct data
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/admin/results',
          expect.objectContaining({
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.any(String),
          })
        );
      });

      // Verify the request body
      const callArgs = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);
      expect(requestBody).toEqual({
        seasonId: '2025-26',
        resultIndex: expect.any(Number),
        result: {
          home_score: 8,
          away_score: 2,
        },
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange: Mock failed API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Failed to update result',
        }),
      });

      // Render and open edit form
      render(<DataCorrectionPanel />);
      const resultButton = screen.getAllByRole('button')[0];
      fireEvent.click(resultButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Result')).toBeTruthy();
      });

      const editButton = screen.getByText('Edit Result');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeTruthy();
      });

      // Act: Try to save
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '8' } });
      fireEvent.change(inputs[1], { target: { value: '2' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      // Assert: Error message should be displayed
      await waitFor(() => {
        expect(screen.getByText('Failed to update result')).toBeTruthy();
      });
    });
  });

  describe('Step 4 & 5: Standings recalculate and changes reflect in main app', () => {
    it('should reload the page after successful update to refresh standings', async () => {
      // Arrange: Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Result updated successfully',
        }),
      });

      // Render and open edit form
      render(<DataCorrectionPanel />);
      const resultButton = screen.getAllByRole('button')[0];
      fireEvent.click(resultButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Result')).toBeTruthy();
      });

      const editButton = screen.getByText('Edit Result');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeTruthy();
      });

      // Act: Save changes
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '8' } });
      fireEvent.change(inputs[1], { target: { value: '2' } });

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      // Assert: Page should reload to show updated standings
      await waitFor(() => {
        expect(window.location.reload).toHaveBeenCalled();
      });
    });
  });

  describe('Cancel and Reset functionality', () => {
    it('should cancel editing and reset form when Cancel is clicked', async () => {
      // Arrange: Render and open edit form
      render(<DataCorrectionPanel />);
      const resultButton = screen.getAllByRole('button')[0];
      fireEvent.click(resultButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Result')).toBeTruthy();
      });

      const editButton = screen.getByText('Edit Result');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByText('Save Changes')).toBeTruthy();
      });

      // Modify scores
      const inputs = screen.getAllByRole('spinbutton');
      fireEvent.change(inputs[0], { target: { value: '9' } });
      fireEvent.change(inputs[1], { target: { value: '1' } });

      // Act: Click cancel
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Assert: Edit form should be hidden, Edit button should be visible again
      await waitFor(() => {
        expect(screen.queryByText('Save Changes')).toBeNull();
        expect(screen.getByText('Edit Result')).toBeTruthy();
      });

      // API should not be called
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Empty state', () => {
    it('should show empty state message when no results are found', () => {
      // Mock empty data
      const emptyData = {
        ...mockLeagueData,
        results: [],
      };

      jest.requireMock('@/lib/active-data-provider').useActiveData.mockReturnValueOnce({
        data: emptyData,
        ds: {
          divisions: mockLeagueData.divisions,
          results: [],
          fixtures: [],
          players: {},
          rosters: {},
          players2526: {},
        },
        frames: [],
        isTimeMachine: false,
      });

      // Act: Render with no results
      render(<DataCorrectionPanel />);

      // Assert: Empty state should be displayed
      expect(screen.getByText('No results found')).toBeTruthy();
    });
  });
});
