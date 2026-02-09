/**
 * Analytics Module
 *
 * Advanced statistical analysis for predictions including BD stats, form analysis,
 * H2H records, and comprehensive scouting reports.
 */

import type {
  FrameData,
  Players2526Map,
  PlayerFormData,
  BDStats,
  H2HRecord,
  ScoutingReport,
  TeamPlayer,
  TeamHomeAwaySplit,
  SetPerformance,
  PredictedLineup,
  PlayerAppearance,
  MatchResult,
  DivisionCode,
} from '../types';
import { calcBayesianPct, type DataSources } from './core';
import { parseDate } from './core';

// ============================================================================
// Constants
// ============================================================================

const FORM_WINDOW_SMALL = 5;
const FORM_WINDOW_MEDIUM = 8;
const FORM_WINDOW_LARGE = 10;
const HOT_THRESHOLD = 0.65; // 65%+ recent form
const COLD_THRESHOLD = 0.40; // <40% recent form
const MIN_GAMES_FOR_TREND = 5;

// ============================================================================
// Types
// ============================================================================

export interface AdvancedBDStats extends BDStats {
  bdFPerGame: number; // Break and dish for per game
  bdAPerGame: number; // Break and dish against per game
  bdDiff: number; // Net break and dish differential
  bdEfficiency: number; // BD for / (BD for + BD against)
  rank?: number; // League ranking
}

export interface FormAnalysis {
  current: PlayerFormData;
  streak: {
    type: 'win' | 'loss' | 'none';
    count: number;
    dates: string[];
  };
  recentGames: { date: string; won: boolean; opponent: string }[];
  momentum: number; // -1 to 1 scale
}

export interface H2HAnalysis {
  record: H2HRecord;
  recentForm: { date: string; won: boolean }[];
  advantage: 'strong' | 'moderate' | 'even' | 'disadvantage';
  confidence: number; // 0-1 based on sample size
}

// ============================================================================
// Break and Dish (BD) Statistics
// ============================================================================

/**
 * Calculate advanced BD statistics for a player or team.
 */
export function calcBDStats(
  playerName: string | null,
  teamName: string | null,
  players2526: Players2526Map,
  division?: DivisionCode
): AdvancedBDStats {
  let totalGames = 0;
  let totalBdF = 0;
  let totalBdA = 0;
  let totalForf = 0;

  if (playerName) {
    // Calculate for a specific player
    const playerData = players2526[playerName];
    if (playerData) {
      playerData.teams.forEach((teamStats) => {
        if (!division || teamStats.div === division) {
          totalGames += teamStats.p;
          totalBdF += teamStats.bdF;
          totalBdA += teamStats.bdA;
          totalForf += teamStats.forf;
        }
      });
    }
  } else if (teamName) {
    // Calculate for all players on a team
    Object.entries(players2526).forEach(([name, data]) => {
      data.teams.forEach((teamStats) => {
        if (teamStats.team === teamName && (!division || teamStats.div === division)) {
          totalGames += teamStats.p;
          totalBdF += teamStats.bdF;
          totalBdA += teamStats.bdA;
          totalForf += teamStats.forf;
        }
      });
    });
  }

  const bdFPerGame = totalGames > 0 ? totalBdF / totalGames : 0;
  const bdAPerGame = totalGames > 0 ? totalBdA / totalGames : 0;
  const bdDiff = totalBdF - totalBdA;
  const bdEfficiency = totalBdF + totalBdA > 0 ? totalBdF / (totalBdF + totalBdA) : 0.5;
  const forfRate = totalGames > 0 ? totalForf / totalGames : 0;

  return {
    bdFRate: bdFPerGame,
    bdARate: bdAPerGame,
    netBD: bdDiff,
    forfRate,
    bdFPerGame,
    bdAPerGame,
    bdDiff,
    bdEfficiency,
  };
}

/**
 * Compare BD stats between two players or teams.
 */
export function compareBDStats(
  stats1: AdvancedBDStats,
  stats2: AdvancedBDStats
): {
  bdAdvantage: number; // Positive favors stats1
  efficiencyDiff: number;
  netDiff: number;
} {
  return {
    bdAdvantage: stats1.bdFPerGame - stats2.bdFPerGame,
    efficiencyDiff: stats1.bdEfficiency - stats2.bdEfficiency,
    netDiff: stats1.netBD - stats2.netBD,
  };
}

