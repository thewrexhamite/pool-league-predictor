'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Home, Plane, UserCheck, History, Trophy, Award, Globe, Zap } from 'lucide-react';
import clsx from 'clsx';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { getPlayerStats, getPlayerStats2526, getPlayerTeams, calcPlayerForm, getPlayerFrameHistory, calcPlayerHomeAway, calcBayesianPct } from '@/lib/predictions/index';
import { useActiveData } from '@/lib/active-data-provider';
import { useLeague } from '@/lib/league-context';
import { useAuth } from '@/lib/auth';
import { fetchPlayerCareerData, calculateCareerTrend, calculateImprovementRate, calculateConsistencyMetrics, calcClutchIndex } from '@/lib/stats';
import type { CareerTrend, ImprovementMetrics, ConsistencyMetrics } from '@/lib/stats';
import { AIInsightsPanel } from './AIInsightsPanel';
import SeasonComparisonChart, { type SeasonPlayerStats } from './SeasonComparisonChart';
import CareerTrendChart from './CareerTrendChart';
import type { Players2526Map } from '@/lib/types';

interface PlayerDetailProps {
  player: string;
  selectedTeam: string | null;
  onBack: () => void;
  onTeamClick: (team: string, div: string) => void;
}

export default function PlayerDetail({ player, selectedTeam, onBack, onTeamClick }: PlayerDetailProps) {
  const { ds, frames } = useActiveData();
  const { leagues, selected } = useLeague();
  const { user, profile } = useAuth();
  const stats = getPlayerStats(player, ds);
  const stats2526 = getPlayerStats2526(player, ds);
  const playerTeams = getPlayerTeams(player, ds);

  // Cross-league data state
  const [crossLeagueData, setCrossLeagueData] = useState<
    Map<string, { leagueName: string; players2526: Players2526Map }>
  >(new Map());
  const [loadingCrossLeague, setLoadingCrossLeague] = useState(false);

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
  const clutchProfile = useMemo(() => {
    if (frames.length === 0) return null;
    return calcClutchIndex(player, frames, ds.results);
  }, [player, frames, ds.results]);

  // Sparkline data from frame history
  const sparklineData = useMemo(() => {
    return frameHistory.slice(0, 10).reverse().map((f, i) => ({
      idx: i,
      value: f.won ? 1 : 0,
    }));
  }, [frameHistory]);

  // Historical season data
  const [historicalSeasons, setHistoricalSeasons] = useState<SeasonPlayerStats[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  useEffect(() => {
    if (!selected?.league.seasons || selected.league.seasons.length <= 1) {
      setHistoricalSeasons([]);
      return;
    }

    let cancelled = false;

    async function fetchHistoricalStats() {
      if (!selected) return;
      setLoadingHistorical(true);
      try {
        const { db } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');

        const seasonStats: SeasonPlayerStats[] = [];

        // Fetch player data from each season
        for (const season of selected.league.seasons) {
          const docRef = doc(db, 'leagues', selected.leagueId, 'seasons', season.id);
          const snap = await getDoc(docRef);

          if (cancelled) return;

          if (snap.exists()) {
            const data = snap.data();
            const players = data.players || {};
            const players2526 = data.players2526 || {};

            // Try to get stats from either data source
            let rating: number | null = null;
            let winPct: number | null = null;
            let gamesPlayed: number | null = null;

            // Check 24/25 season data (players map)
            if (players[player]) {
              rating = players[player].r || null;
              winPct = players[player].w || null;
              gamesPlayed = players[player].p || null;
            }

            // Check 25/26 season data (players2526 map) - prefer this if available
            if (players2526[player]) {
              const p2526 = players2526[player];
              if (p2526.total) {
                gamesPlayed = p2526.total.p || null;
                winPct = p2526.total.pct ? p2526.total.pct / 100 : null;
                // rating stays from players map if available
              }
            }

            // Only add season if player has some data
            if (rating !== null || winPct !== null || gamesPlayed !== null) {
              seasonStats.push({
                seasonId: season.id,
                seasonLabel: season.label,
                rating,
                winPct,
                gamesPlayed,
              });
            }
          }
        }

        if (!cancelled) {
          setHistoricalSeasons(seasonStats);
        }
      } catch (error) {
        // Firestore error - just show no historical data
        if (!cancelled) {
          setHistoricalSeasons([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingHistorical(false);
        }
      }
    }

    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      fetchHistoricalStats();
    } else {
      setHistoricalSeasons([]);
      setLoadingHistorical(false);
    }

    return () => {
      cancelled = true;
    };
  }, [player, selected]);

  // Fetch cross-league player data
  useEffect(() => {
    async function fetchCrossLeagueData() {
      if (leagues.length <= 1) return; // Skip if only one league

      setLoadingCrossLeague(true);
      try {
        const dataMap = new Map<string, { leagueName: string; players2526: Players2526Map }>();

        // Fetch data for each league
        for (const league of leagues) {
          try {
            const response = await fetch(`/api/leagues/${league.id}/data`);
            if (response.ok) {
              const data = await response.json();
              if (data.players2526 && Object.keys(data.players2526).length > 0) {
                dataMap.set(league.id, {
                  leagueName: league.name,
                  players2526: data.players2526,
                });
              }
            }
          } catch (err) {
            // Skip leagues that don't have data available
            console.warn(`Failed to fetch data for league ${league.name}:`, err);
          }
        }

        // Fallback to current league data if API doesn't exist
        if (dataMap.size === 0 && selected && stats2526) {
          dataMap.set(selected.leagueId, {
            leagueName: selected.league.name,
            players2526: ds.players2526,
          });
        }

        setCrossLeagueData(dataMap);
      } catch (err) {
        console.error('Error fetching cross-league data:', err);
      } finally {
        setLoadingCrossLeague(false);
      }
    }

    fetchCrossLeagueData();
  }, [leagues, player, selected, stats2526, ds.players2526]);

  // Aggregate cross-league stats
  const crossLeagueStats = useMemo(() => {
    if (crossLeagueData.size === 0) return null;

    const leagueStats: Array<{
      leagueId: string;
      leagueName: string;
      p: number;
      w: number;
      pct: number;
      bdF: number;
      bdA: number;
    }> = [];

    let totalP = 0;
    let totalW = 0;
    let totalBdF = 0;
    let totalBdA = 0;

    crossLeagueData.forEach((leagueData, leagueId) => {
      const playerData = leagueData.players2526[player];
      if (playerData) {
        const p = playerData.total.p;
        const w = playerData.total.w;
        const pct = p > 0 ? (w / p) * 100 : 0;
        const bdF = (playerData.total as any).bdF || 0;
        const bdA = (playerData.total as any).bdA || 0;

        leagueStats.push({
          leagueId,
          leagueName: leagueData.leagueName,
          p,
          w,
          pct,
          bdF,
          bdA,
        });

        totalP += p;
        totalW += w;
        totalBdF += bdF;
        totalBdA += bdA;
      }
    });

    const totalPct = totalP > 0 ? (totalW / totalP) * 100 : 0;

    return {
      leagues: leagueStats,
      total: {
        p: totalP,
        w: totalW,
        pct: totalPct,
        bdF: totalBdF,
        bdA: totalBdA,
      },
    };
  }, [crossLeagueData, player]);

  return (
    <div className="card-interactive bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition -ml-2 px-2 py-1.5 rounded-lg hover:bg-surface-elevated/50 min-h-[44px]">
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

      {/* No frame data notice */}
      {frames.length === 0 && (
        <div className="mb-6 bg-surface rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">No frame data found — form, home/away and clutch stats are unavailable for this league.</p>
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

      {/* Home/Away Split - Enhanced with bar chart */}
      {homeAway && (homeAway.home.p > 0 || homeAway.away.p > 0) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Home / Away</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
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
          {/* Bar visualization */}
          {homeAway.home.p >= 2 && homeAway.away.p >= 2 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 w-10">Home</span>
                <div className="flex-1 bg-surface rounded-full h-2">
                  <div className="bg-info h-2 rounded-full transition-all" style={{ width: `${homeAway.home.pct}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 w-10">Away</span>
                <div className="flex-1 bg-surface rounded-full h-2">
                  <div className="bg-warning h-2 rounded-full transition-all" style={{ width: `${homeAway.away.pct}%` }} />
                </div>
              </div>
              <div className="text-[10px] text-gray-600 text-center">
                {Math.abs(homeAway.home.pct - homeAway.away.pct) < 5
                  ? 'Performs consistently at home and away'
                  : homeAway.home.pct > homeAway.away.pct
                    ? `+${(homeAway.home.pct - homeAway.away.pct).toFixed(0)}pp better at home`
                    : `+${(homeAway.away.pct - homeAway.home.pct).toFixed(0)}pp better away`
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clutch Badge */}
      {clutchProfile && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Zap size={14} className={clsx(
              clutchProfile.label === 'clutch' ? 'text-win' : clutchProfile.label === 'choke' ? 'text-loss' : 'text-gray-500'
            )} />
            Clutch Performance
          </h3>
          <div className="bg-surface rounded-lg p-3 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className={clsx(
                'px-2 py-0.5 rounded text-xs font-semibold uppercase',
                clutchProfile.label === 'clutch' && 'bg-win/20 text-win',
                clutchProfile.label === 'choke' && 'bg-loss/20 text-loss',
                clutchProfile.label === 'neutral' && 'bg-gray-600/20 text-gray-400',
              )}>
                {clutchProfile.label}
              </span>
              <span className={clsx(
                'text-lg font-bold',
                clutchProfile.clutchRating > 0.15 ? 'text-win' : clutchProfile.clutchRating < -0.15 ? 'text-loss' : 'text-gray-400'
              )}>
                {clutchProfile.clutchRating > 0 ? '+' : ''}{(clutchProfile.clutchRating * 100).toFixed(0)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-gray-500">Close matches</div>
                <div className="text-white font-medium">{clutchProfile.closeMatchRecord.pct.toFixed(0)}% ({clutchProfile.closeMatchRecord.w}/{clutchProfile.closeMatchRecord.p})</div>
              </div>
              <div>
                <div className="text-gray-500">Late frames</div>
                <div className="text-white font-medium">{clutchProfile.lateFrameRecord.pct.toFixed(0)}% ({clutchProfile.lateFrameRecord.w}/{clutchProfile.lateFrameRecord.p})</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Consistency Metrics */}
      {consistencyMetrics && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            Consistency
            <span className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              consistencyMetrics.consistency === 'high' ? 'bg-win/20 text-win' :
              consistencyMetrics.consistency === 'low' ? 'bg-loss/20 text-loss' :
              'bg-gray-500/20 text-gray-400'
            )}>
              {consistencyMetrics.consistency === 'high' ? 'High' : consistencyMetrics.consistency === 'low' ? 'Low' : 'Medium'}
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-lg p-3 text-center shadow-card" title="Lower variance indicates more consistent performance across seasons">
              <div className="text-lg font-bold text-white">
                {consistencyMetrics.winRateVariance.toFixed(3)}
              </div>
              <div className="text-[10px] text-gray-500">Win Rate Variance</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card" title="Standard deviation of win rate across seasons">
              <div className="text-lg font-bold text-white">
                {consistencyMetrics.winRateStdDev.toFixed(3)}
              </div>
              <div className="text-[10px] text-gray-500">Std Dev</div>
            </div>
          </div>
          {consistencyMetrics.ratingVariance !== null && consistencyMetrics.ratingStdDev !== null && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-surface rounded-lg p-3 text-center shadow-card" title="Variance in rating across seasons">
                <div className="text-lg font-bold text-white">
                  {consistencyMetrics.ratingVariance.toFixed(3)}
                </div>
                <div className="text-[10px] text-gray-500">Rating Variance</div>
              </div>
              <div className="bg-surface rounded-lg p-3 text-center shadow-card" title="Standard deviation of rating across seasons">
                <div className="text-lg font-bold text-white">
                  {consistencyMetrics.ratingStdDev.toFixed(3)}
                </div>
                <div className="text-[10px] text-gray-500">Rating Std Dev</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Improvement Rate */}
      {improvementMetrics && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            Season-to-Season Change
            <span className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              improvementMetrics.trend === 'improving' ? 'bg-win/20 text-win' :
              improvementMetrics.trend === 'declining' ? 'bg-loss/20 text-loss' :
              'bg-gray-500/20 text-gray-400'
            )}>
              {improvementMetrics.trend === 'improving' && <TrendingUp size={12} className="inline mr-0.5" />}
              {improvementMetrics.trend === 'declining' && <TrendingDown size={12} className="inline mr-0.5" />}
              {improvementMetrics.trend === 'improving' ? 'Improving' : improvementMetrics.trend === 'declining' ? 'Declining' : 'Stable'}
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className={clsx(
                'text-lg font-bold',
                improvementMetrics.winRateChange > 0 ? 'text-win' :
                improvementMetrics.winRateChange < 0 ? 'text-loss' :
                'text-gray-400'
              )}>
                {improvementMetrics.winRateChange > 0 ? '+' : ''}{improvementMetrics.winRateChange.toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-500">Win Rate Change</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className={clsx(
                'text-lg font-bold',
                improvementMetrics.winRateChangePercent > 0 ? 'text-win' :
                improvementMetrics.winRateChangePercent < 0 ? 'text-loss' :
                'text-gray-400'
              )}>
                {improvementMetrics.winRateChangePercent > 0 ? '+' : ''}{improvementMetrics.winRateChangePercent.toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-500">Relative Change</div>
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

      {/* Career Highlights */}
      {careerTrend && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Trophy size={14} className="text-gold" />
            Career Highlights
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {/* Peak Win Rate */}
            <div className="bg-surface rounded-lg p-3 text-center shadow-card" title="Career best win rate">
              <Award size={16} className="mx-auto text-gold mb-1" />
              <div className="text-lg font-bold text-gold">
                {(careerTrend.peakWinRate.value * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-500">Career High</div>
            </div>

            {/* Peak Season */}
            <div className="bg-surface rounded-lg p-3 text-center shadow-card" title="Season when peak performance was achieved">
              <div className="text-lg font-bold text-info">
                {careerTrend.peakWinRate.seasonId.length === 4
                  ? `${careerTrend.peakWinRate.seasonId.slice(0,2)}/${careerTrend.peakWinRate.seasonId.slice(2,4)}`
                  : careerTrend.peakWinRate.seasonId}
              </div>
              <div className="text-[10px] text-gray-500">Peak Season</div>
            </div>

            {/* Current vs Peak */}
            <div className="bg-surface rounded-lg p-3 text-center shadow-card" title="Current performance relative to career peak">
              <div className={clsx(
                'text-lg font-bold',
                careerTrend.currentVsPeak.winRateDiff >= 0 ? 'text-win' : 'text-loss'
              )}>
                {careerTrend.currentVsPeak.winRateDiff >= 0 ? '+' : ''}{careerTrend.currentVsPeak.winRateDiff.toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-500">vs Peak</div>
            </div>
          </div>
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

      {/* Historical Season Comparison */}
      {historicalSeasons.length > 1 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <History size={14} />
            Career History
          </h3>
          <SeasonComparisonChart
            playerName={player}
            seasons={historicalSeasons}
            chartType="line"
          />
        </div>
      )}

      {loadingHistorical && (
        <div className="mb-6">
          <div className="skeleton h-4 w-40 mb-3" />
          <div className="space-y-2">
            <div className="skeleton h-8 w-full" />
            <div className="skeleton h-8 w-full" />
          </div>
        </div>
      )}

      {/* Cross-League Stats */}
      {crossLeagueStats && crossLeagueStats.leagues.length > 1 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Globe size={14} className="text-info" />
            Cross-League Stats
          </h3>

          {/* Total stats across all leagues */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-2xl font-bold text-white">{crossLeagueStats.total.p}</div>
              <div className="text-[10px] text-gray-500">Total Played</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-2xl font-bold text-win">{crossLeagueStats.total.w}</div>
              <div className="text-[10px] text-gray-500">Total Won</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-2xl font-bold text-info">{crossLeagueStats.total.pct.toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500">Overall Win%</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-xl font-bold text-gray-400">{crossLeagueStats.leagues.length}</div>
              <div className="text-[10px] text-gray-500">Leagues</div>
            </div>
          </div>

          {/* Per-league breakdown */}
          <div className="bg-surface/50 rounded-lg p-3">
            <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide">League Breakdown</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-surface-border/30 uppercase tracking-wider text-[10px]">
                    <th className="text-left p-2">League</th>
                    <th className="text-center p-2">P</th>
                    <th className="text-center p-2">W</th>
                    <th className="text-center p-2">Win%</th>
                    <th className="text-center p-2">BD+</th>
                    <th className="text-center p-2">BD-</th>
                  </tr>
                </thead>
                <tbody>
                  {crossLeagueStats.leagues.map((league, i) => (
                    <tr key={league.leagueId} className="border-b border-surface-border/20">
                      <td className="p-2 text-gray-300">{league.leagueName}</td>
                      <td className="p-2 text-center">{league.p}</td>
                      <td className="p-2 text-center text-win">{league.w}</td>
                      <td className="p-2 text-center font-bold">{league.pct.toFixed(1)}%</td>
                      <td className="p-2 text-center text-win">{league.bdF}</td>
                      <td className="p-2 text-center text-loss">{league.bdA}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {loadingCrossLeague && leagues.length > 1 && (
        <div className="mb-6 bg-surface/50 rounded-lg p-4 text-center">
          <div className="text-xs text-gray-500">Loading cross-league stats...</div>
        </div>
      )}

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
