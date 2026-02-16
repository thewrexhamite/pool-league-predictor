'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, X, Star, Calendar, TrendingUp, TrendingDown, ChevronRight, Trophy, AlertTriangle, ScanLine, Flame, Users } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { useIsAuthenticated } from '@/lib/auth';
import { getRemainingFixtures, getTeamResults, calcStandings, calcPlayerForm } from '@/lib/predictions/index';
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
  onJoinTable?: () => void;
  onSetMyTeam?: () => void;
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
  onJoinTable,
  onSetMyTeam,
  seasonId,
  seasonLabel,
}: DashboardTabProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const { ds, frames } = useActiveData();
  const isAuthenticated = useIsAuthenticated();

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

  // Title race data for anonymous dashboard
  const titleRace = useMemo(() => {
    if (standings.length < 3) return null;
    const top3 = standings.slice(0, 3);
    return top3.map(s => {
      const results = getTeamResults(s.team, ds);
      const form = results.slice(0, 5).map(r => r.result);
      const gap = top3[0].pts - s.pts;
      return { ...s, form, gap };
    });
  }, [standings, ds]);

  // Best form team + hottest player for anonymous dashboard
  const formSpotlight = useMemo(() => {
    if (standings.length === 0) return null;
    let bestTeam: string | null = null;
    let bestTeamPts = -1;
    for (const s of standings) {
      const results = getTeamResults(s.team, ds);
      const last5 = results.slice(0, 5).map(r => r.result);
      const pts = last5.reduce((acc, r) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
      if (pts > bestTeamPts) {
        bestTeamPts = pts;
        bestTeam = s.team;
      }
    }

    let hotPlayer: { name: string; pct: number } | null = null;
    if (frames.length > 0) {
      const teams = ds.divisions[selectedDiv]?.teams || [];
      const seen = new Set<string>();
      for (const frame of frames.slice(0, 30)) {
        for (const f of frame.frames) {
          for (const team of teams) {
            const name = frame.home === team ? f.homePlayer : frame.away === team ? f.awayPlayer : null;
            if (!name || seen.has(name)) continue;
            seen.add(name);
            const form = calcPlayerForm(name, frames);
            if (!form || form.last5.p < 3) continue;
            if (!hotPlayer || form.last5.pct > hotPlayer.pct) {
              hotPlayer = { name, pct: form.last5.pct };
            }
          }
        }
      }
    }

    return { bestTeam, hotPlayer };
  }, [standings, ds, frames, selectedDiv]);

  return (
    <div className="relative space-y-4">
      {/* Join a Table card — authenticated users only */}
      {isAuthenticated && onJoinTable && (
        <div className="bg-gradient-to-r from-baize/5 to-transparent border border-baize/20 rounded-card shadow-card p-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Join a Table</h3>
            <p className="text-xs text-gray-400 mt-0.5">Scan a kiosk QR code to join the queue</p>
          </div>
          <button
            onClick={onJoinTable}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-baize rounded-lg hover:bg-baize-light transition active:scale-[0.98] shrink-0"
          >
            <ScanLine size={16} />
            Scan QR
          </button>
        </div>
      )}

      {/* Quick Glance Cards */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-3" staggerDelay={0.1}>
        {/* League highlights for anonymous/no-team users */}
        {!myTeamGlance && upcomingMatches.length === 0 && alerts.length === 0 && (
          <>
            {/* Title Race card */}
            {titleRace && (
              <div className="col-span-full bg-surface-card rounded-card shadow-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={14} className="text-gold" />
                  <span className="text-sm font-semibold text-white">Title Race</span>
                </div>
                <div className="space-y-2">
                  {titleRace.map((team, i) => (
                    <button
                      key={team.team}
                      onClick={() => onTeamClick(team.team)}
                      className="w-full flex items-center gap-3 text-left hover:bg-surface-elevated/50 rounded-lg p-2 transition"
                    >
                      <span className={clsx(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                        i === 0 ? 'bg-gold/20 text-gold' : 'bg-surface-elevated text-gray-400'
                      )}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-white flex-1 truncate">{team.team}</span>
                      <div className="flex gap-0.5 shrink-0">
                        {team.form.map((r, j) => (
                          <span key={j} className={clsx(
                            'w-3.5 h-3.5 rounded text-[8px] font-bold flex items-center justify-center',
                            r === 'W' ? 'bg-win-muted text-win' : r === 'L' ? 'bg-loss-muted text-loss' : 'bg-surface-elevated text-draw'
                          )}>{r}</span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right shrink-0">
                        <span className="text-gold font-bold">{team.pts}</span> pts
                      </span>
                      {i > 0 && (
                        <span className="text-[10px] text-gray-600 w-6 text-right shrink-0">-{team.gap}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form Spotlight card */}
            {formSpotlight && (formSpotlight.bestTeam || formSpotlight.hotPlayer) && (
              <div className="bg-surface-card rounded-card shadow-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Flame size={14} className="text-orange-400" />
                  <span className="text-sm font-semibold text-white">Form Spotlight</span>
                </div>
                <div className="space-y-2">
                  {formSpotlight.bestTeam && (
                    <button
                      onClick={() => onTeamClick(formSpotlight.bestTeam!)}
                      className="w-full flex items-center justify-between text-left hover:bg-surface-elevated/50 rounded-lg p-2 transition"
                    >
                      <div className="flex items-center gap-2">
                        <TrendingUp size={12} className="text-win" />
                        <span className="text-xs text-gray-400">Best Form</span>
                      </div>
                      <span className="text-sm text-white font-medium">{formSpotlight.bestTeam}</span>
                    </button>
                  )}
                  {formSpotlight.hotPlayer && (
                    <button
                      onClick={() => onPlayerClick(formSpotlight.hotPlayer!.name)}
                      className="w-full flex items-center justify-between text-left hover:bg-surface-elevated/50 rounded-lg p-2 transition"
                    >
                      <div className="flex items-center gap-2">
                        <Users size={12} className="text-info" />
                        <span className="text-xs text-gray-400">Hottest Player</span>
                      </div>
                      <span className="text-sm text-white font-medium">
                        {formSpotlight.hotPlayer.name}
                        <span className="text-baize ml-1 text-xs">{formSpotlight.hotPlayer.pct.toFixed(0)}%</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Set My Team CTA */}
            <div className="bg-gradient-to-r from-accent-muted/10 to-transparent border border-accent/20 rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Star size={14} className="text-accent" />
                <span className="text-sm font-semibold text-white">Follow Your Team</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Follow your team&apos;s fixtures, form & predictions.
              </p>
              {onSetMyTeam && (
                <button
                  onClick={onSetMyTeam}
                  className="px-4 py-2 bg-accent hover:bg-accent-light text-white rounded-lg text-sm font-medium transition"
                >
                  Set My Team
                </button>
              )}
            </div>
          </>
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
