import type {
  DivisionCode,
  Divisions,
  StandingEntry,
  MatchResult,
  Fixture,
  PlayersMap,
  RostersMap,
  Players2526Map,
} from '../types';
import {
  RESULTS as STATIC_RESULTS,
  FIXTURES as STATIC_FIXTURES,
  PLAYERS as STATIC_PLAYERS,
  ROSTERS as STATIC_ROSTERS,
  PLAYERS_2526 as STATIC_PLAYERS_2526,
} from '../data';

// Optional data sources argument -- defaults to static imports for backward compatibility
export interface DataSources {
  divisions: Divisions;
  results: MatchResult[];
  fixtures: Fixture[];
  players: PlayersMap;
  rosters: RostersMap;
  players2526: Players2526Map;
}

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

// Parse DD-MM-YYYY to comparable YYYY-MM-DD string
export function parseDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return parts[2] + '-' + parts[1] + '-' + parts[0];
}

// Find the latest result date for dynamic cutoff
export function getLatestResultDate(results: MatchResult[]): string {
  return results.reduce((max, r) => {
    const d = parseDate(r.date);
    return d > max ? d : max;
  }, '0000-00-00');
}

// Bayesian confidence-adjusted win percentage
// Pulls small samples toward 50% (prior), reducing flukes from low game counts
const BAYESIAN_PRIOR = 0.5;
const BAYESIAN_K = 6;
const PRIOR_BLEND_MATCHES = 10;
const UNKNOWN_PLAYER_PRIOR = 0.45; // Below-average default for players without prior season data

export function calcBayesianPct(wins: number, games: number): number {
  if (games === 0) return BAYESIAN_PRIOR * 100;
  return ((wins + BAYESIAN_K * BAYESIAN_PRIOR) / (games + BAYESIAN_K)) * 100;
}

export function getDiv(team: string, ds?: DataSources): DivisionCode | null {
  const divisions = ds?.divisions ?? {}; // Use empty object if no DataSources provided
  for (const [div, data] of Object.entries(divisions)) {
    if (data.teams.includes(team)) return div as DivisionCode;
  }
  return null;
}

export function calcStandings(div: DivisionCode, ds?: DataSources): StandingEntry[] {
  const { divisions, results } = ds ?? defaults();
  const teams = divisions[div].teams;
  const standings: Record<string, { p: number; w: number; d: number; l: number; f: number; a: number; pts: number }> = {};
  teams.forEach(t => {
    standings[t] = { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, pts: 0 };
  });

  results.forEach(r => {
    if (getDiv(r.home, ds ? ds : undefined) !== div) return;
    const { home, away, home_score: hs, away_score: awayScore } = r;
    if (!standings[home] || !standings[away]) return;

    standings[home].p++;
    standings[away].p++;
    standings[home].f += hs;
    standings[home].a += awayScore;
    standings[away].f += awayScore;
    standings[away].a += hs;

    if (hs > awayScore) {
      standings[home].w++;
      standings[home].pts += 2;
      standings[away].l++;
    } else if (hs < awayScore) {
      standings[away].w++;
      standings[away].pts += 3;
      standings[home].l++;
    } else {
      standings[home].d++;
      standings[away].d++;
      standings[home].pts++;
      standings[away].pts++;
    }
  });

  return Object.entries(standings)
    .map(([team, s]) => ({ team, ...s, diff: s.f - s.a }))
    .sort((a, b) => b.pts - a.pts || b.diff - a.diff);
}

function calcPriorTeamStrength(team: string, div: DivisionCode, ds: DataSources): number {
  const rosterKey = div + ':' + team;
  const roster = ds.rosters[rosterKey] || [];

  // Collect all players associated with this team (roster + anyone who played in 25/26)
  const allPlayers = new Set(roster);
  for (const [name, data] of Object.entries(ds.players2526)) {
    if (data.teams.some(t => t.team === team)) allPlayers.add(name);
  }

  // Weighted average of 24/25 win% (weighted by games played that season)
  let totalWeight = 0;
  let weightedPct = 0;
  for (const name of allPlayers) {
    const stats = ds.players[name];
    if (stats && stats.p > 0) {
      totalWeight += stats.p;
      weightedPct += stats.w * stats.p;
    } else {
      // Unknown player: contribute a Bayesian prior
      totalWeight += BAYESIAN_K;
      weightedPct += UNKNOWN_PLAYER_PRIOR * BAYESIAN_K;
    }
  }

  if (totalWeight === 0) return 0;
  const avgWinPct = weightedPct / totalWeight;
  return (avgWinPct - 0.5) * 4; // map to strength scale
}

export function calcTeamStrength(div: DivisionCode, ds?: DataSources): Record<string, number> {
  const src = ds ?? defaults();
  const standings = calcStandings(div, src);
  const strengths: Record<string, number> = {};
  standings.forEach(s => {
    const currentStrength = s.p > 0 ? (s.diff / s.p / 10) * 2 : 0;
    const blendWeight = Math.min(1, s.p / PRIOR_BLEND_MATCHES);
    if (blendWeight < 1) {
      const prior = calcPriorTeamStrength(s.team, div, src);
      strengths[s.team] = (1 - blendWeight) * prior + blendWeight * currentStrength;
    } else {
      strengths[s.team] = currentStrength;
    }
  });
  return strengths;
}
