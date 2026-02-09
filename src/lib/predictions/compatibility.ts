/**
 * Compatibility layer for legacy prediction functions
 * 
 * This module contains functions recovered from predictions.deprecated.ts that may still be
 * referenced by other parts of the application. These functions have been preserved to maintain
 * backward compatibility during the refactoring process.
 * 
 * @module predictions/compatibility
 */

import type {
  DivisionCode,
  FrameData,
  HomeAwaySplit,
  H2HRecord,
  BDStats,
  Players2526Map,
  PlayerData2526,
  PlayerTeamStats2526,
  RostersMap,
  SquadOverrides,
  WhatIfResult,
  FixtureImportance,
  MatchResult,
  ScoutingReport,
} from '../types';
import type { DataSources } from './core';
import type { FormAnalysis } from './analytics';
import { parseDate, getDiv } from './core';
import { getRemainingFixtures } from './fixtures';
import { runSeasonSimulation } from './simulation';
import { calcPlayerForm as calcPlayerFormNew, generateScoutingReport as generateScoutingReportNew } from './analytics';
import { getTeamPlayers } from './player-stats';

/**
 * Calculate head-to-head record between two players
 * 
 * Analyzes frame-by-frame data to determine wins and losses between two specific players.
 * Returns detailed history of all encounters sorted by date (most recent first).
 * 
 * @param playerA - Name of the first player
 * @param playerB - Name of the second player
 * @param frames - Array of frame data to analyze
 * @returns H2H record with wins, losses, and detailed match history
 */
export function getH2HRecord(playerA: string, playerB: string, frames: FrameData[]): H2HRecord {
  const details: { date: string; winner: string }[] = [];
  let wins = 0;
  let losses = 0;
  for (const match of frames) {
    for (const f of match.frames) {
      const aIsHome = f.homePlayer === playerA && f.awayPlayer === playerB;
      const aIsAway = f.homePlayer === playerB && f.awayPlayer === playerA;
      if (!aIsHome && !aIsAway) continue;
      const aWon = (aIsHome && f.winner === 'home') || (aIsAway && f.winner === 'away');
      if (aWon) wins++;
      else losses++;
      details.push({
        date: match.date,
        winner: aWon ? playerA : playerB,
      });
    }
  }
  details.sort((a, b) => parseDate(b.date).localeCompare(parseDate(a.date)));
  return { playerA, playerB, wins, losses, details };
}

/**
 * Calculate player's home vs away performance split
 * 
 * Analyzes frame-by-frame data to determine a player's win percentage when playing
 * at home versus away. Useful for identifying players with strong home/away biases.
 * 
 * @param player - Name of the player
 * @param frames - Array of frame data to analyze
 * @returns Home and away performance statistics
 */
export function calcPlayerHomeAway(player: string, frames: FrameData[]): HomeAwaySplit {
  const home = { p: 0, w: 0, pct: 0 };
  const away = { p: 0, w: 0, pct: 0 };
  for (const match of frames) {
    for (const f of match.frames) {
      if (f.homePlayer === player) {
        home.p++;
        if (f.winner === 'home') home.w++;
      } else if (f.awayPlayer === player) {
        away.p++;
        if (f.winner === 'away') away.w++;
      }
    }
  }
  home.pct = home.p > 0 ? (home.w / home.p) * 100 : 0;
  away.pct = away.p > 0 ? (away.w / away.p) * 100 : 0;
  return { home, away };
}

/**
 * Calculate team's break and dish statistics
 * 
 * Aggregates break and dish statistics across all players who have played for a team.
 * Includes rates for breaks for (bdF), breaks against (bdA), and forfeits.
 * 
 * @param team - Name of the team
 * @param players2526 - Map of player statistics for the 2025-26 season
 * @returns Break and dish statistics including net BD and forfeit rate
 */
export function calcTeamBDStats(team: string, players2526: Players2526Map): BDStats {
  let totalP = 0;
  let totalBdF = 0;
  let totalBdA = 0;
  let totalForf = 0;
  for (const data of Object.values(players2526)) {
    const entry = data.teams.find(t => t.team === team);
    if (entry) {
      totalP += entry.p;
      totalBdF += entry.bdF;
      totalBdA += entry.bdA;
      totalForf += entry.forf;
    }
  }
  const p = totalP || 1;
  return {
    bdFRate: totalBdF / p,
    bdARate: totalBdA / p,
    netBD: totalBdF - totalBdA,
    forfRate: totalForf / p,
  };
}

/**
 * Get head-to-head records for all player matchups between two teams
 * 
 * Analyzes potential matchups between all players who have played for two teams.
 * Includes both players from frame data and rostered players. Results are sorted
 * by total encounters (most frequent matchups first).
 * 
 * @param teamA - Name of the first team
 * @param teamB - Name of the second team
 * @param frames - Array of frame data to analyze
 * @param rosters - Map of team rosters
 * @returns Array of H2H records for all player matchups between the teams
 */
