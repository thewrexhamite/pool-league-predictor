/**
 * League-Wide Statistics Module
 *
 * Calculate league-wide leaderboards and statistical rankings.
 */

import type { Players2526Map, DivisionCode, MatchResult, TeamHomeAwaySplit } from '../types';
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
