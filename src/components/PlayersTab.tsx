'use client';

import { useState, useMemo } from 'react';
import type { DivisionCode, PlayerFormData } from '@/lib/types';
import { DIVISIONS } from '@/lib/data';
import { getTeamPlayers, calcPlayerForm, calcBDStats } from '@/lib/predictions';
import { useLeagueData } from '@/lib/data-provider';

interface PlayersTabProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

type SortKey = 'pct' | 'bdF' | 'bdA' | 'form';
type SortDir = 'asc' | 'desc';

export default function PlayersTab({ selectedDiv, onTeamClick, onPlayerClick }: PlayersTabProps) {
  const [minGames, setMinGames] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>('pct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const { data: leagueData } = useLeagueData();
  const teams = DIVISIONS[selectedDiv].teams;

  const divPlayers = useMemo(() => {
    const list: Array<{
      name: string;
      rating: number | null;
      s2526: { p: number; w: number; pct: number; bdF: number; bdA: number; forf: number } | null;
      team: string;
      form: PlayerFormData | null;
      bdFRate: number;
      bdARate: number;
    }> = [];
    const seen = new Set<string>();
    teams.forEach(team => {
      const roster = getTeamPlayers(team);
      roster.forEach(pl => {
        if (pl.s2526 && !seen.has(pl.name + ':' + team)) {
          seen.add(pl.name + ':' + team);
          const form = leagueData.frames.length > 0 ? calcPlayerForm(pl.name, leagueData.frames) : null;
          const bd = calcBDStats(pl.s2526);
          list.push({ ...pl, team, form, bdFRate: bd.bdFRate, bdARate: bd.bdARate });
        }
      });
    });
    return list;
  }, [teams, leagueData.frames]);

  const filtered = useMemo(() => {
    const f = divPlayers.filter(p => p.s2526 && p.s2526.p >= minGames);
    f.sort((a, b) => {
      let av: number, bv: number;
      switch (sortKey) {
        case 'pct':
          av = a.s2526 ? a.s2526.pct : -999;
          bv = b.s2526 ? b.s2526.pct : -999;
          break;
        case 'bdF':
          av = a.bdFRate;
          bv = b.bdFRate;
          break;
        case 'bdA':
          av = a.bdARate;
          bv = b.bdARate;
          break;
        case 'form':
          av = a.form ? a.form.last5.pct : -999;
          bv = b.form ? b.form.last5.pct : -999;
          break;
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return f;
  }, [divPlayers, minGames, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return '';
    return sortDir === 'desc' ? ' \u25BC' : ' \u25B2';
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <h2 className="text-xl font-bold mb-4">{DIVISIONS[selectedDiv].name} - Player Stats</h2>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-gray-400">Min games:</span>
        {[1, 3, 5, 10].map(n => (
          <button
            key={n}
            onClick={() => setMinGames(n)}
            className={
              'px-3 py-1 rounded text-xs font-medium transition ' +
              (minGames === n
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300')
            }
          >
            {n}+
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-2">{filtered.length} players</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">Player</th>
              <th className="text-left p-2">Team</th>
              <th className="text-center p-2">P</th>
              <th className="text-center p-2">W</th>
              <th
                className="text-center p-2 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('pct')}
              >
                Win%{sortIndicator('pct')}
              </th>
              <th
                className="text-center p-2 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('form')}
                title="Last 5 games form"
              >
                Form{sortIndicator('form')}
              </th>
              <th
                className="text-center p-2 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('bdF')}
                title="Break & Dish for rate"
              >
                BD+{sortIndicator('bdF')}
              </th>
              <th
                className="text-center p-2 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('bdA')}
                title="Break & Dish against rate"
              >
                BD-{sortIndicator('bdA')}
              </th>
              <th className="text-right p-2">Rtg</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.name + p.team}
                className="border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/50"
                onClick={() => onPlayerClick(p.name)}
              >
                <td className="p-2 text-gray-500">{i + 1}</td>
                <td className="p-2 font-medium text-blue-300">{p.name}</td>
                <td
                  className="p-2 text-gray-400 cursor-pointer hover:text-blue-300"
                  onClick={e => {
                    e.stopPropagation();
                    onTeamClick(p.team);
                  }}
                >
                  {p.team}
                </td>
                <td className="p-2 text-center">{p.s2526!.p}</td>
                <td className="p-2 text-center text-green-400">{p.s2526!.w}</td>
                <td className="p-2 text-center font-bold">{p.s2526!.pct.toFixed(1)}%</td>
                <td className="p-2 text-center">
                  {p.form ? (
                    <span
                      className={
                        p.form.trend === 'hot'
                          ? 'text-green-400 font-bold'
                          : p.form.trend === 'cold'
                            ? 'text-red-400 font-bold'
                            : 'text-gray-400'
                      }
                      title={`Last 5: ${p.form.last5.pct.toFixed(0)}% | Season: ${p.form.seasonPct.toFixed(0)}%`}
                    >
                      {p.form.trend === 'hot' ? '\u2191' : p.form.trend === 'cold' ? '\u2193' : '\u2022'}{' '}
                      {p.form.last5.pct.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
                <td className="p-2 text-center text-green-400">
                  {p.bdFRate.toFixed(2)}
                </td>
                <td className="p-2 text-center text-red-400">
                  {p.bdARate.toFixed(2)}
                </td>
                <td
                  className={
                    'p-2 text-right ' +
                    (p.rating !== null
                      ? p.rating > 0
                        ? 'text-green-400'
                        : p.rating < 0
                          ? 'text-red-400'
                          : 'text-gray-400'
                      : 'text-gray-600')
                  }
                >
                  {p.rating !== null
                    ? (p.rating > 0 ? '+' : '') + p.rating.toFixed(2)
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
