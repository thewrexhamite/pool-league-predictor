/**
 * Strength of Schedule Module
 *
 * Rate remaining schedule difficulty. Show "toughest remaining" vs "easiest path".
 */

import type { DivisionCode, SOSEntry } from '../types';
import type { DataSources } from '../predictions/core';
import { calcTeamStrength } from '../predictions/core';
import { getTeamResults, getRemainingFixtures } from '../predictions/fixtures';

/**
 * Calculate strength of schedule for a single team.
 */
export function calcScheduleStrength(
  team: string,
  div: DivisionCode,
  ds: DataSources
): { completedSOS: number; remainingSOS: number; combinedSOS: number } {
  const strengths = calcTeamStrength(div, ds);
  const teamResults = getTeamResults(team, ds);
  const remaining = getRemainingFixtures(div, ds);

  // Completed SOS: average strength of opponents already faced
  let completedTotal = 0;
  let completedCount = 0;
  for (const r of teamResults) {
    if (strengths[r.opponent] !== undefined) {
      completedTotal += strengths[r.opponent];
      completedCount++;
    }
  }
  const completedSOS = completedCount > 0 ? completedTotal / completedCount : 0;

  // Remaining SOS: average strength of future opponents
  const teamRemaining = remaining.filter(f => f.home === team || f.away === team);
  let remainingTotal = 0;
  let remainingCount = 0;
  for (const f of teamRemaining) {
    const opponent = f.home === team ? f.away : f.home;
    if (strengths[opponent] !== undefined) {
      remainingTotal += strengths[opponent];
      remainingCount++;
    }
  }
  const remainingSOS = remainingCount > 0 ? remainingTotal / remainingCount : 0;

  // Combined: weighted by proportion of games
  const totalGames = completedCount + remainingCount;
  const combinedSOS = totalGames > 0
    ? (completedTotal + remainingTotal) / totalGames
    : 0;

  return { completedSOS, remainingSOS, combinedSOS };
}

/**
 * Calculate SOS for all teams in a division, ranked by remaining difficulty.
 */
export function calcAllTeamsSOS(
  div: DivisionCode,
  ds: DataSources
): SOSEntry[] {
  const teams = ds.divisions[div]?.teams || [];
  const entries: SOSEntry[] = [];

  for (const team of teams) {
    const sos = calcScheduleStrength(team, div, ds);
    entries.push({
      team,
      completedSOS: sos.completedSOS,
      remainingSOS: sos.remainingSOS,
      combinedSOS: sos.combinedSOS,
      rank: 0,
    });
  }

  // Rank by remaining SOS (hardest = rank 1)
  entries.sort((a, b) => b.remainingSOS - a.remainingSOS);
  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries;
}
