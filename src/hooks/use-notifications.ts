'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isNotificationSupported,
  getPermissionStatus,
  requestPermission as requestNotificationPermission,
  subscribeToNotifications as subscribeToNotificationsAPI,
  unsubscribeFromNotifications as unsubscribeFromNotificationsAPI,
  updateNotificationPreferences as updateNotificationPreferencesAPI,
  subscribeToEmailNotifications as subscribeToEmailNotificationsAPI,
  unsubscribeFromEmailNotifications as unsubscribeFromEmailNotificationsAPI,
  updateEmailNotificationPreferences as updateEmailNotificationPreferencesAPI,
  type NotificationPermissionStatus,
  type NotificationPreferences,
  type EmailNotificationPreferences,
  type EmailFrequency,
  type MyTeam,
} from '@/lib/notifications';

const STORAGE_KEY = 'pool-league-pro-notifications';
const EMAIL_STORAGE_KEY = 'pool-league-pro-email-notifications';
const MY_TEAM_STORAGE_KEY = 'pool-league-pro-my-team';

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

interface EmailNotificationState {
  email: string;
  preferences: EmailNotificationPreferences;
  frequency: EmailFrequency;
  isSubscribed: boolean;
}

const DEFAULT_EMAIL_PREFERENCES: EmailNotificationPreferences = {
  match_results: true,
  upcoming_fixtures: true,
  standings_updates: true,
  weekly_digest: false,
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

  // Get My Team from localStorage
  const getMyTeam = useCallback((): MyTeam | undefined => {
    try {
      const stored = localStorage.getItem(MY_TEAM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.team && parsed.div) {
          return parsed as MyTeam;
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  }, []);

  // Subscribe to notifications
  const subscribe = useCallback(async (userId: string): Promise<boolean> => {
    if (!isNotificationSupported() || state.permission !== 'granted') {
      return false;
    }

    setLoading(true);
    try {
      const myTeam = getMyTeam();
      const success = await subscribeToNotificationsAPI(userId, state.preferences, myTeam);

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
  }, [state, getMyTeam]);

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
      const myTeam = getMyTeam();
      const success = await updateNotificationPreferencesAPI(userId, preferences, myTeam);

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
  }, [state, getMyTeam]);

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

export function useEmailNotifications() {
  const [state, setState] = useState<EmailNotificationState>({
    email: '',
    preferences: DEFAULT_EMAIL_PREFERENCES,
    frequency: 'instant',
    isSubscribed: false,
  });
  const [loading, setLoading] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(EMAIL_STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as Partial<EmailNotificationState>;
        setState({
          email: parsed.email || '',
          preferences: parsed.preferences || DEFAULT_EMAIL_PREFERENCES,
          frequency: parsed.frequency || 'instant',
          isSubscribed: parsed.isSubscribed || false,
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Get My Team from localStorage
  const getMyTeam = useCallback((): MyTeam | undefined => {
    try {
      const stored = localStorage.getItem(MY_TEAM_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.team && parsed.div) {
          return parsed as MyTeam;
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  }, []);

  // Subscribe to email notifications
  const subscribe = useCallback(async (userId: string, email: string): Promise<boolean> => {
    if (!email) {
      return false;
    }

    setLoading(true);
    try {
      const myTeam = getMyTeam();
      const success = await subscribeToEmailNotificationsAPI(
        userId,
        email,
        state.preferences,
        state.frequency,
        myTeam
      );

      if (success) {
        const newState = { ...state, email, isSubscribed: true };
        setState(newState);

        try {
          localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify({
            email: newState.email,
            preferences: newState.preferences,
            frequency: newState.frequency,
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
  }, [state, getMyTeam]);

  // Unsubscribe from email notifications
  const unsubscribe = useCallback(async (userId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await unsubscribeFromEmailNotificationsAPI(userId);

      if (success) {
        const newState = { ...state, isSubscribed: false };
        setState(newState);

        try {
          localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify({
            email: newState.email,
            preferences: newState.preferences,
            frequency: newState.frequency,
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

  // Update email notification preferences
  const updatePreferences = useCallback(async (
    userId: string,
    preferences: EmailNotificationPreferences,
    frequency?: EmailFrequency
  ): Promise<boolean> => {
    if (!state.isSubscribed || !state.email) {
      return false;
    }

    setLoading(true);
    try {
      const myTeam = getMyTeam();
      const newFrequency = frequency || state.frequency;
      const success = await updateEmailNotificationPreferencesAPI(
        userId,
        state.email,
        preferences,
        newFrequency,
        myTeam
      );

      if (success) {
        const newState = { ...state, preferences, frequency: newFrequency };
        setState(newState);

        try {
          localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify({
            email: newState.email,
            preferences: newState.preferences,
            frequency: newState.frequency,
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
  }, [state, getMyTeam]);

  return {
    email: state.email,
    preferences: state.preferences,
    frequency: state.frequency,
    isSubscribed: state.isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    updatePreferences,
  };
}
