'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Moon, Clock, Loader2, Check, X } from 'lucide-react';
import type { NotificationPreferences } from '@/lib/types';

interface QuietHoursSettingsProps {
  preferences: NotificationPreferences;
  onUpdate: (preferences: NotificationPreferences) => Promise<boolean>;
  disabled?: boolean;
}

export default function QuietHoursSettings({
  preferences,
  onUpdate,
  disabled = false,
}: QuietHoursSettingsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const quietHoursEnabled = preferences.quietHoursEnabled || false;
  const quietHoursStart = preferences.quietHoursStart || '22:00';
  const quietHoursEnd = preferences.quietHoursEnd || '08:00';

  // Handle toggle change
  const handleToggle = async () => {
    if (disabled || isUpdating) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const newPreferences: NotificationPreferences = {
        ...preferences,
        quietHoursEnabled: !quietHoursEnabled,
      };

      const success = await onUpdate(newPreferences);

      if (success) {
        setMessage({ type: 'success', text: 'Quiet hours updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update quiet hours' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating quiet hours' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle time change
  const handleTimeChange = async (field: 'quietHoursStart' | 'quietHoursEnd', value: string) => {
    if (disabled || isUpdating || !quietHoursEnabled) return;

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) {
      setMessage({ type: 'error', text: 'Invalid time format. Use HH:MM (24-hour)' });
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      const newPreferences: NotificationPreferences = {
        ...preferences,
        [field]: value,
      };

      const success = await onUpdate(newPreferences);

      if (success) {
        setMessage({ type: 'success', text: 'Quiet hours time updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update quiet hours time' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating quiet hours time' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Format time for display
  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quiet Hours
          </h3>
        </div>
        {isUpdating && (
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

      {/* Settings Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Enable Quiet Hours
            </h4>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Mute notifications during specific hours to avoid interruptions
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            disabled={disabled || isUpdating}
            className={clsx(
              'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
              quietHoursEnabled
                ? 'bg-indigo-600'
                : 'bg-gray-200 dark:bg-gray-700',
              (disabled || isUpdating) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span
              className={clsx(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                quietHoursEnabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Time Settings */}
        {quietHoursEnabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-4 space-y-4"
          >
            {/* Start Time */}
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="quiet-hours-start"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Start Time
                  </label>
                  <input
                    type="time"
                    id="quiet-hours-start"
                    value={quietHoursStart}
                    onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                    disabled={disabled || isUpdating}
                    className={clsx(
                      'block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm',
                      (disabled || isUpdating) && 'opacity-50 cursor-not-allowed'
                    )}
                  />
                </div>
                <div>
                  <label
                    htmlFor="quiet-hours-end"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    End Time
                  </label>
                  <input
                    type="time"
                    id="quiet-hours-end"
                    value={quietHoursEnd}
                    onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                    disabled={disabled || isUpdating}
                    className={clsx(
                      'block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white sm:text-sm',
                      (disabled || isUpdating) && 'opacity-50 cursor-not-allowed'
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Visual Indicator */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    Active Quiet Hours
                  </p>
                  <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-300">
                    Notifications will be muted from{' '}
                    <span className="font-semibold">{formatTimeDisplay(quietHoursStart)}</span>
                    {' '}to{' '}
                    <span className="font-semibold">{formatTimeDisplay(quietHoursEnd)}</span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
