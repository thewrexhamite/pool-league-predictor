'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, Tag, BarChart3, Users,
} from 'lucide-react';
import clsx from 'clsx';
import { usePlayerInsights, usePlayerLabels, useToolUnlocks, useMiniLeagues } from '@/hooks/use-gamification';
import { useAuth } from '@/lib/auth';
import { useLeague } from '@/lib/league-context';
import { useActiveData } from '@/lib/active-data-provider';
import { getAllRemainingFixtures } from '@/lib/predictions';
import { computeFormIndicators } from '@/lib/gamification/form-indicators';
import { buildSeasonSnapshot } from '@/lib/gamification/season-arc';
import { getToolStatuses } from '@/lib/gamification/tool-unlocks';
import type { FormIndicator, SeasonSnapshot } from '@/lib/gamification/types';
import FormCard from './FormCard';
import PlayerLabels from './PlayerLabels';
import SeasonArc from './SeasonArc';
import ContextualComparison from './ContextualComparison';
import ToolUnlockHint from './ToolUnlockHint';
import MiniLeaguePanel from './MiniLeaguePanel';

type HubTab = 'form' | 'labels' | 'insights' | 'leagues';

export default function GamificationHub() {
  const [activeTab, setActiveTab] = useState<HubTab>('form');
  const { user, profile } = useAuth();
  const { insights, loading } = usePlayerInsights();
  const { active: activeLabels, expired: expiredLabels } = usePlayerLabels();
  const { unlockedTools, usage } = useToolUnlocks();
  const { miniLeagues, refresh: refreshMiniLeagues } = useMiniLeagues();
  const { selected } = useLeague();
  const { ds, frames } = useActiveData();

  const [formIndicators, setFormIndicators] = useState<FormIndicator[]>([]);
  const [seasonSnapshot, setSeasonSnapshot] = useState<SeasonSnapshot | null>(null);

  // Get claimed player name
  const claimedPlayer = profile?.claimedProfiles?.[0]?.name;

  // Compute season progress
  const seasonPct = useMemo(() => {
    const totalRemaining = getAllRemainingFixtures(ds).length;
    const totalPlayed = ds.results.length;
    return totalPlayed + totalRemaining > 0
      ? totalPlayed / (totalPlayed + totalRemaining)
      : 0;
  }, [ds]);

  // Get division players
  const divisionInfo = useMemo(() => {
    const claimedProfile = profile?.claimedProfiles?.[0];
    if (!claimedProfile || !ds.players2526) return null;

    // Find which division the claimed player is in
    const playerData = ds.players2526[claimedPlayer || ''];
    if (!playerData?.teams?.length) return null;

    const div = playerData.teams[0].div;
    // Get all players in same division
    const divisionPlayers = Object.entries(ds.players2526)
      .filter(([, data]) => data.teams.some(t => t.div === div))
      .map(([name]) => name);

    return { division: div, divisionPlayers };
  }, [profile, ds.players2526, claimedPlayer]);

  // Compute form indicators when we have a claimed player
  useEffect(() => {
    if (!claimedPlayer || !divisionInfo || !frames) return;

    computeFormIndicators({
      playerName: claimedPlayer,
      frames: frames,
      results: ds.results,
      players2526: ds.players2526,
      division: divisionInfo.division as import('@/lib/types').DivisionCode,
      divisionPlayers: divisionInfo.divisionPlayers,
      seasonPct,
      leagueId: selected?.leagueId,
    }).then(setFormIndicators).catch(() => setFormIndicators([]));
  }, [claimedPlayer, divisionInfo, frames, ds.results, ds.players2526, seasonPct, selected?.leagueId]);

  // Compute season snapshot
  useEffect(() => {
    if (!claimedPlayer || !frames) return;
    const snapshot = buildSeasonSnapshot(claimedPlayer, frames, seasonPct);
    setSeasonSnapshot(snapshot);
  }, [claimedPlayer, frames, seasonPct]);

  // Tool statuses
  const toolStatuses = useMemo(() => {
    const isCaptain = (profile?.captainClaims ?? []).some(c => c.verified);
    return getToolStatuses(usage, {
      isCaptain,
      hasUsedLineupOptimizer: usage.featuresUsed.includes('lineup_optimizer'),
    });
  }, [usage, profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="skeleton w-8 h-8 rounded-full" />
      </div>
    );
  }

  if (!insights.insightsEnabled) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        <p>Player insights are disabled.</p>
        <p className="text-xs mt-1">Enable them in your profile settings.</p>
      </div>
    );
  }

  const tabs: { id: HubTab; label: string; icon: typeof TrendingUp }[] = [
    { id: 'form', label: 'Form', icon: TrendingUp },
    { id: 'labels', label: 'Labels', icon: Tag },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'leagues', label: 'Leagues', icon: Users },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition',
                isActive
                  ? 'bg-baize text-white'
                  : 'bg-surface-card text-gray-400 hover:text-white',
              )}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {activeTab === 'form' && (
          <div className="space-y-4">
            {!claimedPlayer ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                <p>Claim your player profile to see form indicators.</p>
              </div>
            ) : formIndicators.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                <p>Not enough match data yet.</p>
              </div>
            ) : (
              <>
                {/* Form indicator cards */}
                <div className="grid grid-cols-2 gap-2">
                  {formIndicators.map(ind => (
                    <FormCard key={ind.metric} indicator={ind} />
                  ))}
                </div>

                {/* Season sparkline */}
                {seasonSnapshot && <SeasonArc snapshot={seasonSnapshot} />}
              </>
            )}
          </div>
        )}

        {activeTab === 'labels' && (
          <PlayerLabels
            active={activeLabels}
            expired={expiredLabels}
            showExpired
          />
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            {/* Division comparisons */}
            {formIndicators.length > 0 && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-2">
                  Division Context
                </div>
                <ContextualComparison indicators={formIndicators} />
              </div>
            )}

            {/* Season narrative */}
            {seasonSnapshot && (
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-2">
                  Season Summary
                </div>
                <p className="text-xs text-gray-400 leading-relaxed bg-surface-card border border-surface-border rounded-lg p-3">
                  {seasonSnapshot.narrative}
                </p>
              </div>
            )}

            {/* Tool unlocks */}
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-2">
                Tools
              </div>
              <ToolUnlockHint tools={toolStatuses} />
            </div>

            {/* Predictions stats */}
            {insights.predictions.total > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-card border border-surface-border rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-white">{insights.predictions.total}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Predictions</div>
                </div>
                <div className="bg-surface-card border border-surface-border rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-white">
                    {Math.round((insights.predictions.correct / insights.predictions.total) * 100)}%
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">Accuracy</div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leagues' && (
          <MiniLeaguePanel
            userId={user?.uid || ''}
            miniLeagues={miniLeagues}
            seasonId={selected?.seasonId || ''}
            onUpdate={refreshMiniLeagues}
          />
        )}
      </motion.div>
    </div>
  );
}
