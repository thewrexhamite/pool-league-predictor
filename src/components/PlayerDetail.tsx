'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Home, Plane, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { getPlayerStats, getPlayerStats2526, getPlayerTeams, calcPlayerForm, getPlayerFrameHistory, calcPlayerHomeAway, calcBayesianPct } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';
import { useAuth } from '@/lib/auth';
import { useLeague } from '@/lib/league-context';
import { fetchPlayerCareerData, calculateCareerTrend, calculateImprovementRate, calculateConsistencyMetrics } from '@/lib/stats';
import type { CareerTrend, ImprovementMetrics, ConsistencyMetrics } from '@/lib/stats';
import { AIInsightsPanel } from './AIInsightsPanel';
import CareerTrendChart from './CareerTrendChart';

interface PlayerDetailProps {
  player: string;
  selectedTeam: string | null;
  onBack: () => void;
  onTeamClick: (team: string, div: string) => void;
}

export default function PlayerDetail({ player, selectedTeam, onBack, onTeamClick }: PlayerDetailProps) {
  const { ds, frames } = useActiveData();
  const { user, profile } = useAuth();
  const { selected } = useLeague();
  const stats = getPlayerStats(player, ds);
  const stats2526 = getPlayerStats2526(player, ds);
  const playerTeams = getPlayerTeams(player, ds);

  // Check if the current user has already claimed this player
  const isClaimedByUser = useMemo(() => {
    if (!profile?.claimedProfiles) return false;
    return profile.claimedProfiles.some(cp => cp.name === player);
  }, [profile, player]);

  // Career data state
  const [careerTrend, setCareerTrend] = useState<CareerTrend | null>(null);
  const [improvementMetrics, setImprovementMetrics] = useState<ImprovementMetrics | null>(null);
  const [consistencyMetrics, setConsistencyMetrics] = useState<ConsistencyMetrics | null>(null);
  const [careerLoading, setCareerLoading] = useState(false);

  // Fetch career data when player or league changes
  useEffect(() => {
    // Reset state when player changes
    setCareerTrend(null);
    setImprovementMetrics(null);
    setConsistencyMetrics(null);

    // Only fetch if we have a league ID
    if (!selected?.leagueId) return;

    let cancelled = false;
    const leagueId = selected.leagueId; // Capture for closure

    async function fetchCareerData() {
      setCareerLoading(true);
      try {
        const seasons = await fetchPlayerCareerData(player, leagueId);

        if (cancelled) return;

        // Calculate metrics if we have season data
        if (seasons.length > 0) {
          const trend = calculateCareerTrend(seasons);
          const improvement = calculateImprovementRate(seasons);
          const consistency = calculateConsistencyMetrics(seasons);

          setCareerTrend(trend);
          setImprovementMetrics(improvement);
          setConsistencyMetrics(consistency);
        }
      } catch (error) {
        // Silently handle errors - career data is optional
      } finally {
        if (!cancelled) {
          setCareerLoading(false);
        }
      }
    }

    fetchCareerData();

    return () => {
      cancelled = true;
    };
  }, [player, selected?.leagueId]);

  const form = useMemo(() => frames.length > 0 ? calcPlayerForm(player, frames) : null, [player, frames]);
  const frameHistory = useMemo(() => frames.length > 0 ? getPlayerFrameHistory(player, frames) : [], [player, frames]);
  const homeAway = useMemo(() => frames.length > 0 ? calcPlayerHomeAway(player, frames) : null, [player, frames]);

  // Sparkline data from frame history
  const sparklineData = useMemo(() => {
    return frameHistory.slice(0, 10).reverse().map((f, i) => ({
      idx: i,
      value: f.won ? 1 : 0,
    }));
  }, [frameHistory]);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition">
        <ArrowLeft size={16} /> Back
      </button>
      <h2 className="text-xl font-bold mb-1 text-white">{player}</h2>

      {playerTeams.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {playerTeams.map((pt, i) => (
            <button key={i} onClick={() => onTeamClick(pt.team, pt.div)}
              className="text-xs bg-info-muted/30 text-info px-2.5 py-1 rounded-full hover:bg-info-muted/50 transition"
            >
              {pt.team} ({pt.div})
            </button>
          ))}
        </div>
      )}

      {/* Form section */}
      {form && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            Form
            <span className={clsx(
              'text-xs font-medium',
              form.trend === 'hot' ? 'text-win' : form.trend === 'cold' ? 'text-loss' : 'text-gray-500'
            )}>
              {form.trend === 'hot' && <TrendingUp size={14} className="inline" />}
              {form.trend === 'cold' && <TrendingDown size={14} className="inline" />}
              {' '}{form.trend === 'hot' ? 'Hot' : form.trend === 'cold' ? 'Cold' : 'Steady'}
            </span>
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: `Last 5 (${form.last5.w}/${form.last5.p})`, pct: form.last5.pct, color: 'bg-info' },
              { label: `Last 10 (${form.last10.w}/${form.last10.p})`, pct: form.last10.pct, color: 'bg-accent' },
              { label: 'Season', pct: form.seasonPct, color: 'bg-gray-400' },
            ].map(s => (
              <div key={s.label} className="bg-surface rounded-lg p-3 text-center shadow-card">
                <div className="text-lg font-bold text-white">{s.pct.toFixed(0)}%</div>
                <div className="text-[10px] text-gray-500">{s.label}</div>
                <div className="w-full bg-surface-elevated rounded-full h-1.5 mt-1.5">
                  <div className={clsx('h-1.5 rounded-full', s.color)} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          {sparklineData.length >= 3 && (
            <div className="bg-surface/50 rounded-lg p-3 mb-3">
              <div className="text-[10px] text-gray-500 mb-1">Last {sparklineData.length} frames</div>
              <div className="h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <YAxis domain={[0, 1]} hide />
                    <Line type="monotone" dataKey="value" stroke="#0EA572" strokeWidth={2} dot={{ r: 3, fill: '#0EA572' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Frame history */}
          {frameHistory.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-[10px] text-gray-600 mb-1">Recent frames:</div>
              {frameHistory.slice(0, 10).map((f, i) => (
                <div key={i} className="flex items-center text-xs gap-2">
                  <span className="text-gray-600 w-20 shrink-0">{f.date}</span>
                  <span className={clsx('w-4 font-bold', f.won ? 'text-win' : 'text-loss')}>{f.won ? 'W' : 'L'}</span>
                  <span className="text-gray-500">vs {f.opponent}</span>
                  {f.breakDish && <span className="text-gold text-[10px] bg-gold/10 px-1 rounded">BD</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Home/Away Split */}
      {homeAway && (homeAway.home.p > 0 || homeAway.away.p > 0) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Home / Away</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <span title="Home win %"><Home size={14} className="mx-auto text-win mb-1" /></span>
              <div className="text-lg font-bold text-win">{homeAway.home.pct.toFixed(0)}%</div>
              <div className="text-[10px] text-gray-500">Home ({homeAway.home.w}/{homeAway.home.p})</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <span title="Away win %"><Plane size={14} className="mx-auto text-loss mb-1" /></span>
              <div className="text-lg font-bold text-loss">{homeAway.away.pct.toFixed(0)}%</div>
              <div className="text-[10px] text-gray-500">Away ({homeAway.away.w}/{homeAway.away.p})</div>
            </div>
          </div>
        </div>
      )}

      {/* Career Trend */}
      {careerTrend && (
        <div className="mb-6">
          <CareerTrendChart careerTrend={careerTrend} />
        </div>
      )}

      {/* 25/26 Season */}
      {stats2526 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">25/26 Season</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-2xl font-bold text-white">{stats2526.total.p}</div>
              <div className="text-[10px] text-gray-500">Played</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-2xl font-bold text-win">{stats2526.total.w}</div>
              <div className="text-[10px] text-gray-500">Won</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-2xl font-bold text-info">{calcBayesianPct(stats2526.total.w, stats2526.total.p).toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500">Adj%</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-xl font-bold text-gray-400">{stats2526.total.pct.toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500">Raw Win%</div>
            </div>
          </div>
          {stats2526.teams.length > 1 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-surface-border/30 uppercase tracking-wider text-[10px]">
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">P</th>
                    <th className="text-center p-2">W</th>
                    <th className="text-center p-2">Win%</th>
                    <th className="text-center p-2">BD+</th>
                    <th className="text-center p-2">BD-</th>
                    <th className="text-center p-2">Forf</th>
                  </tr>
                </thead>
                <tbody>
                  {stats2526.teams.map((t, i) => (
                    <tr key={i} className="border-b border-surface-border/20">
                      <td className="p-2 text-info cursor-pointer hover:text-info-light transition" onClick={() => onTeamClick(t.team, t.div)}>
                        {t.team}{t.cup && <span className="ml-1 text-gold text-[9px]">Cup</span>}
                      </td>
                      <td className="p-2 text-center">{t.p}</td>
                      <td className="p-2 text-center text-win">{t.w}</td>
                      <td className="p-2 text-center font-bold">{t.pct.toFixed(1)}%</td>
                      <td className="p-2 text-center text-win">{t.bdF}</td>
                      <td className="p-2 text-center text-loss">{t.bdA}</td>
                      <td className="p-2 text-center text-gold">{t.forf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 24/25 Season */}
      {stats ? (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">24/25 Season</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className={clsx('text-2xl font-bold', stats.rating > 0 ? 'text-win' : stats.rating < 0 ? 'text-loss' : 'text-gray-400')}>
                {stats.rating > 0 ? '+' : ''}{stats.rating.toFixed(2)}
              </div>
              <div className="text-[10px] text-gray-500">Last Season</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-2xl font-bold text-info">{(stats.winPct * 100).toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500">Win Rate</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-2xl font-bold text-white">{stats.played}</div>
              <div className="text-[10px] text-gray-500">Games</div>
            </div>
          </div>
        </div>
      ) : (!stats2526 && <p className="text-gray-500 text-sm">No individual stats available.</p>)}

      <AIInsightsPanel type="player" playerName={player} />

      {/* "Is this you?" prompt - only shown to logged-in users who haven't claimed this profile */}
      {user && !isClaimedByUser && (
        <div className="mt-6 bg-surface/50 rounded-lg p-4 border border-surface-border/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-baize shrink-0" />
              <div>
                <p className="text-sm text-gray-300">Is this you?</p>
                <p className="text-xs text-gray-500">Claim this profile to track your career stats</p>
              </div>
            </div>
            <Link
              href={`/claim?name=${encodeURIComponent(player)}`}
              className="text-sm text-baize hover:text-baize-light transition shrink-0"
            >
              Claim Profile
            </Link>
          </div>
        </div>
      )}

      {/* Show badge if user has claimed this profile */}
      {isClaimedByUser && (
        <div className="mt-6 flex items-center gap-2 text-sm text-baize">
          <UserCheck className="w-4 h-4" />
          <span>This is your claimed profile</span>
        </div>
      )}
    </div>
  );
}
