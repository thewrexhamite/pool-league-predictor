/**
 * Insight Engine — replaces achievement-engine.
 *
 * Core computation for form indicators, division percentiles, and label evaluation.
 * Orchestrates the analytics modules into player insights.
 */

import type { FormIndicator, PlayerLabel } from './types';
import type { FrameData, Players2526Map, DivisionCode, MatchResult } from '../types';
import type { LabelContext } from './labels';
import { computeFormIndicators } from './form-indicators';
import { evaluateLabels } from './labels';
import { calcPlayerForm } from '../predictions/analytics';
import { calcClutchIndex } from '../stats/clutch-index';
import { calcPlayerVenueBias } from '../stats/home-away-analytics';
import { calcBDStats } from '../predictions/analytics';

interface InsightComputeOptions {
  playerName: string;
  frames: FrameData[];
  results: MatchResult[];
  players2526: Players2526Map;
  division: DivisionCode;
  divisionPlayers: string[];
  seasonPct: number;
  leagueId?: string;
  existingLabels?: PlayerLabel[];
  // Extra context for labels
  isCaptain?: boolean;
  lineupOptimizerUses?: number;
  scoutingReportsViewed?: number;
}

/**
 * Compute form indicators for a player.
 */
export async function computePlayerFormIndicators(
  opts: InsightComputeOptions,
): Promise<FormIndicator[]> {
  return computeFormIndicators({
    playerName: opts.playerName,
    frames: opts.frames,
    results: opts.results,
    players2526: opts.players2526,
    division: opts.division,
    divisionPlayers: opts.divisionPlayers,
    seasonPct: opts.seasonPct,
    leagueId: opts.leagueId,
  });
}

/**
 * Compute division percentile for a single metric.
 */
export function computeDivisionPercentile(
  playerValue: number,
  divisionValues: number[],
): number {
  if (divisionValues.length === 0) return 50;
  const below = divisionValues.filter(v => v < playerValue).length;
  return Math.round((below / divisionValues.length) * 100);
}

/**
 * Build label context from match data for label evaluation.
 */
function buildLabelContext(opts: InsightComputeOptions): LabelContext {
  const { playerName, frames, results, players2526, division, divisionPlayers } = opts;

  const form = calcPlayerForm(playerName, frames, opts.seasonPct);
  const clutch = calcClutchIndex(playerName, frames, results);
  const venueBias = calcPlayerVenueBias(playerName, frames);

  // Division average away pct
  const allAwayPcts = divisionPlayers.map(p => calcPlayerVenueBias(p, frames).awayPct);
  const divisionAvgAwayPct = allAwayPcts.length > 0
    ? allAwayPcts.reduce((a, b) => a + b, 0) / allAwayPcts.length
    : 0;

  // BD stats + percentile
  const myBD = calcBDStats(playerName, null, players2526, division);
  let bdPercentileInDiv = 50;
  if (myBD && myBD.bdFRate + myBD.bdARate > 0) {
    const myEfficiency = myBD.bdFRate / (myBD.bdFRate + myBD.bdARate);
    const allEfficiencies = divisionPlayers.map(p => {
      const bd = calcBDStats(p, null, players2526, division);
      if (!bd || bd.bdFRate + bd.bdARate === 0) return 0;
      return bd.bdFRate / (bd.bdFRate + bd.bdARate);
    });
    bdPercentileInDiv = computeDivisionPercentile(myEfficiency, allEfficiencies);
  }

  // Frames won pct
  const playerData = players2526[playerName];
  const framesWonPct = playerData?.total?.pct ?? undefined;
  const allFramesPcts = divisionPlayers
    .map(p => players2526[p]?.total?.pct)
    .filter((v): v is number => v !== undefined);
  const divisionAvgFramesWonPct = allFramesPcts.length > 0
    ? allFramesPcts.reduce((a, b) => a + b, 0) / allFramesPcts.length
    : undefined;

  // Consecutive wins
  let consecutiveWins = 0;
  if (form) {
    for (let i = form.recentGames.length - 1; i >= 0; i--) {
      if (form.recentGames[i].won) consecutiveWins++;
      else break;
    }
  }

  return {
    form: form ?? undefined,
    clutch,
    venueBias,
    divisionAvgAwayPct,
    bdPercentileInDiv,
    framesWonPct,
    divisionAvgFramesWonPct,
    isCaptain: opts.isCaptain,
    lineupOptimizerUses: opts.lineupOptimizerUses,
    scoutingReportsViewed: opts.scoutingReportsViewed,
    consecutiveWins,
  };
}

/**
 * Evaluate which labels a player has earned.
 */
export function computePlayerLabels(
  opts: InsightComputeOptions,
): PlayerLabel[] {
  const ctx = buildLabelContext(opts);
  return evaluateLabels(ctx, opts.existingLabels ?? []);
}