// ============================================================================
// Form Analysis
// ============================================================================

/**
 * Calculate player form over different windows.
 */
export function calcPlayerForm(
  playerName: string,
  frames: FrameData[],
  seasonPct: number
): FormAnalysis {
  // Sort frames by date (most recent first)
  const sortedFrames = [...frames].sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateB.localeCompare(dateA);
  });

  // Collect all games for this player
  const games: { date: string; won: boolean; opponent: string; matchId: string }[] = [];

  for (const match of sortedFrames) {
    for (const frame of match.frames) {
      const isHome = frame.homePlayer.includes(playerName);
      const isAway = frame.awayPlayer.includes(playerName);

      if (!isHome && !isAway) continue;

      const opponent = isHome ? frame.awayPlayer : frame.homePlayer;
      const won = (isHome && frame.winner === 'home') || (isAway && frame.winner === 'away');

      games.push({
        date: match.date,
        won,
        opponent,
        matchId: match.matchId,
      });
    }
  }

  // Calculate form windows
  const last5Games = games.slice(0, FORM_WINDOW_SMALL);
  const last8Games = games.slice(0, FORM_WINDOW_MEDIUM);
  const last10Games = games.slice(0, FORM_WINDOW_LARGE);

  const calcWindow = (window: typeof games) => ({
    p: window.length,
    w: window.filter((g) => g.won).length,
    pct: window.length > 0 ? (window.filter((g) => g.won).length / window.length) * 100 : 0,
  });

  const last5 = calcWindow(last5Games);
  const last8 = calcWindow(last8Games);
  const last10 = calcWindow(last10Games);

  // Determine trend
  let trend: 'hot' | 'cold' | 'steady' = 'steady';
  if (last5.p >= MIN_GAMES_FOR_TREND) {
    if (last5.pct >= HOT_THRESHOLD * 100) {
      trend = 'hot';
    } else if (last5.pct < COLD_THRESHOLD * 100) {
      trend = 'cold';
    }
  }

  // Calculate streak
  const streak = calcStreak(games);

  // Calculate momentum (-1 to 1)
  let momentum = 0;
  if (last5.p > 0) {
    // Weight recent games more heavily
    let weightedSum = 0;
    let weightTotal = 0;
    last5Games.forEach((game, idx) => {
      const weight = FORM_WINDOW_SMALL - idx; // 5, 4, 3, 2, 1
      weightedSum += (game.won ? 1 : 0) * weight;
      weightTotal += weight;
    });
    const weightedPct = weightTotal > 0 ? weightedSum / weightTotal : 0.5;
    momentum = (weightedPct - 0.5) * 2; // Scale to -1 to 1
  }

  return {
    current: {
      last5,
      last8: last8.p > 0 ? last8 : undefined,
      last10,
      seasonPct,
      trend,
    },
    streak,
    recentGames: games.slice(0, 10).map((g) => ({
      date: g.date,
      won: g.won,
      opponent: g.opponent,
    })),
    momentum,
  };
}

/**
 * Calculate current streak from games (already sorted by date, most recent first).
 */
function calcStreak(games: { date: string; won: boolean }[]): {
  type: 'win' | 'loss' | 'none';
  count: number;
  dates: string[];
} {
  if (games.length === 0) {
    return { type: 'none', count: 0, dates: [] };
  }

  const firstResult = games[0].won;
  const dates: string[] = [];
  let count = 0;

  for (const game of games) {
    if (game.won === firstResult) {
      count++;
      dates.push(game.date);
    } else {
      break;
    }
  }

  return {
    type: firstResult ? 'win' : 'loss',
    count,
    dates,
  };
}

// ============================================================================
// Head-to-Head Analysis
// ============================================================================

/**
 * Analyze H2H record and determine matchup advantage.
 */
