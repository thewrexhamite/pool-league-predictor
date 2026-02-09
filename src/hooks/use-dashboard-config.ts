'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useUser } from '@/lib/auth/auth-context';
import type { DashboardConfig, WidgetConfig, WidgetType } from '@/lib/dashboard-config';
import {
  DEFAULT_DASHBOARD_CONFIG,
  isValidDashboardConfig,
  generateWidgetId,
} from '@/lib/dashboard-config';

const STORAGE_KEY = 'pool-league-pro-dashboard-config';
const DEBOUNCE_MS = 2000;

export function useDashboardConfig() {
  const [dashboardConfig, setDashboardConfigState] = useState<DashboardConfig>(
    DEFAULT_DASHBOARD_CONFIG
  );
  const [initialized, setInitialized] = useState(false);
  const user = useUser();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage
  function loadLocalConfig(): DashboardConfig | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isValidDashboardConfig(parsed)) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  // Save to localStorage
  function saveLocalConfig(config: DashboardConfig) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }

  // Restore on mount
  useEffect(() => {
    // Try localStorage first (instant)
    const local = loadLocalConfig();
    if (local) {
      setDashboardConfigState(local);
    }

    // Then try Firestore if authenticated (async reconciliation)
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && user) {
      (async () => {
        try {
          const { db } = await import('@/lib/firebase');
          const docRef = doc(db, 'users', user.uid, 'userData', 'dashboardConfig');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const remote = snap.data() as DashboardConfig;
            if (isValidDashboardConfig(remote)) {
              setDashboardConfigState(remote);
              saveLocalConfig(remote);
            }
          }
        } catch {
          // Firestore unavailable, local value is fine
        }
      })();
    }

    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync to Firestore when value changes (debounced)
  useEffect(() => {
    if (!initialized) return;

    // Always save to localStorage immediately
    saveLocalConfig(dashboardConfig);

    // Debounce Firestore writes
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !user) return;
      try {
        const { db } = await import('@/lib/firebase');
        const docRef = doc(db, 'users', user.uid, 'userData', 'dashboardConfig');
        await setDoc(docRef, dashboardConfig);
      } catch {
        // Firestore unavailable
      }
    }, DEBOUNCE_MS);
  }, [initialized, dashboardConfig, user]);

  // Update entire config
  const setDashboardConfig = useCallback((config: DashboardConfig) => {
    setDashboardConfigState({
      ...config,
      lastModified: Date.now(),
    });
  }, []);

  // Add a widget
  const addWidget = useCallback((type: WidgetType, settings?: Record<string, unknown>) => {
    setDashboardConfigState(prev => {
      const maxOrder = Math.max(...prev.widgets.map(w => w.order), -1);
      const newWidget: WidgetConfig = {
        id: generateWidgetId(type),
        type,
        enabled: true,
        order: maxOrder + 1,
        settings,
      };
      return {
        ...prev,
        widgets: [...prev.widgets, newWidget],
        lastModified: Date.now(),
      };
    });
  }, []);

  // Remove a widget
  const removeWidget = useCallback((widgetId: string) => {
    setDashboardConfigState(prev => ({
      ...prev,
      widgets: prev.widgets.filter(w => w.id !== widgetId),
      lastModified: Date.now(),
    }));
  }, []);

  // Update widget order (for drag-and-drop)
  const reorderWidgets = useCallback((widgetIds: string[]) => {
    setDashboardConfigState(prev => {
      const widgetMap = new Map(prev.widgets.map(w => [w.id, w]));
      const reorderedWidgets = widgetIds
        .map(id => widgetMap.get(id))
        .filter((w): w is WidgetConfig => w !== undefined)
        .map((w, index) => ({ ...w, order: index }));

      // Add any widgets not in the reordered list (shouldn't happen but be safe)
      const reorderedIds = new Set(widgetIds);
      const remainingWidgets = prev.widgets
        .filter(w => !reorderedIds.has(w.id))
        .map((w, index) => ({ ...w, order: reorderedWidgets.length + index }));

      return {
        ...prev,
        widgets: [...reorderedWidgets, ...remainingWidgets],
        lastModified: Date.now(),
      };
    });
  }, []);

  // Toggle widget enabled state
  const toggleWidget = useCallback((widgetId: string) => {
    setDashboardConfigState(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.id === widgetId ? { ...w, enabled: !w.enabled } : w
      ),
      lastModified: Date.now(),
    }));
  }, []);

  // Update widget settings
  const updateWidgetSettings = useCallback(
    (widgetId: string, settings: Record<string, unknown>) => {
      setDashboardConfigState(prev => ({
        ...prev,
        widgets: prev.widgets.map(w =>
          w.id === widgetId ? { ...w, settings: { ...w.settings, ...settings } } : w
        ),
        lastModified: Date.now(),
      }));
    },
    []
  );

  // Reset to default configuration
  const resetConfig = useCallback(() => {
    setDashboardConfigState({
      ...DEFAULT_DASHBOARD_CONFIG,
      lastModified: Date.now(),
    });
  }, []);

  return {
    dashboardConfig,
    setDashboardConfig,
    addWidget,
    removeWidget,
    reorderWidgets,
    toggleWidget,
    updateWidgetSettings,
    resetConfig,
  };
}
