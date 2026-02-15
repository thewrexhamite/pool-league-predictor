/**
 * Adjusted Rating Calculator
 *
 * Computes comparable ratings for any player/team across leagues,
 * adjusting for division and league strength differences.
 */

import type {
  AdjustedRating,
  LeagueStrength,
  Players2526Map,
  LeagueMeta,
} from '../types';
import type { LeagueData } from '../data-provider';
import { calcBayesianPct } from '../predictions/core';

/**
 * Get an adjusted rating for a player, normalizing for division and league strength.
 */
export function getAdjustedPlayerRating(
  playerName: string,
  leagueId: string,
  divisionCode: string,
  leagueData: LeagueData,
  strengths: LeagueStrength[]
): AdjustedRating | null {
  const playerData = leagueData.players2526[playerName];
  if (!playerData) return null;

  // Find the team stats for this specific division (non-cup)
  const teamStats = playerData.teams.find(t => t.div === divisionCode && !t.cup);
  if (!teamStats || teamStats.p === 0) return null;

  const rawPct = teamStats.pct;
  const bayesianPct = calcBayesianPct(teamStats.w, teamStats.p);

  // Get strength offsets
  const leagueStrength = strengths.find(s => s.leagueId === leagueId);
  const divStrength = leagueStrength?.divisionStrengths.find(
    d => d.divisionCode === divisionCode
  );

  const divisionOffset = divStrength?.strengthOffset ?? 0;
  const leagueOffset = leagueStrength?.strengthOffset ?? 0;
  const totalAdjustment = divisionOffset + leagueOffset;

  const adjustedPct = bayesianPct + totalAdjustment;

  // Calculate z-score within division
  const divPlayers = getDivisionPlayers(divisionCode, leagueData.players2526);
  const { mean: divMean, stdDev: divStdDev } = calculateDistribution(divPlayers);
  const zScore = divStdDev > 0 ? (bayesianPct - divMean) / divStdDev : 0;

  // Calculate percentiles
  const leaguePercentile = calculatePercentile(
    bayesianPct,
    getAllLeaguePlayers(leagueData.players2526)
  );

  // Confidence is the minimum of division and league strength confidence
  const divConfidence = divStrength?.confidence ?? 0;
  const leagueConfidence = leagueStrength?.confidence ?? 0;
  const confidence = Math.min(divConfidence, leagueConfidence);

  return {
    rawPct,
    bayesianPct,
    adjustedPct,
    zScore,
    leaguePercentile,
    globalPercentile: 0, // Set later when all leagues are available
    confidence,
    adjustmentBreakdown: {
      divisionOffset,
      leagueOffset,
      totalAdjustment,
    },
  };
}

/**
 * Get an adjusted rating for a team, averaging across its roster.
 */
export function getAdjustedTeamRating(
  teamName: string,
  leagueId: string,
  divisionCode: string,
  leagueData: LeagueData,
  strengths: LeagueStrength[]
): AdjustedRating | null {
  // Find all players on this team
  const teamPlayers: { name: string; wins: number; played: number; pct: number }[] = [];

  for (const [name, data] of Object.entries(leagueData.players2526)) {
    const teamStats = data.teams.find(t => t.team === teamName && !t.cup);
    if (teamStats && teamStats.p > 0) {
      teamPlayers.push({
        name,
        wins: teamStats.w,
        played: teamStats.p,
        pct: teamStats.pct,
      });
    }
  }

  if (teamPlayers.length === 0) return null;

  // Weighted average by games played
  const totalPlayed = teamPlayers.reduce((s, p) => s + p.played, 0);
  const totalWins = teamPlayers.reduce((s, p) => s + p.wins, 0);
  const rawPct = totalPlayed > 0 ? (totalWins / totalPlayed) * 100 : 0;
  const bayesianPct = calcBayesianPct(totalWins, totalPlayed);

  // Get strength offsets
  const leagueStrength = strengths.find(s => s.leagueId === leagueId);
  const divStrength = leagueStrength?.divisionStrengths.find(
    d => d.divisionCode === divisionCode
  );

  const divisionOffset = divStrength?.strengthOffset ?? 0;
  const leagueOffset = leagueStrength?.strengthOffset ?? 0;
  const totalAdjustment = divisionOffset + leagueOffset;

  const adjustedPct = bayesianPct + totalAdjustment;

  // Team z-score within division (using team win rates)
  const divTeams = getDivisionTeamRates(divisionCode, leagueData);
  const { mean: divMean, stdDev: divStdDev } = calculateDistribution(divTeams);
  const zScore = divStdDev > 0 ? (bayesianPct - divMean) / divStdDev : 0;

  const leaguePercentile = calculatePercentile(bayesianPct, divTeams);

  const divConfidence = divStrength?.confidence ?? 0;
  const leagueConfidence = leagueStrength?.confidence ?? 0;
  const confidence = Math.min(divConfidence, leagueConfidence);

  return {
    rawPct,
    bayesianPct,
    adjustedPct,
    zScore,
    leaguePercentile,
    globalPercentile: 0,
    confidence,
    adjustmentBreakdown: {
      divisionOffset,
      leagueOffset,
      totalAdjustment,
    },
  };
}

/**
 * Compute global percentiles across all leagues for a set of adjusted ratings.
 */
export function computeGlobalPercentiles(
  ratings: { rating: AdjustedRating; key: string }[]
): Map<string, number> {
  const sorted = [...ratings].sort((a, b) => a.rating.adjustedPct - b.rating.adjustedPct);
  const result = new Map<string, number>();

  for (let i = 0; i < sorted.length; i++) {
    const percentile = ((i + 1) / sorted.length) * 100;
    result.set(sorted[i].key, percentile);
  }

  return result;
}

// ============================================================================
// Helpers
// ============================================================================

function getDivisionPlayers(divisionCode: string, players2526: Players2526Map): number[] {
  const pcts: number[] = [];
  for (const data of Object.values(players2526)) {
    for (const ts of data.teams) {
      if (ts.div === divisionCode && !ts.cup && ts.p >= 3) {
        pcts.push(calcBayesianPct(ts.w, ts.p));
      }
    }
  }
  return pcts;
}

function getAllLeaguePlayers(players2526: Players2526Map): number[] {
  const pcts: number[] = [];
  for (const data of Object.values(players2526)) {
    if (data.total.p >= 3) {
      pcts.push(calcBayesianPct(data.total.w, data.total.p));
    }
  }
  return pcts;
}

function getDivisionTeamRates(divisionCode: string, leagueData: LeagueData): number[] {
  const teams = leagueData.divisions[divisionCode]?.teams || [];
  const rates: number[] = [];

  for (const team of teams) {
    let totalW = 0;
    let totalP = 0;
    for (const data of Object.values(leagueData.players2526)) {
      for (const ts of data.teams) {
        if (ts.team === team && !ts.cup) {
          totalW += ts.w;
          totalP += ts.p;
        }
      }
    }
    if (totalP >= 3) {
      rates.push(calcBayesianPct(totalW, totalP));
    }
  }

  return rates;
}

function calculateDistribution(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 50, stdDev: 1 };

  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev: stdDev || 1 }; // Prevent division by zero
}

function calculatePercentile(value: number, pool: number[]): number {
  if (pool.length === 0) return 50;
  const below = pool.filter(v => v < value).length;
  return (below / pool.length) * 100;
}
