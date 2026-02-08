/**
 * League-Wide Statistics Module
 *
 * Calculate league-wide leaderboards and statistical rankings.
 */

import type { Players2526Map, PlayersMap, DivisionCode, MatchResult, TeamHomeAwaySplit, FrameData } from '../types';
import { calcBayesianPct } from '../predictions';

// ============================================================================
// Types
// ============================================================================

export interface TopPlayerEntry {
  name: string;
  division: string;
  team: string;
  played: number;
  won: number;
  winPct: number;
  bayesianPct: number;
}

export interface BDLeaderEntry {
  name: string;
  division: string;
  team: string;
  played: number;
  bdCount: number;
  bdRate: number;
}

export interface BDLeaders {
  bdFor: BDLeaderEntry[];
  bdAgainst: BDLeaderEntry[];
}

export interface ImprovedPlayerEntry {
  name: string;
  division: string;
  team: string;
  currentPlayed: number;
  currentWon: number;
  currentPct: number;
  priorPlayed: number;
  priorPct: number;
  improvement: number;
}

export interface StreakLeaderEntry {
  name: string;
  division: string;
  team: string;
  streak: number;
  lastGameDate: string;
  played: number;
}

// ============================================================================
// Top Players Leaderboard
// ============================================================================

/**
 * Get top players by Bayesian-adjusted win percentage.
 *
 * @param players2526 - Current season player stats map
 * @param division - Division code to filter by (null for all divisions)
 * @param minGames - Minimum games played threshold (default: 10)
 * @param limit - Maximum number of players to return (default: 10)
 * @returns Array of top players sorted by Bayesian-adjusted win percentage
 */
export function getTopPlayers(
  players2526: Players2526Map,
  division: DivisionCode | null,
  minGames: number = 10,
  limit: number = 10
): TopPlayerEntry[] {
  const results: TopPlayerEntry[] = [];

  // Iterate through all players
  for (const [playerName, playerData] of Object.entries(players2526)) {
    // For each team the player has played for
    for (const teamStats of playerData.teams) {
      // Skip if filtering by division and this team isn't in that division
      if (division !== null && teamStats.div !== division) {
        continue;
      }

      // Skip if below minimum games threshold
      if (teamStats.p < minGames) {
        continue;
      }

      // Calculate Bayesian-adjusted percentage
      const bayesianPct = calcBayesianPct(teamStats.w, teamStats.p);

      results.push({
        name: playerName,
        division: teamStats.div,
        team: teamStats.team,
        played: teamStats.p,
        won: teamStats.w,
        winPct: teamStats.pct,
        bayesianPct,
      });
    }
  }

  // Sort by Bayesian-adjusted percentage (descending), then by games played (descending)
  results.sort((a, b) => {
    if (Math.abs(a.bayesianPct - b.bayesianPct) > 0.01) {
      return b.bayesianPct - a.bayesianPct;
    }
    return b.played - a.played;
  });

  // Return top N results
  return results.slice(0, limit);
}

// ============================================================================
// Break & Dish Leaderboard
// ============================================================================

/**
 * Get Break & Dish leaders.
 *
 * Returns two leaderboards:
 * - bdFor: Players with highest Break & Dish rate (most successful breaks)
 * - bdAgainst: Players with lowest Break & Dish against rate (best defense)
 *
 * @param players2526 - Current season player stats map
 * @param division - Division code to filter by (null for all divisions)
 * @param minGames - Minimum games played threshold (default: 10)
 * @param limit - Maximum number of players to return per leaderboard (default: 10)
 * @returns Object with bdFor and bdAgainst leaderboards
 */
