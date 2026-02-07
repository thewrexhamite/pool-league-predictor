'use client';

/**
 * Notification Opt-in Prompt
 *
 * Non-intrusive prompt asking users if they want to enable push notifications.
 * Should be shown after the user has set their My Team.
 */

import { useState } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/lib/auth';

interface NotificationPromptProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onDismiss?: () => void;
}

export function NotificationPrompt({
  onSuccess,
  onError,
  onDismiss,
}: NotificationPromptProps) {
  const { user } = useAuth();
  const {
    permission,
    isSupported,
    loading,
    requestPermission,
    subscribe,
  } = useNotifications();
  const [isEnabling, setIsEnabling] = useState(false);

  // Don't show if notifications aren't supported or permission already granted
  if (!isSupported || permission === 'granted' || permission === 'denied') {
    return null;
  }

  const handleEnable = async () => {
    if (!user) {
      onError?.(new Error('Must be signed in to enable notifications'));
      return;
    }

    setIsEnabling(true);
    try {
      // Request browser permission
      const permissionResult = await requestPermission();

      if (permissionResult === 'granted') {
        // Subscribe to notifications
        const subscribed = await subscribe(user.uid);

        if (subscribed) {
          onSuccess?.();
        } else {
          onError?.(new Error('Failed to subscribe to notifications'));
        }
      } else if (permissionResult === 'denied') {
        onError?.(new Error('Notification permission denied'));
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Failed to enable notifications'));
    } finally {
      setIsEnabling(false);
    }
  };

  const handleDismiss = () => {
    onDismiss?.();
  };

  const isLoading = loading || isEnabling;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Bell Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Stay updated with notifications
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Get notified about match results, upcoming fixtures, and standings updates for your team.
          </p>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="
                px-3 py-1.5 text-sm font-medium rounded-md
                bg-blue-600 hover:bg-blue-700
                text-white
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enabling...
                </span>
              ) : (
                'Enable Notifications'
              )}
            </button>

            <button
              onClick={handleDismiss}
              disabled={isLoading}
              className="
                px-3 py-1.5 text-sm font-medium rounded-md
                text-gray-700 dark:text-gray-300
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