export function getSquadH2H(
  teamA: string,
  teamB: string,
  frames: FrameData[],
  rosters: RostersMap
): H2HRecord[] {
  // Collect all players who have played for each team from frame data
  const teamAPlayers = new Set<string>();
  const teamBPlayers = new Set<string>();
  for (const match of frames) {
    for (const f of match.frames) {
      if (match.home === teamA || match.away === teamA) {
        if (match.home === teamA) teamAPlayers.add(f.homePlayer);
        else teamAPlayers.add(f.awayPlayer);
      }
      if (match.home === teamB || match.away === teamB) {
        if (match.home === teamB) teamBPlayers.add(f.homePlayer);
        else teamBPlayers.add(f.awayPlayer);
      }
    }
  }
  // Also include rostered players
  for (const [key, roster] of Object.entries(rosters)) {
    const rosterTeam = key.split(':').slice(1).join(':');
    if (rosterTeam === teamA) roster.forEach(p => teamAPlayers.add(p));
    if (rosterTeam === teamB) roster.forEach(p => teamBPlayers.add(p));
  }

  const records: H2HRecord[] = [];
  for (const pA of teamAPlayers) {
    for (const pB of teamBPlayers) {
      const record = getH2HRecord(pA, pB, frames);
      if (record.wins + record.losses > 0) {
        records.push(record);
      }
    }
  }
  return records.sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
}

/**
 * Get player's frame history with results and opponents
 * 
 * Retrieves all frames played by a specific player, including win/loss results,
 * opponents faced, and break/dish occurrences. Results are sorted by date
 * (most recent first).
 * 
 * @param player - Name of the player
 * @param frames - Array of frame data to analyze
 * @returns Array of frame history entries with date, result, opponent, and break/dish status
 */
export function getPlayerFrameHistory(
  player: string,
  frames: FrameData[]
): { date: string; won: boolean; opponent: string; breakDish: boolean }[] {
  const history: { date: string; won: boolean; opponent: string; breakDish: boolean; sortDate: string }[] = [];
  for (const match of frames) {
    for (const f of match.frames) {
      if (f.homePlayer === player) {
        history.push({
          date: match.date,
          won: f.winner === 'home',
          opponent: f.awayPlayer,
          breakDish: f.breakDish,
          sortDate: parseDate(match.date),
        });
      } else if (f.awayPlayer === player) {
        history.push({
          date: match.date,
          won: f.winner === 'away',
          opponent: f.homePlayer,
          breakDish: f.breakDish,
          sortDate: parseDate(match.date),
        });
      }
    }
  }
  history.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
  return history.map(({ sortDate: _, ...rest }) => rest);
}

/**
 * Calculate importance of each remaining fixture for a team
 * 
 * Simulates the impact of winning vs losing each remaining fixture on a team's
 * chances of finishing in the top 2. Importance is measured as the difference
 * in top-2 probability between winning and losing the fixture.
 * 
 * @param div - Division code
 * @param team - Name of the team
 * @param squadOverrides - Squad override settings for simulations
 * @param squadTopN - Number of top players to use per team
 * @param whatIfResults - Array of hypothetical results already applied
 * @param ds - Optional data sources (uses defaults if not provided)
 * @returns Array of fixtures with importance scores, sorted by importance (highest first)
 */
export function calcFixtureImportance(
  div: DivisionCode,
  team: string,
  squadOverrides: SquadOverrides,
  squadTopN: number,
  whatIfResults: WhatIfResult[],
  ds?: DataSources
): FixtureImportance[] {
  const remaining = getRemainingFixtures(div, ds);
  const teamFixtures = remaining.filter(f => f.home === team || f.away === team);
  const whatIfKeys = new Set(whatIfResults.map(wi => wi.home + ':' + wi.away));

  const results: FixtureImportance[] = [];

  for (const fix of teamFixtures) {
    if (whatIfKeys.has(fix.home + ':' + fix.away)) continue;

    // Simulate with this fixture as a win for the team
    const isHome = fix.home === team;
    const winResult: WhatIfResult = {
      home: fix.home,
      away: fix.away,
      homeScore: isHome ? 7 : 3,
      awayScore: isHome ? 3 : 7,
    };
    const lossResult: WhatIfResult = {
      home: fix.home,
      away: fix.away,
      homeScore: isHome ? 3 : 7,
      awayScore: isHome ? 7 : 3,
    };

    const simWin = runSeasonSimulation(div, squadOverrides, squadTopN, [...whatIfResults, winResult], ds);
    const simLoss = runSeasonSimulation(div, squadOverrides, squadTopN, [...whatIfResults, lossResult], ds);

    const teamWin = simWin.find(s => s.team === team);
    const teamLoss = simLoss.find(s => s.team === team);

    if (teamWin && teamLoss) {
      const pTop2Win = parseFloat(teamWin.pTop2);
      const pTop2Loss = parseFloat(teamLoss.pTop2);
      results.push({
        home: fix.home,
        away: fix.away,
        date: fix.date,
        importance: Math.abs(pTop2Win - pTop2Loss),
        pTop2IfWin: pTop2Win,
        pTop2IfLoss: pTop2Loss,
      });
    }
  }

  return results.sort((a, b) => b.importance - a.importance);
}

