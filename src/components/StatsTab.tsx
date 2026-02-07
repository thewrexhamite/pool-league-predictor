'use client';

import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Trophy, TrendingUp, Target, Flame, Award } from 'lucide-react';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getTeamPlayers, calcBayesianPct, calcBDStats } from '@/lib/predictions';

interface StatsTabProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function StatsTab({ selectedDiv, onTeamClick, onPlayerClick }: StatsTabProps) {
  const [minGames, setMinGames] = useState(5);
  const { ds } = useActiveData();

  const divisionName = ds.divisions[selectedDiv]?.name || selectedDiv;
  const teams = ds.divisions[selectedDiv].teams;

  // Calculate all players in division with stats
  const divPlayers = useMemo(() => {
    const list: Array<{
      name: string;
      s2526: { p: number; w: number; pct: number; bdF: number; bdA: number; forf: number } | null;
      team: string;
      bdFRate: number;
      bdARate: number;
      adjPct: number;
    }> = [];
    const seen = new Set<string>();
    teams.forEach(team => {
      const roster = getTeamPlayers(team, ds);
      roster.forEach(pl => {
        if (pl.s2526 && !seen.has(pl.name + ':' + team)) {
          seen.add(pl.name + ':' + team);
          const bd = calcBDStats(pl.s2526);
          const adjPct = calcBayesianPct(pl.s2526.w, pl.s2526.p);
          list.push({ ...pl, team, bdFRate: bd.bdFRate, bdARate: bd.bdARate, adjPct });
        }
      });
    });
    return list;
  }, [teams, ds]);

  // Top players by adjusted win percentage
  const topPlayers = useMemo(() => {
    return divPlayers
      .filter(p => p.s2526 && p.s2526.p >= minGames)
      .sort((a, b) => b.adjPct - a.adjPct)
      .slice(0, 10);
  }, [divPlayers, minGames]);

  // Best Break & Dish For (highest bdFRate)
  const topBDFor = useMemo(() => {
    return divPlayers
      .filter(p => p.s2526 && p.s2526.p >= minGames)
      .sort((a, b) => b.bdFRate - a.bdFRate)
      .slice(0, 10);
  }, [divPlayers, minGames]);

