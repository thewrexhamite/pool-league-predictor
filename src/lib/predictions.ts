import type {
  DivisionCode,
  StandingEntry,
  TeamPlayer,
  TeamResult,
  LeaguePlayer,
  PredictionResult,
  SimulationResult,
  WhatIfResult,
  SquadOverrides,
  PlayerTeamStats2526,
} from './types';
import {
  DIVISIONS,
  RESULTS,
  FIXTURES,
  PLAYERS,
  ROSTERS,
  PLAYERS_2526,
  HOME_ADV,
} from './data';

// Parse DD-MM-YYYY to comparable YYYY-MM-DD string
export function parseDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return parts[2] + '-' + parts[1] + '-' + parts[0];
}

// Find the latest result date for dynamic cutoff
export const LATEST_RESULT_DATE = RESULTS.reduce((max, r) => {
  const d = parseDate(r.date);
  return d > max ? d : max;
}, '0000-00-00');

export function getDiv(team: string): DivisionCode | null {
  for (const [div, data] of Object.entries(DIVISIONS)) {
    if (data.teams.includes(team)) return div as DivisionCode;
  }
  return null;
}

export function calcStandings(div: DivisionCode): StandingEntry[] {
  const teams = DIVISIONS[div].teams;
  const standings: Record<string, { p: number; w: number; d: number; l: number; f: number; a: number; pts: number }> = {};
  teams.forEach(t => {
    standings[t] = { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, pts: 0 };
  });

  RESULTS.forEach(r => {
    if (getDiv(r.home) !== div) return;
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

export function calcTeamStrength(div: DivisionCode): Record<string, number> {
  const standings = calcStandings(div);
  const strengths: Record<string, number> = {};
  standings.forEach(s => {
    strengths[s.team] = s.p > 0 ? (s.diff / s.p / 10) * 2 : 0;
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

export function getRemainingFixtures(div: DivisionCode) {
  return FIXTURES.filter(
    f => f.division === div && parseDate(f.date) > LATEST_RESULT_DATE
  );
}

export function getAllRemainingFixtures() {
  return FIXTURES.filter(f => parseDate(f.date) > LATEST_RESULT_DATE);
}

export function getTeamResults(team: string): TeamResult[] {
  return RESULTS.filter(r => r.home === team || r.away === team)
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

export function getTeamPlayers(team: string): TeamPlayer[] {
  const div = getDiv(team);
  if (!div) return [];
  const rosterKey = div + ':' + team;
  const roster = ROSTERS[rosterKey];
  if (!roster) return [];

  const players2526: Record<string, PlayerTeamStats2526> = {};
  for (const [name, data] of Object.entries(PLAYERS_2526)) {
    const teamEntry = data.teams.find(t => t.team === team);
    if (teamEntry) players2526[name] = teamEntry;
  }

  const allNames = new Set(roster);
  Object.keys(players2526).forEach(n => allNames.add(n));

  return [...allNames]
    .map(name => ({
      name,
      rating: PLAYERS[name] ? PLAYERS[name].r : null,
      winPct: PLAYERS[name] ? PLAYERS[name].w : null,
      played: PLAYERS[name] ? PLAYERS[name].p : null,
      s2526: players2526[name] || null,
      rostered: roster.includes(name),
    }))
    .sort((a, b) => {
      const aP = a.s2526 ? a.s2526.p : 0;
      const bP = b.s2526 ? b.s2526.p : 0;
      if (bP >= 5 && aP < 5) return 1;
      if (aP >= 5 && bP < 5) return -1;
      if (aP >= 5 && bP >= 5) return (b.s2526!.pct - a.s2526!.pct);
      return (b.rating || -999) - (a.rating || -999);
    });
}

export function getPlayerStats(name: string) {
  const data = PLAYERS[name];
  if (!data) return null;
  return { name, rating: data.r, winPct: data.w, played: data.p };
}

export function getPlayerTeams(name: string) {
  const teams: { div: string; team: string }[] = [];
  for (const [key, roster] of Object.entries(ROSTERS)) {
    if (roster.includes(name)) {
      const parts = key.split(':');
      teams.push({ div: parts[0], team: parts.slice(1).join(':') });
    }
  }
  return teams;
}

export function getPlayerStats2526(name: string) {
  const data = PLAYERS_2526[name];
  if (!data) return null;
  return data;
}

export function getTeamPlayers2526(team: string) {
  const players: Array<{ name: string } & PlayerTeamStats2526 & { total: { p: number; w: number; pct: number } }> = [];
  for (const [name, data] of Object.entries(PLAYERS_2526)) {
    const teamEntry = data.teams.find(t => t.team === team);
    if (teamEntry) {
      players.push({ name, ...teamEntry, total: data.total });
    }
  }
  return players.sort((a, b) => b.pct - a.pct);
}

// Get effective win% for a player (25/26 preferred, 24/25 fallback)
export function getPlayerEffectivePct(pl: TeamPlayer): { pct: number; weight: number } | null {
  if (pl.s2526 && pl.s2526.p >= 3) return { pct: pl.s2526.pct / 100, weight: pl.s2526.p };
  if (pl.winPct !== null && pl.played !== null && pl.played > 0) return { pct: pl.winPct, weight: pl.played };
  return null;
}

// Filter to top N players by effective win%
export function getTopNPlayers(players: TeamPlayer[], n: number) {
  const withStats = players
    .map(pl => ({ ...pl, eff: getPlayerEffectivePct(pl) }))
    .filter(pl => pl.eff !== null);
  withStats.sort((a, b) => b.eff!.pct - a.eff!.pct);
  return withStats.slice(0, n);
}

// Squad Builder strength calculations
const SQUAD_STRENGTH_SCALING = 4.0;

export function calcSquadStrength(team: string, topN?: number): number | null {
  const players = getTeamPlayers(team);
  if (players.length === 0) return null;
  const pool = topN
    ? getTopNPlayers(players, topN)
    : players.map(pl => ({ ...pl, eff: getPlayerEffectivePct(pl) }));
  let totalWeight = 0;
  let weightedPct = 0;
  pool.forEach(pl => {
    const e = pl.eff || getPlayerEffectivePct(pl);
    if (e) {
      weightedPct += e.pct * e.weight;
      totalWeight += e.weight;
    }
  });
  return totalWeight === 0 ? null : weightedPct / totalWeight;
}

export function calcModifiedSquadStrength(
  team: string,
  overrides: SquadOverrides,
  topN?: number
): number | null {
  const override = overrides[team];
  if (!override) return calcSquadStrength(team, topN);
  const basePlayers = getTeamPlayers(team);
  const removedSet = new Set(override.removed || []);
  const players: TeamPlayer[] = basePlayers.filter(pl => !removedSet.has(pl.name));
  (override.added || []).forEach(name => {
    const s2526 = PLAYERS_2526[name];
    const s2425 = PLAYERS[name];
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
      weightedPct += e.pct * e.weight;
      totalWeight += e.weight;
    }
  });
  return totalWeight === 0 ? null : weightedPct / totalWeight;
}

export function calcStrengthAdjustments(
  div: DivisionCode,
  overrides: SquadOverrides,
  topN?: number
): Record<string, number> {
  const adjustments: Record<string, number> = {};
  DIVISIONS[div].teams.forEach(team => {
    if (!overrides[team]) return;
    const orig = calcSquadStrength(team, topN);
    const mod = calcModifiedSquadStrength(team, overrides, topN);
    if (orig !== null && mod !== null) {
      adjustments[team] = (mod - orig) * SQUAD_STRENGTH_SCALING;
    }
  });
  return adjustments;
}

export function getAllLeaguePlayers(): LeaguePlayer[] {
  const allNames = new Set([...Object.keys(PLAYERS), ...Object.keys(PLAYERS_2526)]);
  return [...allNames]
    .map(name => {
      const s2425 = PLAYERS[name];
      const s2526 = PLAYERS_2526[name];
      return {
        name,
        rating: s2425 ? s2425.r : null,
        teams2526: s2526 ? s2526.teams.map(t => t.team) : [],
        totalPct2526: s2526 ? s2526.total.pct : null,
        totalPlayed2526: s2526 ? s2526.total.p : null,
      };
    })
    .sort((a, b) => (b.totalPct2526 || 0) - (a.totalPct2526 || 0));
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
  whatIfResults: WhatIfResult[]
): SimulationResult[] {
  const divTeams = DIVISIONS[div].teams;
  const strengths = calcTeamStrength(div);
  const squadAdj = calcStrengthAdjustments(div, squadOverrides, squadTopN);
  Object.entries(squadAdj).forEach(([t, adj]) => {
    if (strengths[t] !== undefined) strengths[t] += adj;
  });
  const current = calcStandings(div);
  const currentMap: Record<string, StandingEntry> = {};
  current.forEach(s => {
    currentMap[s.team] = s;
  });

  const fixtures = getRemainingFixtures(div);
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
