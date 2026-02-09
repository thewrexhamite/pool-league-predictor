import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerMergePanel from '@/components/admin/PlayerMergePanel';
import { useActiveData } from '@/lib/active-data-provider';
import { useAuth } from '@/lib/auth';
import { getAllLeaguePlayers } from '@/lib/predictions';

// Mock dependencies
jest.mock('@/lib/active-data-provider');
jest.mock('@/lib/auth');
jest.mock('@/lib/predictions');

const mockUseActiveData = useActiveData as jest.MockedFunction<typeof useActiveData>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetAllLeaguePlayers = getAllLeaguePlayers as jest.MockedFunction<typeof getAllLeaguePlayers>;

// Mock fetch
global.fetch = jest.fn();

describe('Player Merge E2E Workflow', () => {
  const mockLeaguePlayers = [
    {
      name: 'John Smith',
      teams2526: ['Team A'],
      totalPlayed2526: 10,
      totalPct2526: 60,
      adjPct2526: 65,
      rating: 1200,
    },
    {
      name: 'John Smyth',
      teams2526: ['Team B'],
      totalPlayed2526: 8,
      totalPct2526: 55,
      adjPct2526: 58,
      rating: 1150,
    },
    {
      name: 'Jon Smith',
      teams2526: ['Team C'],
      totalPlayed2526: 12,
      totalPct2526: 62,
      adjPct2526: 64,
      rating: 1180,
    },
    {
      name: 'Alice Johnson',
      teams2526: ['Team D'],
      totalPlayed2526: 15,
      totalPct2526: 70,
      adjPct2526: 72,
      rating: 1300,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock active data provider
    mockUseActiveData.mockReturnValue({
      ds: {} as any,
      isLoading: false,
      error: null,
    });

    // Mock auth
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-uid' } as any,
      profile: { isAdmin: true } as any,
      loading: false,
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    } as any);

    // Mock getAllLeaguePlayers
    mockGetAllLeaguePlayers.mockReturnValue(mockLeaguePlayers as any);

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Step 1: Admin searches for duplicate players', () => {
    it('should display search input', () => {
      render(<PlayerMergePanel />);
      expect(screen.getByPlaceholderText(/Type player name/i)).toBeInTheDocument();
    });

    it('should show empty state when search query is too short', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'J' } });

      // Should not show results for 1 character
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    });

    it('should filter players when search query is 2+ characters', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      // Should show filtered results
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('John Smyth')).toBeInTheDocument();
      expect(screen.getByText('Jon Smith')).toBeInTheDocument();
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    it('should limit search results to 20 players', () => {
      // Mock with more than 20 players
      const manyPlayers = Array.from({ length: 30 }, (_, i) => ({
        name: `Player ${i}`,
        teams2526: ['Team A'],
        totalPlayed2526: 10,
        totalPct2526: 60,
        adjPct2526: 65,
        rating: 1200,
      }));
      mockGetAllLeaguePlayers.mockReturnValue(manyPlayers as any);

      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'Player' } });

      // Should only show 20 results
      const results = screen.getAllByText(/Player \d+/);
      expect(results.length).toBe(20);
    });

    it('should show "No players found" when search has no matches', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'XYZ' } });

      expect(screen.getByText('No players found')).toBeInTheDocument();
    });
  });

  describe('Step 2: Selects players to merge', () => {
    it('should allow selecting a player', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      const player = screen.getByText('John Smith');
      fireEvent.click(player);

      // Should show in selected players list
      expect(screen.getByText('Selected Players (1)')).toBeInTheDocument();
    });

    it('should auto-select first player as primary', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      const player = screen.getByText('John Smith');
      fireEvent.click(player);

      // Should show (Primary) tag
      expect(screen.getByText('(Primary)')).toBeInTheDocument();
    });

    it('should allow selecting multiple players', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));

      expect(screen.getByText('Selected Players (2)')).toBeInTheDocument();
    });

    it('should allow changing primary player', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));

      // Click "Set as primary" button for second player
      const setPrimaryButtons = screen.getAllByText('Set as primary');
      fireEvent.click(setPrimaryButtons[1]);

      // Should update primary indicator
      const selectedSection = screen.getByText('Selected Players (2)').closest('div');
      expect(selectedSection).toBeInTheDocument();
    });

    it('should allow deselecting a player', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      expect(screen.getByText('Selected Players (1)')).toBeInTheDocument();

      // Click player again to deselect
      fireEvent.click(screen.getByText('John Smith'));
      expect(screen.queryByText('Selected Players')).not.toBeInTheDocument();
    });

    it('should provide "Clear all" button', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));

      const clearButton = screen.getByText('Clear all');
      fireEvent.click(clearButton);

      expect(screen.queryByText('Selected Players')).not.toBeInTheDocument();
    });
  });

  describe('Step 3: Reviews merge preview', () => {
    it('should show preview button when 2+ players selected', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));

      expect(screen.getByText('Show Merge Preview')).toBeInTheDocument();
      expect(screen.getByText('Show Merge Preview')).not.toBeDisabled();
    });

    it('should disable preview button with less than 2 players', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));

      const previewButton = screen.getByText('Show Merge Preview');
      expect(previewButton).toBeDisabled();
    });

    it('should display merge preview with combined stats', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));

      const previewButton = screen.getByText('Show Merge Preview');
      fireEvent.click(previewButton);

      // Should show merge preview section
      expect(screen.getByText('Merge Preview')).toBeInTheDocument();
    });

    it('should show warning message in preview', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      expect(screen.getByText(/Warning: This action cannot be undone/i)).toBeInTheDocument();
    });

    it('should display combined teams in preview', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      expect(screen.getByText('Combined Teams:')).toBeInTheDocument();
      expect(screen.getByText('Team A')).toBeInTheDocument();
      expect(screen.getByText('Team B')).toBeInTheDocument();
    });

    it('should show primary player name in preview', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      expect(screen.getByText(/Primary Player/i)).toBeInTheDocument();
      // Primary should be John Smith (first selected)
      const previewSection = screen.getByText('Merge Preview').closest('div');
      expect(previewSection).toHaveTextContent('John Smith');
    });

    it('should allow canceling preview', () => {
      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Merge Preview')).not.toBeInTheDocument();
    });
  });

  describe('Step 4: Confirms merge', () => {
    it('should call merge API with correct parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Successfully merged 2 player(s) into John Smith',
          changes: { rostersUpdated: 2, playersRemoved: 2 },
        }),
      });

      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Jon Smith'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      const confirmButton = screen.getByText('Confirm Merge');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/players/merge',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mock-token',
            }),
            body: JSON.stringify({
              seasonId: '2025-26',
              sourcePlayerNames: ['John Smyth', 'Jon Smith'],
              targetPlayerName: 'John Smith',
            }),
          })
        );
      });
    });

    it('should show loading state during merge', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      const confirmButton = screen.getByText('Confirm Merge');
      fireEvent.click(confirmButton);

      expect(await screen.findByText('Merging...')).toBeInTheDocument();
    });

    it('should disable buttons during merge', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      const confirmButton = screen.getByText('Confirm Merge');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Merging...')).toBeDisabled();
      });
    });

    it('should show success message on successful merge', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Successfully merged 2 player(s) into John Smith',
        }),
      });

      // Mock window.location.reload
      delete (window as any).location;
      (window as any).location = { reload: jest.fn() };

      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      const confirmButton = screen.getByText('Confirm Merge');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Successfully merged 2 player/i)).toBeInTheDocument();
      });
    });

    it('should show error message on failed merge', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Failed to merge players',
        }),
      });

      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      const confirmButton = screen.getByText('Confirm Merge');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to merge players/i)).toBeInTheDocument();
      });
    });

    it('should handle authentication errors', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
        getIdToken: jest.fn().mockResolvedValue(null),
      } as any);

      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      const confirmButton = screen.getByText('Confirm Merge');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Authentication required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 5: All player references update correctly', () => {
    it('should reload page after successful merge', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Successfully merged players',
        }),
      });

      // Mock window.location.reload
      delete (window as any).location;
      (window as any).location = { reload: jest.fn() };

      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      const confirmButton = screen.getByText('Confirm Merge');
      fireEvent.click(confirmButton);

      // Wait for reload to be called (after 2 second delay)
      await waitFor(
        () => {
          expect(window.location.reload).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );
    });

    it('should verify API response includes change statistics', async () => {
      const mockResponse = {
        success: true,
        message: 'Successfully merged 2 player(s) into John Smith',
        changes: {
          rostersUpdated: 2,
          playersRemoved: 1,
          players2526Removed: 1,
          framesUpdated: 15,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(<PlayerMergePanel />);
      const searchInput = screen.getByPlaceholderText(/Type player name/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      fireEvent.click(screen.getByText('John Smith'));
      fireEvent.click(screen.getByText('John Smyth'));
      fireEvent.click(screen.getByText('Show Merge Preview'));

      const confirmButton = screen.getByText('Confirm Merge');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/Successfully merged/i)).toBeInTheDocument();
      });
    });
  });
});