export function getBDLeaders(
  players2526: Players2526Map,
  division: DivisionCode | null,
  minGames: number = 10,
  limit: number = 10
): BDLeaders {
  const bdForResults: BDLeaderEntry[] = [];
  const bdAgainstResults: BDLeaderEntry[] = [];

  // Iterate through all players
  for (const [playerName, playerData] of Object.entries(players2526)) {
    // For each team the player has played for
    for (const teamStats of playerData.teams) {
      // Skip if filtering by division and this team isn't in that division
      if (division !== null && teamStats.div !== division) {
        continue;
      }

      // Skip if below minimum games threshold
      if (teamStats.p < minGames) {
        continue;
      }

      // Calculate B&D rates (per game)
      const bdForRate = teamStats.p > 0 ? (teamStats.bdF / teamStats.p) * 100 : 0;
      const bdAgainstRate = teamStats.p > 0 ? (teamStats.bdA / teamStats.p) * 100 : 0;

      // Add to bdFor leaderboard
      bdForResults.push({
        name: playerName,
        division: teamStats.div,
        team: teamStats.team,
        played: teamStats.p,
        bdCount: teamStats.bdF,
        bdRate: bdForRate,
      });

      // Add to bdAgainst leaderboard
      bdAgainstResults.push({
        name: playerName,
        division: teamStats.div,
        team: teamStats.team,
        played: teamStats.p,
        bdCount: teamStats.bdA,
        bdRate: bdAgainstRate,
      });
    }
  }

  // Sort bdFor by highest rate (descending), then by games played (descending)
  bdForResults.sort((a, b) => {
    if (Math.abs(a.bdRate - b.bdRate) > 0.01) {
      return b.bdRate - a.bdRate;
    }
    return b.played - a.played;
  });

  // Sort bdAgainst by lowest rate (ascending), then by games played (descending)
  bdAgainstResults.sort((a, b) => {
    if (Math.abs(a.bdRate - b.bdRate) > 0.01) {
      return a.bdRate - b.bdRate;
    }
    return b.played - a.played;
  });

  return {
    bdFor: bdForResults.slice(0, limit),
    bdAgainst: bdAgainstResults.slice(0, limit),
  };
}

// ============================================================================
// Team Home/Away Records
// ============================================================================

/**
 * Calculate team home and away records.
 *
 * @param results - Match results array
 * @param team - Team name to calculate records for
 * @returns TeamHomeAwaySplit with separate home and away statistics
 */
export function getTeamHomeAwayRecord(
  results: MatchResult[],
  team: string
): TeamHomeAwaySplit {
  // Initialize home and away records
  const homeRecord = { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, winPct: 0 };
  const awayRecord = { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, winPct: 0 };

  // Iterate through all results
  for (const result of results) {
    const { home, away, home_score, away_score } = result;

    // Check if this team is the home team
    if (home === team) {
      homeRecord.p++;
      homeRecord.f += home_score;
      homeRecord.a += away_score;

      if (home_score > away_score) {
        homeRecord.w++;
      } else if (home_score < away_score) {
        homeRecord.l++;
      } else {
        homeRecord.d++;
      }
    }
    // Check if this team is the away team
    else if (away === team) {
      awayRecord.p++;
      awayRecord.f += away_score;
      awayRecord.a += home_score;

      if (away_score > home_score) {
        awayRecord.w++;
      } else if (away_score < home_score) {
        awayRecord.l++;
      } else {
        awayRecord.d++;
      }
    }
  }

  // Calculate win percentages
  homeRecord.winPct = homeRecord.p > 0 ? (homeRecord.w / homeRecord.p) * 100 : 0;
  awayRecord.winPct = awayRecord.p > 0 ? (awayRecord.w / awayRecord.p) * 100 : 0;

  return {
    home: homeRecord,
    away: awayRecord,
  };
}

// ============================================================================
// Most Improved Players
// ============================================================================

/**
 * Get most improved players by comparing current season to prior season.
 *
 * Calculates improvement as the difference between current win percentage
 * and prior season win percentage. Only includes players who played in both
 * seasons and meet the minimum games threshold in both seasons.
 *
 * @param players2526 - Current season player stats map
 * @param players - Prior season (24/25) player stats map
 * @param division - Division code to filter by (null for all divisions)
 * @param minGames - Minimum games played threshold for both seasons (default: 10)
 * @param limit - Maximum number of players to return (default: 10)
 * @returns Array of most improved players sorted by improvement delta
 */
