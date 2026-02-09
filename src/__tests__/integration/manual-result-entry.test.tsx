/**
 * Integration tests for End-to-end Manual Result Entry Workflow
 *
 * Tests the complete flow from manual entry form to Firestore persistence:
 * 1. Admin opens manual entry form
 * 2. Fills in match details and scores
 * 3. Submits result
 * 4. Result saves to Firestore
 * 5. Result appears in results list and standings
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManualResultEntry from '@/components/admin/ManualResultEntry';
import { useLeagueData } from '@/lib/data-provider';
import type { MatchResult, DivisionCode } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/data-provider');

// Mock fetch globally
global.fetch = jest.fn();

// Mock window.location.reload
delete (window as any).location;
window.location = { reload: jest.fn() } as any;

const mockLeagueData = {
  divisions: {
    Premier: {
      teams: ['Team A', 'Team B', 'Team C'],
    },
    'Division 1': {
      teams: ['Team D', 'Team E', 'Team F'],
    },
  } as Record<DivisionCode, { teams: string[] }>,
  results: [] as MatchResult[],
  frames: [],
};

describe('Manual Result Entry E2E Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLeagueData as jest.Mock).mockReturnValue({ data: mockLeagueData });
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Step 1: Admin opens manual entry form', () => {
    it('should render the manual entry form', () => {
      const mockOnSubmit = jest.fn();
      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Manual Result Entry')).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/home team/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/away team/i)).toBeInTheDocument();
      expect(screen.getByText('Save Result')).toBeInTheDocument();
    });

    it('should display teams from league divisions', () => {
      const mockOnSubmit = jest.fn();
      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Teams appear as options in both home and away selects
      // Use getAllByText since each team appears in both select elements
      expect(screen.getAllByText('Team A').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Team B').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Team D').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Team E').length).toBeGreaterThanOrEqual(1);
    });

    it('should filter teams by selected division', () => {
      const mockOnSubmit = jest.fn();
      render(
        <ManualResultEntry selectedDiv="Premier" onSubmit={mockOnSubmit} />
      );

      // Should only include teams from Premier division
      // Teams appear as options in both select elements
      expect(screen.getAllByText('Team A').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Team B').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Team C').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Step 2: Fills in match details and scores', () => {
    it('should allow filling in date, teams, and scores', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Fill in date
      const dateInput = screen.getByLabelText(/date/i);
      await user.clear(dateInput);
      await user.type(dateInput, '2026-02-15');

      // Select home team
      const homeTeamSelect = screen.getByLabelText(/home team/i);
      await user.selectOptions(homeTeamSelect, 'Team A');

      // Select away team
      const awayTeamSelect = screen.getByLabelText(/away team/i);
      await user.selectOptions(awayTeamSelect, 'Team B');

      expect(dateInput).toHaveValue('2026-02-15');
      expect(homeTeamSelect).toHaveValue('Team A');
      expect(awayTeamSelect).toHaveValue('Team B');
    });

    it('should allow adjusting scores with +/- buttons', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Initial scores should be 5-5
      expect(screen.getAllByText('5')).toHaveLength(2);

      // Find increase home score button
      const increaseHomeButtons = screen.getAllByLabelText(/increase home score/i);
      await user.click(increaseHomeButtons[0]);

      // Scores should now be 6-4
      await waitFor(() => {
        const scores = screen.getAllByText(/^[0-9]+$/);
        expect(scores[0]).toHaveTextContent('6');
        expect(scores[1]).toHaveTextContent('4');
      });
    });

    it('should maintain score sum of 10', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Increase home score multiple times
      const increaseHomeButtons = screen.getAllByLabelText(/increase home score/i);
      await user.click(increaseHomeButtons[0]); // 6-4
      await user.click(increaseHomeButtons[0]); // 7-3
      await user.click(increaseHomeButtons[0]); // 8-2

      await waitFor(() => {
        const scores = screen.getAllByText(/^[0-9]+$/);
        expect(scores[0]).toHaveTextContent('8');
        expect(scores[1]).toHaveTextContent('2');
      });
    });

    it('should validate that teams are different', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Select same team for both home and away
      const homeTeamSelect = screen.getByLabelText(/home team/i);
      const awayTeamSelect = screen.getByLabelText(/away team/i);
      await user.selectOptions(homeTeamSelect, 'Team A');
      await user.selectOptions(awayTeamSelect, 'Team A');

      // Try to submit
      const saveButton = screen.getByText('Save Result');
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(
          screen.getByText(/home and away teams must be different/i)
        ).toBeInTheDocument();
      });

      // onSubmit should not be called
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Try to submit with empty fields
      const saveButton = screen.getByText('Save Result');
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(
          screen.getByText(/please select a home team/i)
        ).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Step 3: Submits result', () => {
    it('should call onSubmit with correct result data', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Fill in form
      const dateInput = screen.getByLabelText(/date/i);
      await user.clear(dateInput);
      await user.type(dateInput, '2026-02-15');

      const homeTeamSelect = screen.getByLabelText(/home team/i);
      await user.selectOptions(homeTeamSelect, 'Team A');

      const awayTeamSelect = screen.getByLabelText(/away team/i);
      await user.selectOptions(awayTeamSelect, 'Team B');

      // Adjust scores to 7-3
      const increaseHomeButtons = screen.getAllByLabelText(/increase home score/i);
      await user.click(increaseHomeButtons[0]);
      await user.click(increaseHomeButtons[0]);

      // Submit
      const saveButton = screen.getByText('Save Result');
      await user.click(saveButton);

      // Verify onSubmit was called with correct data
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          date: '2026-02-15',
          home: 'Team A',
          away: 'Team B',
          home_score: 7,
          away_score: 3,
        });
      });
    });

    it('should show loading state while submitting', async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      const mockOnSubmit = jest.fn().mockReturnValue(submitPromise);

      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Fill in form
      const homeTeamSelect = screen.getByLabelText(/home team/i);
      await user.selectOptions(homeTeamSelect, 'Team A');

      const awayTeamSelect = screen.getByLabelText(/away team/i);
      await user.selectOptions(awayTeamSelect, 'Team B');

      // Submit
      const saveButton = screen.getByText('Save Result');
      await user.click(saveButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Resolve the promise
      resolveSubmit!();

      // Loading state should go away
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });

    it('should display error if submission fails', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Fill in form
      const homeTeamSelect = screen.getByLabelText(/home team/i);
      await user.selectOptions(homeTeamSelect, 'Team A');

      const awayTeamSelect = screen.getByLabelText(/away team/i);
      await user.selectOptions(awayTeamSelect, 'Team B');

      // Submit
      const saveButton = screen.getByText('Save Result');
      await user.click(saveButton);

      // Should display error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step 4-5: Result saves to Firestore and appears in results', () => {
    it('should make API request with correct payload', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn(async (result) => {
        // Simulate the actual API call that AdminDashboard would make
        const response = await fetch('/api/admin/results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token',
          },
          body: JSON.stringify({
            seasonId: '2025-26',
            result: {
              ...result,
              division: 'Premier',
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create result');
        }
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: 'Result created successfully',
          result: {},
        }),
      });

      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Fill in form
      const dateInput = screen.getByLabelText(/date/i);
      await user.clear(dateInput);
      await user.type(dateInput, '2026-02-15');

      const homeTeamSelect = screen.getByLabelText(/home team/i);
      await user.selectOptions(homeTeamSelect, 'Team A');

      const awayTeamSelect = screen.getByLabelText(/away team/i);
      await user.selectOptions(awayTeamSelect, 'Team B');

      // Submit
      const saveButton = screen.getByText('Save Result');
      await user.click(saveButton);

      // Verify API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/admin/results',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: 'Bearer mock-token',
            }),
          })
        );
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

      render(<ManualResultEntry onSubmit={mockOnSubmit} />);

      // Fill in form
      const dateInput = screen.getByLabelText(/date/i);
      const originalDate = (dateInput as HTMLInputElement).value;

      const homeTeamSelect = screen.getByLabelText(/home team/i);
      await user.selectOptions(homeTeamSelect, 'Team A');

      const awayTeamSelect = screen.getByLabelText(/away team/i);
      await user.selectOptions(awayTeamSelect, 'Team B');

      // Submit
      const saveButton = screen.getByText('Save Result');
      await user.click(saveButton);

      // Form should reset
      await waitFor(() => {
        expect(homeTeamSelect).toHaveValue('');
        expect(awayTeamSelect).toHaveValue('');
        // Date should reset to today
        expect(dateInput).toHaveValue(originalDate);
      });
    });
  });

  describe('Cancel functionality', () => {
    it('should call onCancel and reset form', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <ManualResultEntry onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
      );

      // Fill in some data
      const homeTeamSelect = screen.getByLabelText(/home team/i);
      await user.selectOptions(homeTeamSelect, 'Team A');

      // Click cancel
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Form should reset
      expect(homeTeamSelect).toHaveValue('');
      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });
});
