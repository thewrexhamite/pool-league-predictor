/**
 * Home/Away Analytics Module
 *
 * Advanced home/away performance analysis for teams and players.
 */

import type { DivisionCode, FrameData, TeamHomeAwaySplit } from '../types';
import type { DataSources } from '../predictions/core';
import { calcTeamHomeAwaySplit } from '../predictions/analytics';
import { getDiv } from '../predictions/core';

export interface HomeAdvantageEntry {
  team: string;
  homeWinPct: number;
  awayWinPct: number;
  advantage: number; // home - away difference
  homeRecord: TeamHomeAwaySplit['home'];
  awayRecord: TeamHomeAwaySplit['away'];
}

export interface PlayerVenueBias {
  player: string;
  homeGames: number;
  homeWins: number;
  homePct: number;
  awayGames: number;
  awayWins: number;
  awayPct: number;
  bias: number; // positive = better at home
}

/**
 * Calculate home advantage stats for all teams in a division.
 */
export function calcHomeAdvantage(
  div: DivisionCode,
  ds: DataSources
): HomeAdvantageEntry[] {
  const teams = ds.divisions[div]?.teams || [];
  const divResults = ds.results.filter(r => getDiv(r.home, ds) === div);
  const entries: HomeAdvantageEntry[] = [];

  for (const team of teams) {
    const split = calcTeamHomeAwaySplit(team, divResults);
    entries.push({
      team,
      homeWinPct: split.home.winPct,
      awayWinPct: split.away.winPct,
      advantage: split.home.winPct - split.away.winPct,
      homeRecord: split.home,
      awayRecord: split.away,
    });
  }

  entries.sort((a, b) => b.advantage - a.advantage);
  return entries;
}

/**
 * Calculate player venue bias (home vs away performance).
 */
export function calcPlayerVenueBias(
  player: string,
  frames: FrameData[]
): PlayerVenueBias {
  let homeGames = 0;
  let homeWins = 0;
  let awayGames = 0;
  let awayWins = 0;

  for (const match of frames) {
    for (const f of match.frames) {
      if (f.homePlayer === player) {
        homeGames++;
        if (f.winner === 'home') homeWins++;
      } else if (f.awayPlayer === player) {
        awayGames++;
        if (f.winner === 'away') awayWins++;
      }
    }
  }

  const homePct = homeGames > 0 ? (homeWins / homeGames) * 100 : 0;
  const awayPct = awayGames > 0 ? (awayWins / awayGames) * 100 : 0;

  return {
    player,
    homeGames,
    homeWins,
    homePct,
    awayGames,
    awayWins,
    awayPct,
    bias: homePct - awayPct,
  };
}

/**
 * Get teams sorted by home strength.
 */
export function getStrongestHomeTeams(
  div: DivisionCode,
  ds: DataSources,
  limit: number = 10
): HomeAdvantageEntry[] {
  const entries = calcHomeAdvantage(div, ds);
  return entries
    .filter(e => e.homeRecord.p >= 3)
    .sort((a, b) => b.homeWinPct - a.homeWinPct)
    .slice(0, limit);
}
