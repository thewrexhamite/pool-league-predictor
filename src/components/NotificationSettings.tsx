'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Bell, BellOff, Loader2, Check, X } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/lib/auth';
import type { NotificationPreferences } from '@/lib/notifications';

interface NotificationSettingsProps {
  onUnsubscribe?: () => void;
}

type BooleanNotificationKey = 'match_results' | 'upcoming_fixtures' | 'standings_updates' | 'prediction_updates';

const NOTIFICATION_TYPES: { key: BooleanNotificationKey; label: string; description: string }[] = [
  {
    key: 'match_results',
    label: 'Match Results',
    description: 'Get notified when your team\'s match results are synced',
  },
  {
    key: 'upcoming_fixtures',
    label: 'Upcoming Fixtures',
    description: 'Reminder 24 hours before your team\'s next match',
  },
  {
    key: 'standings_updates',
    label: 'Standings Updates',
    description: 'Notifications when league standings change after match nights',
  },
  {
    key: 'prediction_updates',
    label: 'Prediction Updates',
    description: 'Updates about significant changes in match predictions',
  },
] as const;

export default function NotificationSettings({
  onUnsubscribe,
}: NotificationSettingsProps) {
  const { user } = useAuth();
  const {
    permission,
    preferences,
    isSubscribed,
    isSupported,
    loading,
    unsubscribe,
    updatePreferences,
  } = useNotifications();

  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle toggle change
  const handleToggle = async (key: BooleanNotificationKey) => {
    if (!user || !isSubscribed || isUpdating) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const newPreferences: NotificationPreferences = {
        ...preferences,
        [key]: !preferences[key],
      };

      const success = await updatePreferences(user.uid, newPreferences);

      if (success) {
        setMessage({ type: 'success', text: 'Preferences updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update preferences' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating preferences' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle unsubscribe
  const handleUnsubscribe = async () => {
    if (!user || !isSubscribed || isUnsubscribing) return;

    if (!confirm('Are you sure you want to unsubscribe from all notifications?')) {
      return;
    }

    setIsUnsubscribing(true);
    setMessage(null);

    try {
      const success = await unsubscribe(user.uid);

      if (success) {
        setMessage({ type: 'success', text: 'Successfully unsubscribed from notifications' });
        onUnsubscribe?.();
      } else {
        setMessage({ type: 'error', text: 'Failed to unsubscribe' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while unsubscribing' });
    } finally {
      setIsUnsubscribing(false);
    }
  };

  // Not supported
  if (!isSupported) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <BellOff className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Notifications Not Supported
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Your browser doesn&apos;t support push notifications. Try using a modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not subscribed
  if (!isSubscribed || permission !== 'granted') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Bell className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Notifications Not Enabled
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Enable notifications to receive updates about your team&apos;s matches, fixtures, and standings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notification Preferences
          </h3>
        </div>
        {loading && (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Message Banner */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={clsx(
            'p-3 rounded-lg flex items-center gap-2 text-sm',
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
          )}
        >
          {message.type === 'success' ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <X className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </motion.div>
      )}

      {/* Settings List */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
        {NOTIFICATION_TYPES.map((type) => {
          const isEnabled = preferences[type.key];
          const isDisabled = isUpdating || isUnsubscribing;

          return (
            <div key={type.key} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {type.label}
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    {type.description}
                  </p>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(type.key)}
                  disabled={isDisabled}
                  className={clsx(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
                    isEnabled
                      ? 'bg-blue-600'
                      : 'bg-gray-200 dark:bg-gray-700',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={`Toggle ${type.label}`}
                >
                  <span
                    className={clsx(
                      'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unsubscribe Button */}
      <div className="pt-2">
        <button
          onClick={handleUnsubscribe}
          disabled={isUnsubscribing || isUpdating}
          className={clsx(
            'w-full px-4 py-2.5 text-sm font-medium rounded-lg transition-colors',
            'text-red-700 dark:text-red-400',
            'bg-red-50 dark:bg-red-900/20',
            'border border-red-200 dark:border-red-800',
            'hover:bg-red-100 dark:hover:bg-red-900/30',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isUnsubscribing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Unsubscribing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <BellOff className="w-4 h-4" />
              Unsubscribe from All Notifications
            </span>
          )}
        </button>
        <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          You can re-enable notifications anytime from your settings
        </p>
      </div>
    </div>
  );
}
