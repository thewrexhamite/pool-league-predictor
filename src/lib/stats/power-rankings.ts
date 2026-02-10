/**
 * Power Rankings Module
 *
 * Algorithmic team ranking using form, margin of victory, strength of schedule,
 * and trajectory. Different from the points-based standings table.
 */

import type { DivisionCode, PowerRanking, FrameData } from '../types';
import type { DataSources } from '../predictions/core';
import { calcStandings, calcTeamStrength } from '../predictions/core';
import { getTeamResults } from '../predictions/fixtures';

/**
 * Calculate power rankings for all teams in a division.
 *
 * score = 0.30 * normalizedPoints
 *       + 0.25 * formScore        (last 5 matches, weighted recency)
 *       + 0.20 * marginOfVictory  (avg frame diff, normalized)
 *       + 0.15 * sosScore          (avg opponent strength faced)
 *       + 0.10 * trajectory        (current form vs season avg)
 */
export function calcPowerRankings(
  div: DivisionCode,
  ds: DataSources,
  _frames: FrameData[],
  previousRankings?: PowerRanking[]
): PowerRanking[] {
  const standings = calcStandings(div, ds);
  const strengths = calcTeamStrength(div, ds);

  if (standings.length === 0) return [];

  // Normalize points to 0-1 range
  const maxPts = Math.max(...standings.map(s => s.pts), 1);

  // Build previous rank lookup
  const prevRankMap = new Map<string, number>();
  if (previousRankings) {
    for (const pr of previousRankings) {
      prevRankMap.set(pr.team, pr.rank);
    }
  }

  const entries: { team: string; score: number; components: PowerRanking['components'] }[] = [];

  for (const s of standings) {
    const teamResults = getTeamResults(s.team, ds);
    const gamesPlayed = teamResults.length;

    // 1. Normalized points (0-1)
    const normalizedPoints = maxPts > 0 ? s.pts / maxPts : 0;

    // 2. Form score (last 5 matches, weighted by recency)
    const last5 = teamResults.slice(0, 5);
    let formWeightedSum = 0;
    let formWeightTotal = 0;
    last5.forEach((r, idx) => {
      const weight = 5 - idx; // 5, 4, 3, 2, 1
      const value = r.result === 'W' ? 1 : r.result === 'D' ? 0.4 : 0;
      formWeightedSum += value * weight;
      formWeightTotal += weight;
    });
    const formScore = formWeightTotal > 0 ? formWeightedSum / formWeightTotal : 0.5;

    // 3. Margin of victory (average frame diff, normalized)
    let totalFrameDiff = 0;
    for (const r of teamResults) {
      totalFrameDiff += r.teamScore - r.oppScore;
    }
    const avgFrameDiff = gamesPlayed > 0 ? totalFrameDiff / gamesPlayed : 0;
    // Normalize to roughly 0-1 range (typical frame diff is -10 to +10)
    const movNormalized = Math.max(0, Math.min(1, (avgFrameDiff + 10) / 20));

    // 4. Strength of schedule (avg opponent strength faced)
    let totalOppStrength = 0;
    let oppCount = 0;
    for (const r of teamResults) {
      if (strengths[r.opponent] !== undefined) {
        totalOppStrength += strengths[r.opponent];
        oppCount++;
      }
    }
    const avgOppStrength = oppCount > 0 ? totalOppStrength / oppCount : 0;
    // Normalize strength (typically -1 to 1) to 0-1
    const sosScore = Math.max(0, Math.min(1, (avgOppStrength + 1) / 2));

    // 5. Trajectory (current form vs season average)
    const seasonWinPct = gamesPlayed > 0
      ? teamResults.filter(r => r.result === 'W').length / gamesPlayed
      : 0.5;
    const recentWinPct = last5.length > 0
      ? last5.filter(r => r.result === 'W').length / last5.length
      : 0.5;
    // Trajectory is how much current form exceeds/falls below season average
    // Normalize from range [-1, 1] to [0, 1]
    const trajectoryRaw = recentWinPct - seasonWinPct;
    const trajectory = Math.max(0, Math.min(1, (trajectoryRaw + 1) / 2));

    // Combined score
    const score =
      0.30 * normalizedPoints +
      0.25 * formScore +
      0.20 * movNormalized +
      0.15 * sosScore +
      0.10 * trajectory;

    entries.push({
      team: s.team,
      score,
      components: {
        points: normalizedPoints,
        form: formScore,
        mov: movNormalized,
        sos: sosScore,
        trajectory,
      },
    });
  }

  // Sort by score descending
  entries.sort((a, b) => b.score - a.score);

  return entries.map((e, idx) => ({
    team: e.team,
    rank: idx + 1,
    previousRank: prevRankMap.get(e.team) ?? null,
    score: e.score,
    components: e.components,
  }));
}
