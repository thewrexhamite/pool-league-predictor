/**
 * League-Wide Statistics Module
 *
 * Calculate league-wide leaderboards and statistical rankings.
 */

import type { Players2526Map, DivisionCode } from '../types';
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
