'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, X, Star, Calendar, TrendingUp, TrendingDown, ChevronRight, Trophy, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getRemainingFixtures, getTeamResults, calcStandings } from '@/lib/predictions/index';
import DashboardEditor from './dashboard/DashboardEditor';
import WidgetLibrary from './dashboard/WidgetLibrary';
import FadeInOnScroll from './ui/FadeInOnScroll';
import StaggerList from './ui/StaggerList';

interface DashboardTabProps {
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  myTeam: { team: string; div: DivisionCode } | null;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
  onPredict: (home: string, away: string) => void;
  onQuickLookup?: () => void;
  seasonId?: string;
  seasonLabel?: string;
}

export default function DashboardTab({
  selectedDiv,
  standings,
  myTeam,
  onTeamClick,
  onPlayerClick,
  onPredict,
  onQuickLookup,
  seasonId,
  seasonLabel,
}: DashboardTabProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const { ds } = useActiveData();

  // My Team quick glance
  const myTeamGlance = useMemo(() => {
    if (!myTeam) return null;
    const standing = standings.find(s => s.team === myTeam.team);
    if (!standing) return null;
    const pos = standings.findIndex(s => s.team === myTeam.team) + 1;
    const results = getTeamResults(myTeam.team, ds);
    const form = results.slice(0, 5).map(r => r.result);
    const fixtures = getRemainingFixtures(myTeam.div as DivisionCode, ds);
    const nextMatch = fixtures.find(f => f.home === myTeam.team || f.away === myTeam.team);
    return { standing, pos, form, nextMatch };
  }, [myTeam, standings, ds]);

  // Upcoming matches (next 3 days)
  const upcomingMatches = useMemo(() => {
    const fixtures = getRemainingFixtures(selectedDiv, ds);
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    return fixtures
      .filter(f => {
        const d = new Date(f.date);
        return d >= now && d <= threeDaysLater;
      })
      .slice(0, 4);
  }, [selectedDiv, ds]);

  // Title race / relegation alerts
  const alerts = useMemo(() => {
    if (standings.length < 3) return [];
    const items: Array<{ type: 'title' | 'relegation'; text: string; teams: string[] }> = [];

    // Title race: check if top 3 are within 6 points
    const top = standings.slice(0, 3);
    const topGap = top[0].pts - top[2].pts;
    if (topGap <= 6 && top[0].p >= 3) {
      items.push({
        type: 'title',
        text: `Title race: ${topGap}pt gap across top 3`,
        teams: top.map(s => s.team),
      });
    }

    // Relegation danger: bottom 2 within 3 points of safety
    if (standings.length >= 6) {
      const bottom = standings.slice(-2);
      const safeTeam = standings[standings.length - 3];
      const relegGap = safeTeam.pts - bottom[1].pts;
      if (relegGap <= 3 && bottom[1].p >= 3) {
        items.push({
          type: 'relegation',
          text: `Relegation battle: ${relegGap}pt gap to safety`,
          teams: bottom.map(s => s.team),
        });
      }
    }

    return items;
  }, [standings]);

  return (
    <div className="relative space-y-4">
      {/* Quick Glance Cards */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-3" staggerDelay={0.1}>
        {/* Empty state when no cards to show */}
        {!myTeamGlance && upcomingMatches.length === 0 && alerts.length === 0 && (
          <div className="col-span-full bg-surface-card rounded-card shadow-card p-6 text-center">
            <Star size={24} className="mx-auto text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">Set your team for a personalised dashboard.</p>
          </div>
        )}

        {/* My Team Card */}
        {myTeam && myTeamGlance && (
          <button
            onClick={() => onTeamClick(myTeam.team)}
            className="card-interactive bg-surface-card rounded-card shadow-card p-4 text-left hover:bg-surface-elevated/50 transition group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star size={14} className="text-accent fill-current" />
                <span className="text-sm font-semibold text-white">{myTeam.team}</span>
              </div>
              <ChevronRight size={14} className="text-gray-600 group-hover:text-gray-400 transition" />
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-400">
                <span className="text-white font-bold">#{myTeamGlance.pos}</span> in {myTeam.div}
              </span>
              <span className="text-gray-400">
                <span className="text-gold font-bold">{myTeamGlance.standing.pts}</span> pts
              </span>
              <div className="flex gap-0.5">
                {myTeamGlance.form.map((r, i) => (
                  <span key={i} className={clsx(
                    'w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center',
                    r === 'W' ? 'bg-win-muted text-win' : r === 'L' ? 'bg-loss-muted text-loss' : 'bg-surface-elevated text-draw'
                  )}>{r}</span>
                ))}
              </div>
            </div>
            {myTeamGlance.nextMatch && (
              <div className="mt-2 text-[10px] text-gray-500">
                Next: <span className="text-gray-300">
                  {myTeamGlance.nextMatch.home === myTeam.team ? 'vs' : '@'}{' '}
                  {myTeamGlance.nextMatch.home === myTeam.team ? myTeamGlance.nextMatch.away : myTeamGlance.nextMatch.home}
                </span>
                {' '}&bull; {myTeamGlance.nextMatch.date}
              </div>
            )}
          </button>
        )}

        {/* Match Day Card */}
        {upcomingMatches.length > 0 && (
          <div className="card-interactive bg-surface-card rounded-card shadow-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-info" />
              <span className="text-sm font-semibold text-white">Upcoming Matches</span>
            </div>
            <div className="space-y-1.5">
              {upcomingMatches.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onTeamClick(f.home)} className="text-gray-200 hover:text-info transition">{f.home}</button>
                    <span className="text-gray-600">vs</span>
                    <button onClick={() => onTeamClick(f.away)} className="text-gray-200 hover:text-info transition">{f.away}</button>
                  </div>
                  <span className="text-gray-600 text-[10px]">{f.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alert Cards */}
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={clsx(
              'card-interactive bg-surface-card rounded-card shadow-card p-4 border-l-2',
              alert.type === 'title' ? 'border-l-gold' : 'border-l-loss',
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {alert.type === 'title'
                ? <Trophy size={14} className="text-gold" />
                : <AlertTriangle size={14} className="text-loss" />
              }
              <span className="text-xs font-semibold text-white">{alert.text}</span>
            </div>
            <div className="flex gap-1.5">
              {alert.teams.map(t => (
                <button
                  key={t}
                  onClick={() => onTeamClick(t)}
                  className="text-[10px] text-gray-400 hover:text-info transition px-1.5 py-0.5 bg-surface/50 rounded"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ))}
      </StaggerList>

      {/* Control buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setShowWidgetLibrary(!showWidgetLibrary)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-card hover:bg-surface-elevated text-gray-300 transition-colors"
          title="Add widgets"
        >
          <Plus size={14} />
          Add Widget
        </button>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isEditMode
              ? 'bg-accent text-white'
              : 'bg-surface-card hover:bg-surface-elevated text-gray-300'
          }`}
          title={isEditMode ? 'Exit edit mode' : 'Edit dashboard'}
        >
          <Settings size={14} />
          {isEditMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Widget Library Panel */}
      <AnimatePresence>
        {showWidgetLibrary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-card rounded-card shadow-card p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-200">Widget Library</h3>
                <button
                  onClick={() => setShowWidgetLibrary(false)}
                  className="p-1 rounded-lg hover:bg-surface-elevated transition-colors"
                  title="Close"
                  aria-label="Close widget library"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <WidgetLibrary onClose={() => setShowWidgetLibrary(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard with widgets */}
      <FadeInOnScroll delay={0.1}>
        <DashboardEditor
          selectedDiv={selectedDiv}
          standings={standings}
          myTeam={myTeam}
          onTeamClick={onTeamClick}
          onPlayerClick={onPlayerClick}
          onPredict={onPredict}
          isEditMode={isEditMode}
        />
      </FadeInOnScroll>
    </div>
  );
}
