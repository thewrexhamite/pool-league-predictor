/**
 * League Strength Calculator
 *
 * Calculates relative league strength using cross-league bridge players.
 * Combines division-level offsets (from division-strength.ts) with cross-league
 * bridge player data to produce league-level strength offsets.
 */

import type {
  BridgePlayer,
  DivisionStrength,
  LeagueStrength,
  LeagueMeta,
} from '../types';
import type { LeagueData } from '../data-provider';
import { calculateDivisionStrengths } from './division-strength';

/**
 * Calculate relative league strengths across all loaded leagues.
 *
 * Algorithm:
 * 1. Find bridge players across leagues
 * 2. Normalize their within-league rating using division offsets
 * 3. Compute the average normalized rating difference between each league pair
 * 4. Solve for league offsets (same least-squares approach as division strength)
 */
export function calculateLeagueStrengths(
  multiLeagueData: Record<string, { meta: LeagueMeta; data: LeagueData }>,
  bridgePlayers: BridgePlayer[]
): LeagueStrength[] {
  const leagueIds = Object.keys(multiLeagueData);
  if (leagueIds.length === 0) return [];

  // Step 1: Calculate division strengths for each league
  const divStrengths: Record<string, DivisionStrength[]> = {};
  for (const leagueId of leagueIds) {
    const { data } = multiLeagueData[leagueId];
    divStrengths[leagueId] = calculateDivisionStrengths(leagueId, data, bridgePlayers);
  }

  // Helper: get division offset for a given league+division
  function getDivOffset(leagueId: string, divCode: string): number {
    const strengths = divStrengths[leagueId] || [];
    const match = strengths.find(s => s.divisionCode === divCode);
    return match ? match.strengthOffset : 0;
  }

  // Step 2: Find cross-league bridge players and compute pairwise differences
  const crossLeagueBridge = bridgePlayers.filter(bp => {
    const leagues = new Set(bp.contexts.map(c => c.leagueId));
    return leagues.size >= 2;
  });

  // Collect pairwise league differences using normalized ratings
  const pairDiffs: Map<string, number[]> = new Map();

  for (const bp of crossLeagueBridge) {
    // Group contexts by league
    const byLeague = new Map<string, typeof bp.contexts>();
    for (const ctx of bp.contexts) {
      const list = byLeague.get(ctx.leagueId) || [];
      list.push(ctx);
      byLeague.set(ctx.leagueId, list);
    }

    const leagueEntries = [...byLeague.entries()];
    for (let i = 0; i < leagueEntries.length; i++) {
      for (let j = i + 1; j < leagueEntries.length; j++) {
        const [leagueA, contextsA] = leagueEntries[i];
        const [leagueB, contextsB] = leagueEntries[j];

        // Compute normalized rating for each league (average across divisions)
        const normA = computeNormalizedRating(contextsA, leagueA, getDivOffset);
        const normB = computeNormalizedRating(contextsB, leagueB, getDivOffset);

        if (normA === null || normB === null) continue;

        const key = [leagueA, leagueB].sort().join(':');
        const diff = normA - normB; // positive = player does better in A
        const existing = pairDiffs.get(key) || [];
        existing.push(diff * bp.matchConfidence);
        pairDiffs.set(key, existing);
      }
    }
  }

  // Step 3: Solve for league offsets
  const offsets: Record<string, number> = {};
  for (const id of leagueIds) {
    offsets[id] = 0;
  }

  if (pairDiffs.size > 0) {
    for (let iter = 0; iter < 20; iter++) {
      const newOffsets: Record<string, number> = {};
      const counts: Record<string, number> = {};
      for (const id of leagueIds) {
        newOffsets[id] = 0;
        counts[id] = 0;
      }

      for (const [key, diffs] of pairDiffs) {
        const [leagueA, leagueB] = key.split(':');
        const avgDiff = diffs.reduce((s, d) => s + d, 0) / diffs.length;

        if (leagueA in newOffsets && leagueB in newOffsets) {
          // Player does better in A -> B is stronger (higher offset)
          newOffsets[leagueA] -= avgDiff / 2;
          newOffsets[leagueB] += avgDiff / 2;
          counts[leagueA]++;
          counts[leagueB]++;
        }
      }

      for (const id of leagueIds) {
        if (counts[id] > 0) {
          offsets[id] = offsets[id] * 0.5 + (newOffsets[id] / counts[id]) * 0.5;
        }
      }

      // Re-center
      const mean = leagueIds.reduce((s, id) => s + offsets[id], 0) / leagueIds.length;
      for (const id of leagueIds) {
        offsets[id] -= mean;
      }
    }
  }

  const bridgeCount = crossLeagueBridge.length;
  const confidence = Math.min(1, bridgeCount / 10);

  return leagueIds.map(leagueId => ({
    leagueId,
    strengthOffset: offsets[leagueId],
    confidence,
    bridgePlayerCount: bridgeCount,
    divisionStrengths: divStrengths[leagueId] || [],
  }));
}

/**
 * Compute a normalized rating for a player in a given league,
 * adjusting for division strength.
 */
function computeNormalizedRating(
  contexts: { leagueId: string; divisionCode: string; stats: { pct: number; p: number } }[],
  leagueId: string,
  getDivOffset: (leagueId: string, divCode: string) => number
): number | null {
  let totalGames = 0;
  let weightedPct = 0;

  for (const ctx of contexts) {
    if (ctx.stats.p < 3) continue;
    const divOffset = getDivOffset(leagueId, ctx.divisionCode);
    const adjusted = ctx.stats.pct + divOffset;
    weightedPct += adjusted * ctx.stats.p;
    totalGames += ctx.stats.p;
  }

  if (totalGames === 0) return null;
  return weightedPct / totalGames;
}
