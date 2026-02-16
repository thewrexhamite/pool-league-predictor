import type {
  SessionStats,
  CurrentGame,
  ReportResultPayload,
  PlayerSessionStats,
  KingOfTable,
} from './types';

const DEFAULT_PLAYER_STATS: PlayerSessionStats = {
  wins: 0,
  losses: 0,
  gamesPlayed: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export function updateStatsAfterGame(
  stats: SessionStats,
  game: CurrentGame,
  result: ReportResultPayload
): SessionStats {
  const { winningSide, winnerNames } = result;
  const loserSide = winningSide === 'holder' ? 'challenger' : 'holder';

  const winnerPlayerNames = game.players
    .filter((p) => p.side === winningSide)
    .map((p) => p.name);
  const loserPlayerNames = game.players
    .filter((p) => p.side === loserSide)
    .map((p) => p.name);

  const updatedPlayerStats = { ...stats.playerStats };

  // Update winners
  for (const name of winnerPlayerNames) {
    const prev = updatedPlayerStats[name] ?? { ...DEFAULT_PLAYER_STATS };
    const newStreak = prev.currentStreak + 1;
    updatedPlayerStats[name] = {
      ...prev,
      wins: prev.wins + 1,
      gamesPlayed: prev.gamesPlayed + 1,
      currentStreak: newStreak,
      bestStreak: Math.max(prev.bestStreak, newStreak),
    };
  }

  // Update losers
  for (const name of loserPlayerNames) {
    const prev = updatedPlayerStats[name] ?? { ...DEFAULT_PLAYER_STATS };
    updatedPlayerStats[name] = {
      ...prev,
      losses: prev.losses + 1,
      gamesPlayed: prev.gamesPlayed + 1,
      currentStreak: 0,
    };
  }

  // Determine king of the table
  const consecutiveWins = winningSide === 'holder'
    ? game.consecutiveWins + 1
    : 1;
  let kingOfTable = stats.kingOfTable;

  if (consecutiveWins >= 3) {
    const kingName = winnerNames[0] ?? winnerPlayerNames[0];
    if (
      !kingOfTable ||
      consecutiveWins > kingOfTable.consecutiveWins
    ) {
      kingOfTable = {
        playerName: kingName,
        consecutiveWins,
        crownedAt: Date.now(),
      };
    }
  }

  return {
    gamesPlayed: stats.gamesPlayed + 1,
    playerStats: updatedPlayerStats,
    kingOfTable,
  };
}

export function updateStatsAfterKillerGame(
  stats: SessionStats,
  game: CurrentGame,
  winnerName: string
): SessionStats {
  const allPlayerNames = game.players.map((p) => p.name);
  const updatedPlayerStats = { ...stats.playerStats };

  for (const name of allPlayerNames) {
    const prev = updatedPlayerStats[name] ?? { ...DEFAULT_PLAYER_STATS };
    if (name === winnerName) {
      const newStreak = prev.currentStreak + 1;
      updatedPlayerStats[name] = {
        ...prev,
        wins: prev.wins + 1,
        gamesPlayed: prev.gamesPlayed + 1,
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
      };
    } else {
      updatedPlayerStats[name] = {
        ...prev,
        losses: prev.losses + 1,
        gamesPlayed: prev.gamesPlayed + 1,
        currentStreak: 0,
      };
    }
  }

  return {
    gamesPlayed: stats.gamesPlayed + 1,
    playerStats: updatedPlayerStats,
    kingOfTable: stats.kingOfTable,
  };
}

export function getLeaderboard(stats: SessionStats): Array<{
  name: string;
  stats: PlayerSessionStats;
}> {
  return Object.entries(stats.playerStats)
    .map(([name, s]) => ({ name, stats: s }))
    .sort((a, b) => {
      // Sort by wins descending, then by win rate, then by games played
      if (b.stats.wins !== a.stats.wins) return b.stats.wins - a.stats.wins;
      const aRate = a.stats.gamesPlayed > 0 ? a.stats.wins / a.stats.gamesPlayed : 0;
      const bRate = b.stats.gamesPlayed > 0 ? b.stats.wins / b.stats.gamesPlayed : 0;
      if (bRate !== aRate) return bRate - aRate;
      return b.stats.gamesPlayed - a.stats.gamesPlayed;
    });
}
