import { getToken as getFCMToken, deleteToken } from 'firebase/messaging';
import { getFirebaseMessaging } from './firebase';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NotificationPreferences {
  match_results: boolean;
  upcoming_fixtures: boolean;
  standings_updates: boolean;
  prediction_updates: boolean;
}

export interface EmailNotificationPreferences {
  match_results: boolean;
  upcoming_fixtures: boolean;
  standings_updates: boolean;
  weekly_digest: boolean;
}

export type EmailFrequency = 'instant' | 'daily' | 'weekly';

export interface MyTeam {
  team: string;
  div: string;
}

/**
 * Check if push notifications are supported in the current browser
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get the current notification permission status
 */
export function getPermissionStatus(): NotificationPermissionStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Request notification permission from the browser
 * Returns the permission status after user responds
 */
export async function requestPermission(): Promise<NotificationPermissionStatus> {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionStatus;
  } catch (error) {
    return 'denied';
  }
}

/**
 * Get FCM token for push notifications
 * Requires notification permission to be granted
 */
export async function getToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const permission = getPermissionStatus();
  if (permission !== 'granted') {
    return null;
  }

  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      return null;
    }

    const token = await getFCMToken(messaging, { vapidKey });
    return token;
  } catch (error) {
    return null;
  }
}

/**
 * Subscribe to push notifications
 * Sends FCM token, preferences, and My Team to the backend
 */
export async function subscribeToNotifications(
  userId: string,
  preferences: NotificationPreferences,
  myTeam?: MyTeam
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const token = await getToken();
    if (!token) {
      return false;
    }

    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        userId,
        preferences,
        myTeam,
      }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 * Removes subscription from backend and deletes FCM token
 */
export async function unsubscribeFromNotifications(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    // Call backend to remove subscription
    const response = await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      return false;
    }

    // Delete FCM token locally
    const messaging = await getFirebaseMessaging();
    if (messaging) {
      await deleteToken(messaging);
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Update notification preferences
 * Updates preferences and optionally My Team in backend without changing subscription status
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
  myTeam?: MyTeam
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const token = await getToken();
    if (!token) {
      return false;
    }

    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        userId,
        preferences,
        myTeam,
      }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Subscribe to email notifications
 * Sends email, preferences, frequency, and optionally My Team to the backend
 */
export async function subscribeToEmailNotifications(
  userId: string,
  email: string,
  preferences: EmailNotificationPreferences,
  frequency: EmailFrequency,
  myTeam?: MyTeam
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const response = await fetch('/api/notifications/email/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email,
        preferences,
        frequency,
        myTeam,
      }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Unsubscribe from email notifications
 * Removes email subscription from backend
 */
export async function unsubscribeFromEmailNotifications(userId: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const response = await fetch('/api/notifications/email/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Update email notification preferences
 * Updates email preferences, frequency, and optionally My Team in backend
 */
export async function updateEmailNotificationPreferences(
  userId: string,
  email: string,
  preferences: EmailNotificationPreferences,
  frequency: EmailFrequency,
  myTeam?: MyTeam
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const response = await fetch('/api/notifications/email/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        email,
        preferences,
        frequency,
        myTeam,
      }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}
