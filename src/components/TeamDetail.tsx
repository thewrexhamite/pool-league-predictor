'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Home, Plane, Crosshair, Shield, TrendingUp, TrendingDown, Grid3x3, Swords, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import clsx from 'clsx';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import { getTeamResults, getTeamPlayers, calcTeamHomeAway, calcPlayerForm, calcSetPerformance, calcTeamBDStats, calcAppearanceRates, calcBayesianPct } from '@/lib/predictions/index';
import { useActiveData } from '@/lib/active-data-provider';
import { useLeague } from '@/lib/league-context';
import { identifyRivalries } from '@/lib/stats';
import type { MatchResult, StandingEntry as StandingEntryType } from '@/lib/types';
import ShareButton from './ShareButton';
import { generateTeamShareData } from '@/lib/share-utils';
import TeamFormHeatmap from './TeamFormHeatmap';
import RivalryPanel from './RivalryPanel';

interface TeamDetailProps {
  team: string;
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  onBack: () => void;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

interface TeamSeasonRecord {
  seasonLabel: string;
  seasonId: string;
  position: number;
  pts: number;
  w: number;
  d: number;
  l: number;
  f: number;
  a: number;
  p: number;
}

export default function TeamDetail({ team, selectedDiv, standings, onBack, onTeamClick, onPlayerClick }: TeamDetailProps) {
  const { ds, frames } = useActiveData();
  const { selected } = useLeague();
  const teamResults = getTeamResults(team, ds);
  const teamPlayers = getTeamPlayers(team, ds);
  const teamStanding = standings.find(s => s.team === team);
  const teamPos = standings.findIndex(s => s.team === team) + 1;
  const form = teamResults.slice(0, 5).map(r => r.result);

  const homeAway = useMemo(() => calcTeamHomeAway(team, ds.results), [team, ds.results]);
  const setPerf = useMemo(() => frames.length > 0 ? calcSetPerformance(team, frames) : null, [team, frames]);
  const teamBD = useMemo(() => calcTeamBDStats(team, ds.players2526), [team, ds.players2526]);

  const playerForms = useMemo(() => {
    if (frames.length === 0) return new Map<string, ReturnType<typeof calcPlayerForm>>();
    const map = new Map<string, ReturnType<typeof calcPlayerForm>>();
    teamPlayers.forEach(pl => map.set(pl.name, calcPlayerForm(pl.name, frames)));
    return map;
  }, [teamPlayers, frames]);

  const rivalries = useMemo(() => {
    return identifyRivalries(selectedDiv, ds).filter(r => r.teamA === team || r.teamB === team).slice(0, 5);
  }, [selectedDiv, ds, team]);

  const appearanceRates = useMemo(() => {
    if (frames.length === 0) return new Map<string, { rate: number; category: 'core' | 'rotation' | 'fringe'; appearances: number; totalMatches: number }>();
    const rates = calcAppearanceRates(team, frames);
    const map = new Map<string, { rate: number; category: 'core' | 'rotation' | 'fringe'; appearances: number; totalMatches: number }>();
    rates.forEach(r => map.set(r.name, { rate: r.rate, category: r.category, appearances: r.appearances, totalMatches: r.totalMatches }));
    return map;
  }, [team, frames]);

  // Historical multi-season data
  const [historicalSeasons, setHistoricalSeasons] = useState<TeamSeasonRecord[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  useEffect(() => {
    if (!selected?.league.seasons || selected.league.seasons.length <= 1) {
      setHistoricalSeasons([]);
      return;
    }

    let cancelled = false;

    async function fetchTeamHistory() {
      if (!selected) return;
      setLoadingHistorical(true);
      try {
        const { db } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');

        const records: TeamSeasonRecord[] = [];

        for (const season of selected.league.seasons) {
          const docRef = doc(db, 'leagues', selected.leagueId, 'seasons', season.id);
          const snap = await getDoc(docRef);

          if (cancelled) return;

          if (snap.exists()) {
            const data = snap.data();
            const results: MatchResult[] = data.results || [];
            const divisions = data.divisions || {};

            // Find which division this team is in for this season
            let teamDiv: string | null = null;
            for (const [divCode, divData] of Object.entries(divisions)) {
              if ((divData as any).teams?.includes(team)) {
                teamDiv = divCode;
                break;
              }
            }

            if (!teamDiv) continue;

            // Calculate standings from results
            const divTeams: string[] = (divisions[teamDiv] as any)?.teams || [];
            const standingsMap: Record<string, { p: number; w: number; d: number; l: number; f: number; a: number; pts: number }> = {};
            divTeams.forEach(t => {
              standingsMap[t] = { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, pts: 0 };
            });

            for (const r of results) {
              if (!standingsMap[r.home] || !standingsMap[r.away]) continue;
              standingsMap[r.home].p++;
              standingsMap[r.away].p++;
              standingsMap[r.home].f += r.home_score;
              standingsMap[r.home].a += r.away_score;
              standingsMap[r.away].f += r.away_score;
              standingsMap[r.away].a += r.home_score;

              if (r.home_score > r.away_score) {
                standingsMap[r.home].w++;
                standingsMap[r.home].pts += 2;
                standingsMap[r.away].l++;
              } else if (r.home_score < r.away_score) {
                standingsMap[r.away].w++;
                standingsMap[r.away].pts += 3;
                standingsMap[r.away].l++;
              } else {
                standingsMap[r.home].d++;
                standingsMap[r.away].d++;
                standingsMap[r.home].pts++;
                standingsMap[r.away].pts++;
              }
            }

            // Sort and find position
            const sorted = Object.entries(standingsMap)
              .map(([t, s]) => ({ team: t, ...s, diff: s.f - s.a }))
              .sort((a, b) => b.pts - a.pts || b.diff - a.diff);

            const teamEntry = standingsMap[team];
            if (teamEntry && teamEntry.p > 0) {
              const position = sorted.findIndex(s => s.team === team) + 1;
              records.push({
                seasonLabel: season.label,
                seasonId: season.id,
                position,
                pts: teamEntry.pts,
                w: teamEntry.w,
                d: teamEntry.d,
                l: teamEntry.l,
                f: teamEntry.f,
                a: teamEntry.a,
                p: teamEntry.p,
              });
            }
          }
        }

        if (!cancelled) {
          setHistoricalSeasons(records);
        }
      } catch {
        if (!cancelled) setHistoricalSeasons([]);
      } finally {
        if (!cancelled) setLoadingHistorical(false);
      }
    }

    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      fetchTeamHistory();
    } else {
      setHistoricalSeasons([]);
    }

    return () => { cancelled = true; };
  }, [team, selected, selectedDiv]);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition -ml-2 px-2 py-1.5 rounded-lg hover:bg-surface-elevated/50 min-h-[44px]">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-white">{team}</h2>
        <ShareButton
          data={generateTeamShareData({
            div: selectedDiv,
            team: team,
            position: teamPos,
            points: teamStanding?.pts,
          })}
        />
      </div>
      <p className="text-gray-500 text-sm mb-4">{ds.divisions[selectedDiv].name} &bull; #{teamPos}</p>

      {teamStanding && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface rounded-lg p-3 text-center shadow-card">
            <div className="text-2xl font-bold text-gold">{teamStanding.pts}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Points</div>
          </div>
          <div className="bg-surface rounded-lg p-3 text-center shadow-card">
            <div className="text-2xl font-bold text-white">{teamStanding.w}-{teamStanding.d}-{teamStanding.l}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">W-D-L</div>
          </div>
          <div className="bg-surface rounded-lg p-3 text-center shadow-card">
            <div className="text-2xl font-bold text-white">{teamStanding.f}-{teamStanding.a}</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">Frames F-A</div>
          </div>
          <div className="bg-surface rounded-lg p-3 text-center shadow-card">
            <div className="flex justify-center gap-1">
              {form.map((r, i) => (
                <span key={i} className={clsx(
                  'w-6 h-6 rounded text-xs font-bold flex items-center justify-center',
                  r === 'W' ? 'bg-win-muted text-win' : r === 'L' ? 'bg-loss-muted text-loss' : 'bg-surface-elevated text-draw'
                )}>{r}</span>
              ))}
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Form</div>
          </div>
        </div>
      )}

