'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Bell, BellOff, Loader2, Check, X, Filter, Mail } from 'lucide-react';
import { useNotifications, useEmailNotifications } from '@/hooks/use-notifications';
import { useAuth } from '@/lib/auth';
import { useLeagueData } from '@/lib/data-provider';
import type { NotificationPreferences, EmailNotificationPreferences, EmailFrequency } from '@/lib/notifications';
import NotificationHistory from '@/components/NotificationHistory';
import QuietHoursSettings from '@/components/QuietHoursSettings';

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

const EMAIL_NOTIFICATION_TYPES = [
  {
    key: 'match_results' as keyof EmailNotificationPreferences,
    label: 'Match Results',
    description: 'Get notified via email when your team\'s match results are synced',
  },
  {
    key: 'upcoming_fixtures' as keyof EmailNotificationPreferences,
    label: 'Upcoming Fixtures',
    description: 'Email reminder 24 hours before your team\'s next match',
  },
  {
    key: 'standings_updates' as keyof EmailNotificationPreferences,
    label: 'Standings Updates',
    description: 'Email notifications when league standings change after match nights',
  },
  {
    key: 'weekly_digest' as keyof EmailNotificationPreferences,
    label: 'Weekly Digest',
    description: 'Weekly summary of matches, standings, and your team\'s performance',
  },
] as const;

