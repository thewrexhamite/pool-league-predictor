'use client';

import { useState, useMemo } from 'react';
import { Search, X, TrendingUp, TrendingDown, ChevronUp, ChevronDown, UserX } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, PlayerFormData } from '@/lib/types';
import { DIVISIONS } from '@/lib/data';
import { getTeamPlayers, calcPlayerForm, calcBDStats, calcBayesianPct } from '@/lib/predictions';
import { useLeagueData } from '@/lib/data-provider';

interface PlayersTabProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

type SortKey = 'pct' | 'adjPct' | 'bdF' | 'bdA' | 'form';
type SortDir = 'asc' | 'desc';

export default function PlayersTab({ selectedDiv, onTeamClick, onPlayerClick }: PlayersTabProps) {
  const [minGames, setMinGames] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>('adjPct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchQuery, setSearchQuery] = useState('');
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
      adjPct: number;
    }> = [];
    const seen = new Set<string>();
    teams.forEach(team => {
      const roster = getTeamPlayers(team);
      roster.forEach(pl => {
        if (pl.s2526 && !seen.has(pl.name + ':' + team)) {
          seen.add(pl.name + ':' + team);
          const form = leagueData.frames.length > 0 ? calcPlayerForm(pl.name, leagueData.frames) : null;
          const bd = calcBDStats(pl.s2526);
          const adjPct = calcBayesianPct(pl.s2526.w, pl.s2526.p);
          list.push({ ...pl, team, form, bdFRate: bd.bdFRate, bdARate: bd.bdARate, adjPct });
        }
      });
    });
    return list;
  }, [teams, leagueData.frames]);

  const filtered = useMemo(() => {
    let f = divPlayers.filter(p => p.s2526 && p.s2526.p >= minGames);
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      f = f.filter(p => p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q));
    }
    f.sort((a, b) => {
      let av: number, bv: number;
      switch (sortKey) {
        case 'pct':
          av = a.s2526 ? a.s2526.pct : -999;
          bv = b.s2526 ? b.s2526.pct : -999;
          break;
        case 'adjPct':
          av = a.adjPct;
          bv = b.adjPct;
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
  }, [divPlayers, minGames, sortKey, sortDir, searchQuery]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null;
    return sortDir === 'desc'
      ? <ChevronDown size={12} className="inline ml-0.5" />
      : <ChevronUp size={12} className="inline ml-0.5" />;
  }

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <h2 className="text-lg font-bold mb-4 text-white">{DIVISIONS[selectedDiv].name} — Players</h2>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Min games */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Min:</span>
          {[1, 3, 5, 10].map(n => (
            <button
              key={n}
              onClick={() => setMinGames(n)}
              className={clsx(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                minGames === n ? 'bg-baize text-white' : 'bg-surface text-gray-400 hover:text-white'
              )}
            >
              {n}+
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">{filtered.length} players</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <UserX size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500 text-sm">No players match your filters</p>
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
                <th className="text-center p-2 cursor-pointer hover:text-white select-none" onClick={() => handleSort('adjPct')} title="Confidence-adjusted win%">
                  Adj%<SortIcon k="adjPct" />
                </th>
                <th className="text-center p-2 cursor-pointer hover:text-white select-none" onClick={() => handleSort('pct')}>
                  Win%<SortIcon k="pct" />
                </th>
                <th className="text-center p-2 cursor-pointer hover:text-white select-none" onClick={() => handleSort('form')} title="Last 5 form">
                  Form<SortIcon k="form" />
                </th>
                <th className="text-center p-2 cursor-pointer hover:text-white select-none" onClick={() => handleSort('bdF')} title="B&D for rate">
                  BD+<SortIcon k="bdF" />
                </th>
                <th className="text-center p-2 cursor-pointer hover:text-white select-none" onClick={() => handleSort('bdA')} title="B&D against rate">
                  BD-<SortIcon k="bdA" />
                </th>
                <th className="text-right p-2">Rtg</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
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
                  <td className="p-2 text-center">
                    {p.form ? (
                      <span className={clsx(
                        'flex items-center justify-center gap-0.5',
                        p.form.trend === 'hot' ? 'text-win font-bold' : p.form.trend === 'cold' ? 'text-loss font-bold' : 'text-gray-400'
                      )}>
                        {p.form.trend === 'hot' ? <TrendingUp size={12} /> : p.form.trend === 'cold' ? <TrendingDown size={12} /> : null}
                        {p.form.last5.pct.toFixed(0)}%
                      </span>
                    ) : <span className="text-gray-600">-</span>}
                  </td>
                  <td className="p-2 text-center text-win">{p.bdFRate.toFixed(2)}</td>
                  <td className="p-2 text-center text-loss">{p.bdARate.toFixed(2)}</td>
                  <td className={clsx(
                    'p-2 text-right',
                    p.rating !== null ? (p.rating > 0 ? 'text-win' : p.rating < 0 ? 'text-loss' : 'text-gray-400') : 'text-gray-600'
                  )}>
                    {p.rating !== null ? (p.rating > 0 ? '+' : '') + p.rating.toFixed(2) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
