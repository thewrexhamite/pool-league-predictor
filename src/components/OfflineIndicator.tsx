'use client';

/**
 * Offline Indicator
 *
 * Toast-style banner that appears at top of screen when the user goes offline.
 * Shows 'You are offline - viewing cached data' message and dismisses automatically
 * when connection is restored.
 */

import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';

interface OfflineIndicatorProps {
  onDismiss?: () => void;
}

export function OfflineIndicator({ onDismiss }: OfflineIndicatorProps) {
  const { isOffline } = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (isOffline) {
      setIsDismissed(false);
      // Small delay for animation
      setTimeout(() => setIsVisible(true), 100);
    } else {
      // Auto-dismiss when connection restored
      setIsVisible(false);
      setTimeout(() => setIsDismissed(false), 300);
    }
  }, [isOffline]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      onDismiss?.();
    }, 300);
  };

  // Don't show if online or manually dismissed
  if (!isOffline || isDismissed) {
    return null;
  }

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        transition-transform duration-300 ease-in-out
        ${isVisible ? 'translate-y-0' : '-translate-y-full'}
      `}
    >
      <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Icon and Message */}
            <div className="flex items-center gap-3">
              {/* Wifi Off Icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-amber-600 dark:text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3l8.293 8.293"
                  />
                </svg>
              </div>

              {/* Text */}
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  You are offline
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Viewing cached data
                </p>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="
                flex-shrink-0 p-1 rounded-md
                text-amber-700 dark:text-amber-300
                hover:bg-amber-100 dark:hover:bg-amber-900/50
                transition-colors
              "
              aria-label="Dismiss offline indicator"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
