import {
  filterAvailablePlayers,
  optimizeLineupWithLocks,
  calculateLineupWinProbability,
  generateAlternativeLineups,
} from './lineup-optimizer';
import type {
  TeamPlayer,
  PlayerAvailability,
  LockedPosition,
  FrameData,
  Players2526Map,
} from './types';
import type { DataSources } from './predictions';

// Mock the predictions module
jest.mock('./predictions', () => ({
  calcBayesianPct: jest.fn((wins: number, games: number) => {
    if (games === 0) return 50;
    return ((wins / games) * 100);
  }),
  calcPlayerForm: jest.fn((name: string, frames: FrameData[]) => {
    if (frames.length === 0) return null;
    return {
      last5: { p: 5, w: 3, pct: 60 },
      last8: { p: 8, w: 5, pct: 62.5 },
      last10: { p: 10, w: 6, pct: 60 },
      seasonPct: 60,
      trend: 'steady' as const,
    };
  }),
  calcPlayerHomeAway: jest.fn((name: string, frames: FrameData[]) => {
    if (frames.length === 0) return null;
    return {
      home: { p: 5, w: 3, pct: 60 },
      away: { p: 5, w: 2, pct: 40 },
    };
  }),
  getH2HRecord: jest.fn((playerA: string, playerB: string, frames: FrameData[]) => ({
    playerA,
    playerB,
    wins: 1,
    losses: 1,
    details: [],
  })),
  predictLineup: jest.fn((team: string, frames: FrameData[]) => ({
    players: [],
    recentPlayers: ['Opponent Player 1', 'Opponent Player 2'],
  })),
  predictFrame: jest.fn((homeStrength: number, awayStrength: number) => 0.55),
  runPredSim: jest.fn((frameWinProb: number) => ({
    pHomeWin: '55.0',
    pDraw: '20.0',
    pAwayWin: '25.0',
    expectedHome: '6.5',
    expectedAway: '3.5',
    topScores: [],
  })),
  calcTeamStrength: jest.fn((div: any, ds: DataSources) => ({
    'Test Team': 0.5,
    'Opponent Team': 0.4,
  })),
  getDiv: jest.fn((team: string, ds?: DataSources) => 'div1'),
}));

describe('filterAvailablePlayers', () => {
  const mockTeamPlayers: TeamPlayer[] = [
    {
      name: 'Player 1',
      rating: 1500,
      winPct: 60,
      played: 10,
      s2526: null,
      rostered: true,
    },
    {
      name: 'Player 2',
      rating: 1400,
      winPct: 55,
      played: 8,
      s2526: null,
      rostered: true,
    },
    {
      name: 'Player 3',
      rating: 1300,
      winPct: 50,
      played: 12,
      s2526: null,
      rostered: true,
    },
  ];

  it('should return only available players', () => {
    const availability: PlayerAvailability[] = [
      { name: 'Player 1', available: true },
      { name: 'Player 2', available: false },
      { name: 'Player 3', available: true },
    ];

    const result = filterAvailablePlayers(mockTeamPlayers, availability);

    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toEqual(['Player 1', 'Player 3']);
  });

  it('should return empty array when no players are available', () => {
    const availability: PlayerAvailability[] = [
      { name: 'Player 1', available: false },
      { name: 'Player 2', available: false },
      { name: 'Player 3', available: false },
    ];

    const result = filterAvailablePlayers(mockTeamPlayers, availability);

    expect(result).toHaveLength(0);
  });

  it('should return all players when all are available', () => {
    const availability: PlayerAvailability[] = [
      { name: 'Player 1', available: true },
      { name: 'Player 2', available: true },
      { name: 'Player 3', available: true },
    ];

    const result = filterAvailablePlayers(mockTeamPlayers, availability);

    expect(result).toHaveLength(3);
    expect(result).toEqual(mockTeamPlayers);
  });

  it('should handle availability list with extra names', () => {
    const availability: PlayerAvailability[] = [
      { name: 'Player 1', available: true },
      { name: 'Player 2', available: true },
      { name: 'Unknown Player', available: true },
    ];

    const result = filterAvailablePlayers(mockTeamPlayers, availability);

    expect(result).toHaveLength(2);
    expect(result.map(p => p.name)).toEqual(['Player 1', 'Player 2']);
  });
});