  // Best Break & Dish Against (lowest bdARate - fewer conceded is better)
  const topBDAgainst = useMemo(() => {
    return divPlayers
      .filter(p => p.s2526 && p.s2526.p >= minGames)
      .sort((a, b) => a.bdARate - b.bdARate)
      .slice(0, 10);
  }, [divPlayers, minGames]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy size={20} className="text-accent" />
            {divisionName} — League Statistics
          </h2>

          {/* Min games filter */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Min:</span>
            {[5, 10, 15, 20].map(n => (
              <button
                key={n}
                onClick={() => setMinGames(n)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                  minGames === n ? 'bg-baize text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                )}
              >
                {n}+
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-400">
          Comprehensive leaderboards and statistics across the league
        </p>
      </div>

      {/* Top Players Section */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-sm font-semibold text-accent mb-3 flex items-center gap-1.5">
          <Trophy size={16} />
          Top Players by Win %
        </h3>
        {topPlayers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No players with {minGames}+ games</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="text-gray-500 uppercase tracking-wider text-[10px] md:text-xs border-b border-surface-border">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Player</th>
                  <th className="text-left p-2">Team</th>
                  <th className="text-center p-2">P</th>
                  <th className="text-center p-2">W</th>
                  <th className="text-center p-2" title="Confidence-adjusted win%">Adj%</th>
                  <th className="text-center p-2">Win%</th>
                  <th className="text-center p-2" title="Break & Dish won per game">BD+</th>
                  <th className="text-center p-2" title="Break & Dish conceded per game">BD-</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((p, i) => (
                  <tr
                    key={p.name + p.team}
                    className="border-b border-surface-border/30 cursor-pointer transition hover:bg-surface-elevated/50"
                    onClick={() => onPlayerClick(p.name)}
                  >
                    <td className="p-2 text-gray-600">{i + 1}</td>
                    <td className="p-2 font-medium text-info hover:text-info-light transition">{p.name}</td>
                    <td
                      className="p-2 text-gray-400 cursor-pointer hover:text-info transition"
                      onClick={e => { e.stopPropagation(); onTeamClick(p.team); }}
                    >
                      {p.team}
                    </td>
                    <td className="p-2 text-center text-gray-300">{p.s2526!.p}</td>
                    <td className="p-2 text-center text-win">{p.s2526!.w}</td>
                    <td className="p-2 text-center font-bold text-white">{p.adjPct.toFixed(1)}%</td>
                    <td className="p-2 text-center text-gray-400">{p.s2526!.pct.toFixed(1)}%</td>
                    <td className="p-2 text-center text-win">{p.bdFRate.toFixed(2)}</td>
                    <td className="p-2 text-center text-success">{p.bdARate.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Break & Dish Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best BD For */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-win mb-3 flex items-center gap-1.5">
            <Target size={16} />
            Best Break & Dish (For)
          </h3>
          {topBDFor.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No players with {minGames}+ games</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider text-[10px] border-b border-surface-border">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Player</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">P</th>
                    <th className="text-center p-2" title="Break & Dish won per game">BD+</th>
                  </tr>
                </thead>
                <tbody>
                  {topBDFor.map((p, i) => (
                    <tr
                      key={p.name + p.team}
                      className="border-b border-surface-border/30 cursor-pointer transition hover:bg-surface-elevated/50"
                      onClick={() => onPlayerClick(p.name)}
                    >
                      <td className="p-2 text-gray-600">{i + 1}</td>
                      <td className="p-2 font-medium text-info hover:text-info-light transition">{p.name}</td>
                      <td
                        className="p-2 text-gray-400 cursor-pointer hover:text-info transition"
                        onClick={e => { e.stopPropagation(); onTeamClick(p.team); }}
                      >
                        {p.team}
                      </td>
                      <td className="p-2 text-center text-gray-300">{p.s2526!.p}</td>
                      <td className="p-2 text-center font-bold text-win">{p.bdFRate.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Best BD Against */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-1.5">
            <Target size={16} />
            Best Break & Dish (Against)
          </h3>
          {topBDAgainst.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No players with {minGames}+ games</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider text-[10px] border-b border-surface-border">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Player</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">P</th>
                    <th className="text-center p-2" title="Break & Dish conceded per game">BD-</th>
                  </tr>
                </thead>
                <tbody>
                  {topBDAgainst.map((p, i) => (
                    <tr
                      key={p.name + p.team}
                      className="border-b border-surface-border/30 cursor-pointer transition hover:bg-surface-elevated/50"
                      onClick={() => onPlayerClick(p.name)}
                    >
                      <td className="p-2 text-gray-600">{i + 1}</td>
                      <td className="p-2 font-medium text-info hover:text-info-light transition">{p.name}</td>
                      <td
                        className="p-2 text-gray-400 cursor-pointer hover:text-info transition"
                        onClick={e => { e.stopPropagation(); onTeamClick(p.team); }}
                      >
                        {p.team}
                      </td>
                      <td className="p-2 text-center text-gray-300">{p.s2526!.p}</td>
                      <td className="p-2 text-center font-bold text-success">{p.bdARate.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Team Records Section - Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-info mb-3 flex items-center gap-1.5">
            <Award size={16} />
            Best Home Records
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
          </div>
        </div>

        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-info mb-3 flex items-center gap-1.5">
            <Award size={16} />
            Best Away Records
          </h3>
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
          </div>
        </div>
      </div>

      {/* Most Improved Section - Placeholder */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-1.5">
          <TrendingUp size={16} />
          Most Improved Players
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
        </div>
      </div>

      {/* Win Streaks Section - Placeholder */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-sm font-semibold text-warning mb-3 flex items-center gap-1.5">
          <Flame size={16} />
          Longest Active Win Streaks
        </h3>
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Leaderboard coming soon...</p>
        </div>
      </div>
    </div>
  );
}
