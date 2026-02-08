'use client';

import { useMemo, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { Share2 } from 'lucide-react';
import clsx from 'clsx';
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import type { DivisionCode, PredictionResult, SquadOverrides, H2HRecord, PredictionSnapshot } from '@/lib/types';
import { getTeamPlayers, getSquadH2H, calcSetPerformance, generateScoutingReport, suggestLineup } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';
import { AIInsightsPanel } from './AIInsightsPanel';
import ShareButton from './ShareButton';
import { generatePredictionShareData } from '@/lib/share-utils';
import { useToast } from './ToastProvider';

const DEVICE_ID_KEY = 'pool-league-device-id';

function generateDeviceId(): string {
  return 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

interface PredictTabProps {
  selectedDiv: DivisionCode;
  homeTeam: string;
  awayTeam: string;
  prediction: PredictionResult | null;
  squadOverrides: SquadOverrides;
  onHomeTeamChange: (team: string) => void;
  onAwayTeamChange: (team: string) => void;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function PredictTab({
  selectedDiv,
  homeTeam,
  awayTeam,
  prediction,
  squadOverrides,
  onHomeTeamChange,
  onAwayTeamChange,
  onTeamClick,
  onPlayerClick,
}: PredictTabProps) {
  const { data: activeData, ds, frames } = useActiveData();
  const { addToast } = useToast();
  const teams = ds.divisions[selectedDiv].teams;

  const h2hRecords = useMemo(() => {
    if (!homeTeam || !awayTeam || frames.length === 0) return [];
    return getSquadH2H(homeTeam, awayTeam, frames, ds.rosters);
  }, [homeTeam, awayTeam, frames, ds.rosters]);

  const homeSetPerf = useMemo(
    () => homeTeam && frames.length > 0 ? calcSetPerformance(homeTeam, frames) : null,
    [homeTeam, frames]
  );
  const awaySetPerf = useMemo(
    () => awayTeam && frames.length > 0 ? calcSetPerformance(awayTeam, frames) : null,
    [awayTeam, frames]
  );

  const homeScoutReport = useMemo(() => {
    if (!homeTeam || !awayTeam || frames.length === 0) return null;
    return generateScoutingReport(awayTeam, frames, ds.results, ds.players2526);
  }, [awayTeam, homeTeam, frames, ds.results, ds.players2526]);

  const awayScoutReport = useMemo(() => {
    if (!homeTeam || !awayTeam || frames.length === 0) return null;
    return generateScoutingReport(homeTeam, frames, ds.results, ds.players2526);
  }, [homeTeam, awayTeam, frames, ds.results, ds.players2526]);

  const homeLineup = useMemo(() => {
    if (!homeTeam || !awayTeam || frames.length === 0) return null;
    return suggestLineup(homeTeam, awayTeam, true, frames, ds.players2526, ds.rosters);
  }, [homeTeam, awayTeam, frames, ds.players2526, ds.rosters]);

  const awayLineup = useMemo(() => {
    if (!homeTeam || !awayTeam || frames.length === 0) return null;
    return suggestLineup(awayTeam, homeTeam, false, frames, ds.players2526, ds.rosters);
  }, [homeTeam, awayTeam, frames, ds.players2526, ds.rosters]);

  const h2hMap = useMemo(() => {
    const map = new Map<string, H2HRecord>();
    for (const r of h2hRecords) {
      map.set(r.playerA + '|' + r.playerB, r);
    }
    return map;
  }, [h2hRecords]);

  const { homePlayers, awayPlayers } = useMemo(() => {
    const hp = new Set<string>();
    const ap = new Set<string>();
    for (const r of h2hRecords) {
      hp.add(r.playerA);
      ap.add(r.playerB);
    }
    return { homePlayers: [...hp], awayPlayers: [...ap] };
  }, [h2hRecords]);

  // Store prediction to Firestore when generated
  const lastPredictionRef = useRef<string>('');
  useEffect(() => {
    if (!prediction || !homeTeam || !awayTeam) return;

    // Create a fingerprint to detect new predictions
    const fingerprint = `${homeTeam}|${awayTeam}|${prediction.pHomeWin}|${prediction.pDraw}|${prediction.pAwayWin}`;
    if (fingerprint === lastPredictionRef.current) return;
    lastPredictionRef.current = fingerprint;

    // Store prediction asynchronously
    (async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;

      try {
        const { db } = await import('@/lib/firebase');
        const deviceId = getDeviceId();
        if (!deviceId) return;

        // Generate prediction ID
        const predictionId = `${deviceId}_${Date.now()}`;

        // Determine predicted winner
        const pHome = parseFloat(prediction.pHomeWin);
        const pDraw = parseFloat(prediction.pDraw);
        const pAway = parseFloat(prediction.pAwayWin);
        const maxProb = Math.max(pHome, pDraw, pAway);
        let predictedWinner: 'home' | 'away' | 'draw';
        if (pHome === maxProb) predictedWinner = 'home';
        else if (pAway === maxProb) predictedWinner = 'away';
        else predictedWinner = 'draw';

        // Create prediction snapshot
        const snapshot: PredictionSnapshot = {
          id: predictionId,
          seasonId: '2025-26', // Current season
          date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
          home: homeTeam,
          away: awayTeam,
          division: selectedDiv,
          predictedAt: Date.now(),
          pHomeWin: pHome / 100, // Convert percentage to 0-1
          pDraw: pDraw / 100,
          pAwayWin: pAway / 100,
          expectedHome: parseFloat(prediction.expectedHome),
          expectedAway: parseFloat(prediction.expectedAway),
          confidence: maxProb / 100,
          predictedWinner,
        };

        // Store to Firestore
        const docRef = doc(db, 'predictions', predictionId);
        await setDoc(docRef, snapshot);
      } catch {
        // Firestore unavailable - silent fail
      }
    })();
  }, [prediction, homeTeam, awayTeam, selectedDiv]);

  const handleShare = () => {
    if (!prediction || !homeTeam || !awayTeam) return;
    const text = `${homeTeam} vs ${awayTeam} — Home Win ${prediction.pHomeWin}% | Draw ${prediction.pDraw}% | Away Win ${prediction.pAwayWin}%`;
    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => addToast('Copied to clipboard', 'info'));
    }
  };

  // Score distribution data for chart
  const scoreChartData = prediction?.topScores.map(s => ({
    score: s.score,
    pct: parseFloat(s.pct),
  })) || [];

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Match Prediction</h2>
        {prediction && homeTeam && awayTeam && (
          <ShareButton
            data={generatePredictionShareData({
              div: selectedDiv,
              home: homeTeam,
              away: awayTeam,
              homeWinPct: parseFloat(prediction.pHomeWin),
            })}
            title="Share prediction"
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide font-medium">Home Team</label>
          <select
            value={homeTeam}
            onChange={(e) => onHomeTeamChange(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-lg p-3 text-sm text-white focus:outline-none focus:border-baize"
          >
            <option value="">Select home team...</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide font-medium">Away Team</label>
          <select
            value={awayTeam}
            onChange={(e) => onAwayTeamChange(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-lg p-3 text-sm text-white focus:outline-none focus:border-baize"
          >
            <option value="">Select away team...</option>
            {teams.filter(t => t !== homeTeam).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {prediction && (
        <div className="space-y-4">
          {/* Baseline banner */}
          {prediction.baseline && (
            <div className="p-3 bg-accent-muted/20 border border-accent/20 rounded-lg text-sm">
              <span className="text-accent-light font-medium">Squad changes active — </span>
              <span className="text-gray-400">Original: </span>
              <span className="text-win">{prediction.baseline.pHomeWin}%</span>
              <span className="text-gray-600"> / </span>
              <span className="text-draw">{prediction.baseline.pDraw}%</span>
              <span className="text-gray-600"> / </span>
              <span className="text-loss">{prediction.baseline.pAwayWin}%</span>
              <span className="text-gray-600 mx-2">&rarr;</span>
              <span className="text-win">{prediction.pHomeWin}%</span>
              <span className="text-gray-600"> / </span>
              <span className="text-draw">{prediction.pDraw}%</span>
              <span className="text-gray-600"> / </span>
              <span className="text-loss">{prediction.pAwayWin}%</span>
            </div>
          )}

          {/* Probability gauges */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Home Win (+2pts)', pct: parseFloat(prediction.pHomeWin), color: '#22c55e', bg: 'bg-win-muted/20', text: 'text-win' },
              { label: 'Draw (+1pt)', pct: parseFloat(prediction.pDraw), color: '#94a3b8', bg: 'bg-surface-elevated/30', text: 'text-draw' },
              { label: 'Away Win (+3pts)', pct: parseFloat(prediction.pAwayWin), color: '#ef4444', bg: 'bg-loss-muted/20', text: 'text-loss' },
            ].map(g => (
              <div key={g.label} className={clsx('rounded-lg p-3 text-center', g.bg)}>
                <div className="w-20 h-20 mx-auto mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{ value: g.pct }]}>
                      <RadialBar dataKey="value" fill={g.color} background={{ fill: '#161E2E' }} cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className={clsx('text-xl md:text-2xl font-bold', g.text)}>{g.pct}%</div>
                <div className="text-[10px] text-gray-500">{g.label}</div>
                {prediction.baseline && (
                  <div className="text-[10px] text-gray-600 mt-0.5">
                    was {g.label.includes('Home') ? prediction.baseline.pHomeWin : g.label.includes('Draw') ? prediction.baseline.pDraw : prediction.baseline.pAwayWin}%
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Expected score */}
          <div className="bg-surface/50 rounded-lg p-4 text-center">
            <span className="text-2xl font-bold text-white">{prediction.expectedHome} - {prediction.expectedAway}</span>
            <span className="text-gray-500 ml-2 text-sm">Expected</span>
            {prediction.baseline && (
              <span className="text-gray-600 text-sm ml-2">(was {prediction.baseline.expectedHome} - {prediction.baseline.expectedAway})</span>
            )}
          </div>

          {/* Score distribution chart */}
          {scoreChartData.length > 0 && (
            <div className="bg-surface/50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Score Distribution</h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreChartData} margin={{ left: -10 }}>
                    <XAxis dataKey="score" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#161E2E', border: '1px solid #3A4A5C', borderRadius: 8, fontSize: 12 }}
                      formatter={(value) => [`${value}%`, 'Probability']}
                      labelFormatter={(label) => `Score: ${label}`}
                    />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                      {scoreChartData.map((entry, i) => {
                        const [h, a] = entry.score.split('-').map(Number);
                        return <Cell key={i} fill={h > a ? '#22c55e' : h < a ? '#ef4444' : '#94a3b8'} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Set Performance */}
          {homeSetPerf && awaySetPerf && homeTeam && awayTeam && (
            <div className="bg-surface/50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Set Performance</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="text-gray-500 border-b border-surface-border/30">
                      <th className="text-left p-2">Team</th>
                      <th className="text-center p-2">Set 1</th>
                      <th className="text-center p-2">Set 2</th>
                      <th className="text-center p-2">Bias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { team: homeTeam, perf: homeSetPerf, color: 'text-win' },
                      { team: awayTeam, perf: awaySetPerf, color: 'text-loss' },
                    ].map(side => (
                      <tr key={side.team} className="border-b border-surface-border/20">
                        <td className={clsx('p-2 font-medium', side.color)}>{side.team}</td>
                        <td className="p-2 text-center">{side.perf.set1.pct.toFixed(0)}% <span className="text-gray-600">({side.perf.set1.won}/{side.perf.set1.played})</span></td>
                        <td className="p-2 text-center">{side.perf.set2.pct.toFixed(0)}% <span className="text-gray-600">({side.perf.set2.won}/{side.perf.set2.played})</span></td>
                        <td className="p-2 text-center">
                          <span className={clsx(
                            Math.abs(side.perf.bias) < 3 ? 'text-gray-500' : side.perf.bias > 0 ? 'text-info' : 'text-accent'
                          )}>
                            {Math.abs(side.perf.bias) < 3 ? 'Even' : side.perf.bias > 0 ? `Early +${side.perf.bias.toFixed(0)}pp` : `Late +${Math.abs(side.perf.bias).toFixed(0)}pp`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* H2H Matrix */}
          {h2hRecords.length > 0 && homeTeam && awayTeam && (
            <div className="bg-surface/50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Head-to-Head</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-surface-border/30">
                      <th className="text-left p-1.5 text-win font-medium">{homeTeam}</th>
                      {awayPlayers.map(ap => (
                        <th key={ap} className="text-center p-1.5 cursor-pointer hover:text-info text-loss font-medium transition" onClick={() => onPlayerClick(ap)}>
                          {ap.split(' ').pop()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {homePlayers.map(hp => (
                      <tr key={hp} className="border-b border-surface-border/20">
                        <td className="p-1.5 text-info cursor-pointer hover:text-info-light font-medium whitespace-nowrap transition" onClick={() => onPlayerClick(hp)}>
                          {hp}
                        </td>
                        {awayPlayers.map(ap => {
                          const record = h2hMap.get(hp + '|' + ap);
                          if (!record) return <td key={ap} className="p-1.5 text-center text-gray-700">-</td>;
                          const total = record.wins + record.losses;
                          const favorable = record.wins > record.losses;
                          const unfavorable = record.wins < record.losses;
                          return (
                            <td key={ap} className={clsx(
                              'p-1.5 text-center font-bold',
                              favorable ? 'text-win bg-win-muted/10' : unfavorable ? 'text-loss bg-loss-muted/10' : 'text-gray-400'
                            )} title={`${hp} vs ${ap}: ${record.wins}W-${record.losses}L`}>
                              {record.wins}-{record.losses}
                              {total >= 3 && <div className="text-[9px] font-normal text-gray-600">{((record.wins / total) * 100).toFixed(0)}%</div>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] text-gray-600 mt-2">From {homeTeam} perspective (W-L)</div>
            </div>
          )}

          {/* Scouting Reports */}
          {homeScoutReport && awayScoutReport && homeTeam && awayTeam && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: homeTeam + ' scouting ' + awayTeam, report: homeScoutReport, color: 'win' },
                { label: awayTeam + ' scouting ' + homeTeam, report: awayScoutReport, color: 'loss' },
              ].map(side => (
                <div key={side.label} className="bg-surface/50 rounded-lg p-4">
                  <h4 className={clsx('font-semibold text-sm mb-3', `text-${side.color}`)}>Scouting Report: {side.report.opponent}</h4>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-[10px] text-gray-600 w-16">Recent Form:</span>
                    {side.report.teamForm.map((r, i) => (
                      <span key={i} className={clsx(
                        'w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center',
                        r === 'W' ? 'bg-win-muted text-win' : r === 'L' ? 'bg-loss-muted text-loss' : 'bg-surface-elevated text-draw'
                      )}>{r}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[10px] mb-2">
                    <div className="text-gray-500">Home Win%: <span className="text-white font-medium">{side.report.homeAway.home.winPct.toFixed(0)}%</span></div>
                    <div className="text-gray-500">Away Win%: <span className="text-white font-medium">{side.report.homeAway.away.winPct.toFixed(0)}%</span></div>
                    {side.report.setPerformance && (
                      <>
                        <div className="text-gray-500">Set 1 Win%: <span className="text-white font-medium">{side.report.setPerformance.set1.pct.toFixed(0)}%</span></div>
                        <div className="text-gray-500">Set 2 Win%: <span className="text-white font-medium">{side.report.setPerformance.set2.pct.toFixed(0)}%</span></div>
                      </>
                    )}
                    <div className="text-gray-500">Break & Dish: <span className={clsx(
                      side.report.bdStats.netBD > 0 ? 'text-win' : side.report.bdStats.netBD < 0 ? 'text-loss' : 'text-white',
                      'font-medium'
                    )}>{side.report.bdStats.netBD > 0 ? '+' : ''}{side.report.bdStats.netBD}</span></div>
                    <div className="text-gray-500">Forfeits: <span className="text-gold font-medium">{(side.report.forfeitRate * 100).toFixed(0)}%</span></div>
                  </div>
                  <div className="text-[10px] mb-1">
                    <span className="text-gray-600">Strongest: </span>
                    {side.report.strongestPlayers.map((p, i) => (
                      <span key={i}>
                        <button className="text-win hover:text-win/80 transition" onClick={() => onPlayerClick(p.name)}>{p.name}</button>
                        <span className="text-gray-700"> {p.adjPct.toFixed(0)}%</span>
                        <span className="text-gray-800"> ({p.pct.toFixed(0)}%)</span>
                        {i < side.report.strongestPlayers.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                  <div className="text-[10px]">
                    <span className="text-gray-600">Weakest: </span>
                    {side.report.weakestPlayers.map((p, i) => (
                      <span key={i}>
                        <button className="text-loss hover:text-loss/80 transition" onClick={() => onPlayerClick(p.name)}>{p.name}</button>
                        <span className="text-gray-700"> {p.adjPct.toFixed(0)}%</span>
                        <span className="text-gray-800"> ({p.pct.toFixed(0)}%)</span>
                        {i < side.report.weakestPlayers.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lineup Suggestions */}
          {homeLineup && awayLineup && homeTeam && awayTeam && (
            <div className="bg-surface/50 rounded-lg p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Suggested Lineups</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { team: homeTeam, lineup: homeLineup, color: 'win' },
                  { team: awayTeam, lineup: awayLineup, color: 'loss' },
                ].map(side => (
                  <div key={side.team}>
                    <h5 className={clsx('text-xs font-bold mb-2', `text-${side.color}`)}>{side.team}</h5>
                    {[
                      { label: 'Set 1', players: side.lineup.set1 },
                      { label: 'Set 2', players: side.lineup.set2 },
                    ].map(set => (
                      <div key={set.label} className="mb-2">
                        <div className="text-[10px] text-gray-600 mb-0.5">{set.label}</div>
                        {set.players.map((p, i) => (
                          <button key={p.name} className="w-full flex justify-between text-[11px] py-0.5 hover:text-info transition text-left" onClick={() => onPlayerClick(p.name)}>
                            <span className="text-gray-300">
                              {i + 1}. {p.name}
                              {p.h2hAdvantage > 0 && <span className="text-win ml-1">+{p.h2hAdvantage}</span>}
                              {p.h2hAdvantage < 0 && <span className="text-loss ml-1">{p.h2hAdvantage}</span>}
                            </span>
                            <span className="text-gray-600">
                              {p.score.toFixed(0)}
                              {p.formPct !== null && <span className="ml-1 text-gray-700">F:{p.formPct.toFixed(0)}</span>}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                    {side.lineup.insights.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {side.lineup.insights.map((insight, i) => (
                          <div key={i} className="text-[10px] text-gold/80">{insight}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Squad display */}
          {(homeTeam || awayTeam) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { team: homeTeam, color: 'win' },
                { team: awayTeam, color: 'loss' },
              ].map(side => {
                if (!side.team) return null;
                const basePlayers = getTeamPlayers(side.team, ds);
                const override = squadOverrides[side.team];
                const removedSet = override ? new Set(override.removed || []) : new Set<string>();
                const addedNames = override ? override.added || [] : [];

                return (
                  <div key={side.team} className="bg-surface/50 rounded-lg p-4">
                    <h4 className={clsx('font-semibold mb-2 text-sm', `text-${side.color}`)}>
                      <button className="hover:underline" onClick={() => onTeamClick(side.team)}>{side.team}</button> — Squad
                      {override && <span className="text-accent text-xs ml-2">(modified)</span>}
                    </h4>
                    <div className="space-y-0.5">
                      {basePlayers.map(pl => (
                        <button key={pl.name} onClick={() => onPlayerClick(pl.name)}
                          className={clsx(
                            'w-full flex justify-between text-xs rounded p-1.5 text-left transition hover:bg-surface-elevated/50',
                            removedSet.has(pl.name) && 'line-through opacity-40'
                          )}
                        >
                          <span className={removedSet.has(pl.name) ? 'text-gray-600' : 'text-info'}>{pl.name}</span>
                          <span className="text-gray-500">
                            {pl.s2526 && <span className="text-white font-medium">{pl.s2526.pct.toFixed(0)}% ({pl.s2526.p}g)</span>}
                            {pl.s2526 && pl.rating !== null && <span className="text-gray-700 mx-1">|</span>}
                            {pl.rating !== null && (
                              <span className={pl.rating > 0 ? 'text-win' : pl.rating < 0 ? 'text-loss' : 'text-gray-400'} title="Last season rating">
                                {pl.rating > 0 ? '+' : ''}{pl.rating.toFixed(2)}
                              </span>
                            )}
                            {!pl.s2526 && pl.rating === null && 'No stats'}
                          </span>
                        </button>
                      ))}
                      {addedNames.map(name => {
                        const s2526 = ds.players2526[name];
                        const s2425 = ds.players[name];
                        return (
                          <button key={name} onClick={() => onPlayerClick(name)}
                            className="w-full flex justify-between text-xs rounded p-1.5 text-left border-l-2 border-win pl-2 transition hover:bg-surface-elevated/50"
                          >
                            <span className="text-win/80">+ {name}</span>
                            <span className="text-gray-500">
                              {s2526 && <span className="text-white font-medium">{s2526.total.pct.toFixed(0)}% ({s2526.total.p}g)</span>}
                              {s2526 && s2425 && <span className="text-gray-700 mx-1">|</span>}
                              {s2425 && (
                                <span className={s2425.r > 0 ? 'text-win' : s2425.r < 0 ? 'text-loss' : 'text-gray-400'} title="Last season rating">
                                  {s2425.r > 0 ? '+' : ''}{s2425.r.toFixed(2)}
                                </span>
                              )}
                              {!s2526 && !s2425 && 'No stats'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {basePlayers.length === 0 && addedNames.length === 0 && <p className="text-xs text-gray-600">No roster data</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {homeTeam && awayTeam && <AIInsightsPanel type="match" homeTeam={homeTeam} awayTeam={awayTeam} />}
    </div>
  );
}