describe('optimizeLineupWithLocks', () => {
  const mockTeamPlayers: TeamPlayer[] = Array.from({ length: 12 }, (_, i) => ({
    name: `Player ${i + 1}`,
    rating: 1600 - i * 50,
    winPct: 65 - i * 2,
    played: 10,
    s2526: null,
    rostered: true,
  }));

  const mockPlayers2526: Players2526Map = Object.fromEntries(
    mockTeamPlayers.map((p, i) => [
      p.name,
      {
        teams: [],
        total: {
          p: 10,
          w: 10 - i,
          pct: (10 - i) * 10,
        },
      },
    ])
  );

  const mockFrames: FrameData[] = [];

  const mockDataSources: DataSources = {
    divisions: {
      div1: {
        name: 'Division 1',
        teams: ['Test Team', 'Opponent Team'],
      },
    },
    results: [],
    fixtures: [],
    players: {},
    rosters: {},
    players2526: mockPlayers2526,
  };

  it('should return null when fewer than 10 players are available', () => {
    const availability: PlayerAvailability[] = Array.from({ length: 8 }, (_, i) => ({
      name: `Player ${i + 1}`,
      available: true,
    }));

    const result = optimizeLineupWithLocks(
      mockTeamPlayers,
      availability,
      [],
      'Test Team',
      'Opponent Team',
      true,
      mockFrames,
      mockPlayers2526,
      mockDataSources
    );

    expect(result).toBeNull();
  });

  it('should create optimized lineup with no locks', () => {
    const availability: PlayerAvailability[] = mockTeamPlayers.map(p => ({
      name: p.name,
      available: true,
    }));

    const result = optimizeLineupWithLocks(
      mockTeamPlayers,
      availability,
      [],
      'Test Team',
      'Opponent Team',
      true,
      mockFrames,
      mockPlayers2526,
      mockDataSources
    );

    expect(result).not.toBeNull();
    expect(result?.set1).toHaveLength(5);
    expect(result?.set2).toHaveLength(5);
    expect(result?.winProbability).toBeDefined();
    expect(result?.winProbability.pWin).toBeGreaterThanOrEqual(0);
    expect(result?.winProbability.pWin).toBeLessThanOrEqual(1);
  });

  it('should respect locked positions', () => {
    const availability: PlayerAvailability[] = mockTeamPlayers.map(p => ({
      name: p.name,
      available: true,
    }));

    const locks: LockedPosition[] = [
      { set: 1, position: 1, playerName: 'Player 5' },
      { set: 2, position: 3, playerName: 'Player 7' },
    ];

    const result = optimizeLineupWithLocks(
      mockTeamPlayers,
      availability,
      locks,
      'Test Team',
      'Opponent Team',
      true,
      mockFrames,
      mockPlayers2526,
      mockDataSources
    );

    expect(result).not.toBeNull();
    expect(result?.set1[0]).toBe('Player 5');
    expect(result?.set2[2]).toBe('Player 7');
  });

  it('should fill unlocked positions with best available players', () => {
    const availability: PlayerAvailability[] = mockTeamPlayers.map(p => ({
      name: p.name,
      available: true,
    }));

    const locks: LockedPosition[] = [
      { set: 1, position: 5, playerName: 'Player 12' }, // Lock weakest player in last position
    ];

    const result = optimizeLineupWithLocks(
      mockTeamPlayers,
      availability,
      locks,
      'Test Team',
      'Opponent Team',
      true,
      mockFrames,
      mockPlayers2526,
      mockDataSources
    );

    expect(result).not.toBeNull();
    expect(result?.set1[4]).toBe('Player 12');
    // Best available players should be in the lineup (excluding the locked one)
    const lineupPlayers = [...(result?.set1 || []), ...(result?.set2 || [])];
    expect(lineupPlayers).toContain('Player 1');
    expect(lineupPlayers).toContain('Player 2');
  });

  it('should handle invalid lock positions gracefully', () => {
    const availability: PlayerAvailability[] = mockTeamPlayers.map(p => ({
      name: p.name,
      available: true,
    }));

    const locks: LockedPosition[] = [
      { set: 1, position: 0, playerName: 'Player 1' }, // Invalid position
      { set: 1, position: 6, playerName: 'Player 2' }, // Invalid position
    ];

    const result = optimizeLineupWithLocks(
      mockTeamPlayers,
      availability,
      locks,
      'Test Team',
      'Opponent Team',
      true,
      mockFrames,
      mockPlayers2526,
      mockDataSources
    );

    expect(result).not.toBeNull();
    expect(result?.set1).toHaveLength(5);
    expect(result?.set2).toHaveLength(5);
  });
});

