import type {
  TeamPlayer,
  LeaguePlayer,
  PlayerTeamStats2526,
  EffectivePct,
  MatchResult,
  Fixture,
  PlayersMap,
  RostersMap,
  Players2526Map,
  Divisions,
} from '../types';
import type { DataSources } from './core';
import { calcBayesianPct, getDiv } from './core';
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
 * Get team players with combined roster and stats data
 * Returns players from both the 24/25 roster and 25/26 season data
 */
export function getTeamPlayers(team: string, ds?: DataSources): TeamPlayer[] {
  const src = ds ?? defaults();
  const div = getDiv(team, src);
  if (!div) return [];
  const rosterKey = div + ':' + team;
  const roster = src.rosters[rosterKey];
  if (!roster) return [];

  const players2526: Record<string, PlayerTeamStats2526> = {};
  for (const [name, data] of Object.entries(src.players2526)) {
    const teamEntry = data.teams.find(t => t.team === team);
    if (teamEntry) players2526[name] = teamEntry;
  }

  const allNames = new Set(roster);
  Object.keys(players2526).forEach(n => allNames.add(n));

  return [...allNames]
    .map(name => ({
      name,
      rating: src.players[name] ? src.players[name].r : null,
      winPct: src.players[name] ? src.players[name].w : null,
      played: src.players[name] ? src.players[name].p : null,
      s2526: players2526[name] || null,
      rostered: roster.includes(name),
    }))
    .sort((a, b) => {
      const aEff = getPlayerEffectivePct(a);
      const bEff = getPlayerEffectivePct(b);
      if (!aEff && !bEff) return 0;
      if (!aEff) return 1;
      if (!bEff) return -1;
      return bEff.adjPct - aEff.adjPct;
    });
}

/**
 * Get player stats from 24/25 season
 * Returns null if player not found
 */
export function getPlayerStats(name: string, ds?: DataSources) {
  const { players } = ds ?? defaults();
  const data = players[name];
  if (!data) return null;
  return { name, rating: data.r, winPct: data.w, played: data.p };
}

/**
 * Get all teams a player is rostered on (24/25 rosters)
 */
export function getPlayerTeams(name: string, ds?: DataSources) {
  const { rosters } = ds ?? defaults();
  const teams: { div: string; team: string }[] = [];
  for (const [key, roster] of Object.entries(rosters)) {
    if (roster.includes(name)) {
      const parts = key.split(':');
      teams.push({ div: parts[0], team: parts.slice(1).join(':') });
    }
  }
  return teams;
}

/**
 * Get player stats from 25/26 season
 * Returns null if player not found
 */
export function getPlayerStats2526(name: string, ds?: DataSources) {
  const { players2526 } = ds ?? defaults();
  const data = players2526[name];
  if (!data) return null;
  return data;
}

/**
 * Get all players who have played for a team in 25/26 season
 * Returns sorted by Bayesian-adjusted win percentage (highest first)
 */
export function getTeamPlayers2526(team: string, ds?: DataSources) {
  const { players2526 } = ds ?? defaults();
  const players: Array<{ name: string } & PlayerTeamStats2526 & { total: { p: number; w: number; pct: number } }> = [];
  for (const [name, data] of Object.entries(players2526)) {
    const teamEntry = data.teams.find(t => t.team === team);
    if (teamEntry) {
      players.push({ name, ...teamEntry, total: data.total });
    }
  }
  return players.sort((a, b) => {
    const aAdj = calcBayesianPct(a.w, a.p);
    const bAdj = calcBayesianPct(b.w, b.p);
    return bAdj - aAdj;
  });
}

/**
 * Get effective win% for a player (25/26 preferred, 24/25 fallback)
 * Returns null if player has insufficient data
 */
export function getPlayerEffectivePct(pl: TeamPlayer): EffectivePct | null {
  if (pl.s2526 && pl.s2526.p >= 3) {
    return {
      pct: pl.s2526.pct / 100,
      adjPct: calcBayesianPct(pl.s2526.w, pl.s2526.p) / 100,
      weight: pl.s2526.p,
      wins: pl.s2526.w,
    };
  }
  if (pl.winPct !== null && pl.played !== null && pl.played > 0) {
    const wins = Math.round(pl.winPct * pl.played);
    return {
      pct: pl.winPct,
      adjPct: calcBayesianPct(wins, pl.played) / 100,
      weight: pl.played,
      wins,
    };
  }
  return null;
}

/**
 * Get all players in the league with combined 24/25 and 25/26 stats
 * Returns sorted by 25/26 Bayesian-adjusted win percentage (highest first)
 */
export function getAllLeaguePlayers(ds?: DataSources): LeaguePlayer[] {
  const { players, players2526 } = ds ?? defaults();
  const allNames = new Set([...Object.keys(players), ...Object.keys(players2526)]);
  return [...allNames]
    .map(name => {
      const s2425 = players[name];
      const s2526 = players2526[name];
      return {
        name,
        rating: s2425 ? s2425.r : null,
        teams2526: s2526 ? s2526.teams.map(t => t.team) : [],
        totalPct2526: s2526 ? s2526.total.pct : null,
        totalPlayed2526: s2526 ? s2526.total.p : null,
        adjPct2526: s2526 ? calcBayesianPct(s2526.total.w, s2526.total.p) : null,
      };
    })
    .sort((a, b) => (b.adjPct2526 || 0) - (a.adjPct2526 || 0));
}
