'use client';

import { useMemo, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Home, Plane, UserCheck, Globe } from 'lucide-react';
import clsx from 'clsx';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { getPlayerStats, getPlayerStats2526, getPlayerTeams, calcPlayerForm, getPlayerFrameHistory, calcPlayerHomeAway, calcBayesianPct } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';
import { useLeague } from '@/lib/league-context';
import { useAuth } from '@/lib/auth';
import { AIInsightsPanel } from './AIInsightsPanel';
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
        const bdF = playerData.total.bdF || 0;
        const bdA = playerData.total.bdA || 0;

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