describe('calculateLineupWinProbability', () => {
  const mockPlayers2526: Players2526Map = {
    'Player 1': { teams: [], total: { p: 10, w: 7, pct: 70 } },
    'Player 2': { teams: [], total: { p: 10, w: 6, pct: 60 } },
    'Player 3': { teams: [], total: { p: 10, w: 6, pct: 60 } },
    'Player 4': { teams: [], total: { p: 10, w: 5, pct: 50 } },
    'Player 5': { teams: [], total: { p: 10, w: 5, pct: 50 } },
    'Player 6': { teams: [], total: { p: 10, w: 4, pct: 40 } },
    'Player 7': { teams: [], total: { p: 10, w: 4, pct: 40 } },
    'Player 8': { teams: [], total: { p: 10, w: 3, pct: 30 } },
    'Player 9': { teams: [], total: { p: 10, w: 3, pct: 30 } },
    'Player 10': { teams: [], total: { p: 10, w: 2, pct: 20 } },
  };

  const mockDataSources: DataSources = {
    divisions: {
      div1: {
        name: 'Division 1',
        teams: ['Test Team', 'Opponent Team'],
      },
    },
    results: [],
    fixtures: [],
    players: {},
    rosters: {},
    players2526: mockPlayers2526,
  };

  it('should calculate win probability for a lineup', () => {
    const set1 = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'];
    const set2 = ['Player 6', 'Player 7', 'Player 8', 'Player 9', 'Player 10'];

    const result = calculateLineupWinProbability(
      set1,
      set2,
      'Test Team',
      'Opponent Team',
      true,
      [],
      mockPlayers2526,
      mockDataSources
    );

    expect(result).toBeDefined();
    expect(result.pWin).toBeGreaterThanOrEqual(0);
    expect(result.pWin).toBeLessThanOrEqual(1);
    expect(result.pDraw).toBeGreaterThanOrEqual(0);
    expect(result.pDraw).toBeLessThanOrEqual(1);
    expect(result.pLoss).toBeGreaterThanOrEqual(0);
    expect(result.pLoss).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should sum probabilities to approximately 1', () => {
    const set1 = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'];
    const set2 = ['Player 6', 'Player 7', 'Player 8', 'Player 9', 'Player 10'];

    const result = calculateLineupWinProbability(
      set1,
      set2,
      'Test Team',
      'Opponent Team',
      true,
      [],
      mockPlayers2526,
      mockDataSources
    );

    const sum = result.pWin + result.pDraw + result.pLoss;
    expect(sum).toBeCloseTo(1, 2);
  });

  it('should handle away games correctly', () => {
    const set1 = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'];
    const set2 = ['Player 6', 'Player 7', 'Player 8', 'Player 9', 'Player 10'];

    const homeResult = calculateLineupWinProbability(
      set1,
      set2,
      'Test Team',
      'Opponent Team',
      true,
      [],
      mockPlayers2526,
      mockDataSources
    );

    const awayResult = calculateLineupWinProbability(
      set1,
      set2,
      'Test Team',
      'Opponent Team',
      false,
      [],
      mockPlayers2526,
      mockDataSources
    );

    expect(homeResult).toBeDefined();
    expect(awayResult).toBeDefined();
    // Results should differ based on venue
    expect(homeResult.pWin).not.toBe(awayResult.pWin);
  });

  it('should handle players with insufficient data', () => {
    const incompleteData: Players2526Map = {
      'Player 1': { teams: [], total: { p: 1, w: 0, pct: 0 } },
      'Player 2': { teams: [], total: { p: 1, w: 1, pct: 100 } },
      'Player 3': { teams: [], total: { p: 0, w: 0, pct: 0 } },
      'Player 4': { teams: [], total: { p: 0, w: 0, pct: 0 } },
      'Player 5': { teams: [], total: { p: 0, w: 0, pct: 0 } },
      'Player 6': { teams: [], total: { p: 0, w: 0, pct: 0 } },
      'Player 7': { teams: [], total: { p: 0, w: 0, pct: 0 } },
      'Player 8': { teams: [], total: { p: 0, w: 0, pct: 0 } },
      'Player 9': { teams: [], total: { p: 0, w: 0, pct: 0 } },
      'Player 10': { teams: [], total: { p: 0, w: 0, pct: 0 } },
    };

    const set1 = ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'];
    const set2 = ['Player 6', 'Player 7', 'Player 8', 'Player 9', 'Player 10'];

    const result = calculateLineupWinProbability(
      set1,
      set2,
      'Test Team',
      'Opponent Team',
      true,
      [],
      incompleteData,
      mockDataSources
    );

    // Should fall back to team strength calculation
    expect(result).toBeDefined();
    expect(result.pWin).toBeGreaterThanOrEqual(0);
    expect(result.pWin).toBeLessThanOrEqual(1);
  });
});

