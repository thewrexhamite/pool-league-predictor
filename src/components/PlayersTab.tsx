'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, X, TrendingUp, TrendingDown, ChevronUp, ChevronDown, UserX, Calendar } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, PlayerFormData } from '@/lib/types';
import { getTeamPlayers, calcPlayerForm, calcBDStats, calcBayesianPct } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';
import { useLeague } from '@/lib/league-context';

interface PlayersTabProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

type SortKey = 'pct' | 'adjPct' | 'bdF' | 'bdA' | 'form';
type SortDir = 'asc' | 'desc';

interface CrossSeasonPlayer {
  name: string;
  seasons: Array<{
    seasonId: string;
    seasonLabel: string;
    team: string;
    gamesPlayed: number;
    winPct: number;
  }>;
}

export default function PlayersTab({ selectedDiv, onTeamClick, onPlayerClick }: PlayersTabProps) {
  const [minGames, setMinGames] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>('adjPct');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [crossSeasonResults, setCrossSeasonResults] = useState<CrossSeasonPlayer[]>([]);
  const [searchingCrossSeason, setSearchingCrossSeason] = useState(false);
  const { ds, frames } = useActiveData();
  const { selected } = useLeague();
  const teams = ds.divisions[selectedDiv].teams;

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
      const roster = getTeamPlayers(team, ds);
      roster.forEach(pl => {
        if (pl.s2526 && !seen.has(pl.name + ':' + team)) {
          seen.add(pl.name + ':' + team);
          const form = frames.length > 0 ? calcPlayerForm(pl.name, frames) : null;
          const bd = calcBDStats(pl.s2526);
          const adjPct = calcBayesianPct(pl.s2526.w, pl.s2526.p);
          list.push({ ...pl, team, form, bdFRate: bd.bdFRate, bdARate: bd.bdARate, adjPct });
        }
      });
    });
    return list;
  }, [teams, frames, ds]);

  // Cross-season search effect
  useEffect(() => {
    if (!selected?.league.seasons || selected.league.seasons.length <= 1 || searchQuery.length < 2) {
      setCrossSeasonResults([]);
      setSearchingCrossSeason(false);
      return;
    }

    let cancelled = false;
    const q = searchQuery.toLowerCase();

    async function searchAcrossSeasons() {
      setSearchingCrossSeason(true);
      try {
        const { db } = await import('@/lib/firebase');
        const { doc, getDoc } = await import('firebase/firestore');

        const playerMap = new Map<string, CrossSeasonPlayer>();

        // Fetch player data from each season
        for (const season of selected.league.seasons) {
          const docRef = doc(db, 'leagues', selected.leagueId, 'seasons', season.id);
          const snap = await getDoc(docRef);

          if (cancelled) return;

          if (snap.exists()) {
            const data = snap.data();
            const players2526 = data.players2526 || {};

            // Search through players2526 map
            Object.entries(players2526).forEach(([playerName, playerData]: [string, any]) => {
              if (playerName.toLowerCase().includes(q)) {
                if (!playerMap.has(playerName)) {
                  playerMap.set(playerName, {
                    name: playerName,
                    seasons: [],
                  });
                }

                // Add season data
                if (playerData.total && playerData.total.p > 0) {
                  const teams = playerData.teams || [];
                  const primaryTeam = teams.length > 0 ? teams[0].team : 'Unknown';

                  playerMap.get(playerName)!.seasons.push({
                    seasonId: season.id,
                    seasonLabel: season.label,
                    team: primaryTeam,
                    gamesPlayed: playerData.total.p,
                    winPct: playerData.total.pct || 0,
                  });
                }
              }
            });
          }
        }

        if (!cancelled) {
          const results = Array.from(playerMap.values());
          // Sort by total games played across all seasons
          results.sort((a, b) => {
            const aTotal = a.seasons.reduce((sum, s) => sum + s.gamesPlayed, 0);
            const bTotal = b.seasons.reduce((sum, s) => sum + s.gamesPlayed, 0);
            return bTotal - aTotal;
          });
          setCrossSeasonResults(results);
        }
      } catch (error) {
        if (!cancelled) {
          setCrossSeasonResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchingCrossSeason(false);
        }
      }
    }

    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      searchAcrossSeasons();
    } else {
      setSearchingCrossSeason(false);
    }

    return () => {
      cancelled = true;
    };
  }, [searchQuery, selected]);

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

  // Show cross-season results when searching across multiple seasons
  const showCrossSeasonResults = searchQuery.length >= 2 && crossSeasonResults.length > 0;

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <h2 className="text-lg font-bold mb-4 text-white">{ds.divisions[selectedDiv].name} — Players</h2>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search players across all seasons..."
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

        {/* Min games - hide when showing cross-season results */}
        {!showCrossSeasonResults && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Min:</span>
            {[1, 3, 5, 10].map(n => (
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
        )}
        <span className="text-xs text-gray-500">
          {showCrossSeasonResults ? `${crossSeasonResults.length} players (all seasons)` : `${filtered.length} players`}
          {searchingCrossSeason && <span className="ml-1">...</span>}
        </span>
      </div>

      {showCrossSeasonResults ? (
        // Cross-season search results
        <div className="space-y-3">
          {crossSeasonResults.map(player => (
            <div
              key={player.name}
              className="bg-surface rounded-lg p-3 cursor-pointer hover:bg-surface-elevated transition"
              onClick={() => onPlayerClick(player.name)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-medium text-info hover:text-info-light text-sm md:text-base">
                    {player.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {player.seasons.map(season => (
                      <div
                        key={season.seasonId}
                        className="flex items-center gap-1.5 bg-surface-card rounded px-2 py-1 text-xs"
                      >
                        <Calendar size={10} className="text-gray-500" />
                        <span className="text-gray-400">{season.seasonLabel}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-300">{season.team}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400">{season.gamesPlayed}P</span>
                        <span className="text-gray-600">•</span>
                        <span className={clsx(
                          'font-medium',
                          season.winPct >= 60 ? 'text-win' : season.winPct <= 40 ? 'text-loss' : 'text-gray-300'
                        )}>
                          {season.winPct.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
                <th className="text-center p-2 cursor-pointer hover:text-white select-none" onClick={() => handleSort('bdF')} title="Break & Dish won per game">
                  BD+<SortIcon k="bdF" />
                </th>
                <th className="text-center p-2 cursor-pointer hover:text-white select-none" onClick={() => handleSort('bdA')} title="Break & Dish conceded per game">
                  BD-<SortIcon k="bdA" />
                </th>
                <th className="text-right p-2" title="Last season rating">24/25</th>
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
                      )} title={`Last 5 frames: ${p.form.trend === 'hot' ? 'Hot streak' : p.form.trend === 'cold' ? 'Cold streak' : 'Steady'}`}>
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
