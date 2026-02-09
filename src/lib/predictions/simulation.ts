import type {
  DivisionCode,
  StandingEntry,
  Fixture,
  SimulationResult,
  WhatIfResult,
  SquadOverrides,
  PredictionResult,
} from '../types';
import { predictFrame } from './matchup';
import { calcStandings, calcTeamStrength, type DataSources } from './core';
import { calcStrengthAdjustments } from './lineup';
import { getRemainingFixtures, getAllRemainingFixtures } from './fixtures';

// Optional data sources argument for dependency injection
export interface SimulationDataSources {
  divisions: Record<DivisionCode, { name: string; teams: string[] }>;
  results: Array<{ date: string; home: string; away: string; home_score: number; away_score: number; division: string; frames: number }>;
  fixtures: Fixture[];
}

// Re-export predictFrame for convenience
export { predictFrame };

/**
 * Simulates a single match (10 frames) using team strengths.
 * Each frame is simulated independently using the predictFrame probability.
 *
 * @param home - Home team name
 * @param away - Away team name
 * @param strengths - Map of team names to their strength values
 * @returns Tuple of [homeFrames, awayFrames]
 */
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

/**
 * Runs a full Monte Carlo season simulation (1000 iterations).
 * Applies what-if results first, then simulates remaining fixtures.
 * Tracks finish position probabilities for each team.
 *
 * @param div - Division code to simulate
 * @param strengths - Team strength map (with squad adjustments already applied)
 * @param currentStandings - Current standings map by team name
 * @param divTeams - Array of all teams in the division
 * @param fixtures - Remaining fixtures to simulate
 * @param whatIfResults - User-specified match results to apply
 * @returns Array of simulation results sorted by average points (descending)
 */
export function runSeasonSimulationCore(
  div: DivisionCode,
  strengths: Record<string, number>,
  currentStandings: Record<string, StandingEntry>,
  divTeams: string[],
  fixtures: Fixture[],
  whatIfResults: WhatIfResult[]
): SimulationResult[] {
  const N = 1000;
  const tracker: Record<string, { totalPts: number; positions: number[] }> = {};
  divTeams.forEach(t => {
    tracker[t] = { totalPts: 0, positions: Array(divTeams.length).fill(0) };
  });

  for (let sim = 0; sim < N; sim++) {
    const simStandings: Record<string, { pts: number; f: number; a: number }> = {};
    divTeams.forEach(t => {
      simStandings[t] = {
        pts: currentStandings[t].pts,
        f: currentStandings[t].f,
        a: currentStandings[t].a,
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
      currentPts: currentStandings[t].pts,
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

/**
 * Runs a quick Monte Carlo prediction for a single match (5000 iterations).
 * Generates win/draw/loss probabilities and most likely scorelines.
 *
 * @param p - Frame win probability for home team (from predictFrame)
 * @returns Prediction result with probabilities and top scorelines
 */
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

/**
 * Backward-compatible wrapper for runSeasonSimulation.
 * Maintains the original API that accepts squad overrides and computes
 * strengths/standings/fixtures internally.
 *
 * @param div - Division code to simulate
 * @param squadOverrides - Squad override configuration
 * @param squadTopN - Top N players to consider for squad strength
 * @param whatIfResults - User-specified match results to apply
 * @param ds - Optional data sources
 * @returns Array of simulation results sorted by average points (descending)
 */
export function runSeasonSimulation(
  div: DivisionCode,
  squadOverrides: SquadOverrides,
  squadTopN: number,
  whatIfResults: WhatIfResult[],
  ds?: DataSources
): SimulationResult[] {
  // Get default data sources if not provided
  const dataSources = ds ?? {
    divisions: {},
    results: [],
    fixtures: [],
    players: {},
    rosters: {},
    players2526: {},
  };

  // Extract division teams
  const divTeams = dataSources.divisions[div]?.teams || [];

  // Calculate team strengths and apply squad adjustments
  const strengths = calcTeamStrength(div, dataSources);
  const squadAdj = calcStrengthAdjustments(div, squadOverrides, squadTopN, dataSources);
  Object.entries(squadAdj).forEach(([t, adj]) => {
    if (strengths[t] !== undefined) strengths[t] += adj;
  });

  // Calculate current standings
  const current = calcStandings(div, dataSources);
  const currentMap: Record<string, StandingEntry> = {};
  current.forEach(s => {
    currentMap[s.team] = s;
  });

  // Get remaining fixtures
  const fixtures = getRemainingFixtures(div, dataSources);

  // Call the core simulation function
  return runSeasonSimulationCore(div, strengths, currentMap, divTeams, fixtures, whatIfResults);
}