describe('generateAlternativeLineups', () => {
  const mockTeamPlayers: TeamPlayer[] = Array.from({ length: 15 }, (_, i) => ({
    name: `Player ${i + 1}`,
    rating: 1600 - i * 50,
    winPct: 65 - i * 2,
    played: 10,
    s2526: null,
    rostered: true,
  }));

  const mockPlayers2526: Players2526Map = Object.fromEntries(
    mockTeamPlayers.map((p, i) => [
      p.name,
      {
        teams: [],
        total: {
          p: 10,
          w: Math.max(10 - i, 1),
          pct: Math.max((10 - i) * 10, 10),
        },
      },
    ])
  );

  const mockDataSources: DataSources = {
    divisions: {
      div1: {
        name: 'Division 1',
        teams: ['Test Team', 'Opponent Team'],
      },
    },
    results: [],
    fixtures: [],
    players: {},
    rosters: {},
    players2526: mockPlayers2526,
  };

  const optimalLineup = {
    set1: ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5'],
    set2: ['Player 6', 'Player 7', 'Player 8', 'Player 9', 'Player 10'],
    winProbability: {
      pWin: 0.6,
      pDraw: 0.2,
      pLoss: 0.2,
      expectedHome: 6.5,
      expectedAway: 3.5,
      confidence: 0.6,
    },
  };

  it('should generate alternative lineups', () => {
    const availability: PlayerAvailability[] = mockTeamPlayers.map(p => ({
      name: p.name,
      available: true,
    }));

    const alternatives = generateAlternativeLineups(
      optimalLineup,
      mockTeamPlayers,
      availability,
      [],
      'Test Team',
      'Opponent Team',
      true,
      [],
      mockPlayers2526,
      mockDataSources,
      3
    );

    expect(alternatives.length).toBeGreaterThan(0);
    expect(alternatives.length).toBeLessThanOrEqual(3);
  });

  it('should rank alternatives correctly', () => {
    const availability: PlayerAvailability[] = mockTeamPlayers.map(p => ({
      name: p.name,
      available: true,
    }));

    const alternatives = generateAlternativeLineups(
      optimalLineup,
      mockTeamPlayers,
      availability,
      [],
      'Test Team',
      'Opponent Team',
      true,
      [],
      mockPlayers2526,
      mockDataSources,
      3
    );

    alternatives.forEach((alt, idx) => {
      expect(alt.rank).toBe(idx + 1);
    });

    // Should be sorted by win probability descending
    for (let i = 1; i < alternatives.length; i++) {
      expect(alternatives[i - 1].lineup.winProbability.pWin).toBeGreaterThanOrEqual(
        alternatives[i].lineup.winProbability.pWin
      );
    }
  });

  it('should calculate probability differences correctly', () => {
    const availability: PlayerAvailability[] = mockTeamPlayers.map(p => ({
      name: p.name,
      available: true,
    }));

    const alternatives = generateAlternativeLineups(
      optimalLineup,
      mockTeamPlayers,
      availability,
      [],
      'Test Team',
      'Opponent Team',
      true,
      [],
      mockPlayers2526,
      mockDataSources,
      3
    );

    alternatives.forEach(alt => {
      expect(alt.probabilityDiff).toBe(
        optimalLineup.winProbability.pWin - alt.lineup.winProbability.pWin
      );
    });
  });

  it('should respect locked positions when generating alternatives', () => {
    const availability: PlayerAvailability[] = mockTeamPlayers.map(p => ({
      name: p.name,
      available: true,
    }));

    const locks: LockedPosition[] = [
      { set: 1, position: 1, playerName: 'Player 1' },
    ];

    const alternatives = generateAlternativeLineups(
      optimalLineup,
      mockTeamPlayers,
      availability,
      locks,
      'Test Team',
      'Opponent Team',
      true,
      [],
      mockPlayers2526,
      mockDataSources,
      3
    );

    // All alternatives should keep the locked position
    alternatives.forEach(alt => {
      expect(alt.lineup.set1[0]).toBe('Player 1');
    });
  });

  it('should not create duplicate alternatives', () => {
    const availability: PlayerAvailability[] = mockTeamPlayers.map(p => ({
      name: p.name,
      available: true,
    }));

    const alternatives = generateAlternativeLineups(
      optimalLineup,
      mockTeamPlayers,
      availability,
      [],
      'Test Team',
      'Opponent Team',
      true,
      [],
      mockPlayers2526,
      mockDataSources,
      5
    );

    const lineupKeys = alternatives.map(alt => {
      return [...alt.lineup.set1, ...alt.lineup.set2].sort().join(',');
    });

    const uniqueKeys = new Set(lineupKeys);
    expect(uniqueKeys.size).toBe(lineupKeys.length);
  });

  it('should return empty array when no bench players available', () => {
    const availability: PlayerAvailability[] = optimalLineup.set1
      .concat(optimalLineup.set2)
      .map(name => ({ name, available: true }));

    const alternatives = generateAlternativeLineups(
      optimalLineup,
      mockTeamPlayers,
      availability,
      [],
      'Test Team',
      'Opponent Team',
      true,
      [],
      mockPlayers2526,
      mockDataSources,
      3
    );

    expect(alternatives).toHaveLength(0);
  });

  it('should limit number of alternatives to requested amount', () => {
    const availability: PlayerAvailability[] = mockTeamPlayers.map(p => ({
      name: p.name,
      available: true,
    }));

    const alternatives = generateAlternativeLineups(
      optimalLineup,
      mockTeamPlayers,
      availability,
      [],
      'Test Team',
      'Opponent Team',
      true,
      [],
      mockPlayers2526,
      mockDataSources,
      2
    );

    expect(alternatives.length).toBeLessThanOrEqual(2);
  });
});
