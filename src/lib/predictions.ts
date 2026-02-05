import type {
  DivisionCode,
  Divisions,
  StandingEntry,
  MatchResult,
  Fixture,
  TeamPlayer,
  TeamResult,
  LeaguePlayer,
  PredictionResult,
  SimulationResult,
  WhatIfResult,
  SquadOverrides,
  PlayersMap,
  RostersMap,
  Players2526Map,
  PlayerTeamStats2526,
  FrameData,
  PlayerFormData,
  HomeAwaySplit,
  TeamHomeAwaySplit,
  H2HRecord,
  SetPerformance,
  BDStats,
  PlayerAppearance,
  PredictedLineup,
  FixtureImportance,
  ScoutingReport,
  LineupScore,
  LineupSuggestion,
  EffectivePct,
} from './types';
import {
  DIVISIONS as STATIC_DIVISIONS,
  RESULTS as STATIC_RESULTS,
  FIXTURES as STATIC_FIXTURES,
  PLAYERS as STATIC_PLAYERS,
  ROSTERS as STATIC_ROSTERS,
  PLAYERS_2526 as STATIC_PLAYERS_2526,
  HOME_ADV,
} from './data';

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
    divisions: STATIC_DIVISIONS,
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
export const LATEST_RESULT_DATE = STATIC_RESULTS.reduce((max, r) => {
  const d = parseDate(r.date);
  return d > max ? d : max;
}, '0000-00-00');

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
  const divisions = ds?.divisions ?? STATIC_DIVISIONS;
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

export function predictFrame(homeStr: number, awayStr: number): number {
  const adjH = homeStr + HOME_ADV;
  return 1 / (1 + Math.exp(-(adjH - awayStr)));
}

export function simulateMatch(
  home: string,
  away: string,
  strengths: Record<string, number>
): [number, number] {
  const p = predictFrame(strengths[home] || 0, strengths[away] || 0);
  let hf = 0;
  for (let i = 0; i < 10; i++) if (Math.random() < p) hf++;
  return [hf, 10 - hf];
}

export function getRemainingFixtures(div: DivisionCode, ds?: DataSources) {
  const { fixtures, results } = ds ?? defaults();
  const latestDate = getLatestResultDate(results);
  return fixtures.filter(
    f => f.division === div && parseDate(f.date) > latestDate
  );
}

export function getAllRemainingFixtures(ds?: DataSources) {
  const { fixtures, results } = ds ?? defaults();
  const latestDate = getLatestResultDate(results);
  return fixtures.filter(f => parseDate(f.date) > latestDate);
}

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
      const aP = a.s2526 ? a.s2526.p : 0;
      const bP = b.s2526 ? b.s2526.p : 0;
      if (bP >= 5 && aP < 5) return 1;
      if (aP >= 5 && bP < 5) return -1;
      if (aP >= 5 && bP >= 5) {
        const aAdj = calcBayesianPct(a.s2526!.w, a.s2526!.p);
        const bAdj = calcBayesianPct(b.s2526!.w, b.s2526!.p);
        return bAdj - aAdj;
      }
      return (b.rating || -999) - (a.rating || -999);
    });
}

export function getPlayerStats(name: string, ds?: DataSources) {
  const { players } = ds ?? defaults();
  const data = players[name];
  if (!data) return null;
  return { name, rating: data.r, winPct: data.w, played: data.p };
}

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

export function getPlayerStats2526(name: string, ds?: DataSources) {
  const { players2526 } = ds ?? defaults();
  const data = players2526[name];
  if (!data) return null;
  return data;
}

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

// Get effective win% for a player (25/26 preferred, 24/25 fallback)
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

// Filter to top N players by adjusted effective win%
export function getTopNPlayers(players: TeamPlayer[], n: number) {
  const withStats = players
    .map(pl => ({ ...pl, eff: getPlayerEffectivePct(pl) }))
    .filter(pl => pl.eff !== null);
  withStats.sort((a, b) => b.eff!.adjPct - a.eff!.adjPct);
  return withStats.slice(0, n);
}

// Squad Builder strength calculations
const SQUAD_STRENGTH_SCALING = 4.0;

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

