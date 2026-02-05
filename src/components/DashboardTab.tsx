'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Clock,
  Flame,
  Snowflake,
} from 'lucide-react';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import MyTeamDashboard from './MyTeamDashboard';
import {
  getRemainingFixtures,
  getTeamResults,
  calcPlayerForm,
  getDiv,
  parseDate,
} from '@/lib/predictions';

interface DashboardTabProps {
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  myTeam: { team: string; div: DivisionCode } | null;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
  onPredict: (home: string, away: string) => void;
}

export default function DashboardTab({
  selectedDiv,
  standings,
  myTeam,
  onTeamClick,
  onPlayerClick,
  onPredict,
}: DashboardTabProps) {
  const { data: activeData, ds, frames } = useActiveData();

  const divResults = useMemo(() =>
    ds.results.filter(r => getDiv(r.home, ds) === selectedDiv),
    [ds, selectedDiv]
  );

  const remaining = useMemo(() => getRemainingFixtures(selectedDiv, ds), [selectedDiv, ds]);
  const totalPlayed = divResults.length;
  const totalGames = totalPlayed + remaining.length;
  const pct = totalGames > 0 ? Math.round((totalPlayed / totalGames) * 100) : 0;

  // Recent results (last matchday)
  const recentResults = useMemo(() => {
    const sorted = [...divResults].sort((a, b) => parseDate(b.date).localeCompare(parseDate(a.date)));
    if (sorted.length === 0) return [];
    const lastDate = sorted[0].date;
    return sorted.filter(r => r.date === lastDate);
  }, [divResults]);

  // Next fixtures (next date)
  const nextFixtures = useMemo(() => {
    if (remaining.length === 0) return [];
    const sorted = [...remaining].sort((a, b) => parseDate(a.date).localeCompare(parseDate(b.date)));
    const nextDate = sorted[0].date;
    return sorted.filter(f => f.date === nextDate);
  }, [remaining]);

  // Form: last 5 for each team
  const teamForms = useMemo(() => {
    const forms: Record<string, { results: ('W' | 'L' | 'D')[]; pts: number }> = {};
    for (const s of standings) {
      const teamRes = getTeamResults(s.team, ds);
      const last5 = teamRes.slice(0, 5).map(r => r.result);
      const pts = last5.reduce((acc, r) => acc + (r === 'W' ? 3 : r === 'D' ? 1 : 0), 0);
      forms[s.team] = { results: last5, pts };
    }
    return forms;
  }, [standings, ds]);

  // Hot & cold teams
  const bestFormTeam = useMemo(() => {
    let best = standings[0]?.team;
    let bestPts = 0;
    for (const [team, form] of Object.entries(teamForms)) {
      if (form.pts > bestPts) {
        bestPts = form.pts;
        best = team;
      }
    }
    return best;
  }, [standings, teamForms]);

  const worstFormTeam = useMemo(() => {
    let worst = standings[standings.length - 1]?.team;
    let worstPts = 999;
    for (const [team, form] of Object.entries(teamForms)) {
      if (form.results.length >= 3 && form.pts < worstPts) {
        worstPts = form.pts;
        worst = team;
      }
    }
    return worst;
  }, [standings, teamForms]);

  // Hot & cold players
  const { hotPlayer, coldPlayer } = useMemo(() => {
    if (frames.length === 0) return { hotPlayer: null, coldPlayer: null };
    const teams = ds.divisions[selectedDiv].teams;
    let hot: { name: string; pct: number } | null = null;
    let cold: { name: string; pct: number } | null = null;
    const seen = new Set<string>();

    for (const team of teams) {
      for (const frame of frames) {
        if (frame.home !== team && frame.away !== team) continue;
        for (const f of frame.frames) {
          const name = frame.home === team ? f.homePlayer : f.awayPlayer;
          if (!name || seen.has(name)) continue;
          seen.add(name);
          const form = calcPlayerForm(name, frames);
          if (!form || form.last5.p < 3) continue;
          if (!hot || form.last5.pct > hot.pct) hot = { name, pct: form.last5.pct };
          if (!cold || form.last5.pct < cold.pct) cold = { name, pct: form.last5.pct };
        }
      }
    }
    return { hotPlayer: hot, coldPlayer: cold };
  }, [frames, ds.divisions, selectedDiv]);

  const leader = standings[0];

  // Time ago for data freshness
  const timeAgo = useMemo(() => {
    if (!activeData.lastUpdated) return 'Unknown';
    const diff = Date.now() - activeData.lastUpdated;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  }, [activeData.lastUpdated]);

  return (
    <div className="space-y-4">
      {myTeam && myTeam.div === selectedDiv && (
        <MyTeamDashboard
          team={myTeam.team}
          div={myTeam.div}
          standings={standings}
          onTeamClick={onTeamClick}
          onPlayerClick={onPlayerClick}
          onPredict={onPredict}
        />
      )}

      {/* Season Progress */}
      <div className="bg-surface-card rounded-card shadow-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300">Season Progress</h3>
          <span className="text-xs text-gray-500">{pct}% complete</span>
        </div>
        <div className="w-full bg-surface-elevated rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-baize-dark to-baize-light rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          {totalPlayed} played &bull; {remaining.length} remaining
        </p>
      </div>

      {/* Title Race + Relegation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title Race */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-win mb-3 flex items-center gap-1.5">
            <TrendingUp size={16} />
            Title Race
          </h3>
          <div className="space-y-2">
            {standings.slice(0, 4).map((s, i) => {
              const gap = leader ? leader.pts - s.pts : 0;
              const isMyTeam = myTeam?.team === s.team && myTeam?.div === selectedDiv;
              return (
                <button
                  key={s.team}
                  onClick={() => onTeamClick(s.team)}
                  className={clsx(
                    'w-full flex items-center gap-2 p-2 rounded-lg text-left transition hover:bg-surface-elevated',
                    isMyTeam && 'ring-1 ring-accent/40 bg-accent-muted/10'
                  )}
                >
                  <span className={clsx(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    i === 0 ? 'bg-gold text-surface' : 'bg-surface-elevated text-gray-400'
                  )}>
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm text-white font-medium truncate">{s.team}</span>
                  <div className="flex items-center gap-1.5">
                    {teamForms[s.team]?.results.map((r, j) => (
                      <span
                        key={j}
                        className={clsx(
                          'w-4 h-4 rounded-sm text-[9px] font-bold flex items-center justify-center',
                          r === 'W' ? 'bg-win-muted text-win' : r === 'L' ? 'bg-loss-muted text-loss' : 'bg-surface-elevated text-draw'
                        )}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gold w-8 text-right">{s.pts}</span>
                  {gap > 0 && <span className="text-xs text-gray-500 w-8 text-right">-{gap}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Relegation Battle */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-loss mb-3 flex items-center gap-1.5">
            <TrendingDown size={16} />
            Relegation Battle
          </h3>
          <div className="space-y-2">
            {standings.slice(-4).map((s, i) => {
              const pos = standings.length - 4 + i + 1;
              const safetyLine = standings.length > 2 ? standings[standings.length - 3].pts : 0;
              const gap = safetyLine - s.pts;
              const isMyTeam = myTeam?.team === s.team && myTeam?.div === selectedDiv;
              return (
                <button
                  key={s.team}
                  onClick={() => onTeamClick(s.team)}
                  className={clsx(
                    'w-full flex items-center gap-2 p-2 rounded-lg text-left transition hover:bg-surface-elevated',
                    pos > standings.length - 2 && 'border-l-2 border-loss',
                    isMyTeam && 'ring-1 ring-accent/40 bg-accent-muted/10'
                  )}
                >
                  <span className="w-6 h-6 rounded-full bg-surface-elevated flex items-center justify-center text-xs font-bold text-gray-400">
                    {pos}
                  </span>
                  <span className="flex-1 text-sm text-white font-medium truncate">{s.team}</span>
                  <div className="flex items-center gap-1.5">
                    {teamForms[s.team]?.results.map((r, j) => (
                      <span
                        key={j}
                        className={clsx(
                          'w-4 h-4 rounded-sm text-[9px] font-bold flex items-center justify-center',
                          r === 'W' ? 'bg-win-muted text-win' : r === 'L' ? 'bg-loss-muted text-loss' : 'bg-surface-elevated text-draw'
                        )}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-gold w-8 text-right">{s.pts}</span>
                  {gap > 0 && <span className="text-xs text-loss w-10 text-right">-{gap}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Next Matchday + Recent Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Matchday */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-info mb-3 flex items-center gap-1.5">
            <Calendar size={16} />
            Next Matchday
            {nextFixtures.length > 0 && <span className="text-gray-500 font-normal text-xs ml-1">{nextFixtures[0].date}</span>}
          </h3>
          {nextFixtures.length === 0 ? (
            <p className="text-xs text-gray-500">All fixtures completed</p>
          ) : (
            <div className="space-y-1.5">
              {nextFixtures.map(f => {
                const isMyFixture = myTeam && (f.home === myTeam.team || f.away === myTeam.team) && myTeam.div === selectedDiv;
                return (
                  <div
                    key={f.home + f.away}
                    className={clsx(
                      'flex items-center text-sm p-2 rounded-lg',
                      isMyFixture ? 'bg-accent-muted/20 border border-accent/30' : 'bg-surface/50'
                    )}
                  >
                    <span className="flex-1 text-right text-gray-300 truncate">{f.home}</span>
                    <span className="mx-2 text-gray-600 text-xs">vs</span>
                    <span className="flex-1 text-gray-300 truncate">{f.away}</span>
                    <button
                      onClick={() => onPredict(f.home, f.away)}
                      className="ml-2 text-baize hover:text-baize-light transition text-xs shrink-0"
                      aria-label={`Predict ${f.home} vs ${f.away}`}
                      title="Predict match"
                    >
                      <Target size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Results */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <Clock size={16} />
            Recent Results
            {recentResults.length > 0 && <span className="text-gray-500 font-normal text-xs ml-1">{recentResults[0].date}</span>}
          </h3>
          {recentResults.length === 0 ? (
            <p className="text-xs text-gray-500">No results yet</p>
          ) : (
            <div className="space-y-1.5">
              {recentResults.map((r, i) => {
                const homeWin = r.home_score > r.away_score;
                const awayWin = r.away_score > r.home_score;
                return (
                  <div key={i} className="flex items-center text-sm p-2 rounded-lg bg-surface/50">
                    <span
                      className={clsx('flex-1 text-right truncate cursor-pointer hover:text-info', homeWin && 'font-semibold text-white')}
                      onClick={() => onTeamClick(r.home)}
                    >
                      {r.home}
                    </span>
                    <span className="mx-3 font-bold text-center w-12">
                      {r.home_score} - {r.away_score}
                    </span>
                    <span
                      className={clsx('flex-1 truncate cursor-pointer hover:text-info', awayWin && 'font-semibold text-white')}
                      onClick={() => onTeamClick(r.away)}
                    >
                      {r.away}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hot & Cold */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-card rounded-card shadow-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame size={14} className="text-win" />
            <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Best Form Team</span>
          </div>
          {bestFormTeam ? (
            <button onClick={() => onTeamClick(bestFormTeam)} className="text-sm font-medium text-white hover:text-info transition truncate block w-full text-left">
              {bestFormTeam}
            </button>
          ) : <span className="text-xs text-gray-500">-</span>}
        </div>
        <div className="bg-surface-card rounded-card shadow-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Snowflake size={14} className="text-loss" />
            <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Worst Form Team</span>
          </div>
          {worstFormTeam ? (
            <button onClick={() => onTeamClick(worstFormTeam)} className="text-sm font-medium text-white hover:text-info transition truncate block w-full text-left">
              {worstFormTeam}
            </button>
          ) : <span className="text-xs text-gray-500">-</span>}
        </div>
        <div className="bg-surface-card rounded-card shadow-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-win" />
            <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Hottest Player</span>
          </div>
          {hotPlayer ? (
            <button onClick={() => onPlayerClick(hotPlayer.name)} className="text-sm font-medium text-white hover:text-info transition truncate block w-full text-left">
              {hotPlayer.name} <span className="text-win text-xs">{hotPlayer.pct.toFixed(0)}%</span>
            </button>
          ) : <span className="text-xs text-gray-500">-</span>}
        </div>
        <div className="bg-surface-card rounded-card shadow-card p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={14} className="text-loss" />
            <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Coldest Player</span>
          </div>
          {coldPlayer ? (
            <button onClick={() => onPlayerClick(coldPlayer.name)} className="text-sm font-medium text-white hover:text-info transition truncate block w-full text-left">
              {coldPlayer.name} <span className="text-loss text-xs">{coldPlayer.pct.toFixed(0)}%</span>
            </button>
          ) : <span className="text-xs text-gray-500">-</span>}
        </div>
      </div>

      {/* Data Freshness */}
      <div className="text-center text-xs text-gray-600">
        Data last updated: {timeAgo} &bull; Source: {activeData.source}
      </div>
    </div>
  );
}