/**
 * Legacy form data structure
 */
export interface LegacyFormData {
  last5: { p: number; w: number; pct: number };
  last8: { p: number; w: number; pct: number };
  last10: { p: number; w: number; pct: number };
  seasonPct: number;
  recent: { date: string; won: boolean; opponent: string }[];
  trend: 'hot' | 'cold' | 'steady';
}

/**
 * Calculate player form analysis (compatibility wrapper)
 *
 * Legacy version that returns the old form data structure with last5/last10.
 * This is different from the new FormAnalysis interface.
 *
 * @param playerName - Name of the player
 * @param frames - Array of frame data to analyze
 * @returns Legacy form data with last5 and last10 performance
 */
export function calcPlayerForm(playerName: string, frames: FrameData[]): LegacyFormData | null {
  // Sort frames by date (most recent first)
  const sortedFrames = [...frames].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateB.localeCompare(dateA);
  });

  // Collect all games for this player
  const games: { date: string; won: boolean; opponent: string }[] = [];

  for (const match of sortedFrames) {
    for (const frame of match.frames) {
      const isHome = frame.homePlayer.includes(playerName);
      const isAway = frame.awayPlayer.includes(playerName);

      if (!isHome && !isAway) continue;

      const opponent = isHome ? frame.awayPlayer : frame.homePlayer;
      const won = (isHome && frame.winner === 'home') || (isAway && frame.winner === 'away');

      games.push({ date: match.date, won, opponent });
    }
  }

  if (games.length === 0) return null;

  // Calculate last 5, last 8, and last 10
  const last5Games = games.slice(0, 5);
  const last8Games = games.slice(0, 8);
  const last10Games = games.slice(0, 10);

  const last5 = {
    p: last5Games.length,
    w: last5Games.filter(g => g.won).length,
    pct: 0,
  };
  last5.pct = last5.p > 0 ? (last5.w / last5.p) * 100 : 0;

  const last8 = {
    p: last8Games.length,
    w: last8Games.filter(g => g.won).length,
    pct: 0,
  };
  last8.pct = last8.p > 0 ? (last8.w / last8.p) * 100 : 0;

  const last10 = {
    p: last10Games.length,
    w: last10Games.filter(g => g.won).length,
    pct: 0,
  };
  last10.pct = last10.p > 0 ? (last10.w / last10.p) * 100 : 0;

  // Calculate trend
  let trend: 'hot' | 'cold' | 'steady' = 'steady';
  if (last5.p >= 3) {
    if (last5.pct >= 70) trend = 'hot';
    else if (last5.pct <= 30) trend = 'cold';
    else trend = 'steady';
  }

  // Calculate overall season percentage
  const seasonW = games.filter(g => g.won).length;
  const seasonP = games.length;
  const seasonPct = seasonP > 0 ? (seasonW / seasonP) * 100 : 0;

  return {
    last5,
    last8,
    last10,
    seasonPct,
    recent: games.slice(0, 10),
    trend,
  };
}

/**
 * Calculate break and dish statistics from player data (compatibility wrapper)
 *
 * Legacy version that takes PlayerTeamStats2526 or PlayerData2526 object directly.
 * Supports both single team stats and full player data with multiple teams.
 *
 * @param playerData - Player data for 2025-26 season (single team or full data)
 * @returns Break and dish statistics
 */
export function calcBDStats(playerData: PlayerTeamStats2526 | PlayerData2526): BDStats {
  let totalP = 0;
  let totalBdF = 0;
  let totalBdA = 0;
  let totalForf = 0;

  // Check if it's PlayerData2526 (has teams array) or PlayerTeamStats2526 (single team)
  if ('teams' in playerData) {
    // PlayerData2526 - aggregate across all teams
    playerData.teams.forEach((teamStats) => {
      totalP += teamStats.p;
      totalBdF += teamStats.bdF;
      totalBdA += teamStats.bdA;
      totalForf += teamStats.forf;
    });
  } else {
    // PlayerTeamStats2526 - single team stats
    totalP = playerData.p;
    totalBdF = playerData.bdF;
    totalBdA = playerData.bdA;
    totalForf = playerData.forf;
  }

  const p = totalP || 1;
  return {
    bdFRate: totalBdF / p,
    bdARate: totalBdA / p,
    netBD: totalBdF - totalBdA,
    forfRate: totalForf / p,
  };
}

/**
 * Generate scouting report for a team (compatibility wrapper)
 *
 * Legacy version that takes fewer parameters and auto-fills missing ones.
 *
 * @param team - Name of the team to scout
 * @param frames - Frame data for analysis
 * @param results - Match results
 * @param players2526 - Player statistics for 2025-26 season
 * @param ds - Optional data sources
 * @returns Comprehensive scouting report
 */
export function generateScoutingReport(
  team: string,
  frames: FrameData[],
  results: MatchResult[],
  players2526: Players2526Map,
  ds?: DataSources
): ScoutingReport | null {
  const division = getDiv(team, ds);
  if (!division) return null;

  const players = getTeamPlayers(team, ds);
  return generateScoutingReportNew(team, results, frames, players, players2526, division);
}
