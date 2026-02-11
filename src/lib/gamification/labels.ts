/**
 * Player Labels — contextual labels earned from real match data.
 *
 * Each label has a computation function. Labels recalculate weekly
 * and expire after 4 weeks of not qualifying.
 * Max 5 active labels per player.
 */

import type { PlayerLabel, LabelCategory } from './types';
import type { FormAnalysis } from '../predictions/analytics';
import type { ConsistencyMetrics, ImprovementMetrics } from '../types';
import type { ClutchProfile } from '../types';
import type { PlayerVenueBias } from '../stats/home-away-analytics';

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;

interface LabelDefinition {
  id: string;
  name: string;
  description: string;
  category: LabelCategory;
  check: (ctx: LabelContext) => boolean;
}

export interface LabelContext {
  form?: FormAnalysis;
  consistency?: ConsistencyMetrics | null;
  improvement?: ImprovementMetrics | null;
  clutch?: Omit<ClutchProfile, 'team' | 'played'> | null;
  venueBias?: PlayerVenueBias;
  divisionAvgAwayPct?: number;
  bdEfficiency?: number;
  bdPercentileInDiv?: number; // 0-100
  framesWonPct?: number;
  divisionAvgFramesWonPct?: number;
  isCaptain?: boolean;
  lineupOptimizerUses?: number;
  scoutingReportsViewed?: number;
  comebackWins?: number; // won after losing frame 1
  consecutiveWins?: number;
  secondHalfWinPct?: number;
  firstHalfWinPct?: number;
}

const LABEL_DEFINITIONS: LabelDefinition[] = [
  // Performance
  {
    id: 'in_form',
    name: 'In Form',
    description: 'Last 5 matches above 65% win rate',
    category: 'performance',
    check: (ctx) => (ctx.form?.current.last5.pct ?? 0) >= 0.65,
  },
  {
    id: 'hot_streak',
    name: 'Hot Streak',
    description: '4+ consecutive wins',
    category: 'performance',
    check: (ctx) => (ctx.consecutiveWins ?? 0) >= 4,
  },
  {
    id: 'strong_away',
    name: 'Strong Away',
    description: 'Away win% more than 10% above division average',
    category: 'performance',
    check: (ctx) => {
      if (!ctx.venueBias || ctx.divisionAvgAwayPct === undefined) return false;
      return ctx.venueBias.awayGames >= 3 &&
        ctx.venueBias.awayPct > (ctx.divisionAvgAwayPct + 0.10);
    },
  },
  {
    id: 'home_fortress',
    name: 'Home Fortress',
    description: 'Home win rate above 75%',
    category: 'performance',
    check: (ctx) => {
      if (!ctx.venueBias) return false;
      return ctx.venueBias.homeGames >= 3 && ctx.venueBias.homePct >= 0.75;
    },
  },
  // Consistency
  {
    id: 'reliable',
    name: 'Reliable',
    description: 'High consistency rating across recent matches',
    category: 'consistency',
    check: (ctx) => ctx.consistency?.consistency === 'high',
  },
  {
    id: 'season_improver',
    name: 'Season Improver',
    description: 'Win rate up 10%+ compared to season start',
    category: 'consistency',
    check: (ctx) => {
      if (!ctx.improvement) return false;
      return ctx.improvement.winRateChange >= 0.10;
    },
  },
  {
    id: 'late_bloomer',
    name: 'Late Bloomer',
    description: 'Second half of season 15%+ better than first half',
    category: 'consistency',
    check: (ctx) => {
      if (ctx.secondHalfWinPct === undefined || ctx.firstHalfWinPct === undefined) return false;
      return (ctx.secondHalfWinPct - ctx.firstHalfWinPct) >= 0.15;
    },
  },
  // Clutch
  {
    id: 'reliable_closer',
    name: 'Reliable Closer',
    description: 'Close match win% above 60%',
    category: 'clutch',
    check: (ctx) => {
      if (!ctx.clutch) return false;
      return ctx.clutch.closeMatchRecord.p >= 3 &&
        ctx.clutch.closeMatchRecord.pct >= 0.60;
    },
  },
  {
    id: 'pressure_player',
    name: 'Pressure Player',
    description: 'Clutch rating above 0.3',
    category: 'clutch',
    check: (ctx) => (ctx.clutch?.clutchRating ?? -1) >= 0.3,
  },
  {
    id: 'comeback_king',
    name: 'Comeback Specialist',
    description: 'Won 3+ matches after losing the first frame',
    category: 'clutch',
    check: (ctx) => (ctx.comebackWins ?? 0) >= 3,
  },
  // Tactical
  {
    id: 'bd_specialist',
    name: 'BD Specialist',
    description: 'Top 25% for break & dish efficiency in division',
    category: 'tactical',
    check: (ctx) => (ctx.bdPercentileInDiv ?? 0) >= 75,
  },
  {
    id: 'frame_winner',
    name: 'Frame Winner',
    description: 'Above average frames won in division',
    category: 'tactical',
    check: (ctx) => {
      if (ctx.framesWonPct === undefined || ctx.divisionAvgFramesWonPct === undefined) return false;
      return ctx.framesWonPct > ctx.divisionAvgFramesWonPct;
    },
  },
  // Captain / Social
  {
    id: 'team_builder',
    name: 'Team Builder',
    description: 'Captain who actively uses the lineup optimizer',
    category: 'social',
    check: (ctx) => !!ctx.isCaptain && (ctx.lineupOptimizerUses ?? 0) >= 5,
  },
  {
    id: 'scout',
    name: 'Scout',
    description: 'Viewed 20+ scouting reports',
    category: 'social',
    check: (ctx) => (ctx.scoutingReportsViewed ?? 0) >= 20,
  },
];

/**
 * Evaluate which labels a player qualifies for.
 * Returns up to 5 active labels, prioritising newly earned over existing.
 */
export function evaluateLabels(
  ctx: LabelContext,
  existingLabels: PlayerLabel[],
): PlayerLabel[] {
  const now = Date.now();
  const qualifiedIds = new Set<string>();

  // Check which labels the player currently qualifies for
  for (const def of LABEL_DEFINITIONS) {
    if (def.check(ctx)) {
      qualifiedIds.add(def.id);
    }
  }

  // Build updated label list
  const updated: PlayerLabel[] = [];

  // Keep existing labels that still qualify — refresh their expiry
  for (const label of existingLabels) {
    if (qualifiedIds.has(label.id)) {
      updated.push({
        ...label,
        earnedAt: label.earnedAt, // keep original earn date
        expiresAt: now + FOUR_WEEKS_MS,
      });
      qualifiedIds.delete(label.id);
    } else if (label.expiresAt > now) {
      // Still within expiry window, keep but don't refresh
      updated.push(label);
    }
    // Expired labels are dropped
  }

  // Add newly qualified labels
  for (const id of qualifiedIds) {
    const def = LABEL_DEFINITIONS.find(d => d.id === id);
    if (!def) continue;
    updated.push({
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      earnedAt: now,
      expiresAt: now + FOUR_WEEKS_MS,
    });
  }

  // Sort by earnedAt (newest first), limit to 5
  updated.sort((a, b) => b.earnedAt - a.earnedAt);
  return updated.slice(0, 5);
}

/**
 * Get all label definitions (for display/reference).
 */
export function getLabelDefinitions(): LabelDefinition[] {
  return LABEL_DEFINITIONS;
}