const FREQUENCY_OPTIONS: { value: EmailFrequency; label: string; description: string }[] = [
  {
    value: 'instant',
    label: 'Instant',
    description: 'Receive emails immediately as events occur',
  },
  {
    value: 'daily',
    label: 'Daily Digest',
    description: 'One email per day summarizing all activity',
  },
  {
    value: 'weekly',
    label: 'Weekly Digest',
    description: 'One email per week with a complete summary',
  },
];

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
  const { data } = useLeagueData();

  const {
    email: storedEmail,
    preferences: emailPreferences,
    frequency: emailFrequency,
    isSubscribed: isEmailSubscribed,
    loading: emailLoading,
    updatePreferences: updateEmailPreferences,
    unsubscribe: unsubscribeEmail,
  } = useEmailNotifications();

  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  // Initialize email from user or stored email
  useEffect(() => {
    if (storedEmail) {
      setEmail(storedEmail);
    } else if (user?.email) {
      setEmail(user.email);
    }
  }, [storedEmail, user?.email]);

  // Validate email format
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email input change
  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError('');

    // Validate email on change
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    }
  };

  // Extract divisions and teams from league data
  const { allDivisions, allTeams } = useMemo(() => {
    const divisions = Object.keys(data.divisions);
    const teamsSet = new Set<string>();

    Object.values(data.divisions).forEach(division => {
      division.teams.forEach(team => teamsSet.add(team));
    });

    return {
      allDivisions: divisions.sort(),
      allTeams: Array.from(teamsSet).sort(),
    };
  }, [data.divisions]);

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

  // Handle team filter toggle
  const handleTeamFilterToggle = async (team: string) => {
    if (!user || !isSubscribed || isUpdating) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const currentFilters = preferences.teamFilters || [];
      const newFilters = currentFilters.includes(team)
        ? currentFilters.filter(t => t !== team)
        : [...currentFilters, team];

      const newPreferences: NotificationPreferences = {
        ...preferences,
        teamFilters: newFilters,
      };

      const success = await updatePreferences(user.uid, newPreferences);

      if (success) {
        setMessage({ type: 'success', text: 'Team filters updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update team filters' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating team filters' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle division filter toggle
  const handleDivisionFilterToggle = async (division: string) => {
    if (!user || !isSubscribed || isUpdating) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const currentFilters = preferences.divisionFilters || [];
      const newFilters = currentFilters.includes(division)
        ? currentFilters.filter(d => d !== division)
        : [...currentFilters, division];

      const newPreferences: NotificationPreferences = {
        ...preferences,
        divisionFilters: newFilters,
      };

      const success = await updatePreferences(user.uid, newPreferences);

      if (success) {
        setMessage({ type: 'success', text: 'Division filters updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update division filters' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating division filters' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle reminder timing change
  const handleReminderTimingChange = async (timing: 'none' | '1hour' | '1day' | 'both') => {
    if (!user || !isSubscribed || isUpdating) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const newPreferences: NotificationPreferences = {
        ...preferences,
        reminderTiming: timing,
      };

      const success = await updatePreferences(user.uid, newPreferences);

      if (success) {
        setMessage({ type: 'success', text: 'Reminder timing updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update reminder timing' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating reminder timing' });
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

  // Handle email toggle change
  const handleEmailToggle = async (key: keyof EmailNotificationPreferences) => {
    if (!user || !isEmailSubscribed || isUpdating) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const newPreferences: EmailNotificationPreferences = {
        ...emailPreferences,
        [key]: !emailPreferences[key],
      };

      const success = await updateEmailPreferences(user.uid, newPreferences);

      if (success) {
        setMessage({ type: 'success', text: 'Email preferences updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update email preferences' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating email preferences' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle email frequency change
  const handleFrequencyChange = async (frequency: EmailFrequency) => {
    if (!user || !isEmailSubscribed || isUpdating) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const success = await updateEmailPreferences(user.uid, emailPreferences, frequency);

      if (success) {
        setMessage({ type: 'success', text: 'Email frequency updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update email frequency' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating email frequency' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle email unsubscribe
  const handleEmailUnsubscribe = async () => {
    if (!user || !isEmailSubscribed || isUnsubscribing) return;

    if (!confirm('Are you sure you want to unsubscribe from all email notifications?')) {
      return;
    }

    setIsUnsubscribing(true);
    setMessage(null);

    try {
      const success = await unsubscribeEmail(user.uid);

      if (success) {
        setMessage({ type: 'success', text: 'Successfully unsubscribed from email notifications' });
      } else {
        setMessage({ type: 'error', text: 'Failed to unsubscribe from emails' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while unsubscribing from emails' });
    } finally {
      setIsUnsubscribing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notification Preferences
          </h3>
        </div>
        {(loading || emailLoading) && (
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

      {/* Push Notifications Section */}
      {!isSupported ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <BellOff className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Push Notifications Not Supported
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Your browser doesn&apos;t support push notifications. Try using a modern browser like Chrome, Firefox, or Safari.
              </p>
            </div>
          </div>
        </div>
      ) : !isSubscribed || permission !== 'granted' ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Bell className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Push Notifications Not Enabled
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Enable push notifications to receive instant updates about your team&apos;s matches, fixtures, and standings.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Push Notifications
            </h4>
          </div>

          {/* Push Settings List */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
        {NOTIFICATION_TYPES.map((type) => {
          const isEnabled = preferences[type.key];
          const isDisabled = isUpdating || isUnsubscribing;
          const showReminderTiming = type.key === 'upcoming_fixtures' && isEnabled;

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

              {/* Reminder Timing Controls - Only show for Upcoming Fixtures when enabled */}
              {showReminderTiming && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700"
                >
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reminder Timing
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'none' as const, label: 'None', description: 'No reminders' },
                      { value: '1hour' as const, label: '1 hour before', description: 'Reminder 1 hour before match' },
                      { value: '1day' as const, label: '1 day before', description: 'Reminder 1 day before match' },
                      { value: 'both' as const, label: 'Both', description: '1 hour and 1 day before' },
                    ].map((option) => {
                      const isSelected = (preferences.reminderTiming || 'none') === option.value;

                      return (
                        <button
                          key={option.value}
                          onClick={() => handleReminderTimingChange(option.value)}
                          disabled={isDisabled}
                          className={clsx(
                            'w-full flex items-start gap-3 p-2.5 rounded-md border transition-colors text-left',
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-blue-300 dark:border-blue-700'
                              : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
                            isDisabled && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {/* Radio Button */}
                          <div className="flex-shrink-0 mt-0.5">
                            <div
                              className={clsx(
                                'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                                isSelected
                                  ? 'border-blue-600 dark:border-blue-400'
                                  : 'border-gray-300 dark:border-gray-600'
                              )}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                              )}
                            </div>
                          </div>

                          {/* Label and Description */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              {option.label}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                              {option.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter Controls */}
      <div className="space-y-4">
        {/* Team Filters */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Team Filters
            </h4>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Select specific teams to receive notifications for. Leave empty to receive notifications for all teams.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {allTeams.map(team => {
              const isSelected = (preferences.teamFilters || []).includes(team);
              const isDisabled = isUpdating || isUnsubscribing;

              return (
                <button
                  key={team}
                  onClick={() => handleTeamFilterToggle(team)}
                  disabled={isDisabled}
                  className={clsx(
                    'px-3 py-2 text-xs font-medium rounded-md border transition-colors text-left',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{team}</span>
                    {isSelected && (
                      <Check className="w-3 h-3 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {(preferences.teamFilters || []).length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {preferences.teamFilters!.length} team{preferences.teamFilters!.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Division Filters */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Division Filters
            </h4>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Select specific divisions to receive notifications for. Leave empty to receive notifications for all divisions.
          </p>
          <div className="flex flex-wrap gap-2">
            {allDivisions.map(division => {
              const isSelected = (preferences.divisionFilters || []).includes(division);
              const isDisabled = isUpdating || isUnsubscribing;

              return (
                <button
                  key={division}
                  onClick={() => handleDivisionFilterToggle(division)}
                  disabled={isDisabled}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium rounded-md border transition-colors',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span>{division}</span>
                    {isSelected && (
                      <Check className="w-3 h-3 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {(preferences.divisionFilters || []).length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {preferences.divisionFilters!.length} division{preferences.divisionFilters!.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
      </div>

      {/* Quiet Hours */}
      <QuietHoursSettings
        preferences={preferences}
        onUpdate={async (newPrefs) => {
          if (!user) return false;
          return updatePreferences(user.uid, newPrefs);
        }}
        disabled={isUpdating || isUnsubscribing}
      />

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
              Unsubscribe from Push Notifications
            </span>
          )}
        </button>
        <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          You can re-enable push notifications anytime from your settings
        </p>
      </div>
        </div>
      )}

      {/* Email Notifications Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Email Notifications
          </h4>
        </div>

        {/* Email Input Field */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <label htmlFor="email-input" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Email Address
          </label>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="Enter your email address"
            disabled={isEmailSubscribed}
            className={clsx(
              'w-full px-3 py-2 text-sm rounded-lg transition-colors',
              'bg-white dark:bg-gray-900',
              'border',
              emailError
                ? 'border-red-300 dark:border-red-700 focus:border-red-500 dark:focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
              'disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60'
            )}
          />
          {emailError && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <X className="w-3 h-3" />
              {emailError}
            </p>
          )}
          {isEmailSubscribed && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              To change your email address, unsubscribe and re-subscribe with a new email
            </p>
          )}
          {!isEmailSubscribed && user?.email && email === user.email && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              Using your account email address
            </p>
          )}
        </div>

        {!isEmailSubscribed ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Mail className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Email Notifications Not Enabled
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Subscribe to email notifications to receive updates about your team&apos;s matches, fixtures, standings, and weekly digests.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Frequency Options */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Delivery Frequency
              </h5>
              <div className="space-y-2">
                {FREQUENCY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={clsx(
                      'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                      emailFrequency === option.value
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'border border-transparent',
                      isUpdating && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <input
                      type="radio"
                      name="email-frequency"
                      value={option.value}
                      checked={emailFrequency === option.value}
                      onChange={() => handleFrequencyChange(option.value)}
                      disabled={isUpdating}
                      className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-600 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Email Settings List */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
              {EMAIL_NOTIFICATION_TYPES.map((type) => {
                const isEnabled = emailPreferences[type.key];
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
                        onClick={() => handleEmailToggle(type.key)}
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
                onClick={handleEmailUnsubscribe}
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
                    Unsubscribe from Email Notifications
                  </span>
                )}
              </button>
              <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                You can re-enable email notifications anytime from your settings
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notification History */}
      <div className="pt-6">
        <NotificationHistory />
      </div>
    </div>
  );
}
