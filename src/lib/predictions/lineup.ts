import type {
  TeamPlayer,
  SquadOverrides,
  PlayerAppearance,
  PredictedLineup,
  LineupScore,
  LineupSuggestion,
  FrameData,
  Players2526Map,
  RostersMap,
  PlayerFormData,
  DivisionCode,
  Divisions,
} from '../types';
import { calcBayesianPct, type DataSources } from './core';
import { parseDate } from './core';

// Squad Builder strength calculations
const SQUAD_STRENGTH_SCALING = 4.0;

// Import dependencies from parent module that haven't been extracted yet
// These will be moved to player-stats and analytics modules in future subtasks
import {
  getTeamPlayers,
  getPlayerEffectivePct,
  calcPlayerForm,
  getH2HRecord,
  calcPlayerHomeAway,
  calcSetPerformance,
} from '../predictions';

// ── Squad Optimization Functions ──

/**
 * Filter to top N players by adjusted effective win percentage
 */
export function getTopNPlayers(players: TeamPlayer[], n: number) {
  const withStats = players
    .map(pl => ({ ...pl, eff: getPlayerEffectivePct(pl) }))
    .filter(pl => pl.eff !== null);
  withStats.sort((a, b) => b.eff!.adjPct - a.eff!.adjPct);
  return withStats.slice(0, n);
}

/**
 * Calculate squad strength based on player win percentages
 * @param topN - Optional: consider only top N players
 */
export function calcSquadStrength(team: string, topN?: number, ds?: DataSources): number | null {
  const players = getTeamPlayers(team, ds);
  if (players.length === 0) return null;
  const pool = topN
    ? getTopNPlayers(players, topN)
    : players.map(pl => ({ ...pl, eff: getPlayerEffectivePct(pl) }));
  let totalWeight = 0;
  let weightedPct = 0;
  pool.forEach(pl => {
    const e = pl.eff || getPlayerEffectivePct(pl);
    if (e) {
      weightedPct += e.adjPct * e.weight;
      totalWeight += e.weight;
    }
  });
  return totalWeight === 0 ? null : weightedPct / totalWeight;
}

/**
 * Calculate squad strength with player add/remove overrides applied
 */
export function calcModifiedSquadStrength(
  team: string,
  overrides: SquadOverrides,
  topN?: number,
  ds?: DataSources
): number | null {
  const override = overrides[team];
  if (!override) return calcSquadStrength(team, topN, ds);

  const basePlayers = getTeamPlayers(team, ds);
  const removedSet = new Set(override.removed || []);
  const players: TeamPlayer[] = basePlayers.filter(pl => !removedSet.has(pl.name));

  // Add new players with their stats
  (override.added || []).forEach(name => {
    if (!ds) return;
    const s2526 = ds.players2526[name];
    const s2425 = ds.players[name];
    let bestTeamEntry = null;
    if (s2526) {
      bestTeamEntry = s2526.teams.reduce<typeof s2526.teams[0] | null>(
        (best, t) => (!best || t.p > best.p ? t : best),
        null
      );
    }
    players.push({
      name,
      rating: s2425 ? s2425.r : null,
      winPct: s2425 ? s2425.w : null,
      played: s2425 ? s2425.p : null,
      s2526: bestTeamEntry,
      rostered: false,
    });
  });

  const pool = topN
    ? getTopNPlayers(players, topN)
    : players.map(pl => ({ ...pl, eff: getPlayerEffectivePct(pl) }));
  let totalWeight = 0;
  let weightedPct = 0;
  pool.forEach(pl => {
    const e = pl.eff || getPlayerEffectivePct(pl);
    if (e) {
      weightedPct += e.adjPct * e.weight;
      totalWeight += e.weight;
    }
  });
  return totalWeight === 0 ? null : weightedPct / totalWeight;
}

/**
 * Calculate strength adjustments for all teams in a division with squad overrides
 */
