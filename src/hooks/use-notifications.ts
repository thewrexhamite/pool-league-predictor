'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isNotificationSupported,
  getPermissionStatus,
  requestPermission as requestNotificationPermission,
  subscribeToNotifications as subscribeToNotificationsAPI,
  unsubscribeFromNotifications as unsubscribeFromNotificationsAPI,
  updateNotificationPreferences as updateNotificationPreferencesAPI,
  type NotificationPermissionStatus,
  type NotificationPreferences,
} from '@/lib/notifications';

const STORAGE_KEY = 'pool-league-pro-notifications';

interface NotificationState {
  permission: NotificationPermissionStatus;
  preferences: NotificationPreferences;
  isSubscribed: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  match_results: true,
  upcoming_fixtures: true,
  standings_updates: true,
  prediction_updates: false,
};

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    preferences: DEFAULT_PREFERENCES,
    isSubscribed: false,
  });
  const [loading, setLoading] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    if (!isNotificationSupported()) {
      setState((prev) => ({ ...prev, permission: 'unsupported' }));
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const permission = getPermissionStatus();

      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NotificationState>;
        setState({
          permission,
          preferences: parsed.preferences || DEFAULT_PREFERENCES,
          isSubscribed: parsed.isSubscribed || false,
        });
      } else {
        setState((prev) => ({ ...prev, permission }));
      }
    } catch {
      // ignore
      setState((prev) => ({ ...prev, permission: getPermissionStatus() }));
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermissionStatus> => {
    if (!isNotificationSupported()) {
      return 'unsupported';
    }

    setLoading(true);
    try {
      const permission = await requestNotificationPermission();
      setState((prev) => ({ ...prev, permission }));
      return permission;
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to notifications
  const subscribe = useCallback(async (userId: string): Promise<boolean> => {
    if (!isNotificationSupported() || state.permission !== 'granted') {
      return false;
    }

    setLoading(true);
    try {
      const success = await subscribeToNotificationsAPI(userId, state.preferences);

      if (success) {
        const newState = { ...state, isSubscribed: true };
        setState(newState);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            preferences: newState.preferences,
            isSubscribed: newState.isSubscribed,
          }));
        } catch {
          // ignore
        }
      }

      return success;
    } finally {
      setLoading(false);
    }
  }, [state]);

  // Unsubscribe from notifications
  const unsubscribe = useCallback(async (userId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await unsubscribeFromNotificationsAPI(userId);

      if (success) {
        const newState = { ...state, isSubscribed: false };
        setState(newState);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            preferences: newState.preferences,
            isSubscribed: newState.isSubscribed,
          }));
        } catch {
          // ignore
        }
      }

      return success;
    } finally {
      setLoading(false);
    }
  }, [state]);

  // Update notification preferences
  const updatePreferences = useCallback(async (
    userId: string,
    preferences: NotificationPreferences
  ): Promise<boolean> => {
    if (!state.isSubscribed) {
      return false;
    }

    setLoading(true);
    try {
      const success = await updateNotificationPreferencesAPI(userId, preferences);

      if (success) {
        const newState = { ...state, preferences };
        setState(newState);

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            preferences: newState.preferences,
            isSubscribed: newState.isSubscribed,
          }));
        } catch {
          // ignore
        }
      }

      return success;
    } finally {
      setLoading(false);
    }
  }, [state]);

  return {
    permission: state.permission,
    preferences: state.preferences,
    isSubscribed: state.isSubscribed,
    isSupported: isNotificationSupported(),
    loading,
    requestPermission,
    subscribe,
    unsubscribe,
    updatePreferences,
  };
}
