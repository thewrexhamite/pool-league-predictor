'use client';

/**
 * Test Notifications Helper Page
 *
 * This page provides a UI for manually testing push notifications during development.
 * It allows sending test notifications via the /api/notifications/send endpoint.
 *
 * DO NOT DEPLOY TO PRODUCTION - This is for testing only!
 */

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import type { NotificationPreferences } from '@/lib/notifications';

type NotificationType = keyof NotificationPreferences;

const NOTIFICATION_TYPES: { value: NotificationType; label: string }[] = [
  { value: 'match_results', label: 'Match Results' },
  { value: 'upcoming_fixtures', label: 'Upcoming Fixtures' },
  { value: 'standings_updates', label: 'Standings Updates' },
  { value: 'prediction_updates', label: 'Prediction Updates' },
];

const SAMPLE_MESSAGES = {
  match_results: 'Your team won 5-2! Great performance tonight.',
  upcoming_fixtures: 'Match tomorrow at 7pm. Check the scouting report!',
  standings_updates: 'Your team moved up to 2nd place after tonight\'s matches!',
  prediction_updates: 'New prediction: 75% chance of winning your next match.',
};

export default function TestNotificationsPage() {
  const { user } = useAuth();
  const [userId, setUserId] = useState('');
  const [notificationType, setNotificationType] = useState<NotificationType>('match_results');
  const [message, setMessage] = useState(SAMPLE_MESSAGES.match_results);
  const [teamId, setTeamId] = useState('');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill user ID when user is authenticated
  const handleUseCurrentUser = () => {
    if (user) {
      setUserId(user.uid);
    }
  };

  // Update sample message when notification type changes
  const handleTypeChange = (type: NotificationType) => {
    setNotificationType(type);
    setMessage(SAMPLE_MESSAGES[type]);
  };

  const handleSendNotification = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    if (!message) {
      setError('Message is required');
      return;
    }

    setSending(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type: notificationType,
          data: {
            message,
            ...(teamId ? { teamId } : {}),
          },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(data);
      } else {
        setError(data.error || 'Failed to send notification');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <h1 className="text-xl font-bold text-yellow-900 dark:text-yellow-200 mb-2">
            🧪 Push Notifications Test Helper
          </h1>
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            This page is for testing push notifications during development.
            <br />
            <strong>DO NOT deploy this page to production!</strong>
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
          {/* User ID */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              User ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID or click 'Use Current User'"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleUseCurrentUser}
                disabled={!user}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Use Current User
              </button>
            </div>
            {user && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Current user: {user.uid}
              </p>
            )}
          </div>

          {/* Notification Type */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Notification Type
            </label>
            <select
              value={notificationType}
              onChange={(e) => handleTypeChange(e.target.value as NotificationType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {NOTIFICATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              placeholder="Enter notification message"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Team ID (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Team ID (optional)
            </label>
            <input
              type="text"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="team-123 (for deep-link URLs)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              If provided, notification will deep-link to /team/{'{teamId}'}
            </p>
          </div>

          {/* Send Button */}
          <div>
            <button
              onClick={handleSendNotification}
              disabled={sending || !userId || !message}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                'Send Test Notification'
              )}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {/* Success Response */}
          {response && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-sm font-medium text-green-900 dark:text-green-200 mb-2">
                ✅ Notification sent successfully!
              </p>
              <pre className="text-xs text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-3 rounded overflow-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
              {response.dev_mode && (
                <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                  ⚠️ Running in development mode - notification was not actually sent.
                  Set FIREBASE_SERVICE_ACCOUNT_KEY to enable real notifications.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Testing Instructions
          </h2>
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>
              <strong>1.</strong> Sign in and enable notifications in your browser
            </li>
            <li>
              <strong>2.</strong> Click "Use Current User" to auto-fill your user ID
            </li>
            <li>
              <strong>3.</strong> Select a notification type and customize the message
            </li>
            <li>
              <strong>4.</strong> Click "Send Test Notification"
            </li>
            <li>
              <strong>5.</strong> Check your browser for the notification (may appear in notification center)
            </li>
            <li>
              <strong>6.</strong> Click the notification to test deep-linking
            </li>
          </ol>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> If notifications don't appear, check that:
              <br />
              • Browser notification permissions are granted
              • Notification type is enabled in your preferences
              • Service worker is registered (check DevTools)
              • FCM token exists in Firestore (users/{'{userId}'}/notificationSubscription/active)
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex gap-3">
          <a
            href="/"
            className="flex-1 px-4 py-2 text-center bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            ← Back to App
          </a>
          <a
            href="/.auto-claude/specs/008-push-notifications/E2E_TESTING_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2 text-center bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            View Testing Guide
          </a>
        </div>
      </div>
    </div>
  );
}
