'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Bell, BellOff, Loader2, Clock, CheckCircle2, AlertCircle, TrendingUp, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { NotificationHistory as NotificationHistoryType } from '@/lib/types';

const NOTIFICATION_TYPE_CONFIG = {
  match_results: {
    icon: Trophy,
    label: 'Match Result',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  upcoming_fixtures: {
    icon: Clock,
    label: 'Upcoming Fixture',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  standings_updates: {
    icon: TrendingUp,
    label: 'Standings Update',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  prediction_updates: {
    icon: AlertCircle,
    label: 'Prediction Update',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  default: {
    icon: Bell,
    label: 'Notification',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
  },
} as const;

export default function NotificationHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<NotificationHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/notifications/history?userId=${user.uid}`);
        const data = await response.json();

        if (data.success) {
          setHistory(data.history || []);
        } else {
          setError(data.error || 'Failed to load notification history');
        }
      } catch (err) {
        setError('An error occurred while loading notification history');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [user]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInHours * 60);
      return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 24 * 7) {
      const days = Math.floor(diffInHours / 24);
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const getTypeConfig = (type: string) => {
    return NOTIFICATION_TYPE_CONFIG[type as keyof typeof NOTIFICATION_TYPE_CONFIG] || NOTIFICATION_TYPE_CONFIG.default;
  };

  if (!user) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-center gap-3 text-zinc-400">
          <BellOff className="h-5 w-5" />
          <p>Sign in to view your notification history</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
        <div className="flex items-center justify-center gap-3 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p>Loading notification history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-6">
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-zinc-800/50 p-4">
            <Bell className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-300">No notifications yet</h3>
          <p className="max-w-md text-sm text-zinc-500">
            When you receive notifications, they'll appear here. Make sure you've enabled notifications in your settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-zinc-400" />
          <h2 className="font-semibold text-zinc-100">Notification History</h2>
          <span className="ml-auto text-sm text-zinc-500">{history.length} notification{history.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="divide-y divide-zinc-800">
        {history.map((notification, index) => {
          const typeConfig = getTypeConfig(notification.type);
          const Icon = typeConfig.icon;

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={clsx(
                'p-4 transition-colors hover:bg-zinc-800/30',
                !notification.read && 'bg-zinc-800/20'
              )}
            >
              <div className="flex gap-4">
                <div className={clsx('flex-shrink-0 rounded-lg p-2', typeConfig.bgColor)}>
                  <Icon className={clsx('h-5 w-5', typeConfig.color)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('text-xs font-medium', typeConfig.color)}>
                          {typeConfig.label}
                        </span>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-blue-500" title="Unread" />
                        )}
                      </div>

                      <h3 className="font-medium text-zinc-100 mb-1">
                        {notification.title}
                      </h3>

                      <p className="text-sm text-zinc-400 line-clamp-2">
                        {notification.body}
                      </p>
                    </div>

                    <time className="flex-shrink-0 text-xs text-zinc-500" dateTime={new Date(notification.sentAt).toISOString()}>
                      {formatTimestamp(notification.sentAt)}
                    </time>
                  </div>

                  {notification.fixture && (
                    <div className="mt-2 text-xs text-zinc-500">
                      {notification.fixture.home} vs {notification.fixture.away} • {notification.fixture.division}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