export function analyzeH2H(
  playerA: string,
  playerB: string,
  frames: FrameData[]
): H2HAnalysis | null {
  // Find all matchups between these players
  const matchups: { date: string; wonByA: boolean }[] = [];

  for (const match of frames) {
    for (const frame of match.frames) {
      const isAHome = frame.homePlayer.includes(playerA);
      const isBHome = frame.homePlayer.includes(playerB);
      const isAAway = frame.awayPlayer.includes(playerA);
      const isBAway = frame.awayPlayer.includes(playerB);

      // Check if these two players faced each other
      const matchup = (isAHome && isBAway) || (isAAway && isBHome);
      if (!matchup) continue;

      const wonByA = (isAHome && frame.winner === 'home') || (isAAway && frame.winner === 'away');
      matchups.push({
        date: match.date,
        wonByA,
      });
    }
  }

  if (matchups.length === 0) {
    return null;
  }

  // Sort by date (most recent first)
  matchups.sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateB.localeCompare(dateA);
  });

  const totalGames = matchups.length;
  const winsA = matchups.filter((m) => m.wonByA).length;
  const winsB = totalGames - winsA;
  const winPctA = totalGames > 0 ? (winsA / totalGames) * 100 : 0;

  // Determine advantage level
  let advantage: 'strong' | 'moderate' | 'even' | 'disadvantage';
  if (winPctA >= 70) advantage = 'strong';
  else if (winPctA >= 60) advantage = 'moderate';
  else if (winPctA >= 40) advantage = 'even';
  else advantage = 'disadvantage';

  // Confidence based on sample size (0-1)
  const confidence = Math.min(1, totalGames / 10);

  const record: H2HRecord = {
    playerA,
    playerB,
    wins: winsA,
    losses: winsB,
    details: matchups.map((m) => ({
      date: m.date,
      winner: m.wonByA ? playerA : playerB,
    })),
  };

  return {
    record,
    recentForm: matchups.slice(0, 5).map((m) => ({
      date: m.date,
      won: m.wonByA,
    })),
    advantage,
    confidence,
  };
}

// ============================================================================
// Team Home/Away Analysis
// ============================================================================

/**
 * Calculate team's home/away split from results.
 */
export function calcTeamHomeAwaySplit(
  team: string,
  results: MatchResult[]
): TeamHomeAwaySplit {
  const home = { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, winPct: 0 };
  const away = { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, winPct: 0 };

  for (const result of results) {
    const isHome = result.home === team;
    const isAway = result.away === team;

    if (!isHome && !isAway) continue;

    const split = isHome ? home : away;
    const teamScore = isHome ? result.home_score : result.away_score;
    const oppScore = isHome ? result.away_score : result.home_score;

    split.p++;
    split.f += teamScore;
    split.a += oppScore;

    if (teamScore > oppScore) {
      split.w++;
    } else if (teamScore === oppScore) {
      split.d++;
    } else {
      split.l++;
    }
  }

  home.winPct = home.p > 0 ? (home.w / home.p) * 100 : 0;
  away.winPct = away.p > 0 ? (away.w / away.p) * 100 : 0;

  return { home, away };
}

// ============================================================================
// Set Performance Analysis
// ============================================================================

/**
 * Calculate set performance for a team from frame data.
 */
export function calcSetPerformance(
  team: string,
  frames: FrameData[]
): SetPerformance | null {
  const set1 = { won: 0, played: 0 };
  const set2 = { won: 0, played: 0 };

  for (const match of frames) {
    const isHome = match.home === team;
    const isAway = match.away === team;

    if (!isHome && !isAway) continue;

    for (const frame of match.frames) {
      const teamWon = (isHome && frame.winner === 'home') || (isAway && frame.winner === 'away');
      const set = frame.frameNum <= 5 ? set1 : set2;

      set.played++;
      if (teamWon) set.won++;
    }
  }

  if (set1.played === 0 && set2.played === 0) {
    return null;
  }

  const set1Pct = set1.played > 0 ? (set1.won / set1.played) * 100 : 0;
  const set2Pct = set2.played > 0 ? (set2.won / set2.played) * 100 : 0;
  const bias = set1Pct - set2Pct;

  return {
    set1: {
      won: set1.won,
      played: set1.played,
      pct: set1Pct,
    },
    set2: {
      won: set2.won,
      played: set2.played,
      pct: set2Pct,
    },
    bias,
  };
}

// ============================================================================
// Scouting Report Generation
// ============================================================================

/**
 * Generate comprehensive scouting report for a team.
 */
