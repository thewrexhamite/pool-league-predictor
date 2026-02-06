'use client';

import { useEffect, useCallback } from 'react';
import { logEvent } from 'firebase/analytics';
import { getFirebaseAnalytics } from '@/lib/firebase';

/**
 * Track a page view
 */
export function usePageView(pageName: string, params?: Record<string, string>) {
  useEffect(() => {
    (async () => {
      const analytics = await getFirebaseAnalytics();
      if (analytics) {
        logEvent(analytics, 'page_view', {
          page_title: pageName,
          ...params,
        });
      }
    })();
  }, [pageName, params]);
}

/**
 * Get a function to track custom events
 */
export function useAnalytics() {
  const trackEvent = useCallback(async (
    eventName: string,
    params?: Record<string, string | number | boolean>
  ) => {
    const analytics = await getFirebaseAnalytics();
    if (analytics) {
      logEvent(analytics, eventName, params);
    }
  }, []);

  return { trackEvent };
}

/**
 * Common events for the app
 */
export const AnalyticsEvents = {
  LEAGUE_SELECTED: 'league_selected',
  SEASON_SELECTED: 'season_selected',
  SIMULATION_RUN: 'simulation_run',
  PREDICTION_VIEWED: 'prediction_viewed',
  TEAM_VIEWED: 'team_viewed',
  PLAYER_VIEWED: 'player_viewed',
  WHAT_IF_ADDED: 'what_if_added',
  SQUAD_MODIFIED: 'squad_modified',
} as const;
