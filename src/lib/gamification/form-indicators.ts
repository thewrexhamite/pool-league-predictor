/**
 * Form Indicators — compute FormIndicator[] for a claimed player.
 *
 * Uses existing analytics infrastructure:
 * - calcPlayerForm() from predictions/analytics
 * - ConsistencyMetrics from stats/career-stats
 * - calcClutchIndex() from stats/clutch-index
 * - calcBDStats() from predictions/analytics
 * - calcPlayerVenueBias() from stats/home-away-analytics
 */

import type { FormIndicator, TrendDirection } from './types';
import type { FrameData, Players2526Map, DivisionCode, MatchResult } from '../types';
import type { DataSources } from '../predictions/core';
import { calcPlayerForm, calcBDStats } from '../predictions/analytics';
import { calculateConsistencyMetrics, fetchPlayerCareerData } from '../stats/career-stats';
import { calcClutchIndex } from '../stats/clutch-index';
import { calcPlayerVenueBias } from '../stats/home-away-analytics';

function trendFromValue(current: number, baseline: number): TrendDirection {
  const diff = current - baseline;
  if (diff > 0.05) return 'improving';
  if (diff < -0.05) return 'declining';
  return 'stable';
}

function arrowFromTrend(trend: TrendDirection): '↑' | '→' | '↓' {
  if (trend === 'improving') return '↑';
  if (trend === 'declining') return '↓';
  return '→';
}

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Compute percentile of a value within an array.
 * Returns 0-100.
 */
function percentile(value: number, all: number[]): number {
  if (all.length === 0) return 50;
  const below = all.filter(v => v < value).length;
  return Math.round((below / all.length) * 100);
}

/**
 * Get division context string from percentile.
 */
function divisionContext(pct: number, division: string): string {
  if (pct >= 90) return `Top 10% in ${division}`;
  if (pct >= 75) return `Top 25% in ${division}`;
  if (pct >= 50) return `Top half of ${division}`;
  if (pct >= 25) return `Bottom half of ${division}`;
  return `Bottom 25% in ${division}`;
}

interface ComputeOptions {
  playerName: string;
  frames: FrameData[];
  results: MatchResult[];
  players2526: Players2526Map;
  division: DivisionCode;
  divisionPlayers: string[]; // all player names in division
  seasonPct: number; // 0-1 how far through season
  leagueId?: string;
}

/**
 * Compute all form indicators for a player.
 */
