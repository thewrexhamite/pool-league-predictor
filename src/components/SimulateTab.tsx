'use client';

import { useState } from 'react';
import { Dices, Share2, BarChart3 } from 'lucide-react';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DivisionCode, SimulationResult, WhatIfResult, SquadOverrides } from '@/lib/types';
import { DIVISIONS } from '@/lib/data';
import { calcStrengthAdjustments } from '@/lib/predictions';
import { useToast } from './ToastProvider';

interface SimulateTabProps {
  selectedDiv: DivisionCode;
  simResults: SimulationResult[] | null;
  isSimulating: boolean;
  whatIfResults: WhatIfResult[];
  whatIfSimResults: WhatIfResult[] | null;
  squadOverrides: SquadOverrides;
  squadTopN: number;
  myTeam: { team: string; div: DivisionCode } | null;
  onRunSimulation: () => void;
  onTeamClick: (team: string) => void;
}

export default function SimulateTab({
  selectedDiv,
  simResults,
  isSimulating,
  whatIfResults,
  whatIfSimResults,
  squadOverrides,
  squadTopN,
  myTeam,
  onRunSimulation,
  onTeamClick,
}: SimulateTabProps) {
  const { addToast } = useToast();
  const [showChart, setShowChart] = useState(false);

  const handleShare = () => {
    if (!simResults) return;
    const text = `Pool League Pro — ${DIVISIONS[selectedDiv].name} Simulation\n\n` +
      simResults.slice(0, 4).map((r, i) =>
        `${i + 1}. ${r.team}: Title ${r.pTitle}% | Top2 ${r.pTop2}%`
      ).join('\n');

    if (navigator.share) {
      navigator.share({ text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => addToast('Copied to clipboard', 'info'));
    }
  };

  const chartData = simResults?.map(r => ({
    team: r.team.length > 12 ? r.team.slice(0, 12) + '...' : r.team,
    fullTeam: r.team,
    'Title%': parseFloat(r.pTitle),
    'Top2%': parseFloat(r.pTop2),
    'Bot2%': parseFloat(r.pBot2),
  }));

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Season Simulation — {DIVISIONS[selectedDiv].name}</h2>
        {simResults && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChart(!showChart)}
              className="p-1.5 text-gray-400 hover:text-white transition rounded"
              title={showChart ? 'Show table' : 'Show chart'}
            >
              <BarChart3 size={18} />
            </button>
            <button onClick={handleShare} className="p-1.5 text-gray-400 hover:text-white transition rounded" title="Share">
              <Share2 size={18} />
            </button>
          </div>
        )}
      </div>

      <p className="text-gray-500 mb-4 text-sm">
        1,000 Monte Carlo simulations based on current form
        {whatIfResults.length > 0 && ` (with ${whatIfResults.length} locked result${whatIfResults.length > 1 ? 's' : ''})`}
        {Object.keys(squadOverrides).length > 0 && ` (with ${Object.keys(squadOverrides).length} squad change${Object.keys(squadOverrides).length > 1 ? 's' : ''})`}
      </p>

      <button
        onClick={onRunSimulation}
        disabled={isSimulating}
        className={clsx(
          'w-full flex items-center justify-center gap-2 font-bold py-3 px-6 rounded-lg mb-6 transition text-fixed-white',
          isSimulating
            ? 'bg-surface-elevated text-gray-400 cursor-not-allowed'
            : 'bg-baize hover:bg-baize-dark shadow-card'
        )}
      >
        <Dices size={20} className={clsx(isSimulating && 'animate-spin')} />
        {isSimulating ? 'Simulating...' : 'Run Season Simulation'}
      </button>

      {!simResults && !isSimulating && (
        <div className="text-center py-8">
          <Dices size={48} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500 text-sm">Click above to run 1,000 season simulations</p>
        </div>
      )}

      {simResults && (
        <>
          {whatIfSimResults && whatIfSimResults.length > 0 && (
            <div className="mb-4 p-3 bg-amber-900/20 border border-amber-600/20 rounded-lg text-sm">
              <span className="text-gold font-medium">What-If applied: </span>
              {whatIfSimResults.map((wi, i) => (
                <span key={i} className="text-gray-300">
                  {wi.home} {wi.homeScore}-{wi.awayScore} {wi.away}
                  {i < whatIfSimResults.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}
          {Object.keys(squadOverrides).length > 0 && (
            <div className="mb-4 p-3 bg-accent-muted/20 border border-accent/20 rounded-lg text-sm">
              <span className="text-accent-light font-medium">Squad changes: </span>
              {Object.entries(squadOverrides).map(([team, ov], i) => {
                const adj = calcStrengthAdjustments(selectedDiv, squadOverrides, squadTopN);
                const d = adj[team];
                return (
                  <span key={team} className="text-gray-300">
                    {team} ({d !== undefined ? (d > 0 ? '+' : '') + d.toFixed(3) : 'n/a'})
                    {i < Object.keys(squadOverrides).length - 1 ? ', ' : ''}
                  </span>
                );
              })}
            </div>
          )}

          {showChart && chartData ? (
            <div className="h-80 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis type="category" dataKey="team" width={100} tick={{ fill: '#e2e8f0', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161E2E', border: '1px solid #3A4A5C', borderRadius: 8 }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Bar dataKey="Title%" fill="#D4A855" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Top2%" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Bot2%" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider text-[10px] md:text-xs border-b border-surface-border">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-right p-2">Now</th>
                    <th className="text-right p-2">Pred</th>
                    <th className="text-right p-2">Title%</th>
                    <th className="text-right p-2">Top2%</th>
                    <th className="text-right p-2">Bot2%</th>
                  </tr>
                </thead>
                <tbody>
                  {simResults.map((r, i) => {
                    const isMyTeam = myTeam?.team === r.team && myTeam?.div === selectedDiv;
                    return (
                      <tr
                        key={r.team}
                        className={clsx(
                          'border-b border-surface-border/30 cursor-pointer transition hover:bg-surface-elevated/50',
                          i < 2 && 'border-l-[3px] border-l-win bg-win-muted/10',
                          i >= simResults.length - 2 && 'border-l-[3px] border-l-loss bg-loss-muted/10',
                          isMyTeam && 'bg-baize-muted/20',
                          i >= 2 && i < simResults.length - 2 && !isMyTeam && 'border-l-[3px] border-l-transparent'
                        )}
                        onClick={() => onTeamClick(r.team)}
                      >
                        <td className="p-2 text-gray-500">{i + 1}</td>
                        <td className="p-2 font-medium text-info">{r.team}</td>
                        <td className="p-2 text-right text-gray-400">{r.currentPts}</td>
                        <td className="p-2 text-right font-bold text-white">{r.avgPts}</td>
                        <td className="p-2 text-right text-gold">{r.pTitle}%</td>
                        <td className="p-2 text-right text-win">{r.pTop2}%</td>
                        <td className="p-2 text-right text-loss">{r.pBot2}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
