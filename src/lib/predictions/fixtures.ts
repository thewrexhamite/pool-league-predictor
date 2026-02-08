import type {
  DivisionCode,
  Fixture,
  TeamResult,
  MatchResult,
  Divisions,
  PlayersMap,
  RostersMap,
  Players2526Map,
} from '../types';
import type { DataSources } from './core';
import { parseDate, getLatestResultDate } from './core';
import {
  RESULTS as STATIC_RESULTS,
  FIXTURES as STATIC_FIXTURES,
  PLAYERS as STATIC_PLAYERS,
  ROSTERS as STATIC_ROSTERS,
  PLAYERS_2526 as STATIC_PLAYERS_2526,
} from '../data';

function defaults(): DataSources {
  return {
    divisions: {}, // Empty - divisions should always come from DataSources parameter
    results: STATIC_RESULTS,
    fixtures: STATIC_FIXTURES,
    players: STATIC_PLAYERS,
    rosters: STATIC_ROSTERS,
    players2526: STATIC_PLAYERS_2526,
  };
}

/**
 * Get remaining fixtures for a specific division
 * Returns fixtures with dates after the latest completed result
 */
export function getRemainingFixtures(div: DivisionCode, ds?: DataSources): Fixture[] {
  const { fixtures, results } = ds ?? defaults();
  const latestDate = getLatestResultDate(results);
  return fixtures.filter(
    f => f.division === div && parseDate(f.date) > latestDate
  );
}

/**
 * Get all remaining fixtures across all divisions
 * Returns fixtures with dates after the latest completed result
 */
export function getAllRemainingFixtures(ds?: DataSources): Fixture[] {
  const { fixtures, results } = ds ?? defaults();
  const latestDate = getLatestResultDate(results);
  return fixtures.filter(f => parseDate(f.date) > latestDate);
}

/**
 * Get all results for a specific team
 * Returns results sorted by date (most recent first) with computed metadata:
 * - isHome: whether team played at home
 * - opponent: opposing team name
 * - teamScore: team's score
 * - oppScore: opponent's score
 * - result: 'W', 'L', or 'D'
 */
export function getTeamResults(team: string, ds?: DataSources): TeamResult[] {
  const { results } = ds ?? defaults();
  return results.filter(r => r.home === team || r.away === team)
    .map(r => ({
      ...r,
      isHome: r.home === team,
      opponent: r.home === team ? r.away : r.home,
      teamScore: r.home === team ? r.home_score : r.away_score,
      oppScore: r.home === team ? r.away_score : r.home_score,
      result: (
        r.home === team
          ? r.home_score > r.away_score
            ? 'W'
            : r.home_score < r.away_score
              ? 'L'
              : 'D'
          : r.away_score > r.home_score
            ? 'W'
            : r.away_score < r.home_score
              ? 'L'
              : 'D'
      ) as 'W' | 'L' | 'D',
    }))
    .sort((a, b) => parseDate(b.date).localeCompare(parseDate(a.date)));
}
