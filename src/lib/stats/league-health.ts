/**
 * League Health Metrics Module
 *
 * Competitiveness and parity measurement for divisions.
 */

import type { DivisionCode } from '../types';
import type { DataSources } from '../predictions/core';
import { calcStandings } from '../predictions/core';

export interface LeagueHealthData {
  competitivenessIndex: number; // 0-100, higher = more competitive
  parityIndex: number; // 0-100, higher = more parity
  pointsSpread: number; // pts difference between 1st and last
  avgPointsPerTeam: number;
  closeMatches: number; // matches decided by <= 2 frames
  totalMatches: number;
  closeMatchPct: number;
  topHeavy: boolean; // true if top 2 teams have disproportionate share
}

/**
 * Calculate competitiveness index for a division.
 * Based on points spread, standard deviation of points, and close match frequency.
 */
export function calcCompetitivenessIndex(
  div: DivisionCode,
  ds: DataSources
): LeagueHealthData {
  const standings = calcStandings(div, ds);

  if (standings.length === 0) {
    return {
      competitivenessIndex: 0,
      parityIndex: 0,
      pointsSpread: 0,
      avgPointsPerTeam: 0,
      closeMatches: 0,
      totalMatches: 0,
      closeMatchPct: 0,
      topHeavy: false,
    };
  }

  // Points stats
  const points = standings.map(s => s.pts);
  const maxPts = Math.max(...points);
  const minPts = Math.min(...points);
  const pointsSpread = maxPts - minPts;
  const avgPts = points.reduce((a, b) => a + b, 0) / points.length;

  // Standard deviation of points
  const variance = points.reduce((sum, p) => sum + Math.pow(p - avgPts, 2), 0) / points.length;
  const stdDev = Math.sqrt(variance);

  // Close matches (decided by <= 2 frames)
  const teams = new Set(ds.divisions[div]?.teams || []);
  const divResults = ds.results.filter(r => teams.has(r.home) && teams.has(r.away));
  const closeMatches = divResults.filter(r => Math.abs(r.home_score - r.away_score) <= 2).length;
  const totalMatches = divResults.length;
  const closeMatchPct = totalMatches > 0 ? (closeMatches / totalMatches) * 100 : 0;

  // Parity index: based on normalized standard deviation
  // Lower std dev relative to mean = more parity
  const coeffOfVariation = avgPts > 0 ? stdDev / avgPts : 1;
  const parityIndex = Math.max(0, Math.min(100, (1 - coeffOfVariation) * 100));

  // Competitiveness: combine parity and close match frequency
  const competitivenessIndex = Math.max(0, Math.min(100,
    parityIndex * 0.6 + closeMatchPct * 0.4
  ));

  // Top heavy: do top 2 teams have > 40% of all points?
  const top2Pts = standings.slice(0, 2).reduce((sum, s) => sum + s.pts, 0);
  const totalPts = points.reduce((a, b) => a + b, 0);
  const topHeavy = totalPts > 0 && (top2Pts / totalPts) > 0.4;

  return {
    competitivenessIndex,
    parityIndex,
    pointsSpread,
    avgPointsPerTeam: avgPts,
    closeMatches,
    totalMatches,
    closeMatchPct,
    topHeavy,
  };
}