export async function computeFormIndicators(opts: ComputeOptions): Promise<FormIndicator[]> {
  const {
    playerName,
    frames,
    results,
    players2526,
    division,
    divisionPlayers,
    seasonPct,
  } = opts;

  const indicators: FormIndicator[] = [];

  // 1. Win Rate
  const form = calcPlayerForm(playerName, frames, seasonPct);
  if (form) {
    const myWinPct = form.current.last10.pct;
    const allWinPcts = divisionPlayers.map(p => {
      const f = calcPlayerForm(p, frames, seasonPct);
      return f?.current.last10.pct ?? 0;
    });
    const pct = percentile(myWinPct, allWinPcts);

    const trend = form.current.trend === 'hot' ? 'improving' as const
      : form.current.trend === 'cold' ? 'declining' as const
      : 'stable' as const;

    indicators.push({
      metric: 'Win Rate',
      trend,
      arrow: arrowFromTrend(trend),
      value: formatPct(myWinPct),
      rawValue: myWinPct,
      divisionContext: divisionContext(pct, division),
      percentile: pct,
    });
  }

  // 2. Consistency (from career stats if multi-season, else skip)
  try {
    if (opts.leagueId) {
      const seasons = await fetchPlayerCareerData(playerName, opts.leagueId);
      const consistency = calculateConsistencyMetrics(seasons);
      if (consistency) {
        const consistencyScore = 1 - consistency.winRateStdDev; // higher = more consistent
        const trend: TrendDirection = consistency.consistency === 'high' ? 'improving'
          : consistency.consistency === 'low' ? 'declining' : 'stable';

        indicators.push({
          metric: 'Consistency',
          trend,
          arrow: arrowFromTrend(trend),
          value: consistency.consistency.charAt(0).toUpperCase() + consistency.consistency.slice(1),
          rawValue: consistencyScore,
          divisionContext: consistency.consistency === 'high' ? 'Very steady performer' : 'Variable form',
          percentile: consistency.consistency === 'high' ? 85 : consistency.consistency === 'medium' ? 50 : 20,
        });
      }
    }
  } catch {
    // Career data unavailable, skip consistency
  }

  // 3. Match Impact (clutch)
  const clutch = calcClutchIndex(playerName, frames, results);
  if (clutch) {
    const allClutch = divisionPlayers.map(p => {
      const c = calcClutchIndex(p, frames, results);
      return c?.clutchRating ?? 0;
    });
    const pct = percentile(clutch.clutchRating, allClutch);
    const trend: TrendDirection = clutch.label === 'clutch' ? 'improving'
      : clutch.label === 'choke' ? 'declining' : 'stable';

    indicators.push({
      metric: 'Match Impact',
      trend,
      arrow: arrowFromTrend(trend),
      value: clutch.clutchRating >= 0 ? `+${clutch.clutchRating.toFixed(2)}` : clutch.clutchRating.toFixed(2),
      rawValue: clutch.clutchRating,
      divisionContext: divisionContext(pct, division),
      percentile: pct,
    });
  }

  // 4. BD Efficiency
  const bdStats = calcBDStats(playerName, null, players2526, division);
  if (bdStats && bdStats.bdFRate + bdStats.bdARate > 0) {
    const myEfficiency = bdStats.bdFRate / (bdStats.bdFRate + bdStats.bdARate);
    const allEfficiency = divisionPlayers.map(p => {
      const bd = calcBDStats(p, null, players2526, division);
      if (!bd || bd.bdFRate + bd.bdARate === 0) return 0;
      return bd.bdFRate / (bd.bdFRate + bd.bdARate);
    });
    const pct = percentile(myEfficiency, allEfficiency);

    indicators.push({
      metric: 'BD Efficiency',
      trend: pct >= 60 ? 'improving' : pct <= 30 ? 'declining' : 'stable',
      arrow: arrowFromTrend(pct >= 60 ? 'improving' : pct <= 30 ? 'declining' : 'stable'),
      value: formatPct(myEfficiency),
      rawValue: myEfficiency,
      divisionContext: divisionContext(pct, division),
      percentile: pct,
    });
  }

  // 5. Home/Away Split
  const venueBias = calcPlayerVenueBias(playerName, frames);
  if (venueBias && venueBias.homeGames + venueBias.awayGames >= 4) {
    const allBias = divisionPlayers.map(p => {
      const vb = calcPlayerVenueBias(p, frames);
      return vb.awayPct;
    });
    const pct = percentile(venueBias.awayPct, allBias);
    const trend: TrendDirection = Math.abs(venueBias.bias) < 0.1 ? 'stable'
      : venueBias.bias > 0 ? 'improving' : 'declining';

    indicators.push({
      metric: 'Home/Away',
      trend,
      arrow: arrowFromTrend(trend),
      value: `${formatPct(venueBias.homePct)} / ${formatPct(venueBias.awayPct)}`,
      rawValue: venueBias.awayPct,
      divisionContext: Math.abs(venueBias.bias) < 0.1
        ? 'Balanced home & away'
        : venueBias.bias > 0 ? 'Stronger at home' : 'Stronger away',
      percentile: pct,
    });
  }

  return indicators;
}

/**
 * Compute a single metric's percentile across the division.
 */
export function computeDivisionPercentile(
  playerValue: number,
  divisionValues: number[],
): number {
  return percentile(playerValue, divisionValues);
}
