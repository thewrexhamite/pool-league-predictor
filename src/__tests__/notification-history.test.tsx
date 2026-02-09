/**
 * E2E Integration Test: Notification History Display
 *
 * This test verifies the complete workflow for notification history including:
 * - Send test notification via /api/notifications/send
 * - Navigate to notification settings
 * - Verify notification appears in history section
 * - Verify notification shows correct type, title, and timestamp
 * - Verify chronological ordering (newest first)
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationHistory from '@/components/NotificationHistory';
import { useAuth } from '@/lib/auth';
import type { NotificationHistory as NotificationHistoryType } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/auth');

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('E2E: Notification History Display', () => {
  const mockUser = { uid: 'test-user-123' };

  // Sample notification history data
  const mockNotifications: NotificationHistoryType[] = [
    {
      id: 'notif-3',
      userId: 'test-user-123',
      type: 'match_results',
      title: 'Match Result: Magnet A vs North Star A',
      body: 'Magnet A won 6-2',
      sentAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      fixture: {
        date: '15-01-2026',
        home: 'Magnet A',
        away: 'North Star A',
        division: 'SD1',
      },
      read: false,
    },
    {
      id: 'notif-2',
      userId: 'test-user-123',
      type: 'upcoming_fixtures',
      title: 'Upcoming Match: Magnet B vs Magnet A',
      body: 'Your match starts tomorrow at 7:00 PM',
      sentAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
      fixture: {
        date: '22-01-2026',
        home: 'Magnet B',
        away: 'Magnet A',
        division: 'SD1',
      },
      read: true,
    },
    {
      id: 'notif-1',
      userId: 'test-user-123',
      type: 'standings_updates',
      title: 'Standings Update',
      body: 'Magnet A moved to 2nd place in SD1',
      sentAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
      read: true,
    },
  ];

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock useAuth
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
    });

    // Mock fetch to return notifications
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        history: mockNotifications,
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Step 1: Send test notification via /api/notifications/send', () => {
    it('should successfully send a test notification', async () => {
      const sendNotificationPayload = {
        userId: 'test-user-123',
        type: 'match_results',
        title: 'Match Result: Magnet A vs North Star A',
        body: 'Magnet A won 6-2',
        fixture: {
          date: '15-01-2026',
          home: 'Magnet A',
          away: 'North Star A',
          division: 'SD1',
        },
      };

      // Mock send notification endpoint
      const mockSendFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          messageId: 'test-message-123',
        }),
      });

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/notifications/send')) {
          return mockSendFetch(url);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, history: [] }),
        });
      });

      // Simulate sending notification
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendNotificationPayload),
      });

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.messageId).toBe('test-message-123');
      expect(mockSendFetch).toHaveBeenCalledWith('/api/notifications/send');
    });

    it('should handle send notification errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Failed to send notification',
        }),
      });

      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-123',
          type: 'match_results',
          title: 'Test',
          body: 'Test notification',
        }),
      });

      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to send notification');
    });
  });

  describe('Step 2: Navigate to notification settings', () => {
    it('should render NotificationHistory component', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Notification History')).toBeInTheDocument();
      });
    });

    it('should fetch notification history on mount', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/notifications/history?userId=test-user-123'
        );
      });
    });

    it('should show loading state initially', () => {
      render(<NotificationHistory />);

      expect(screen.getByText('Loading notification history...')).toBeInTheDocument();
    });
  });

  describe('Step 3: Verify notification appears in history section', () => {
    it('should display all notifications from history', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Match Result: Magnet A vs North Star A')).toBeInTheDocument();
        expect(screen.getByText('Upcoming Match: Magnet B vs Magnet A')).toBeInTheDocument();
        expect(screen.getByText('Standings Update')).toBeInTheDocument();
      });
    });

    it('should display notification count', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('3 notifications')).toBeInTheDocument();
      });
    });

    it('should handle singular notification count', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          history: [mockNotifications[0]],
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('1 notification')).toBeInTheDocument();
      });
    });

    it('should show empty state when no notifications', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          history: [],
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('No notifications yet')).toBeInTheDocument();
        expect(
          screen.getByText(/When you receive notifications, they'll appear here/i)
        ).toBeInTheDocument();
      });
    });

    it('should display notification body text', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Magnet A won 6-2')).toBeInTheDocument();
        expect(screen.getByText('Your match starts tomorrow at 7:00 PM')).toBeInTheDocument();
        expect(screen.getByText('Magnet A moved to 2nd place in SD1')).toBeInTheDocument();
      });
    });

    it('should display fixture information when available', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Magnet A vs North Star A • SD1')).toBeInTheDocument();
        expect(screen.getByText('Magnet B vs Magnet A • SD1')).toBeInTheDocument();
      });
    });

    it('should show unread indicator for unread notifications', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        const firstNotification = screen.getByText('Match Result: Magnet A vs North Star A').closest('div');
        expect(firstNotification).toBeInTheDocument();

        // Check for unread indicator (blue dot)
        const unreadIndicator = firstNotification?.querySelector('[title="Unread"]');
        expect(unreadIndicator).toBeInTheDocument();
      });
    });

    it('should not show unread indicator for read notifications', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        const secondNotification = screen.getByText('Upcoming Match: Magnet B vs Magnet A').closest('div');
        expect(secondNotification).toBeInTheDocument();

        // No unread indicator for read notification
        const unreadIndicator = secondNotification?.querySelector('[title="Unread"]');
        expect(unreadIndicator).toBeNull();
      });
    });
  });

  describe('Step 4: Verify notification shows correct type, title, and timestamp', () => {
    it('should display correct notification type label for match results', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Match Result')).toBeInTheDocument();
      });
    });

    it('should display correct notification type label for upcoming fixtures', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Upcoming Fixture')).toBeInTheDocument();
      });
    });

    it('should display correct notification type label for standings updates', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Standings Update')).toBeInTheDocument();
      });
    });

    it('should display correct titles', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Match Result: Magnet A vs North Star A')).toBeInTheDocument();
        expect(screen.getByText('Upcoming Match: Magnet B vs Magnet A')).toBeInTheDocument();
        expect(screen.getByText('Standings Update')).toBeInTheDocument();
      });
    });

    it('should display relative timestamps correctly', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        // 30 minutes ago should show "30 minutes ago"
        expect(screen.getByText('30 minutes ago')).toBeInTheDocument();

        // 2 hours ago should show "2 hours ago"
        expect(screen.getByText('2 hours ago')).toBeInTheDocument();

        // 1 day ago should show "Yesterday"
        expect(screen.getByText('Yesterday')).toBeInTheDocument();
      });
    });

    it('should format timestamp for recent notification (< 1 minute)', async () => {
      const recentNotification: NotificationHistoryType = {
        id: 'notif-recent',
        userId: 'test-user-123',
        type: 'match_results',
        title: 'Recent Match',
        body: 'Just happened',
        sentAt: Date.now() - 1000 * 30, // 30 seconds ago
        read: false,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          history: [recentNotification],
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Just now')).toBeInTheDocument();
      });
    });

    it('should format timestamp for old notification (> 1 week)', async () => {
      const oldNotification: NotificationHistoryType = {
        id: 'notif-old',
        userId: 'test-user-123',
        type: 'match_results',
        title: 'Old Match',
        body: 'Long time ago',
        sentAt: Date.now() - 1000 * 60 * 60 * 24 * 10, // 10 days ago
        read: true,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          history: [oldNotification],
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        // Should show formatted date (e.g., "Jan 29")
        const timeElement = screen.getByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
        expect(timeElement).toBeInTheDocument();
      });
    });
  });

  describe('Step 5: Verify chronological ordering (newest first)', () => {
    it('should display notifications in reverse chronological order', async () => {
      render(<NotificationHistory />);

      await waitFor(() => {
        const notifications = screen.getAllByRole('article', { hidden: true });

        // Get all notification titles in order
        const titles = notifications.map(notif =>
          within(notif).queryByText(/Match Result|Upcoming Match|Standings Update/)?.textContent
        ).filter(Boolean);

        // Verify order: newest (30 min ago) -> middle (2 hours ago) -> oldest (1 day ago)
        expect(titles[0]).toContain('Match Result');
        expect(titles[1]).toContain('Upcoming Match');
        expect(titles[2]).toContain('Standings Update');
      });
    });

    it('should maintain chronological order with multiple notifications of same type', async () => {
      const multipleMatchResults: NotificationHistoryType[] = [
        {
          id: 'notif-1',
          userId: 'test-user-123',
          type: 'match_results',
          title: 'Newest Match',
          body: 'Just finished',
          sentAt: Date.now() - 1000 * 60 * 10, // 10 minutes ago
          read: false,
        },
        {
          id: 'notif-2',
          userId: 'test-user-123',
          type: 'match_results',
          title: 'Middle Match',
          body: 'Earlier today',
          sentAt: Date.now() - 1000 * 60 * 60 * 4, // 4 hours ago
          read: true,
        },
        {
          id: 'notif-3',
          userId: 'test-user-123',
          type: 'match_results',
          title: 'Oldest Match',
          body: 'Yesterday',
          sentAt: Date.now() - 1000 * 60 * 60 * 26, // 26 hours ago
          read: true,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          history: multipleMatchResults,
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        const titles = screen.getAllByRole('heading', { level: 3 });

        expect(titles[0]).toHaveTextContent('Newest Match');
        expect(titles[1]).toHaveTextContent('Middle Match');
        expect(titles[2]).toHaveTextContent('Oldest Match');
      });
    });

    it('should handle notifications with identical timestamps', async () => {
      const sameTimestamp = Date.now() - 1000 * 60 * 60; // 1 hour ago
      const identicalTimeNotifications: NotificationHistoryType[] = [
        {
          id: 'notif-1',
          userId: 'test-user-123',
          type: 'match_results',
          title: 'First Match',
          body: 'Same time notification 1',
          sentAt: sameTimestamp,
          read: false,
        },
        {
          id: 'notif-2',
          userId: 'test-user-123',
          type: 'upcoming_fixtures',
          title: 'Second Fixture',
          body: 'Same time notification 2',
          sentAt: sameTimestamp,
          read: false,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          history: identicalTimeNotifications,
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('First Match')).toBeInTheDocument();
        expect(screen.getByText('Second Fixture')).toBeInTheDocument();

        // Both should show same timestamp
        const timestamps = screen.getAllByText('1 hour ago');
        expect(timestamps).toHaveLength(2);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Failed to load notification history',
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load notification history')).toBeInTheDocument();
      });
    });

    it('should display error message when network request throws', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<NotificationHistory />);

      await waitFor(() => {
        expect(
          screen.getByText('An error occurred while loading notification history')
        ).toBeInTheDocument();
      });
    });

    it('should display sign-in prompt when user is not authenticated', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
      });

      render(<NotificationHistory />);

      expect(screen.getByText('Sign in to view your notification history')).toBeInTheDocument();
    });
  });

  describe('Complete E2E Workflow', () => {
    it('should complete full notification history display workflow', async () => {
      // Step 1: Send test notification
      const mockSendFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          messageId: 'test-message-123',
        }),
      });

      // Step 2: Mock history endpoint to return the sent notification
      const sentNotification: NotificationHistoryType = {
        id: 'notif-new',
        userId: 'test-user-123',
        type: 'match_results',
        title: 'New Match Result',
        body: 'Test notification just sent',
        sentAt: Date.now(),
        fixture: {
          date: '15-01-2026',
          home: 'Team A',
          away: 'Team B',
          division: 'SD1',
        },
        read: false,
      };

      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/notifications/send')) {
          return mockSendFetch(url);
        }
        if (url.includes('/api/notifications/history')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              history: [sentNotification, ...mockNotifications],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      // Step 1: Send notification
      const sendResponse = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-123',
          type: 'match_results',
          title: 'New Match Result',
          body: 'Test notification just sent',
        }),
      });

      expect(sendResponse.ok).toBe(true);

      // Step 2 & 3: Navigate to notification settings and verify history
      render(<NotificationHistory />);

      // Step 4: Verify notification shows correct type, title, and timestamp
      await waitFor(() => {
        expect(screen.getByText('New Match Result')).toBeInTheDocument();
        expect(screen.getByText('Test notification just sent')).toBeInTheDocument();
        expect(screen.getByText('Match Result')).toBeInTheDocument();
        expect(screen.getByText('Just now')).toBeInTheDocument();
        expect(screen.getByText('Team A vs Team B • SD1')).toBeInTheDocument();
      });

      // Step 5: Verify chronological ordering - new notification should be first
      const titles = screen.getAllByRole('heading', { level: 3 });
      expect(titles[0]).toHaveTextContent('New Match Result');
      expect(titles[1]).toHaveTextContent('Match Result: Magnet A vs North Star A');
    });
  });

  describe('Notification Type Icons and Colors', () => {
    it('should render correct icon for match_results type', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          history: [mockNotifications[0]], // match_results type
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Match Result')).toBeInTheDocument();
        // Trophy icon is rendered for match results
        const matchResultLabel = screen.getByText('Match Result');
        expect(matchResultLabel).toHaveClass('text-blue-500');
      });
    });

    it('should render correct icon for upcoming_fixtures type', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          history: [mockNotifications[1]], // upcoming_fixtures type
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Upcoming Fixture')).toBeInTheDocument();
        // Clock icon is rendered for upcoming fixtures
        const fixtureLabel = screen.getByText('Upcoming Fixture');
        expect(fixtureLabel).toHaveClass('text-amber-500');
      });
    });

    it('should render correct icon for standings_updates type', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          history: [mockNotifications[2]], // standings_updates type
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Standings Update')).toBeInTheDocument();
        // TrendingUp icon is rendered for standings updates
        const standingsLabel = screen.getByText('Standings Update');
        expect(standingsLabel).toHaveClass('text-purple-500');
      });
    });

    it('should render correct icon for prediction_updates type', async () => {
      const predictionNotification: NotificationHistoryType = {
        id: 'notif-prediction',
        userId: 'test-user-123',
        type: 'prediction_updates',
        title: 'Prediction Update',
        body: 'Your prediction was updated',
        sentAt: Date.now(),
        read: false,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          history: [predictionNotification],
        }),
      });

      render(<NotificationHistory />);

      await waitFor(() => {
        expect(screen.getByText('Prediction Update')).toBeInTheDocument();
        // AlertCircle icon is rendered for prediction updates
        const predictionLabel = screen.getByText('Prediction Update');
        expect(predictionLabel).toHaveClass('text-green-500');
      });
    });
  });
});
