'use client';

import { useMemo } from 'react';
import { ArrowLeft, Home, Plane, Crosshair, Shield, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import { getTeamResults, getTeamPlayers, calcTeamHomeAway, calcPlayerForm, calcSetPerformance, calcTeamBDStats, calcAppearanceRates, calcBayesianPct } from '@/lib/predictions/index';
import { useActiveData } from '@/lib/active-data-provider';
import ShareButton from './ShareButton';
import { generateTeamShareData } from '@/lib/share-utils';

interface TeamDetailProps {
  team: string;
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  onBack: () => void;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function TeamDetail({ team, selectedDiv, standings, onBack, onTeamClick, onPlayerClick }: TeamDetailProps) {
  const { ds, frames } = useActiveData();
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

  const appearanceRates = useMemo(() => {
    if (frames.length === 0) return new Map<string, { rate: number; category: 'core' | 'rotation' | 'fringe'; appearances: number; totalMatches: number }>();
    const rates = calcAppearanceRates(team, frames);
    const map = new Map<string, { rate: number; category: 'core' | 'rotation' | 'fringe'; appearances: number; totalMatches: number }>();
    rates.forEach(r => map.set(r.name, { rate: r.rate, category: r.category, appearances: r.appearances, totalMatches: r.totalMatches }));
    return map;
  }, [team, frames]);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition">
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
      {setPerf && (setPerf.set1.played > 0 || setPerf.set2.played > 0) && (
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

      {/* Squad */}
      {teamPlayers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Squad</h3>
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