export function calcModifiedSquadStrength(
  team: string,
  overrides: SquadOverrides,
  topN?: number,
  ds?: DataSources
): number | null {
  const src = ds ?? defaults();
  const override = overrides[team];
  if (!override) return calcSquadStrength(team, topN, ds);
  const basePlayers = getTeamPlayers(team, ds);
  const removedSet = new Set(override.removed || []);
  const players: TeamPlayer[] = basePlayers.filter(pl => !removedSet.has(pl.name));
  (override.added || []).forEach(name => {
    const s2526 = src.players2526[name];
    const s2425 = src.players[name];
    let bestTeamEntry: PlayerTeamStats2526 | null = null;
    if (s2526) {
      bestTeamEntry = s2526.teams.reduce<PlayerTeamStats2526 | null>(
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

export function calcStrengthAdjustments(
  div: DivisionCode,
  overrides: SquadOverrides,
  topN?: number,
  ds?: DataSources
): Record<string, number> {
  const { divisions } = ds ?? defaults();
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

// Run a quick 5000-sim prediction
export function runPredSim(p: number): PredictionResult {
  let hw = 0;
  let dr = 0;
  let aw = 0;
  const scores: Record<string, number> = {};
  for (let i = 0; i < 5000; i++) {
    let hf = 0;
    for (let j = 0; j < 10; j++) if (Math.random() < p) hf++;
    const af = 10 - hf;
    if (hf > af) hw++;
    else if (hf < af) aw++;
    else dr++;
    const key = hf + '-' + af;
    scores[key] = (scores[key] || 0) + 1;
  }
  const topScores = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([s, c]) => ({ score: s, pct: (c / 50).toFixed(1) }));
  return {
    pHomeWin: (hw / 50).toFixed(1),
    pDraw: (dr / 50).toFixed(1),
    pAwayWin: (aw / 50).toFixed(1),
    expectedHome: (p * 10).toFixed(1),
    expectedAway: ((1 - p) * 10).toFixed(1),
    topScores,
  };
}

// Run full season simulation
export function runSeasonSimulation(
  div: DivisionCode,
  squadOverrides: SquadOverrides,
  squadTopN: number,
  whatIfResults: WhatIfResult[],
  ds?: DataSources
): SimulationResult[] {
  const { divisions } = ds ?? defaults();
  const divTeams = divisions[div].teams;
  const strengths = calcTeamStrength(div, ds);
  const squadAdj = calcStrengthAdjustments(div, squadOverrides, squadTopN, ds);
  Object.entries(squadAdj).forEach(([t, adj]) => {
    if (strengths[t] !== undefined) strengths[t] += adj;
  });
  const current = calcStandings(div, ds);
  const currentMap: Record<string, StandingEntry> = {};
  current.forEach(s => {
    currentMap[s.team] = s;
  });

  const fixtures = getRemainingFixtures(div, ds);
  const N = 1000;
  const tracker: Record<string, { totalPts: number; positions: number[] }> = {};
  divTeams.forEach(t => {
    tracker[t] = { totalPts: 0, positions: Array(divTeams.length).fill(0) };
  });

  for (let sim = 0; sim < N; sim++) {
    const simStandings: Record<string, { pts: number; f: number; a: number }> = {};
    divTeams.forEach(t => {
      simStandings[t] = {
        pts: currentMap[t].pts,
        f: currentMap[t].f,
        a: currentMap[t].a,
      };
    });

    // Apply What-If results first
    whatIfResults.forEach(wi => {
      if (!divTeams.includes(wi.home) || !divTeams.includes(wi.away)) return;
      simStandings[wi.home].f += wi.homeScore;
      simStandings[wi.home].a += wi.awayScore;
      simStandings[wi.away].f += wi.awayScore;
      simStandings[wi.away].a += wi.homeScore;
      if (wi.homeScore > wi.awayScore) simStandings[wi.home].pts += 2;
      else if (wi.homeScore < wi.awayScore) simStandings[wi.away].pts += 3;
      else {
        simStandings[wi.home].pts++;
        simStandings[wi.away].pts++;
      }
    });

    const whatIfKeys = new Set(whatIfResults.map(wi => wi.home + ':' + wi.away));
    fixtures.forEach(fix => {
      if (!divTeams.includes(fix.home) || !divTeams.includes(fix.away)) return;
      if (whatIfKeys.has(fix.home + ':' + fix.away)) return;
      const [hs, as2] = simulateMatch(fix.home, fix.away, strengths);
      simStandings[fix.home].f += hs;
      simStandings[fix.home].a += as2;
      simStandings[fix.away].f += as2;
      simStandings[fix.away].a += hs;
      if (hs > as2) simStandings[fix.home].pts += 2;
      else if (hs < as2) simStandings[fix.away].pts += 3;
      else {
        simStandings[fix.home].pts++;
        simStandings[fix.away].pts++;
      }
    });

    const ranked = divTeams.slice().sort(
      (a, b) =>
        simStandings[b].pts - simStandings[a].pts ||
        simStandings[b].f - simStandings[b].a - (simStandings[a].f - simStandings[a].a)
    );
    ranked.forEach((t, pos) => {
      tracker[t].positions[pos]++;
      tracker[t].totalPts += simStandings[t].pts;
    });
  }

  return divTeams
    .map(t => ({
      team: t,
      currentPts: currentMap[t].pts,
      avgPts: (tracker[t].totalPts / N).toFixed(1),
      pTitle: ((tracker[t].positions[0] / N) * 100).toFixed(1),
      pTop2: (((tracker[t].positions[0] + tracker[t].positions[1]) / N) * 100).toFixed(1),
      pBot2: (
        ((tracker[t].positions[divTeams.length - 1] + tracker[t].positions[divTeams.length - 2]) /
          N) *
        100
      ).toFixed(1),
    }))
    .sort((a, b) => parseFloat(b.avgPts) - parseFloat(a.avgPts));
}

// ── Feature 5: Break & Dish Intelligence ──

export function calcBDStats(stats: PlayerTeamStats2526): BDStats {
  const p = stats.p || 1;
  return {
    bdFRate: stats.bdF / p,
    bdARate: stats.bdA / p,
    netBD: stats.bdF - stats.bdA,
    forfRate: stats.forf / p,
  };
}

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

// ── Feature 2: Home/Away Performance Split ──

export function calcTeamHomeAway(team: string, results: MatchResult[]): TeamHomeAwaySplit {
  const home = { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, winPct: 0 };
  const away = { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, winPct: 0 };
  for (const r of results) {
    if (r.home === team) {
      home.p++;
      home.f += r.home_score;
      home.a += r.away_score;
      if (r.home_score > r.away_score) home.w++;
      else if (r.home_score < r.away_score) home.l++;
      else home.d++;
    } else if (r.away === team) {
      away.p++;
      away.f += r.away_score;
      away.a += r.home_score;
      if (r.away_score > r.home_score) away.w++;
      else if (r.away_score < r.home_score) away.l++;
      else away.d++;
    }
  }
  home.winPct = home.p > 0 ? (home.w / home.p) * 100 : 0;
  away.winPct = away.p > 0 ? (away.w / away.p) * 100 : 0;
  return { home, away };
}

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

// ── Feature 1: Player Form Trend ──

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

export function calcPlayerForm(player: string, frames: FrameData[]): PlayerFormData | null {
  const history = getPlayerFrameHistory(player, frames);
  if (history.length === 0) return null;
  const last5 = history.slice(0, 5);
  const last10 = history.slice(0, 10);
  const l5w = last5.filter(h => h.won).length;
  const l10w = last10.filter(h => h.won).length;
  const totalW = history.filter(h => h.won).length;
  const seasonPct = (totalW / history.length) * 100;
  const l5pct = last5.length > 0 ? (l5w / last5.length) * 100 : 0;

  let trend: 'hot' | 'cold' | 'steady' = 'steady';
  if (last5.length >= 3) {
    if (l5pct > seasonPct + 15) trend = 'hot';
    else if (l5pct < seasonPct - 15) trend = 'cold';
  }

  return {
    last5: { p: last5.length, w: l5w, pct: l5pct },
    last10: { p: last10.length, w: l10w, pct: last10.length > 0 ? (l10w / last10.length) * 100 : 0 },
    seasonPct,
    trend,
  };
}

// ── Feature 4: Set 1 vs Set 2 Analysis ──

export function calcSetPerformance(team: string, frames: FrameData[]): SetPerformance {
  const set1 = { won: 0, played: 0, pct: 0 };
  const set2 = { won: 0, played: 0, pct: 0 };
  for (const match of frames) {
    const isHome = match.home === team;
    const isAway = match.away === team;
    if (!isHome && !isAway) continue;
    for (const f of match.frames) {
      const inSet1 = f.frameNum <= 5;
      const target = inSet1 ? set1 : set2;
      target.played++;
      const won = (isHome && f.winner === 'home') || (isAway && f.winner === 'away');
      if (won) target.won++;
    }
  }
  set1.pct = set1.played > 0 ? (set1.won / set1.played) * 100 : 0;
  set2.pct = set2.played > 0 ? (set2.won / set2.played) * 100 : 0;
  return { set1, set2, bias: set1.pct - set2.pct };
}

// ── Feature 3: Head-to-Head Matchup Lookup ──

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

// ── Feature 6: Opponent Appearance Frequency & Lineup Prediction ──

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

// ── Feature 7: Must-Win Fixture Identifier ──

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

// ── Feature 8: Pre-Match Scouting Report ──

export function generateScoutingReport(
  opponent: string,
  frames: FrameData[],
  results: MatchResult[],
  players2526: Players2526Map
): ScoutingReport {
  // Team form (last 5 results)
  const oppResults = results
    .filter(r => r.home === opponent || r.away === opponent)
    .sort((a, b) => parseDate(b.date).localeCompare(parseDate(a.date)));
  const teamForm = oppResults.slice(0, 5).map(r => {
    if (r.home === opponent) {
      return r.home_score > r.away_score ? 'W' as const : r.home_score < r.away_score ? 'L' as const : 'D' as const;
    }
    return r.away_score > r.home_score ? 'W' as const : r.away_score < r.home_score ? 'L' as const : 'D' as const;
  });

  const homeAway = calcTeamHomeAway(opponent, results);
  const setPerformance = frames.length > 0 ? calcSetPerformance(opponent, frames) : null;
  const bdStats = calcTeamBDStats(opponent, players2526);
  const predictedLineupData = predictLineup(opponent, frames);

  // Strongest/weakest players (from 2526 stats, min 3 games)
  const oppPlayers: { name: string; pct: number; adjPct: number; p: number }[] = [];
  for (const [name, data] of Object.entries(players2526)) {
    const entry = data.teams.find(t => t.team === opponent);
    if (entry && entry.p >= 3) {
      oppPlayers.push({ name, pct: entry.pct, adjPct: calcBayesianPct(entry.w, entry.p), p: entry.p });
    }
  }
  oppPlayers.sort((a, b) => b.adjPct - a.adjPct);

  // Total forfeits / total games
  let totalForf = 0;
  let totalGames = 0;
  for (const data of Object.values(players2526)) {
    const entry = data.teams.find(t => t.team === opponent);
    if (entry) {
      totalForf += entry.forf;
      totalGames += entry.p;
    }
  }

  return {
    opponent,
    teamForm,
    homeAway,
    setPerformance,
    bdStats,
    predictedLineup: predictedLineupData,
    strongestPlayers: oppPlayers.slice(0, 3),
    weakestPlayers: oppPlayers.slice(-3).reverse(),
    forfeitRate: totalGames > 0 ? totalForf / totalGames : 0,
  };
}

// ── Feature 9: Optimal Lineup Suggester ──

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

  // Score each player
  const scored: LineupScore[] = myPlayers.map(pl => {
    // Form component
    const form = frames.length > 0 ? calcPlayerForm(pl.name, frames) : null;
    const formPct = form ? form.last5.pct : null;

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

  // Generate insights
  const insights: string[] = [];
  const hotPlayers = scored.filter(s => {
    const f = frames.length > 0 ? calcPlayerForm(s.name, frames) : null;
    return f && f.trend === 'hot';
  });
  const coldPlayers = scored.filter(s => {
    const f = frames.length > 0 ? calcPlayerForm(s.name, frames) : null;
    return f && f.trend === 'cold';
  });

  if (hotPlayers.length > 0) {
    insights.push(`In form: ${hotPlayers.slice(0, 3).map(p => p.name).join(', ')}`);
  }
  if (coldPlayers.length > 0) {
    insights.push(`Out of form: ${coldPlayers.slice(0, 3).map(p => p.name).join(', ')}`);
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

export { STATIC_DIVISIONS as DIVISIONS };
export const DIVISION_CODES: DivisionCode[] = ['SD1', 'SD2', 'WD1', 'WD2'];
