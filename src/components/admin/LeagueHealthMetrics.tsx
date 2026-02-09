'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  Activity,
  Bell,
  BarChart3,
  Clock,
  Zap,
  Target,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth';

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  usersWithNotifications: number;
}

interface LeagueDataMetrics {
  totalPlayers: number;
  totalTeams: number;
  totalDivisions: number;
  totalMatches: number;
  totalFixtures: number;
}

interface EngagementMetrics {
  notificationSubscriptions: number;
  recentLogins: number;
  activeInLast7Days: number;
  activeInLast30Days: number;
}

interface GrowthMetrics {
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  growthRate: number;
}

interface AnalyticsData {
  users: UserMetrics;
  leagueData: LeagueDataMetrics;
  engagement: EngagementMetrics;
  growth: GrowthMetrics;
  timestamp: number;
  dev_mode?: boolean;
}

export default function LeagueHealthMetrics() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token from Firebase Auth
      const idToken = user ? await user.getIdToken() : null;

      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Content-Type': 'application/json',
          ...(idToken && { 'Authorization': `Bearer ${idToken}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Calculate participation rates
  const participationRate = data
    ? Math.round((data.users.activeUsers / Math.max(data.users.totalUsers, 1)) * 100)
    : 0;
  const notificationRate = data
    ? Math.round((data.users.usersWithNotifications / Math.max(data.users.totalUsers, 1)) * 100)
    : 0;
  const recentActivityRate = data
    ? Math.round((data.engagement.activeInLast7Days / Math.max(data.users.totalUsers, 1)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-baize"></div>
          <span className="ml-3 text-gray-400">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-6">
        <div className="flex items-center gap-2 text-loss mb-2">
          <AlertCircle size={20} />
          <h3 className="font-semibold">Failed to Load Analytics</h3>
        </div>
        <p className="text-sm text-gray-400">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-baize text-fixed-white rounded-lg text-sm hover:bg-baize-light transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity size={20} className="text-accent" />
            League Health Metrics
          </h2>
          {data.dev_mode && (
            <span className="px-2 py-1 text-xs bg-yellow-900/30 text-yellow-400 rounded-md">
              Dev Mode
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400">
          Last updated: {new Date(data.timestamp).toLocaleString()}
        </p>
      </div>

      {/* Participation Rates */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Target size={18} className="text-win" />
          Participation Rates
        </h3>

        {/* Overall participation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Active Users (30 days)</span>
            <span className="text-sm font-semibold text-white">{participationRate}%</span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-baize-dark to-baize-light rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${participationRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {data.users.activeUsers} of {data.users.totalUsers} registered users
          </p>
        </div>

        {/* Recent activity */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Active This Week</span>
            <span className="text-sm font-semibold text-white">{recentActivityRate}%</span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${recentActivityRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {data.engagement.activeInLast7Days} users active in last 7 days
          </p>
        </div>

        {/* Notification engagement */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Notification Subscribers</span>
            <span className="text-sm font-semibold text-white">{notificationRate}%</span>
          </div>
          <div className="w-full bg-surface-elevated rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${notificationRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {data.users.usersWithNotifications} users have enabled notifications
          </p>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={18} className="text-yellow-400" />
          Engagement Statistics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-surface-elevated rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Users</p>
                <p className="text-xl font-bold text-white">{data.users.totalUsers}</p>
              </div>
            </div>
          </motion.div>

          {/* Active users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-surface-elevated rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Active (30d)</p>
                <p className="text-xl font-bold text-white">{data.users.activeUsers}</p>
              </div>
            </div>
          </motion.div>

          {/* Recent logins */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-surface-elevated rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Recent Logins</p>
                <p className="text-xl font-bold text-white">{data.engagement.recentLogins}</p>
              </div>
            </div>
          </motion.div>

          {/* Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="bg-surface-elevated rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Subscriptions</p>
                <p className="text-xl font-bold text-white">
                  {data.engagement.notificationSubscriptions}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-win" />
          Growth & Trends
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* New users (7 days) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-surface-elevated rounded-lg p-4"
          >
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Last 7 Days</p>
              <p className="text-3xl font-bold text-white mb-1">
                +{data.growth.newUsersLast7Days}
              </p>
              <p className="text-xs text-gray-400">new users</p>
            </div>
          </motion.div>

          {/* New users (30 days) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-surface-elevated rounded-lg p-4"
          >
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Last 30 Days</p>
              <p className="text-3xl font-bold text-white mb-1">
                +{data.growth.newUsersLast30Days}
              </p>
              <p className="text-xs text-gray-400">new users</p>
            </div>
          </motion.div>

          {/* Growth rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-surface-elevated rounded-lg p-4"
          >
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Growth Rate</p>
              <p
                className={clsx(
                  'text-3xl font-bold mb-1',
                  data.growth.growthRate > 0 ? 'text-win' : 'text-gray-400'
                )}
              >
                {data.growth.growthRate > 0 ? '+' : ''}
                {data.growth.growthRate}%
              </p>
              <p className="text-xs text-gray-400">monthly growth</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* League Data Overview */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={18} className="text-cyan-400" />
          League Data Overview
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-surface-elevated rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Players</p>
            <p className="text-2xl font-bold text-white">{data.leagueData.totalPlayers}</p>
          </div>
          <div className="bg-surface-elevated rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Teams</p>
            <p className="text-2xl font-bold text-white">{data.leagueData.totalTeams}</p>
          </div>
          <div className="bg-surface-elevated rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Divisions</p>
            <p className="text-2xl font-bold text-white">{data.leagueData.totalDivisions}</p>
          </div>
          <div className="bg-surface-elevated rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Matches</p>
            <p className="text-2xl font-bold text-white">{data.leagueData.totalMatches}</p>
          </div>
          <div className="bg-surface-elevated rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fixtures</p>
            <p className="text-2xl font-bold text-white">{data.leagueData.totalFixtures}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