export function calcStrengthAdjustments(
  div: DivisionCode,
  overrides: SquadOverrides,
  topN?: number,
  ds?: DataSources
): Record<string, number> {
  const divisions: Divisions = ds?.divisions ?? {};
  const adjustments: Record<string, number> = {};
  divisions[div].teams.forEach(team => {
    if (!overrides[team]) return;
    const orig = calcSquadStrength(team, topN, ds);
    const mod = calcModifiedSquadStrength(team, overrides, topN, ds);
    if (orig !== null && mod !== null) {
      adjustments[team] = (mod - orig) * SQUAD_STRENGTH_SCALING;
    }
  });
  return adjustments;
}

// ── Lineup Prediction Functions ──

/**
 * Calculate player appearance rates for a team based on frame history
 */
export function calcAppearanceRates(team: string, frames: FrameData[]): PlayerAppearance[] {
  const matchDates = new Set<string>();
  const playerAppearances: Record<string, Set<string>> = {};

  for (const match of frames) {
    const isHome = match.home === team;
    const isAway = match.away === team;
    if (!isHome && !isAway) continue;
    matchDates.add(match.date);
    for (const f of match.frames) {
      const player = isHome ? f.homePlayer : f.awayPlayer;
      if (!playerAppearances[player]) playerAppearances[player] = new Set();
      playerAppearances[player].add(match.date);
    }
  }

  const totalMatches = matchDates.size;
  if (totalMatches === 0) return [];

  return Object.entries(playerAppearances)
    .map(([name, dates]) => {
      const appearances = dates.size;
      const rate = appearances / totalMatches;
      let category: 'core' | 'rotation' | 'fringe';
      if (rate >= 0.8) category = 'core';
      else if (rate >= 0.4) category = 'rotation';
      else category = 'fringe';
      return { name, appearances, totalMatches, rate, category };
    })
    .sort((a, b) => b.rate - a.rate);
}

/**
 * Predict likely lineup for a team based on recent appearance patterns
 */
export function predictLineup(team: string, frames: FrameData[], recentN = 3): PredictedLineup {
  const appearances = calcAppearanceRates(team, frames);

  // Find the most recent N match dates for this team
  const matchDates = new Set<string>();
  for (const match of frames) {
    if (match.home === team || match.away === team) {
      matchDates.add(match.date);
    }
  }
  const sortedDates = [...matchDates]
    .sort((a, b) => parseDate(b).localeCompare(parseDate(a)))
    .slice(0, recentN);
  const recentDateSet = new Set(sortedDates);

  // Find players who appeared in the recent matches
  const recentPlayers = new Set<string>();
  for (const match of frames) {
    if (!recentDateSet.has(match.date)) continue;
    const isHome = match.home === team;
    const isAway = match.away === team;
    if (!isHome && !isAway) continue;
    for (const f of match.frames) {
      recentPlayers.add(isHome ? f.homePlayer : f.awayPlayer);
    }
  }

  return {
    players: appearances,
    recentPlayers: [...recentPlayers],
  };
}

/**
 * Suggest optimal lineup considering form, H2H, and venue performance
 * Feature 9: Optimal Lineup Suggester
 */
