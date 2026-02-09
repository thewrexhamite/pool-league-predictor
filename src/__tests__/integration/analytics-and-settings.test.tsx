import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LeagueHealthMetrics from '@/components/admin/LeagueHealthMetrics';
import LeagueSettingsPanel from '@/components/admin/LeagueSettingsPanel';
import { useAuth } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/auth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock fetch
global.fetch = jest.fn();

describe('Analytics and League Settings E2E Workflow', () => {
  const mockAnalyticsData = {
    users: {
      totalUsers: 150,
      activeUsers: 120,
      adminUsers: 5,
      usersWithNotifications: 90,
    },
    leagueData: {
      totalPlayers: 300,
      totalTeams: 40,
      totalDivisions: 4,
      totalMatches: 250,
      totalFixtures: 500,
    },
    engagement: {
      notificationSubscriptions: 90,
      recentLogins: 85,
      activeInLast7Days: 110,
      activeInLast30Days: 120,
    },
    growth: {
      newUsersLast7Days: 12,
      newUsersLast30Days: 45,
      growthRate: 42,
    },
    timestamp: Date.now(),
  };

  const mockLeagueSettings = {
    settings: {
      leagueName: 'Test Pool League',
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      contactEmail: 'admin@testleague.com',
      enableNotifications: true,
      enablePredictions: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock auth
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid' } as any,
      profile: { isAdmin: true, displayName: 'Test Admin' } as any,
      loading: false,
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    } as any);

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Step 1: Admin Views League Health Metrics', () => {
    it('should fetch and display analytics data successfully', async () => {
      // Mock successful analytics fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyticsData,
      });

      render(<LeagueHealthMetrics />);

      // Loading state should appear initially
      expect(screen.getByText(/Loading analytics/i)).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('League Health Metrics')).toBeInTheDocument();
      });

      // Verify analytics API was called with auth token
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/analytics',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          }),
        })
      );

      // Verify analytics data is displayed
      expect(screen.getByText('150')).toBeInTheDocument(); // Total users
      expect(screen.getByText('120')).toBeInTheDocument(); // Active users
    });

    it('should show loading state while fetching analytics', async () => {
      // Mock delayed response
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => mockAnalyticsData,
        }), 100))
      );

      render(<LeagueHealthMetrics />);

      expect(screen.getByText(/Loading analytics/i)).toBeInTheDocument();
      expect(screen.getByRole('generic', { hidden: true })).toHaveClass('animate-spin');
    });

    it('should display error state when analytics fetch fails', async () => {
      // Mock failed fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
      });

      render(<LeagueHealthMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Failed to Load Analytics')).toBeInTheDocument();
        expect(screen.getByText(/Failed to fetch analytics: Unauthorized/i)).toBeInTheDocument();
      });

      // Verify retry button is present
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    it('should allow retrying analytics fetch after error', async () => {
      // Mock initial failure, then success
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAnalyticsData,
        });

      render(<LeagueHealthMetrics />);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText('Failed to Load Analytics')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryButton);

      // Wait for success
      await waitFor(() => {
        expect(screen.getByText('League Health Metrics')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Step 2: Metrics Display Correctly with Real Data', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalyticsData,
      });
    });

    it('should display participation rates with correct calculations', async () => {
      render(<LeagueHealthMetrics />);

      await waitFor(() => {
        expect(screen.getByText('League Health Metrics')).toBeInTheDocument();
      });

      // Check participation rate calculation (120/150 = 80%)
      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText(/120 of 150 registered users/i)).toBeInTheDocument();

      // Check notification rate (90/150 = 60%)
      expect(screen.getByText('60%')).toBeInTheDocument();
      expect(screen.getByText(/90 users have enabled notifications/i)).toBeInTheDocument();

      // Check weekly activity rate (110/150 = 73%)
      expect(screen.getByText('73%')).toBeInTheDocument();
      expect(screen.getByText(/110 users active in last 7 days/i)).toBeInTheDocument();
    });

    it('should display engagement statistics correctly', async () => {
      render(<LeagueHealthMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Engagement Statistics')).toBeInTheDocument();
      });

      // Verify all engagement metrics
      expect(screen.getByText('150')).toBeInTheDocument(); // Total users
      expect(screen.getByText('120')).toBeInTheDocument(); // Active users
      expect(screen.getByText('85')).toBeInTheDocument(); // Recent logins
      expect(screen.getByText('90')).toBeInTheDocument(); // Notification subscriptions
    });

    it('should display growth metrics with trends', async () => {
      render(<LeagueHealthMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Growth & Trends')).toBeInTheDocument();
      });

      // Verify growth numbers
      expect(screen.getByText('+12')).toBeInTheDocument(); // New users last 7 days
      expect(screen.getByText('+45')).toBeInTheDocument(); // New users last 30 days
      expect(screen.getByText('+42%')).toBeInTheDocument(); // Growth rate
    });

    it('should display league data overview', async () => {
      render(<LeagueHealthMetrics />);

      await waitFor(() => {
        expect(screen.getByText('League Data Overview')).toBeInTheDocument();
      });

      // Verify league data counts
      expect(screen.getByText('300')).toBeInTheDocument(); // Players
      expect(screen.getByText('40')).toBeInTheDocument(); // Teams
      expect(screen.getByText('4')).toBeInTheDocument(); // Divisions
      expect(screen.getByText('250')).toBeInTheDocument(); // Matches
      expect(screen.getByText('500')).toBeInTheDocument(); // Fixtures
    });

    it('should show dev mode indicator when present', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockAnalyticsData,
          dev_mode: true,
        }),
      });

      render(<LeagueHealthMetrics />);

      await waitFor(() => {
        expect(screen.getByText('Dev Mode')).toBeInTheDocument();
      });
    });
  });

  describe('Step 3: Admin Updates League Settings', () => {
    beforeEach(async () => {
      // Mock settings fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeagueSettings,
      });
    });

    it('should fetch and display current league settings', async () => {
      render(<LeagueSettingsPanel />);

      // Loading state
      expect(screen.getByRole('generic', { hidden: true })).toHaveClass('animate-spin');

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Verify settings API was called with auth token
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/leagues/settings',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      );

      // Verify current settings are displayed
      const leagueNameInput = screen.getByPlaceholderText('Enter league name') as HTMLInputElement;
      expect(leagueNameInput.value).toBe('Test Pool League');

      const emailInput = screen.getByPlaceholderText('admin@example.com') as HTMLInputElement;
      expect(emailInput.value).toBe('admin@testleague.com');
    });

    it('should allow editing league name and colors', async () => {
      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Edit league name
      const leagueNameInput = screen.getByPlaceholderText('Enter league name');
      fireEvent.change(leagueNameInput, { target: { value: 'Updated Pool League' } });

      expect((leagueNameInput as HTMLInputElement).value).toBe('Updated Pool League');

      // Edit primary color
      const primaryColorInputs = screen.getAllByDisplayValue('#1976d2');
      fireEvent.change(primaryColorInputs[0], { target: { value: '#ff0000' } });

      expect((primaryColorInputs[0] as HTMLInputElement).value).toBe('#ff0000');
    });

    it('should validate required fields before saving', async () => {
      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Clear league name (required field)
      const leagueNameInput = screen.getByPlaceholderText('Enter league name');
      fireEvent.change(leagueNameInput, { target: { value: '' } });

      // Try to save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('League name is required')).toBeInTheDocument();
        expect(screen.getByText('Please fix the errors before saving')).toBeInTheDocument();
      });

      // Settings API should not be called
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial fetch
    });

    it('should validate hex color format', async () => {
      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Enter invalid hex color
      const primaryColorInputs = screen.getAllByDisplayValue('#1976d2');
      fireEvent.change(primaryColorInputs[1], { target: { value: 'not-a-color' } });

      // Try to save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid hex color/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Enter invalid email
      const emailInput = screen.getByPlaceholderText('admin@example.com');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      // Try to save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });
    });

    it('should toggle feature flags', async () => {
      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('Enable Notifications')).toBeInTheDocument();
      });

      // Find toggle buttons by their parent text
      const notificationToggle = screen.getByText('Enable Notifications').parentElement?.querySelector('button');
      const predictionsToggle = screen.getByText('Enable Predictions').parentElement?.querySelector('button');

      expect(notificationToggle).toBeInTheDocument();
      expect(predictionsToggle).toBeInTheDocument();

      // Toggle notifications off
      fireEvent.click(notificationToggle!);

      // Toggle predictions off
      fireEvent.click(predictionsToggle!);

      // Both should now be toggled
      expect(notificationToggle).toHaveClass('bg-gray-600');
      expect(predictionsToggle).toHaveClass('bg-gray-600');
    });
  });

  describe('Step 4: Settings Save and Apply to Main App', () => {
    beforeEach(async () => {
      // Mock settings fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeagueSettings,
      });
    });

    it('should save settings successfully with proper payload', async () => {
      // Mock successful save
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeagueSettings,
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'League settings updated successfully',
        }),
      });

      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Make a change
      const leagueNameInput = screen.getByPlaceholderText('Enter league name');
      fireEvent.change(leagueNameInput, { target: { value: 'Updated League Name' } });

      // Save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      // Wait for save to complete
      await waitFor(() => {
        expect(screen.getByText('League settings saved successfully')).toBeInTheDocument();
      });

      // Verify save API was called with correct payload
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/leagues/settings',
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          }),
          body: expect.stringContaining('Updated League Name'),
        })
      );
    });

    it('should show loading state during save', async () => {
      // Mock delayed save
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeagueSettings,
      }).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Success' }),
        }), 100))
      );

      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Make a change
      const leagueNameInput = screen.getByPlaceholderText('Enter league name');
      fireEvent.change(leagueNameInput, { target: { value: 'New Name' } });

      // Start save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    it('should handle save errors gracefully', async () => {
      // Mock failed save
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeagueSettings,
      }).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Permission denied' }),
      });

      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Make a change
      const leagueNameInput = screen.getByPlaceholderText('Enter league name');
      fireEvent.change(leagueNameInput, { target: { value: 'New Name' } });

      // Try to save
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
      });
    });

    it('should disable save button when no changes', async () => {
      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Save button should be disabled (no changes)
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveClass('cursor-not-allowed');
    });

    it('should enable save button when changes are made', async () => {
      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Make a change
      const leagueNameInput = screen.getByPlaceholderText('Enter league name');
      fireEvent.change(leagueNameInput, { target: { value: 'Modified Name' } });

      // Save button should now be enabled
      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('should show reset button when changes are made', async () => {
      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // No reset button initially
      expect(screen.queryByRole('button', { name: /Reset/i })).not.toBeInTheDocument();

      // Make a change
      const leagueNameInput = screen.getByPlaceholderText('Enter league name');
      fireEvent.change(leagueNameInput, { target: { value: 'Changed' } });

      // Reset button should appear
      expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument();
    });

    it('should reset changes when reset button is clicked', async () => {
      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      const leagueNameInput = screen.getByPlaceholderText('Enter league name') as HTMLInputElement;
      const originalValue = leagueNameInput.value;

      // Make a change
      fireEvent.change(leagueNameInput, { target: { value: 'Changed' } });
      expect(leagueNameInput.value).toBe('Changed');

      // Click reset
      const resetButton = screen.getByRole('button', { name: /Reset/i });
      fireEvent.click(resetButton);

      // Value should be restored
      expect(leagueNameInput.value).toBe(originalValue);
    });

    it('should auto-dismiss success message after 3 seconds', async () => {
      jest.useFakeTimers();

      // Mock successful save
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockLeagueSettings,
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Settings saved' }),
      });

      render(<LeagueSettingsPanel />);

      await waitFor(() => {
        expect(screen.getByText('League Settings')).toBeInTheDocument();
      });

      // Make a change and save
      const leagueNameInput = screen.getByPlaceholderText('Enter league name');
      fireEvent.change(leagueNameInput, { target: { value: 'New Name' } });

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText('Settings saved')).toBeInTheDocument();
      });

      // Fast-forward time by 3 seconds
      jest.advanceTimersByTime(3000);

      // Success message should be removed
      await waitFor(() => {
        expect(screen.queryByText('Settings saved')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
});
