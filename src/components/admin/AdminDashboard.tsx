'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Trophy,
  BarChart3,
  Settings,
  Database,
  GitMerge,
  FileText,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLeagueData } from '@/lib/data-provider';
import DataCorrectionPanel from './DataCorrectionPanel';
import ManualResultEntry from './ManualResultEntry';
import PlayerMergePanel from './PlayerMergePanel';
import LeagueHealthMetrics from './LeagueHealthMetrics';

interface AdminDashboardProps {
  // Reserved for future props
}

export default function AdminDashboard({}: AdminDashboardProps) {
  const { user, profile } = useAuth();
  const { data: leagueData } = useLeagueData();

  // Calculate stats
  const stats = useMemo(() => {
    const totalDivisions = Object.keys(leagueData.divisions).length;
    const totalTeams = Object.values(leagueData.divisions).reduce(
      (acc, div) => acc + div.teams.length,
      0
    );
    const totalResults = leagueData.results.length;
    const totalFrames = leagueData.frames.length;

    return {
      totalDivisions,
      totalTeams,
      totalResults,
      totalFrames,
    };
  }, [leagueData]);

  // Admin tools
  const adminTools = [
    {
      title: 'User Management',
      description: 'Manage user accounts and admin access',
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/30',
      href: '#users',
    },
    {
      title: 'Results Management',
      description: 'Edit, add, or remove match results',
      icon: Trophy,
      color: 'text-green-400',
      bgColor: 'bg-green-900/30',
      href: '#results',
    },
    {
      title: 'Analytics',
      description: 'View system analytics and usage stats',
      icon: BarChart3,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/30',
      href: '#analytics',
    },
    {
      title: 'League Settings',
      description: 'Configure league settings and rules',
      icon: Settings,
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/30',
      href: '#settings',
    },
    {
      title: 'Data Management',
      description: 'Import, export, and sync league data',
      icon: Database,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-900/30',
      href: '#data',
    },
    {
      title: 'Player Merge',
      description: 'Merge duplicate player profiles',
      icon: GitMerge,
      color: 'text-pink-400',
      bgColor: 'bg-pink-900/30',
      href: '#merge',
    },
    {
      title: 'Reports',
      description: 'Generate league and player reports',
      icon: FileText,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/30',
      href: '#reports',
    },
    {
      title: 'Notifications',
      description: 'Send notifications to users',
      icon: Bell,
      color: 'text-red-400',
      bgColor: 'bg-red-900/30',
      href: '#notifications',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">
          Welcome back, {profile?.displayName || user?.email || 'Admin'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
          className="bg-surface-card rounded-card shadow-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                Divisions
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.totalDivisions}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-900/30 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-surface-card rounded-card shadow-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                Teams
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.totalTeams}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-900/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-surface-card rounded-card shadow-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                Results
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.totalResults}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-900/30 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-surface-card rounded-card shadow-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                Frames
              </p>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.totalFrames}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-900/30 flex items-center justify-center">
              <Database className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Admin Tools */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Admin Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {adminTools.map((tool, index) => {
            const Icon = tool.icon;
            return (
              <motion.button
                key={tool.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 * index }}
                className="bg-surface-card rounded-card shadow-card p-4 text-left hover:bg-surface-elevated transition-colors group"
                onClick={() => {
                  // TODO: Navigate to tool
                }}
              >
                <div
                  className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center mb-3`}
                >
                  <Icon className={`w-6 h-6 ${tool.color}`} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-baize-light transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-gray-500">{tool.description}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-surface-card rounded-card shadow-card p-6 mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface text-white transition-colors text-sm">
            View latest results
          </button>
          <button className="w-full text-left px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface text-white transition-colors text-sm">
            Add new match result
          </button>
          <button className="w-full text-left px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface text-white transition-colors text-sm">
            Generate weekly report
          </button>
          <button className="w-full text-left px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface text-white transition-colors text-sm">
            Send notification to all users
          </button>
        </div>
      </div>

      {/* League Health Metrics */}
      <div className="mb-8">
        <LeagueHealthMetrics />
      </div>

      {/* Manual Result Entry */}
      <ManualResultEntry
        onSubmit={async (result) => {
          // Determine division based on the teams
          const division = Object.entries(leagueData.divisions).find(([_, div]) =>
            div.teams.includes(result.home) && div.teams.includes(result.away)
          )?.[0];

          if (!division) {
            throw new Error('Could not determine division for selected teams');
          }

          // Get auth token from Firebase Auth
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          const idToken = await auth.currentUser?.getIdToken();

          if (!idToken) {
            throw new Error('Not authenticated');
          }

          // Submit to API
          const response = await fetch('/api/admin/results', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              seasonId: '2025-26',
              result: {
                ...result,
                division,
              },
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create result');
          }

          // Reload page to refresh results and standings
          window.location.reload();
        }}
        onCancel={() => {
          // No-op: ManualResultEntry already handles form reset
        }}
      />

      {/* Data Correction Panel */}
      <DataCorrectionPanel />

      {/* Player Merge Panel */}
      <div className="mt-8">
        <PlayerMergePanel />
      </div>
    </div>
  );
}