export function suggestLineup(
  myTeam: string,
  opponent: string,
  isHome: boolean,
  frames: FrameData[],
  players2526: Players2526Map,
  rosters: RostersMap
): LineupSuggestion {
  // Get my team's players with stats (min 5 games for reliability)
  const myPlayers: { name: string; pct: number; adjPct: number; p: number }[] = [];
  const excludedPlayers: string[] = [];
  for (const [name, data] of Object.entries(players2526)) {
    const entry = data.teams.find(t => t.team === myTeam);
    if (entry) {
      if (entry.p >= 5) {
        myPlayers.push({ name, pct: entry.pct, adjPct: calcBayesianPct(entry.w, entry.p), p: entry.p });
      } else if (entry.p >= 1) {
        excludedPlayers.push(name);
      }
    }
  }

  // Predicted opponent lineup
  const oppLineup = predictLineup(opponent, frames);
  const likelyOpponents = oppLineup.recentPlayers;

  // Score each player (cache form data for insight generation)
  const formCache = new Map<string, PlayerFormData>();
  const scored: LineupScore[] = myPlayers.map(pl => {
    // Form component
    const form = frames.length > 0 ? calcPlayerForm(pl.name, frames) : null;
    if (form) formCache.set(pl.name, form);
    // Use last-8 when available, fall back to last-5
    const formPct = form ? (form.last8 && form.last8.p >= 6 ? form.last8.pct : form.last5.pct) : null;

    // H2H advantage against likely opponents
    let h2hAdvantage = 0;
    for (const opp of likelyOpponents) {
      const record = getH2HRecord(pl.name, opp, frames);
      h2hAdvantage += record.wins - record.losses;
    }

    // Home/away performance
    const ha = frames.length > 0 ? calcPlayerHomeAway(pl.name, frames) : null;
    const homeAwayPct = ha ? (isHome ? ha.home.pct : ha.away.pct) : null;

    // Composite score: weighted blend using adjusted pct as base
    let score = pl.adjPct; // base: confidence-adjusted win%
    if (formPct !== null) score += (formPct - pl.adjPct) * 0.3; // form adjustment
    if (h2hAdvantage !== 0) score += h2hAdvantage * 5; // H2H bonus/penalty
    if (homeAwayPct !== null && ha) {
      const venue = isHome ? ha.home : ha.away;
      if (venue.p >= 3) score += (homeAwayPct - pl.adjPct) * 0.2; // venue adjustment
    }

    return {
      name: pl.name,
      score,
      formPct,
      h2hAdvantage,
      homeAwayPct,
      suggestedSet: 1 as 1 | 2, // will be assigned below
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // Assign top 5 to sets — check opponent's set bias
  const oppSetPerf = frames.length > 0 ? calcSetPerformance(opponent, frames) : null;
  const oppWeakerLate = oppSetPerf ? oppSetPerf.bias > 5 : false; // opponent stronger early = save best for late

  const set1: LineupScore[] = [];
  const set2: LineupScore[] = [];

  if (oppWeakerLate && scored.length >= 10) {
    // Opponent is front-loaded: save best for set 2
    scored.slice(0, 5).forEach(s => { s.suggestedSet = 2; set2.push(s); });
    scored.slice(5, 10).forEach(s => { s.suggestedSet = 1; set1.push(s); });
  } else {
    // Default: best in set 1
    scored.slice(0, 5).forEach(s => { s.suggestedSet = 1; set1.push(s); });
    scored.slice(5, 10).forEach(s => { s.suggestedSet = 2; set2.push(s); });
  }

  // Generate insights (using cached form data)
  const insights: string[] = [];
  const hotPlayers = scored.filter(s => {
    const f = formCache.get(s.name);
    return f && f.trend === 'hot';
  });
  const coldPlayers = scored.filter(s => {
    const f = formCache.get(s.name);
    return f && f.trend === 'cold';
  });

  const formatFormContext = (name: string): string => {
    const f = formCache.get(name);
    if (!f) return name;
    const useL8 = f.last8 && f.last8.p >= 6;
    const label = useL8 ? 'L8' : 'L5';
    const pct = useL8 ? f.last8!.pct : f.last5.pct;
    return `${name} (${label}: ${Math.round(pct)}% vs ${Math.round(f.seasonPct)}% season)`;
  };

  if (hotPlayers.length > 0) {
    insights.push(`In form: ${hotPlayers.slice(0, 3).map(p => formatFormContext(p.name)).join(', ')}`);
  }
  if (coldPlayers.length > 0) {
    insights.push(`Out of form: ${coldPlayers.slice(0, 3).map(p => formatFormContext(p.name)).join(', ')}`);
  }
  if (oppWeakerLate) {
    insights.push('Opponent is stronger in Set 1 — consider saving best players for Set 2');
  }
  const h2hStars = scored.filter(s => s.h2hAdvantage >= 2).slice(0, 3);
  if (h2hStars.length > 0) {
    insights.push(`H2H advantage: ${h2hStars.map(p => p.name + ' (+' + p.h2hAdvantage + ')').join(', ')}`);
  }
  if (excludedPlayers.length > 0) {
    insights.push(`Excluded (<5 games): ${excludedPlayers.join(', ')}`);
  }

  return { set1, set2, insights };
}
