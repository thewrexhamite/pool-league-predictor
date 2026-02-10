/**
 * Rivalry Tracker Module
 *
 * Identify recurring matchups with significant history and trends.
 */

import type { DivisionCode, RivalryRecord, MatchResult } from '../types';
import type { DataSources } from '../predictions/core';
import { getDiv, parseDate } from '../predictions/core';

/**
 * Identify team rivalries based on matchup frequency and competitiveness.
 *
 * Significance = matchesPlayed * competitivenessFactor
 * where competitivenessFactor = 1 + (1 - abs(winPctDiff))
 * Closer records = higher significance.
 */
export function identifyRivalries(
  div: DivisionCode,
  ds: DataSources
): RivalryRecord[] {
  const teams = ds.divisions[div]?.teams || [];
  const divResults = ds.results.filter(r => getDiv(r.home, ds) === div);

  // Build matchup records
  const matchups = new Map<string, {
    teamA: string;
    teamB: string;
    matches: MatchResult[];
    teamAWins: number;
    teamBWins: number;
    draws: number;
    frameDiff: number;
  }>();

  for (const result of divResults) {
    const [teamA, teamB] = [result.home, result.away].sort();
    const key = `${teamA}::${teamB}`;

    if (!matchups.has(key)) {
      matchups.set(key, {
        teamA,
        teamB,
        matches: [],
        teamAWins: 0,
        teamBWins: 0,
        draws: 0,
        frameDiff: 0,
      });
    }

    const record = matchups.get(key)!;
    record.matches.push(result);

    // Determine winner relative to sorted team order
    const isTeamAHome = result.home === teamA;
    const teamAScore = isTeamAHome ? result.home_score : result.away_score;
    const teamBScore = isTeamAHome ? result.away_score : result.home_score;

    if (teamAScore > teamBScore) {
      record.teamAWins++;
    } else if (teamBScore > teamAScore) {
      record.teamBWins++;
    } else {
      record.draws++;
    }
    record.frameDiff += teamAScore - teamBScore;
  }

  const rivalries: RivalryRecord[] = [];

  for (const record of matchups.values()) {
    const matchesPlayed = record.matches.length;
    if (matchesPlayed < 1) continue;

    // Calculate competitiveness (how close the overall record is)
    const total = matchesPlayed;
    const winPctA = record.teamAWins / total;
    const winPctB = record.teamBWins / total;
    const competitiveness = 1 + (1 - Math.abs(winPctA - winPctB));

    const significance = matchesPlayed * competitiveness;

    // Find last met date
    const lastMet = record.matches
      .map(m => m.date)
      .sort((a, b) => parseDate(b).localeCompare(parseDate(a)))[0];

    rivalries.push({
      teamA: record.teamA,
      teamB: record.teamB,
      matchesPlayed,
      teamAWins: record.teamAWins,
      teamBWins: record.teamBWins,
      draws: record.draws,
      significance,
      lastMet,
      frameDiff: record.frameDiff,
    });
  }

  // Sort by significance (most significant first)
  rivalries.sort((a, b) => b.significance - a.significance);
  return rivalries;
}