export function getMostImprovedPlayers(
  players2526: Players2526Map,
  players: PlayersMap,
  division: DivisionCode | null,
  minGames: number = 10,
  limit: number = 10
): ImprovedPlayerEntry[] {
  const results: ImprovedPlayerEntry[] = [];

  // Iterate through all current season players
  for (const [playerName, playerData] of Object.entries(players2526)) {
    // Check if player exists in prior season data
    const priorStats = players[playerName];
    if (!priorStats) {
      continue;
    }

    // Skip if player didn't play enough games in prior season
    if (priorStats.p < minGames) {
      continue;
    }

    // Prior season win percentage (stored as 0-1, convert to 0-100)
    const priorPct = priorStats.w * 100;

    // For each team the player has played for this season
    for (const teamStats of playerData.teams) {
      // Skip if filtering by division and this team isn't in that division
      if (division !== null && teamStats.div !== division) {
        continue;
      }

      // Skip if below minimum games threshold in current season
      if (teamStats.p < minGames) {
        continue;
      }

      // Calculate improvement delta
      const improvement = teamStats.pct - priorPct;

      results.push({
        name: playerName,
        division: teamStats.div,
        team: teamStats.team,
        currentPlayed: teamStats.p,
        currentWon: teamStats.w,
        currentPct: teamStats.pct,
        priorPlayed: priorStats.p,
        priorPct,
        improvement,
      });
    }
  }

  // Sort by improvement (descending), then by current games played (descending)
  results.sort((a, b) => {
    if (Math.abs(a.improvement - b.improvement) > 0.01) {
      return b.improvement - a.improvement;
    }
    return b.currentPlayed - a.currentPlayed;
  });

  // Return top N results
  return results.slice(0, limit);
}

// ============================================================================
// Winning Streaks
// ============================================================================

/**
 * Parse a date string in DD-MM-YYYY format.
 */
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get players with longest active winning streaks.
 *
 * Calculates current winning streaks by analyzing recent frame data.
 * A streak is the number of consecutive wins counting backwards from
 * the most recent game. Only active streaks are counted (streak continues
 * from most recent game).
 *
 * @param frames - Frame-level match data
 * @param players2526 - Current season player stats map
 * @param division - Division code to filter by (null for all divisions)
 * @param limit - Maximum number of players to return (default: 10)
 * @returns Array of players with longest active winning streaks
 */
export function getActiveWinStreaks(
  frames: FrameData[],
  players2526: Players2526Map,
  division: DivisionCode | null,
  limit: number = 10
): StreakLeaderEntry[] {
  // Map to store each player's games: playerName -> games array
  const playerGames = new Map<string, Array<{ date: string; won: boolean; division: string }>>();

  // Extract all player games from frame data
  for (const match of frames) {
    for (const frame of match.frames) {
      const homePlayer = frame.homePlayer;
      const awayPlayer = frame.awayPlayer;

      // Skip forfeits as they don't count for streaks
      if (frame.forfeit) {
        continue;
      }

      // Record home player's game
      if (!playerGames.has(homePlayer)) {
        playerGames.set(homePlayer, []);
      }
      playerGames.get(homePlayer)!.push({
        date: match.date,
        won: frame.winner === 'home',
        division: match.division,
      });

      // Record away player's game
      if (!playerGames.has(awayPlayer)) {
        playerGames.set(awayPlayer, []);
      }
      playerGames.get(awayPlayer)!.push({
        date: match.date,
        won: frame.winner === 'away',
        division: match.division,
      });
    }
  }

  const results: StreakLeaderEntry[] = [];

  // Calculate active streak for each player
  for (const [playerName, games] of playerGames.entries()) {
    // Check if player exists in current season stats
    const playerData = players2526[playerName];
    if (!playerData) {
      continue;
    }

    // Sort games by date (most recent first)
    games.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    // For each team the player has played for
    for (const teamStats of playerData.teams) {
      // Skip if filtering by division and this team isn't in that division
      if (division !== null && teamStats.div !== division) {
        continue;
      }

      // Get games for this specific division
      const divisionGames = games.filter((g) => g.division === teamStats.div);

      if (divisionGames.length === 0) {
        continue;
      }

      // Calculate active streak (consecutive wins from most recent game)
      let streak = 0;
      for (const game of divisionGames) {
        if (game.won) {
          streak++;
        } else {
          // Streak broken
          break;
        }
      }

      // Only include players with an active streak (at least 1 win)
      if (streak > 0) {
        results.push({
          name: playerName,
          division: teamStats.div,
          team: teamStats.team,
          streak,
          lastGameDate: divisionGames[0].date,
          played: teamStats.p,
        });
      }
    }
  }

  // Sort by streak length (descending), then by games played (descending)
  results.sort((a, b) => {
    if (a.streak !== b.streak) {
      return b.streak - a.streak;
    }
    return b.played - a.played;
  });

  // Return top N results
  return results.slice(0, limit);
}
