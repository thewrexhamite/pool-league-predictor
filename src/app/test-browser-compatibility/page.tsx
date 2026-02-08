'use client';

import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

interface BrowserInfo {
  name: string;
  version: string;
  os: string;
  userAgent: string;
}

interface CompatibilityCheck {
  notifications: boolean;
  serviceWorker: boolean;
  pushManager: boolean;
  permission: NotificationPermission | 'unsupported';
  isSecureContext: boolean;
  isStandalone: boolean;
  fcmSupported: boolean;
}

export default function BrowserCompatibilityTest() {
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
  const [compatibility, setCompatibility] = useState<CompatibilityCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Detect browser info
    const detectBrowser = (): BrowserInfo => {
      const ua = navigator.userAgent;
      let name = 'Unknown';
      let version = 'Unknown';
      let os = 'Unknown';

      // Detect OS
      if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Mac OS X')) os = 'macOS';
      else if (ua.includes('Linux')) os = 'Linux';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

      // Detect browser
      if (ua.includes('Chrome') && !ua.includes('Edg')) {
        name = 'Chrome';
        const match = ua.match(/Chrome\/(\d+)/);
        version = match ? match[1] : 'Unknown';
      } else if (ua.includes('Firefox')) {
        name = 'Firefox';
        const match = ua.match(/Firefox\/(\d+)/);
        version = match ? match[1] : 'Unknown';
      } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
        name = 'Safari';
        const match = ua.match(/Version\/(\d+)/);
        version = match ? match[1] : 'Unknown';
      } else if (ua.includes('Edg')) {
        name = 'Edge';
        const match = ua.match(/Edg\/(\d+)/);
        version = match ? match[1] : 'Unknown';
      }

      return { name, version, os, userAgent: ua };
    };

    // Check compatibility
    const checkCompatibility = (): CompatibilityCheck => {
      const hasNotifications = typeof window !== 'undefined' && 'Notification' in window;
      const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
      const hasPushManager = typeof window !== 'undefined' && 'PushManager' in window;
      const permission = hasNotifications ? Notification.permission : 'unsupported';
      const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;

      // Check if running as standalone PWA (iOS)
      const isStandalone = typeof window !== 'undefined' && (
        (window.navigator as any).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches
      );

      // FCM supported if all required APIs present
      const fcmSupported = hasNotifications && hasServiceWorker && hasPushManager && isSecureContext;

      return {
        notifications: hasNotifications,
        serviceWorker: hasServiceWorker,
        pushManager: hasPushManager,
        permission,
        isSecureContext,
        isStandalone,
        fcmSupported,
      };
    };

    setBrowserInfo(detectBrowser());
    setCompatibility(checkCompatibility());
    setLoading(false);
  }, []);

  if (loading || !browserInfo || !compatibility) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading compatibility check...</p>
      </div>
    );
  }

  const isFullySupported = compatibility.fcmSupported;
  const isIOSBrowser = browserInfo.os === 'iOS' && browserInfo.name === 'Safari';
  const needsHomeScreen = isIOSBrowser && !compatibility.isStandalone;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Browser Compatibility Test
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Push Notification Feature Compatibility Check
          </p>
        </div>

        {/* Overall Status */}
        <div className={`rounded-lg shadow-sm p-6 mb-6 ${
          isFullySupported && !needsHomeScreen
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : needsHomeScreen
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
        }`}>
          <h2 className="text-xl font-semibold mb-2">
            {isFullySupported && !needsHomeScreen && (
              <span className="text-green-700 dark:text-green-300">✅ Push Notifications Supported</span>
            )}
            {needsHomeScreen && (
              <span className="text-yellow-700 dark:text-yellow-300">⚠️ Action Required (iOS)</span>
            )}
            {!isFullySupported && !needsHomeScreen && (
              <span className="text-red-700 dark:text-red-300">❌ Push Notifications Not Supported</span>
            )}
          </h2>
          {needsHomeScreen && (
            <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-300 dark:border-yellow-700">
              <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                iOS Users: Add to Home Screen Required
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
                Push notifications on iOS require the app to be added to your Home Screen:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-yellow-700 dark:text-yellow-300 text-sm">
                <li>Tap the Share button (bottom center)</li>
                <li>Select &quot;Add to Home Screen&quot;</li>
                <li>Name the app and tap &quot;Add&quot;</li>
                <li>Close Safari</li>
                <li>Open the app from your Home Screen icon</li>
              </ol>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-3">
                After adding to Home Screen, re-run this test from the Home Screen app.
              </p>
            </div>
          )}
        </div>

        {/* Browser Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Browser Information
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Browser:</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                {browserInfo.name} {browserInfo.version}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Operating System:</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                {browserInfo.os}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">User Agent:</p>
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                {browserInfo.userAgent}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Compatibility */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Feature Compatibility
          </h2>
          <div className="space-y-3">
            <FeatureRow
              label="Notification API"
              supported={compatibility.notifications}
              description="Required for displaying notifications"
            />
            <FeatureRow
              label="Service Worker API"
              supported={compatibility.serviceWorker}
              description="Required for background notifications"
            />
            <FeatureRow
              label="Push Manager API"
              supported={compatibility.pushManager}
              description="Required for receiving push messages"
            />
            <FeatureRow
              label="Secure Context (HTTPS)"
              supported={compatibility.isSecureContext}
              description="Required for service workers and push"
            />
            {isIOSBrowser && (
              <FeatureRow
                label="Standalone Mode (PWA)"
                supported={compatibility.isStandalone}
                description="Required for push notifications on iOS"
                warning={!compatibility.isStandalone}
              />
            )}
          </div>
        </div>

        {/* Permission Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Notification Permission
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Current Status:</span>
            <span className={`font-semibold px-3 py-1 rounded ${
              compatibility.permission === 'granted'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : compatibility.permission === 'denied'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                : compatibility.permission === 'default'
                ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}>
              {compatibility.permission}
            </span>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {compatibility.permission === 'granted' && (
              <p>✅ Notifications are enabled. You can receive push notifications.</p>
            )}
            {compatibility.permission === 'denied' && (
              <p>❌ Notifications are blocked. Enable them in your browser settings to receive notifications.</p>
            )}
            {compatibility.permission === 'default' && (
              <p>⚠️ Permission not yet requested. You&apos;ll be prompted when you enable notifications in the app.</p>
            )}
            {compatibility.permission === 'unsupported' && (
              <p>❌ Notifications are not supported in this browser.</p>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Recommendations
          </h2>
          <div className="space-y-3">
            {isFullySupported && !needsHomeScreen && (
              <div className="flex items-start gap-3">
                <span className="text-green-500 text-xl">✅</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    Ready for Testing
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your browser fully supports push notifications. You can proceed with testing.
                  </p>
                </div>
              </div>
            )}

            {needsHomeScreen && (
              <div className="flex items-start gap-3">
                <span className="text-yellow-500 text-xl">⚠️</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    Add to Home Screen
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    You&apos;re on iOS Safari. Add this app to your Home Screen and open it from there to enable push notifications.
                  </p>
                </div>
              </div>
            )}

            {!compatibility.isSecureContext && (
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">❌</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    Secure Context Required
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Push notifications require HTTPS. Use https:// or localhost for testing.
                  </p>
                </div>
              </div>
            )}

            {!isFullySupported && !needsHomeScreen && (
              <div className="flex items-start gap-3">
                <span className="text-red-500 text-xl">❌</span>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    Browser Not Supported
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use Chrome, Firefox, Edge (89+), or Safari (16.0+) for push notification support.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
            Next Steps
          </h2>
          {isFullySupported && !needsHomeScreen ? (
            <div className="space-y-2 text-blue-800 dark:text-blue-200">
              <p>1. Return to the app and enable push notifications</p>
              <p>2. Grant permission when prompted</p>
              <p>3. Configure your notification preferences</p>
              <p>4. Use the test helper at <code className="bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">/test-notifications</code></p>
            </div>
          ) : needsHomeScreen ? (
            <div className="space-y-2 text-yellow-800 dark:text-yellow-200">
              <p>1. Add this app to your Home Screen (see instructions above)</p>
              <p>2. Close Safari completely</p>
              <p>3. Open the app from your Home Screen icon</p>
              <p>4. Re-run this compatibility test</p>
              <p>5. Proceed with notification setup</p>
            </div>
          ) : (
            <div className="space-y-2 text-red-800 dark:text-red-200">
              <p>Unfortunately, push notifications are not supported in your current browser/environment.</p>
              <p>Please use one of the supported browsers:</p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>Chrome 89+ (Desktop & Android)</li>
                <li>Firefox 89+ (Desktop & Android)</li>
                <li>Safari 16.0+ (macOS 13+, iOS 16.4+ with Home Screen)</li>
                <li>Edge 89+ (Desktop)</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-500">
          <p>For detailed cross-platform testing information, see:</p>
          <p className="font-mono mt-1">
            .auto-claude/specs/008-push-notifications/CROSS_PLATFORM_TESTING_GUIDE.md
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  label,
  supported,
  description,
  warning = false,
}: {
  label: string;
  supported: boolean;
  description: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded bg-gray-50 dark:bg-gray-700/50">
      <span className={`text-2xl ${
        supported
          ? 'text-green-500'
          : warning
          ? 'text-yellow-500'
          : 'text-red-500'
      }`}>
        {supported ? '✅' : warning ? '⚠️' : '❌'}
      </span>
      <div className="flex-1">
        <p className="font-semibold text-gray-900 dark:text-gray-100">
          {label}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>
      <span className={`text-xs font-semibold px-2 py-1 rounded ${
        supported
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      }`}>
        {supported ? 'Supported' : 'Not Supported'}
      </span>
    </div>
  );
}
