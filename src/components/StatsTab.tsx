'use client';

import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { Trophy, TrendingUp, Target, Flame, Award } from 'lucide-react';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getTeamPlayers, calcBayesianPct, calcBDStats, getTeamResults, getDiv } from '@/lib/predictions';

interface StatsTabProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function StatsTab({ selectedDiv, onTeamClick, onPlayerClick }: StatsTabProps) {
  const [minGames, setMinGames] = useState(5);
  const [showAllDivisions, setShowAllDivisions] = useState(false);
  const { ds } = useActiveData();

  const divisionName = ds.divisions[selectedDiv]?.name || selectedDiv;

  // Get teams based on filter
  const teams = useMemo(() => {
    if (showAllDivisions) {
      // Get all teams from all divisions
      return Object.values(ds.divisions).flatMap(div => div.teams);
    }
    return ds.divisions[selectedDiv].teams;
  }, [showAllDivisions, ds, selectedDiv]);

  // Calculate all players in division with stats
  const divPlayers = useMemo(() => {
    const list: Array<{
      name: string;
      s2526: { p: number; w: number; pct: number; bdF: number; bdA: number; forf: number } | null;
      winPct: number | null;
      played: number | null;
      team: string;
      bdFRate: number;
      bdARate: number;
      adjPct: number;
      improvement: number | null;
    }> = [];
    const seen = new Set<string>();
    teams.forEach(team => {
      const roster = getTeamPlayers(team, ds);
      roster.forEach(pl => {
        if (pl.s2526 && !seen.has(pl.name + ':' + team)) {
          seen.add(pl.name + ':' + team);
          const bd = calcBDStats(pl.s2526);
          const adjPct = calcBayesianPct(pl.s2526.w, pl.s2526.p);
          // Calculate improvement: current season adj% - previous season win%
          const improvement = pl.winPct !== null && pl.played !== null && pl.played >= 5
            ? adjPct - (pl.winPct * 100)
            : null;
          list.push({ ...pl, team, bdFRate: bd.bdFRate, bdARate: bd.bdARate, adjPct, improvement });
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

  // Calculate team home/away records
  const teamRecords = useMemo(() => {
    return teams.map(team => {
      const results = getTeamResults(team, ds);
      // Filter by division only if not showing all divisions
      const divResults = showAllDivisions
        ? results
        : results.filter(r => getDiv(r.home, ds) === selectedDiv);

      const home = { w: 0, d: 0, l: 0, p: 0 };
      const away = { w: 0, d: 0, l: 0, p: 0 };

      divResults.forEach(r => {
        if (r.isHome) {
          home.p++;
          if (r.result === 'W') home.w++;
          else if (r.result === 'D') home.d++;
          else home.l++;
        } else {
          away.p++;
          if (r.result === 'W') away.w++;
          else if (r.result === 'D') away.d++;
          else away.l++;
        }
      });

      const homePct = home.p > 0 ? (home.w / home.p) * 100 : 0;
      const awayPct = away.p > 0 ? (away.w / away.p) * 100 : 0;

      return { team, home, away, homePct, awayPct };
    });
  }, [teams, ds, selectedDiv, showAllDivisions]);

  // Best home records
  const bestHome = useMemo(() => {
    return [...teamRecords]
      .filter(t => t.home.p >= 3)
      .sort((a, b) => b.homePct - a.homePct)
      .slice(0, 10);
  }, [teamRecords]);

  // Best away records
  const bestAway = useMemo(() => {
    return [...teamRecords]
      .filter(t => t.away.p >= 3)
      .sort((a, b) => b.awayPct - a.awayPct)
      .slice(0, 10);
  }, [teamRecords]);

  // Most improved players (current season vs previous season)
  const mostImproved = useMemo(() => {
    return divPlayers
      .filter(p => p.s2526 && p.s2526.p >= minGames && p.improvement !== null)
      .sort((a, b) => b.improvement! - a.improvement!)
      .slice(0, 10);
  }, [divPlayers, minGames]);

  // Calculate win streaks for teams
  const teamStreaks = useMemo(() => {
    return teams.map(team => {
      const results = getTeamResults(team, ds);
      // Filter by division only if not showing all divisions
      const divResults = showAllDivisions
        ? results
        : results.filter(r => getDiv(r.home, ds) === selectedDiv);

      if (divResults.length === 0) {
        return { team, currentStreak: 0, longestStreak: 0 };
      }

      // Current streak (most recent consecutive wins)
      let currentStreak = 0;
      for (const r of divResults) {
        if (r.result === 'W') {
          currentStreak++;
        } else {
          break;
        }
      }

      // Longest streak in the season
      let longestStreak = 0;
      let tempStreak = 0;
      for (const r of divResults) {
        if (r.result === 'W') {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }

      return { team, currentStreak, longestStreak };
    });
  }, [teams, ds, selectedDiv, showAllDivisions]);

  // Active win streaks (teams currently on a winning streak)
  const activeStreaks = useMemo(() => {
    return [...teamStreaks]
      .filter(t => t.currentStreak > 0)
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 10);
  }, [teamStreaks]);

  // Longest win streaks this season
  const longestStreaks = useMemo(() => {
    return [...teamStreaks]
      .filter(t => t.longestStreak > 0)
      .sort((a, b) => b.longestStreak - a.longestStreak)
      .slice(0, 10);
  }, [teamStreaks]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy size={20} className="text-accent" />
            {showAllDivisions ? 'All Divisions' : divisionName} — League Statistics
          </h2>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Division filter */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowAllDivisions(false)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                  !showAllDivisions ? 'bg-baize text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                )}
              >
                Division
              </button>
              <button
                onClick={() => setShowAllDivisions(true)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                  showAllDivisions ? 'bg-baize text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                )}
              >
                All
              </button>
            </div>

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

      {/* Team Records Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Home Records */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-info mb-3 flex items-center gap-1.5">
            <Award size={16} />
            Best Home Records
          </h3>
          {bestHome.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No teams with 3+ home games</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider text-[10px] border-b border-surface-border">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">P</th>
                    <th className="text-center p-2">W</th>
                    <th className="text-center p-2">D</th>
                    <th className="text-center p-2">L</th>
                    <th className="text-center p-2">Win%</th>
                  </tr>
                </thead>
                <tbody>
                  {bestHome.map((t, i) => (
                    <tr
                      key={t.team}
                      className="border-b border-surface-border/30 cursor-pointer transition hover:bg-surface-elevated/50"
                      onClick={() => onTeamClick(t.team)}
                    >
                      <td className="p-2 text-gray-600">{i + 1}</td>
                      <td className="p-2 font-medium text-info hover:text-info-light transition">{t.team}</td>
                      <td className="p-2 text-center text-gray-300">{t.home.p}</td>
                      <td className="p-2 text-center text-win">{t.home.w}</td>
                      <td className="p-2 text-center text-gray-400">{t.home.d}</td>
                      <td className="p-2 text-center text-loss">{t.home.l}</td>
                      <td className="p-2 text-center font-bold text-white">{t.homePct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Best Away Records */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-info mb-3 flex items-center gap-1.5">
            <Award size={16} />
            Best Away Records
          </h3>
          {bestAway.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No teams with 3+ away games</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider text-[10px] border-b border-surface-border">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">P</th>
                    <th className="text-center p-2">W</th>
                    <th className="text-center p-2">D</th>
                    <th className="text-center p-2">L</th>
                    <th className="text-center p-2">Win%</th>
                  </tr>
                </thead>
                <tbody>
                  {bestAway.map((t, i) => (
                    <tr
                      key={t.team}
                      className="border-b border-surface-border/30 cursor-pointer transition hover:bg-surface-elevated/50"
                      onClick={() => onTeamClick(t.team)}
                    >
                      <td className="p-2 text-gray-600">{i + 1}</td>
                      <td className="p-2 font-medium text-info hover:text-info-light transition">{t.team}</td>
                      <td className="p-2 text-center text-gray-300">{t.away.p}</td>
                      <td className="p-2 text-center text-win">{t.away.w}</td>
                      <td className="p-2 text-center text-gray-400">{t.away.d}</td>
                      <td className="p-2 text-center text-loss">{t.away.l}</td>
                      <td className="p-2 text-center font-bold text-white">{t.awayPct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Most Improved Section */}
      <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <h3 className="text-sm font-semibold text-success mb-3 flex items-center gap-1.5">
          <TrendingUp size={16} />
          Most Improved Players
        </h3>
        {mostImproved.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">
              No players with {minGames}+ games and previous season data
            </p>
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
                  <th className="text-center p-2" title="Current season adjusted win%">Now</th>
                  <th className="text-center p-2" title="Previous season win%">Was</th>
                  <th className="text-center p-2" title="Improvement in win percentage">+/-</th>
                </tr>
              </thead>
              <tbody>
                {mostImproved.map((p, i) => (
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
                    <td className="p-2 text-center font-medium text-white">{p.adjPct.toFixed(1)}%</td>
                    <td className="p-2 text-center text-gray-400">{(p.winPct! * 100).toFixed(1)}%</td>
                    <td className={clsx(
                      'p-2 text-center font-bold',
                      p.improvement! > 0 ? 'text-success' : 'text-gray-500'
                    )}>
                      {p.improvement! > 0 ? '+' : ''}{p.improvement!.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Win Streaks Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Win Streaks */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-warning mb-3 flex items-center gap-1.5">
            <Flame size={16} />
            Active Win Streaks
          </h3>
          {activeStreaks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No teams on active win streaks</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider text-[10px] border-b border-surface-border">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStreaks.map((t, i) => (
                    <tr
                      key={t.team}
                      className="border-b border-surface-border/30 cursor-pointer transition hover:bg-surface-elevated/50"
                      onClick={() => onTeamClick(t.team)}
                    >
                      <td className="p-2 text-gray-600">{i + 1}</td>
                      <td className="p-2 font-medium text-info hover:text-info-light transition">{t.team}</td>
                      <td className="p-2 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-warning">
                          <Flame size={14} />
                          {t.currentStreak}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Longest Win Streaks */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-accent mb-3 flex items-center gap-1.5">
            <Trophy size={16} />
            Longest Win Streaks
          </h3>
          {longestStreaks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No win streaks recorded</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider text-[10px] border-b border-surface-border">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">Best</th>
                  </tr>
                </thead>
                <tbody>
                  {longestStreaks.map((t, i) => (
                    <tr
                      key={t.team}
                      className="border-b border-surface-border/30 cursor-pointer transition hover:bg-surface-elevated/50"
                      onClick={() => onTeamClick(t.team)}
                    >
                      <td className="p-2 text-gray-600">{i + 1}</td>
                      <td className="p-2 font-medium text-info hover:text-info-light transition">{t.team}</td>
                      <td className="p-2 text-center font-bold text-accent">{t.longestStreak}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
