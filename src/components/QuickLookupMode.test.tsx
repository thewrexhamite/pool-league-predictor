import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuickLookupMode from './QuickLookupMode';
import { useActiveData } from '@/lib/active-data-provider';
import { getAllLeaguePlayers, getPlayerStats2526, calcPlayerForm, calcBayesianPct } from '@/lib/predictions';
import type { LeaguePlayer } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/active-data-provider');
jest.mock('@/lib/predictions');

const mockUseActiveData = useActiveData as jest.MockedFunction<typeof useActiveData>;
const mockGetAllLeaguePlayers = getAllLeaguePlayers as jest.MockedFunction<typeof getAllLeaguePlayers>;
const mockGetPlayerStats2526 = getPlayerStats2526 as jest.MockedFunction<typeof getPlayerStats2526>;
const mockCalcPlayerForm = calcPlayerForm as jest.MockedFunction<typeof calcPlayerForm>;
const mockCalcBayesianPct = calcBayesianPct as jest.MockedFunction<typeof calcBayesianPct>;

describe('QuickLookupMode', () => {
  // Mock data
  const mockDataSource = { teams: [], players: [] } as any;
  const mockFrames = [
    { winner: 'John Doe', loser: 'Jane Smith', date: '2025-10-01' },
    { winner: 'John Doe', loser: 'Bob Johnson', date: '2025-10-02' },
    { winner: 'Jane Smith', loser: 'John Doe', date: '2025-10-03' },
    { winner: 'John Doe', loser: 'Alice Brown', date: '2025-10-04' },
    { winner: 'John Doe', loser: 'Charlie Wilson', date: '2025-10-05' },
  ] as any;

  const mockPlayers: LeaguePlayer[] = [
    {
      name: 'John Doe',
      rating: 5,
      teams2526: ['Team Alpha', 'Team Beta'],
      totalPct2526: 75.0,
      adjPct2526: 75.5,
      totalPlayed2526: 20,
    },
    {
      name: 'Jane Smith',
      rating: 4,
      teams2526: ['Team Gamma'],
      totalPct2526: 68.0,
      adjPct2526: 68.3,
      totalPlayed2526: 15,
    },
    {
      name: 'Bob Johnson',
      rating: 6,
      teams2526: ['Team Alpha'],
      totalPct2526: 82.0,
      adjPct2526: 82.1,
      totalPlayed2526: 25,
    },
    {
      name: 'Alice Brown',
      rating: 3,
      teams2526: ['Team Delta'],
      totalPct2526: 55.0,
      adjPct2526: 55.0,
      totalPlayed2526: 10,
    },
    {
      name: 'Charlie Wilson',
      rating: 5,
      teams2526: ['Team Epsilon'],
      totalPct2526: 71.0,
      adjPct2526: 71.2,
      totalPlayed2526: 18,
    },
    {
      name: 'David Lee',
      rating: 4,
      teams2526: ['Team Zeta'],
      totalPct2526: 64.0,
      adjPct2526: 64.5,
      totalPlayed2526: 12,
    },
    {
      name: 'Emma Davis',
      rating: 5,
      teams2526: ['Team Eta'],
      totalPct2526: 77.0,
      adjPct2526: 77.8,
      totalPlayed2526: 22,
    },
    {
      name: 'Frank Miller',
      rating: 3,
      teams2526: ['Team Theta'],
      totalPct2526: 59.0,
      adjPct2526: 59.3,
      totalPlayed2526: 14,
    },
    {
      name: 'Grace Taylor',
      rating: 5,
      teams2526: ['Team Iota'],
      totalPct2526: 73.0,
      adjPct2526: 73.6,
      totalPlayed2526: 19,
    },
    {
      name: 'Henry Anderson',
      rating: 4,
      teams2526: ['Team Kappa'],
      totalPct2526: 66.0,
      adjPct2526: 66.9,
      totalPlayed2526: 16,
    },
  ];

  const mockPlayerStats = {
    total: { p: 20, w: 15, pct: 75.0 },
    teams: [
      { team: 'Team Alpha', div: 'Premier', p: 12, w: 9, pct: 75.0, lag: 0, bdF: 3, bdA: 1, forf: 0, cup: false },
      { team: 'Team Beta', div: 'Division 1', p: 8, w: 6, pct: 75.0, lag: 0, bdF: 2, bdA: 0, forf: 0, cup: false },
    ],
  };

  const mockPlayerForm = {
    last5: { p: 5, w: 4, pct: 80.0 },
    last8: { p: 8, w: 6, pct: 75.0 },
    last10: { p: 10, w: 7, pct: 70.0 },
    seasonPct: 75.0,
    recent: [
      { date: '2025-10-05', won: true, opponent: 'Charlie Wilson' },
      { date: '2025-10-04', won: true, opponent: 'Alice Brown' },
      { date: '2025-10-03', won: false, opponent: 'Jane Smith' },
      { date: '2025-10-02', won: true, opponent: 'Bob Johnson' },
      { date: '2025-10-01', won: true, opponent: 'Jane Smith' },
    ],
    trend: 'hot' as const,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock scrollIntoView (not available in jsdom)
    Element.prototype.scrollIntoView = jest.fn();

    // Set up default mock implementations
    mockUseActiveData.mockReturnValue({
      data: {} as any,
      ds: mockDataSource,
      frames: mockFrames,
      isTimeMachine: false,
    });

    mockGetAllLeaguePlayers.mockReturnValue(mockPlayers);
    mockGetPlayerStats2526.mockReturnValue(mockPlayerStats);
    mockCalcPlayerForm.mockReturnValue(mockPlayerForm);
    mockCalcBayesianPct.mockReturnValue(76.5);
  });

  // ===========================
  // Basic Rendering Tests (5)
  // ===========================

  describe('Basic Rendering', () => {
    it('renders search input with placeholder text', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByPlaceholderText(/search players or teams/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('renders with proper ARIA attributes', () => {
      render(<QuickLookupMode />);

      // Dialog role
      const dialog = screen.getByRole('dialog', { name: /quick lookup/i });
      expect(dialog).toBeInTheDocument();

      // Combobox role for search input
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeInTheDocument();
      expect(combobox).toHaveAttribute('aria-label', 'Search players or teams');
      expect(combobox).toHaveAttribute('aria-describedby', 'search-instructions');
      expect(combobox).toHaveAttribute('aria-autocomplete', 'list');
      expect(combobox).toHaveAttribute('aria-controls', 'search-results');
    });

    it('auto-focuses search input on mount', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');
      expect(searchInput).toHaveFocus();
    });

    it('renders Quick Lookup title', () => {
      render(<QuickLookupMode />);
      const title = screen.getByRole('heading', { name: /quick lookup/i });
      expect(title).toBeInTheDocument();
    });

    it('shows keyboard usage instructions initially', () => {
      render(<QuickLookupMode />);
      const instructions = screen.getByText(/start typing to search/i);
      expect(instructions).toBeInTheDocument();
      expect(instructions).toHaveTextContent(/arrow keys to navigate/i);
      expect(instructions).toHaveTextContent(/enter to select/i);
      expect(instructions).toHaveTextContent(/escape to close/i);
    });
  });

  // ===========================
  // Search Functionality Tests (6)
  // ===========================

  describe('Search Functionality', () => {
    it('filters players by name (case-insensitive)', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('filters players by team name', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'alpha' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      // Use getAllByText since "Team Alpha" appears multiple times
      const teamAlphaElements = screen.getAllByText(/team alpha/i);
      expect(teamAlphaElements.length).toBeGreaterThan(0);
    });

    it('shows max 8 results even if more matches exist', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      // Search for something that matches all 10 players
      fireEvent.change(searchInput, { target: { value: 'te' } });

      // Should show "8 players found" not "10 players found"
      const resultCount = screen.getByText(/players found/i);
      expect(resultCount).toHaveTextContent('8 players found');
    });

    it('shows "No players found" message when no matches', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'xyz123nonexistent' } });

      expect(screen.getByText(/no players found matching/i)).toBeInTheDocument();
    });

    it('shows instructions when search query < 2 characters', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'j' } });

      expect(screen.getByText(/start typing to search/i)).toBeInTheDocument();
      expect(screen.queryByText(/players found/i)).not.toBeInTheDocument();
    });

    it('updates results in real-time as user types', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      // Type 'jo' - should show John Doe and Bob Johnson
      fireEvent.change(searchInput, { target: { value: 'jo' } });
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();

      // Type 'john' - should show only John Doe and Bob Johnson
      fireEvent.change(searchInput, { target: { value: 'john' } });
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();

      // Type 'john doe' - should show only John Doe
      fireEvent.change(searchInput, { target: { value: 'john doe' } });
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  // ===========================
  // Player Selection Tests (3)
  // ===========================

  describe('Player Selection', () => {
    it('selects player on click and displays stats card', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });
      const playerCard = screen.getByText('John Doe');
      fireEvent.click(playerCard);

      // Should now show player details dialog
      const playerDetailsDialog = screen.getByRole('dialog', { name: /player details/i });
      expect(playerDetailsDialog).toBeInTheDocument();

      // Should show player name as heading
      expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument();
    });

    it('shows player stats card with correct data (name, win%, rating, form)', async () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });
      const playerCard = screen.getByText('John Doe');
      fireEvent.click(playerCard);

      await waitFor(() => {
        // Check player name
        expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument();

        // Check stats - games played
        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.getByText('Played')).toBeInTheDocument();

        // Check wins
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('Won')).toBeInTheDocument();

        // Check Bayesian rating
        expect(screen.getByText('76.5%')).toBeInTheDocument();
        expect(screen.getByText('Rating')).toBeInTheDocument();

        // Check win percentage
        expect(screen.getByText(/win% 75\.0%/i)).toBeInTheDocument();

        // Check form section
        expect(screen.getByText(/current form/i)).toBeInTheDocument();
        expect(screen.getByText(/hot/i)).toBeInTheDocument();
      });
    });

    it('returns to search results when clicking back button', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });
      const playerCard = screen.getByText('John Doe');
      fireEvent.click(playerCard);

      // Should show player details
      expect(screen.getByRole('dialog', { name: /player details/i })).toBeInTheDocument();

      // Click back button
      const backButton = screen.getByRole('button', { name: /back to search/i });
      fireEvent.click(backButton);

      // Should return to search results
      expect(screen.getByRole('dialog', { name: /quick lookup/i })).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  // ===========================
  // Keyboard Navigation Tests (6)
  // ===========================

  describe('Keyboard Navigation', () => {
    it('closes modal on Escape key press', () => {
      const onClose = jest.fn();
      render(<QuickLookupMode onClose={onClose} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('returns to search from player details on Escape key', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      // Select a player
      fireEvent.change(searchInput, { target: { value: 'john' } });
      const playerCard = screen.getByText('John Doe');
      fireEvent.click(playerCard);

      // Should show player details
      expect(screen.getByRole('dialog', { name: /player details/i })).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });

      // Should return to search (not close modal)
      expect(screen.getByRole('dialog', { name: /quick lookup/i })).toBeInTheDocument();
    });

    it('navigates results down with Arrow Down key', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });

      // Press Arrow Down
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // First result should be focused (aria-selected)
      const firstResult = screen.getByText('John Doe').closest('[role="option"]');
      expect(firstResult).toHaveAttribute('aria-selected', 'true');
    });

    it('navigates results up with Arrow Up key', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });

      // Press Arrow Down twice to go to second item
      fireEvent.keyDown(window, { key: 'ArrowDown' });
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Press Arrow Up to go back to first item
      fireEvent.keyDown(window, { key: 'ArrowUp' });

      // First result should be focused again
      const firstResult = screen.getByText('John Doe').closest('[role="option"]');
      expect(firstResult).toHaveAttribute('aria-selected', 'true');
    });

    it('selects focused player with Enter key', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });

      // Press Arrow Down to focus first result
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Press Enter to select
      fireEvent.keyDown(window, { key: 'Enter' });

      // Should show player details
      expect(screen.getByRole('dialog', { name: /player details/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument();
    });

    it('selects focused player with Space key', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });

      // Click on a result to give it focus
      const firstResult = screen.getByText('John Doe').closest('[role="option"]');

      // Press Space to select
      fireEvent.keyDown(firstResult!, { key: ' ' });

      // Should show player details
      expect(screen.getByRole('dialog', { name: /player details/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument();
    });
  });

  // ===========================
  // Performance Tests (3)
  // ===========================

  describe('Performance', () => {
    it('memoizes filtered players correctly (does not recompute unnecessarily)', () => {
      const { rerender } = render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      // Initial render - getAllLeaguePlayers should be called once
      expect(mockGetAllLeaguePlayers).toHaveBeenCalledTimes(1);

      // Search for a player
      fireEvent.change(searchInput, { target: { value: 'john' } });

      // Rerender without changing data source
      rerender(<QuickLookupMode />);

      // getAllLeaguePlayers should not be called again (memoized)
      expect(mockGetAllLeaguePlayers).toHaveBeenCalledTimes(1);
    });

    it('memoizes player stats correctly', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      // Select a player
      fireEvent.change(searchInput, { target: { value: 'john' } });
      const playerCard = screen.getByText('John Doe');
      fireEvent.click(playerCard);

      // getPlayerStats2526 should be called once
      expect(mockGetPlayerStats2526).toHaveBeenCalledTimes(1);
      expect(mockGetPlayerStats2526).toHaveBeenCalledWith('John Doe', mockDataSource);

      // calcPlayerForm should be called once
      expect(mockCalcPlayerForm).toHaveBeenCalledTimes(1);
      expect(mockCalcPlayerForm).toHaveBeenCalledWith('John Doe', mockFrames);
    });

    it('memoizes Bayesian rating calculation correctly', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      // Select a player
      fireEvent.change(searchInput, { target: { value: 'john' } });
      const playerCard = screen.getByText('John Doe');
      fireEvent.click(playerCard);

      // calcBayesianPct should be called once with correct parameters
      expect(mockCalcBayesianPct).toHaveBeenCalledTimes(1);
      expect(mockCalcBayesianPct).toHaveBeenCalledWith(
        mockPlayerStats.total.w,
        mockPlayerStats.total.p
      );
    });
  });

  // ===========================
  // Edge Cases Tests (5)
  // ===========================

  describe('Edge Cases', () => {
    it('handles empty player list gracefully', () => {
      mockGetAllLeaguePlayers.mockReturnValue([]);

      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });

      expect(screen.getByText(/no players found matching/i)).toBeInTheDocument();
    });

    it('handles null/undefined data source', () => {
      mockUseActiveData.mockReturnValue({
        data: {} as any,
        ds: null as any,
        frames: [],
        isTimeMachine: false,
      });
      mockGetAllLeaguePlayers.mockReturnValue([]);

      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      // Should not crash
      fireEvent.change(searchInput, { target: { value: 'john' } });

      expect(screen.getByText(/no players found matching/i)).toBeInTheDocument();
    });

    it('handles player with no teams (teams2526 empty)', () => {
      const playerWithNoTeams: LeaguePlayer = {
        name: 'Solo Player',
        rating: null,
        teams2526: [],
        totalPct2526: 50.0,
        adjPct2526: 50.0,
        totalPlayed2526: 5,
      };
      mockGetAllLeaguePlayers.mockReturnValue([playerWithNoTeams]);

      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'solo' } });

      // Should render player without crashing
      expect(screen.getByText('Solo Player')).toBeInTheDocument();
      // Should not show team info (teams2526.length === 0)
      expect(screen.queryByText(/team/i)).not.toBeInTheDocument();
    });

    it('handles player with no stats', () => {
      mockGetPlayerStats2526.mockReturnValue(null as any);
      mockCalcPlayerForm.mockReturnValue(null as any);

      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });
      const playerCard = screen.getByText('John Doe');
      fireEvent.click(playerCard);

      // Should show player name but no stats sections
      expect(screen.getByRole('heading', { name: 'John Doe' })).toBeInTheDocument();
      expect(screen.queryByText(/25\/26 season/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/current form/i)).not.toBeInTheDocument();
    });

    it('clears search query when clear button clicked', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox') as HTMLInputElement;

      fireEvent.change(searchInput, { target: { value: 'john' } });
      expect(searchInput.value).toBe('john');

      // Clear button should appear
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      fireEvent.click(clearButton);

      // Search should be cleared
      expect(searchInput.value).toBe('');
      expect(screen.getByText(/start typing to search/i)).toBeInTheDocument();
    });
  });

  // ===========================
  // Accessibility Tests (4)
  // ===========================

  describe('Accessibility', () => {
    it('has proper ARIA roles throughout (dialog, combobox, listbox, option)', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      // Dialog role
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Combobox role
      expect(searchInput).toBeInTheDocument();

      // Search for players to show listbox
      fireEvent.change(searchInput, { target: { value: 'john' } });

      // Listbox role
      expect(screen.getByRole('listbox')).toBeInTheDocument();

      // Option roles
      const options = screen.getAllByRole('option');
      expect(options.length).toBeGreaterThan(0);
    });

    it('announces result count to screen readers (aria-live)', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });

      // Should have aria-live region with result count
      const resultCount = screen.getByRole('status');
      expect(resultCount).toHaveAttribute('aria-live', 'polite');
      expect(resultCount).toHaveTextContent(/players found/i);
    });

    it('updates aria-activedescendant on arrow key navigation', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'john' } });

      // Initially no active descendant
      expect(searchInput).not.toHaveAttribute('aria-activedescendant');

      // Press Arrow Down
      fireEvent.keyDown(window, { key: 'ArrowDown' });

      // Should update aria-activedescendant
      expect(searchInput).toHaveAttribute('aria-activedescendant', 'result-0');
    });

    it('close button has proper aria-label', () => {
      render(<QuickLookupMode />);
      const searchInput = screen.getByRole('combobox');

      fireEvent.change(searchInput, { target: { value: 'test' } });

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toHaveAttribute('aria-label', 'Clear search');
    });
  });
});
