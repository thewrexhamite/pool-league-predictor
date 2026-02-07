'use client';

import { useEffect } from 'react';
import { getFirebaseAnalytics } from '@/lib/firebase';

/**
 * Initializes Firebase Analytics on app load.
 * Renders nothing — just triggers the SDK setup.
 */
export function AnalyticsInit() {
  useEffect(() => {
    getFirebaseAnalytics();
  }, []);

  return null;
}
