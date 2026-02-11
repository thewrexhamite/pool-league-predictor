'use client';

import { useInsightsContext } from '@/lib/gamification/GamificationProvider';
import type { PlayerInsights, MiniLeague } from '@/lib/gamification/types';
import { DEFAULT_INSIGHTS } from '@/lib/gamification/types';

/**
 * Main insights hook — full state access.
 */
export function usePlayerInsights() {
  const ctx = useInsightsContext();
  if (!ctx) {
    return {
      insights: DEFAULT_INSIGHTS,
      miniLeagues: [] as MiniLeague[],
      loading: false,
      refreshMiniLeagues: async () => {},
    };
  }
  return ctx;
}

/**
 * Player labels hook.
 */
export function usePlayerLabels() {
  const { insights } = usePlayerInsights();
  const active = insights.labels.filter(l => l.expiresAt > Date.now());
  const expired = insights.labels.filter(l => l.expiresAt <= Date.now());
  return { active, expired };
}

/**
 * Tool unlocks hook.
 */
export function useToolUnlocks() {
  const { insights } = usePlayerInsights();
  return {
    unlockedTools: insights.unlockedTools,
    usage: insights.usage,
  };
}

/**
 * Mini-leagues hook (unchanged interface).
 */
export function useMiniLeagues() {
  const { miniLeagues, refreshMiniLeagues } = usePlayerInsights();
  return { miniLeagues, refresh: refreshMiniLeagues };
}

/**
 * Insights enabled check.
 */
export function useInsightsEnabled() {
  const { insights } = usePlayerInsights();
  return {
    insightsEnabled: insights.insightsEnabled,
    usageTrackingEnabled: insights.usageTrackingEnabled,
  };
}

// Legacy alias for backward compat during migration
export function useGamification() {
  return usePlayerInsights();
}