export function generateScoutingReport(
  team: string,
  results: MatchResult[],
  frames: FrameData[],
  players: TeamPlayer[],
  players2526: Players2526Map,
  division: DivisionCode
): ScoutingReport {
  // Calculate BD stats for the team
  const bdStats = calcBDStats(null, team, players2526, division);

  // Calculate home/away splits
  const homeAway = calcTeamHomeAwaySplit(team, results);

  // Calculate set performance
  const setPerformance = calcSetPerformance(team, frames);

  // Calculate predicted lineup (appearance rates)
  const predictedLineup = calcPredictedLineup(team, frames);

  // Get team form (last 5 results)
  const teamForm = calcTeamForm(team, results);

  // Identify strongest and weakest players
  const playersWithPct = players
    .filter((p) => p.s2526 && p.s2526.p > 0)
    .map((p) => ({
      name: p.name,
      pct: p.s2526?.pct || 0,
      adjPct: p.s2526 ? calcBayesianPct(p.s2526.w, p.s2526.p) : 0,
      p: p.s2526?.p || 0,
    }))
    .sort((a, b) => b.adjPct - a.adjPct);

  const strongestPlayers = playersWithPct.slice(0, 3);
  const weakestPlayers = playersWithPct.slice(-3).reverse();

  // Calculate forfeit rate
  const totalGames = players.reduce((sum, p) => sum + (p.s2526?.p || 0), 0);
  const totalForfeits = players.reduce((sum, p) => sum + (p.s2526?.forf || 0), 0);
  const forfeitRate = totalGames > 0 ? totalForfeits / totalGames : 0;

  return {
    opponent: team,
    teamForm,
    homeAway,
    setPerformance,
    bdStats,
    predictedLineup,
    strongestPlayers,
    weakestPlayers,
    forfeitRate,
  };
}

/**
 * Calculate team form from recent results.
 */
function calcTeamForm(team: string, results: MatchResult[]): ('W' | 'L' | 'D')[] {
  const form: ('W' | 'L' | 'D')[] = [];

  // Sort by date (most recent first)
  const sorted = [...results]
    .filter((r) => r.home === team || r.away === team)
    .sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB.localeCompare(dateA);
    });

  for (let i = 0; i < Math.min(5, sorted.length); i++) {
    const result = sorted[i];
    const isHome = result.home === team;
    const teamScore = isHome ? result.home_score : result.away_score;
    const oppScore = isHome ? result.away_score : result.home_score;

    if (teamScore > oppScore) {
      form.push('W');
    } else if (teamScore === oppScore) {
      form.push('D');
    } else {
      form.push('L');
    }
  }

  return form;
}

/**
 * Calculate predicted lineup based on appearance rates.
 */
function calcPredictedLineup(team: string, frames: FrameData[]): PredictedLineup {
  const matchDates = new Set<string>();
  const playerAppearances: Record<string, Set<string>> = {};

  // Count appearances per match
  for (const match of frames) {
    const isHome = match.home === team;
    const isAway = match.away === team;

    if (!isHome && !isAway) continue;

    matchDates.add(match.matchId);

    for (const frame of match.frames) {
      const playerName = isHome ? frame.homePlayer : frame.awayPlayer;

      if (!playerAppearances[playerName]) {
        playerAppearances[playerName] = new Set();
      }
      playerAppearances[playerName].add(match.matchId);
    }
  }

  const totalMatches = matchDates.size;
  const players: PlayerAppearance[] = [];

  for (const [name, matches] of Object.entries(playerAppearances)) {
    const appearances = matches.size;
    const rate = totalMatches > 0 ? appearances / totalMatches : 0;

    let category: 'core' | 'rotation' | 'fringe';
    if (rate >= 0.75) category = 'core';
    else if (rate >= 0.4) category = 'rotation';
    else category = 'fringe';

    players.push({
      name,
      appearances,
      totalMatches,
      rate,
      category,
    });
  }

  // Sort by appearance rate
  players.sort((a, b) => b.rate - a.rate);

  // Get recent players (last 3 matches)
  const recentMatches = [...frames]
    .filter((f) => f.home === team || f.away === team)
    .sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB.localeCompare(dateA);
    })
    .slice(0, 3);

  const recentPlayers = new Set<string>();
  for (const match of recentMatches) {
    const isHome = match.home === team;
    for (const frame of match.frames) {
      const playerName = isHome ? frame.homePlayer : frame.awayPlayer;
      recentPlayers.add(playerName);
    }
  }

  return {
    players,
    recentPlayers: Array.from(recentPlayers),
  };
}