      {/* Home/Away */}
      {(homeAway.home.p > 0 || homeAway.away.p > 0) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Home / Away</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-1.5 justify-center mb-1">
                <span title="Home win %"><Home size={14} className="text-win" /></span>
                <span className="text-lg font-bold text-win">{homeAway.home.winPct.toFixed(0)}%</span>
              </div>
              <div className="text-[10px] text-gray-500 text-center">Home Win%</div>
              <div className="w-full bg-surface-elevated rounded-full h-1.5 mt-1.5">
                <div className="bg-win h-1.5 rounded-full" style={{ width: `${homeAway.home.winPct}%` }} />
              </div>
              <div className="text-[10px] text-gray-600 text-center mt-1">{homeAway.home.w}-{homeAway.home.d}-{homeAway.home.l}</div>
            </div>
            <div className="bg-surface rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-1.5 justify-center mb-1">
                <span title="Away win %"><Plane size={14} className="text-loss" /></span>
                <span className="text-lg font-bold text-loss">{homeAway.away.winPct.toFixed(0)}%</span>
              </div>
              <div className="text-[10px] text-gray-500 text-center">Away Win%</div>
              <div className="w-full bg-surface-elevated rounded-full h-1.5 mt-1.5">
                <div className="bg-loss h-1.5 rounded-full" style={{ width: `${homeAway.away.winPct}%` }} />
              </div>
              <div className="text-[10px] text-gray-600 text-center mt-1">{homeAway.away.w}-{homeAway.away.d}-{homeAway.away.l}</div>
            </div>
          </div>
        </div>
      )}

      {/* Set Performance */}
      {frames.length === 0 ? (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Set Performance</h3>
          <p className="text-xs text-gray-500 text-center py-3">No frame data found for this league.</p>
        </div>
      ) : setPerf && (setPerf.set1.played > 0 || setPerf.set2.played > 0) && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Set Performance</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-lg font-bold text-info">{setPerf.set1.pct.toFixed(0)}%</div>
              <div className="text-[10px] text-gray-500">Set 1 ({setPerf.set1.won}/{setPerf.set1.played})</div>
            </div>
            <div className="bg-surface rounded-lg p-3 text-center shadow-card">
              <div className="text-lg font-bold text-accent">{setPerf.set2.pct.toFixed(0)}%</div>
              <div className="text-[10px] text-gray-500">Set 2 ({setPerf.set2.won}/{setPerf.set2.played})</div>
            </div>
          </div>
          <div className="text-[10px] text-gray-600 text-center mt-1">
            {Math.abs(setPerf.bias) < 3 ? 'Balanced' : setPerf.bias > 0 ? `Stronger Set 1 (+${setPerf.bias.toFixed(0)}pp)` : `Stronger Set 2 (${setPerf.bias.toFixed(0)}pp)`}
          </div>
        </div>
      )}

      {/* B&D */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Break & Dish</h3>
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: Crosshair, label: 'BD+ /g', value: teamBD.bdFRate.toFixed(2), color: 'text-win' },
            { icon: Shield, label: 'BD- /g', value: teamBD.bdARate.toFixed(2), color: 'text-loss' },
            { icon: null, label: 'Net BD', value: `${teamBD.netBD > 0 ? '+' : ''}${teamBD.netBD}`, color: teamBD.netBD > 0 ? 'text-win' : teamBD.netBD < 0 ? 'text-loss' : 'text-gray-400' },
            { icon: null, label: 'Forf /g', value: teamBD.forfRate.toFixed(2), color: 'text-gold' },
          ].map((s, i) => (
            <div key={i} className="bg-surface rounded-lg p-2 text-center shadow-card">
              <div className={clsx('text-sm font-bold', s.color)}>{s.value}</div>
              <div className="text-[9px] text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Heatmap */}
      {teamResults.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Grid3x3 size={14} className="text-accent" />
            Season Form
          </h3>
          <TeamFormHeatmap results={teamResults} />
        </div>
      )}

      {/* Rivalries */}
      {rivalries.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Swords size={14} className="text-accent" />
            Rivalries
          </h3>
          <RivalryPanel rivalries={rivalries} focusTeam={team} onTeamClick={onTeamClick} />
        </div>
      )}

      {/* Squad */}
      {teamPlayers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Squad</h3>
          {frames.length === 0 && (
            <p className="text-[10px] text-gray-600 mb-1">Form and appearance data unavailable — no frame data found.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {teamPlayers.map(pl => {
              const pf = playerForms.get(pl.name);
              const ar = appearanceRates.get(pl.name);
              return (
                <button key={pl.name} onClick={() => onPlayerClick(pl.name)}
                  className="flex justify-between text-xs bg-surface/50 rounded-lg p-2 text-left hover:bg-surface-elevated/50 transition"
                >
                  <span className="text-info flex items-center gap-1.5">
                    {pl.name}
                    {pl.s2526?.cup && <span className="text-gold text-[9px] font-medium" title="Cup appearance — does not affect league predictions">Cup</span>}
                    {pf && pf.trend !== 'steady' && (
                      pf.trend === 'hot'
                        ? <span title="Hot streak"><TrendingUp size={12} className="text-win" /></span>
                        : <span title="Cold streak"><TrendingDown size={12} className="text-loss" /></span>
                    )}
                    {ar && (
                      <span className={clsx(
                        'text-[8px] px-1 rounded',
                        ar.category === 'core' ? 'bg-win-muted/30 text-win' : ar.category === 'rotation' ? 'bg-info-muted/30 text-info' : 'bg-surface-elevated text-gray-500'
                      )} title={ar.category === 'core' ? '80%+ match appearances' : ar.category === 'rotation' ? '40–80% match appearances' : 'Under 40% match appearances'}>
                        {ar.category === 'core' ? 'Core' : ar.category === 'rotation' ? 'Rot' : 'Fringe'}
                      </span>
                    )}
                  </span>
                  <span className="text-gray-500">
                    {pl.s2526 && <><span className="text-white font-medium">{calcBayesianPct(pl.s2526.w, pl.s2526.p).toFixed(0)}%</span> <span className="text-gray-600">({pl.s2526.pct.toFixed(0)}% raw, {pl.s2526.p}P)</span></>}
                    {pl.s2526 && pl.rating !== null && <span className="text-gray-700 mx-1">|</span>}
                    {pl.rating !== null && (
                      <span className={pl.rating > 0 ? 'text-win' : pl.rating < 0 ? 'text-loss' : 'text-gray-400'} title="Last season rating">
                        {pl.rating > 0 ? '+' : ''}{pl.rating.toFixed(2)}
                      </span>
                    )}
                    {!pl.s2526 && pl.rating === null && 'No stats'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Historical Trends */}
      {historicalSeasons.length > 1 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <History size={14} className="text-info" />
            Season History
          </h3>
          <div className="h-48 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historicalSeasons.map(s => ({
                season: s.seasonLabel,
                pts: s.pts,
                position: s.position,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="season" stroke="#9CA3AF" fontSize={11} tick={{ fill: '#9CA3AF' }} />
                <YAxis stroke="#9CA3AF" fontSize={11} tick={{ fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff', fontSize: 12 }}
                  itemStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="pts" fill="#F59E0B" name="Points" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-surface-border/30 uppercase tracking-wider text-[10px]">
                  <th className="text-left p-1.5">Season</th>
                  <th className="text-center p-1.5">Pos</th>
                  <th className="text-center p-1.5">P</th>
                  <th className="text-center p-1.5">W</th>
                  <th className="text-center p-1.5">D</th>
                  <th className="text-center p-1.5">L</th>
                  <th className="text-center p-1.5">Pts</th>
                  <th className="text-center p-1.5">F-A</th>
                </tr>
              </thead>
              <tbody>
                {historicalSeasons.map((s, i) => {
                  const prev = i > 0 ? historicalSeasons[i - 1] : null;
                  const posChange = prev ? prev.position - s.position : 0;
                  return (
                    <tr key={s.seasonId} className="border-b border-surface-border/20">
                      <td className="p-1.5 text-gray-300">{s.seasonLabel}</td>
                      <td className="p-1.5 text-center font-medium text-white">
                        #{s.position}
                        {posChange !== 0 && (
                          <span className={clsx('ml-1 text-[10px]', posChange > 0 ? 'text-win' : 'text-loss')}>
                            {posChange > 0 ? <TrendingUp size={10} className="inline" /> : <TrendingDown size={10} className="inline" />}
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 text-center text-gray-400">{s.p}</td>
                      <td className="p-1.5 text-center text-win">{s.w}</td>
                      <td className="p-1.5 text-center text-draw">{s.d}</td>
                      <td className="p-1.5 text-center text-loss">{s.l}</td>
                      <td className="p-1.5 text-center font-bold text-gold">{s.pts}</td>
                      <td className="p-1.5 text-center text-gray-400">{s.f}-{s.a}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loadingHistorical && (
        <div className="mb-6 flex items-center justify-center py-6">
          <div className="text-sm text-gray-500">Loading historical data...</div>
        </div>
      )}

      {/* Match History */}
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Match History</h3>
      <div className="space-y-1">
        {teamResults.map((r, i) => (
          <div key={i} className="flex items-center text-xs bg-surface/50 rounded-lg p-2">
            <span className="text-gray-500 w-20 shrink-0">{r.date}</span>
            <span className={clsx(
              'w-5 font-bold',
              r.result === 'W' ? 'text-win' : r.result === 'L' ? 'text-loss' : 'text-draw'
            )}>
              {r.result}
            </span>
            <span className="text-gray-500 text-[10px] w-8">{r.isHome ? '(H)' : '(A)'}</span>
            <span className="font-bold w-12 text-center text-white">{r.teamScore}-{r.oppScore}</span>
            <button className="text-gray-300 ml-2 hover:text-info transition" onClick={() => onTeamClick(r.opponent)}>
              vs {r.opponent}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
