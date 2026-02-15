/**
 * Division Strength Calculator
 *
 * Calculates relative division strength within a league using bridge players
 * who appear in multiple divisions. When insufficient bridge player data exists,
 * falls back to configurable tier multipliers.
 */

import type { BridgePlayer, DivisionStrength } from '../types';
import type { LeagueData } from '../data-provider';

// Default division tier multipliers (fallback when insufficient bridge player data)
const DEFAULT_TIER_MULTIPLIERS: Record<string, number> = {
  PREM: 1.0,
  SD1: 0.92,
  D1: 0.85,
  WD1: 0.88,
  SD2: 0.78,
  D2: 0.72,
  WD2: 0.75,
  D3: 0.62,
  D4: 0.55,
  D5: 0.48,
  D6: 0.42,
  D7: 0.38,
};

/**
 * Calculate relative division strengths within a league using bridge players.
 *
 * Algorithm:
 * 1. Find bridge players with stats in 2+ divisions
 * 2. For each, compute win% difference between divisions
 * 3. Average the differences across all bridge players for each division pair
 * 4. Solve for division offsets (least-squares fit, anchored so mean = 0)
 * 5. Fall back to tier multipliers when confidence < 0.3
 */
export function calculateDivisionStrengths(
  leagueId: string,
  leagueData: LeagueData,
  bridgePlayers: BridgePlayer[]
): DivisionStrength[] {
  // Get all divisions in this league
  const divisionCodes = Object.keys(leagueData.divisions);
  if (divisionCodes.length === 0) return [];

  // Filter bridge players relevant to this league with 2+ division contexts
  const relevantBridge = bridgePlayers.filter(bp => {
    const leagueContexts = bp.contexts.filter(c => c.leagueId === leagueId);
    const divSet = new Set(leagueContexts.map(c => c.divisionCode));
    return divSet.size >= 2;
  });

  // Collect pairwise observations: for each bridge player,
  // the win% difference between each pair of divisions they play in
  const pairDiffs: Map<string, number[]> = new Map();
  let totalSamples = 0;

  for (const bp of relevantBridge) {
    const leagueContexts = bp.contexts.filter(c => c.leagueId === leagueId);

    for (let i = 0; i < leagueContexts.length; i++) {
      for (let j = i + 1; j < leagueContexts.length; j++) {
        const a = leagueContexts[i];
        const b = leagueContexts[j];

        // Need minimum games in each division for meaningful comparison
        if (a.stats.p < 3 || b.stats.p < 3) continue;

        const key = [a.divisionCode, b.divisionCode].sort().join(':');
        const diff = a.stats.pct - b.stats.pct; // positive = a is easier/player does better
        const existing = pairDiffs.get(key) || [];

        // Weight by confidence and games played
        const weight = bp.matchConfidence;
        existing.push(diff * weight);
        pairDiffs.set(key, existing);
        totalSamples += a.stats.p + b.stats.p;
      }
    }
  }

  // Solve for offsets using iterative averaging
  const offsets: Record<string, number> = {};
  for (const div of divisionCodes) {
    offsets[div] = 0;
  }

  if (pairDiffs.size > 0) {
    // Simple iterative solver: average pairwise differences to get offsets
    for (let iter = 0; iter < 20; iter++) {
      const newOffsets: Record<string, number> = {};
      for (const div of divisionCodes) {
        newOffsets[div] = 0;
      }

      const counts: Record<string, number> = {};
      for (const div of divisionCodes) {
        counts[div] = 0;
      }

      for (const [key, diffs] of pairDiffs) {
        const [divA, divB] = key.split(':');
        const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;

        // If players do better in divA, divB is stronger (or divA is weaker)
        // avgDiff > 0 means divA has higher win%, so divA is weaker
        if (divA in newOffsets && divB in newOffsets) {
          newOffsets[divA] -= avgDiff / 2;
          newOffsets[divB] += avgDiff / 2;
          counts[divA]++;
          counts[divB]++;
        }
      }

      // Apply with damping
      for (const div of divisionCodes) {
        if (counts[div] > 0) {
          offsets[div] = offsets[div] * 0.5 + (newOffsets[div] / counts[div]) * 0.5;
        }
      }

      // Re-center so mean = 0
      const mean = divisionCodes.reduce((s, d) => s + offsets[d], 0) / divisionCodes.length;
      for (const div of divisionCodes) {
        offsets[div] -= mean;
      }
    }
  }

  // Calculate confidence based on bridge player count
  const bridgeCount = relevantBridge.length;
  const dataConfidence = Math.min(1, bridgeCount / 10);

  return divisionCodes.map(divCode => {
    // If confidence is too low, blend with tier-based fallback
    let offset = offsets[divCode];

    if (dataConfidence < 0.3) {
      // Use tier multiplier as fallback
      const tierMultiplier = DEFAULT_TIER_MULTIPLIERS[divCode] ?? 0.5;
      // Convert multiplier to offset scale: 1.0 -> 0, 0.5 -> -25 (approx)
      const tierOffset = (tierMultiplier - 1.0) * 50;
      offset = tierOffset;
    } else if (dataConfidence < 1) {
      // Blend data-driven offset with tier fallback
      const tierMultiplier = DEFAULT_TIER_MULTIPLIERS[divCode] ?? 0.5;
      const tierOffset = (tierMultiplier - 1.0) * 50;
      offset = dataConfidence * offset + (1 - dataConfidence) * tierOffset;
    }

    return {
      divisionCode: divCode,
      leagueId,
      strengthOffset: offset,
      confidence: dataConfidence,
      bridgePlayerCount: bridgeCount,
      sampleSize: totalSamples,
    };
  });
}
