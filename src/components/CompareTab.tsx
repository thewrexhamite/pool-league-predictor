'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, X, GitCompare, UserX, Users, Loader2, Globe } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, LeagueStrength } from '@/lib/types';
import { getTeamPlayers, calcBayesianPct } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';
import { useMultiLeagueData } from '@/hooks/useMultiLeagueData';
import { findAllBridgePlayers } from '@/lib/stats/bridge-players';
import { calculateLeagueStrengths } from '@/lib/stats/league-strength';
import PlayerComparison from './PlayerComparison';
import CrossLeaguePlayerComparison from './CrossLeaguePlayerComparison';
import CrossLeagueTeamComparison from './CrossLeagueTeamComparison';

interface CompareTabProps {
  selectedDiv: DivisionCode;
}

type ScopeMode = 'division' | 'all' | 'cross-league';
type CompareMode = 'player' | 'team';

interface PlayerOption {
  name: string;
  team: string;
  div: string;
  p: number;
  w: number;
  pct: number;
  adjPct: number;
  leagueId?: string;
  leagueShortName?: string;
  leagueColor?: string;
}

interface TeamOption {
  name: string;
  div: string;
  leagueId: string;
  leagueShortName: string;
  leagueColor: string;
}

export default function CompareTab({ selectedDiv }: CompareTabProps) {
  const [scopeMode, setScopeMode] = useState<ScopeMode>('division');
  const [compareMode, setCompareMode] = useState<CompareMode>('player');
  const [minGames, setMinGames] = useState(5);
  const [searchPlayerA, setSearchPlayerA] = useState('');
  const [searchPlayerB, setSearchPlayerB] = useState('');
  const [selectedPlayerA, setSelectedPlayerA] = useState<PlayerOption | null>(null);
  const [selectedPlayerB, setSelectedPlayerB] = useState<PlayerOption | null>(null);
  const [selectedTeamA, setSelectedTeamA] = useState<TeamOption | null>(null);
  const [selectedTeamB, setSelectedTeamB] = useState<TeamOption | null>(null);
  const [searchTeamA, setSearchTeamA] = useState('');
  const [searchTeamB, setSearchTeamB] = useState('');
  const { ds } = useActiveData();
  const multiLeague = useMultiLeagueData();

  const divisionName = ds.divisions[selectedDiv]?.name || selectedDiv;
  const isCrossLeague = scopeMode === 'cross-league';
  const showAllDivisions = scopeMode === 'all';

  // Activate cross-league data when mode is selected
  useEffect(() => {
    if (isCrossLeague && !multiLeague.isActivated && !multiLeague.loading) {
      multiLeague.activate();
    }
  }, [isCrossLeague, multiLeague]);

  // Compute bridge players and league strengths when cross-league data is available
  const strengths = useMemo<LeagueStrength[]>(() => {
    if (!isCrossLeague || Object.keys(multiLeague.leagues).length === 0) return [];
    const bridgePlayers = findAllBridgePlayers(multiLeague.leagues);
    return calculateLeagueStrengths(multiLeague.leagues, bridgePlayers);
  }, [isCrossLeague, multiLeague.leagues]);

  // URL state management helpers
  function encodePlayerParam(player: PlayerOption): string {
    return `${encodeURIComponent(player.name)}@${encodeURIComponent(player.team)}`;
  }

  function decodePlayerParam(param: string): { name: string; team: string } | null {
    const parts = param.split('@');
    if (parts.length !== 2) return null;
    return {
      name: decodeURIComponent(parts[0]),
      team: decodeURIComponent(parts[1]),
    };
  }

  const updateURL = useCallback(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    const baseHash = `#/compare/${selectedDiv}`;

    if (!selectedPlayerA && !selectedPlayerB) {
      if (hash !== baseHash) {
        window.history.replaceState(null, '', baseHash);
      }
      return;
    }

    let newHash = baseHash;
    if (selectedPlayerA) {
      newHash += `/${encodePlayerParam(selectedPlayerA)}`;
    } else {
      newHash += '/_';
    }

    if (selectedPlayerB) {
      newHash += `/${encodePlayerParam(selectedPlayerB)}`;
    }

    if (hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [selectedPlayerA, selectedPlayerB, selectedDiv]);

  // Get all players based on scope
  const allPlayers = useMemo(() => {
    if (isCrossLeague) {
      // Cross-league: aggregate players from all leagues
      const players: PlayerOption[] = [];
      const seen = new Set<string>();

      for (const [leagueId, { meta, data }] of Object.entries(multiLeague.leagues)) {
        for (const [name, playerData] of Object.entries(data.players2526)) {
          const leagueStats = playerData.teams.filter(t => !t.cup);
          for (const ts of leagueStats) {
            if (ts.p < minGames) continue;
            const key = `${leagueId}:${name}:${ts.team}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const adjPct = calcBayesianPct(ts.w, ts.p);
            players.push({
              name,
              team: ts.team,
              div: ts.div,
              p: ts.p,
              w: ts.w,
              pct: ts.pct,
              adjPct,
              leagueId,
              leagueShortName: meta.shortName,
              leagueColor: meta.primaryColor,
            });
          }
        }
      }

      players.sort((a, b) => b.adjPct - a.adjPct);
      return players;
    }

    // Normal mode: single league
    const players: PlayerOption[] = [];
    const seen = new Set<string>();

    const divisions = showAllDivisions
      ? Object.keys(ds.divisions)
      : [selectedDiv];

    divisions.forEach(divCode => {
      const teams = ds.divisions[divCode]?.teams || [];
      teams.forEach(team => {
        const roster = getTeamPlayers(team, ds);
        roster.forEach(pl => {
          if (pl.s2526 && pl.s2526.p >= minGames && !seen.has(pl.name + ':' + team)) {
            seen.add(pl.name + ':' + team);
            const adjPct = calcBayesianPct(pl.s2526.w, pl.s2526.p);
            players.push({
              name: pl.name,
              team,
              div: divCode,
              p: pl.s2526.p,
              w: pl.s2526.w,
              pct: pl.s2526.pct,
              adjPct,
            });
          }
        });
      });
    });

    players.sort((a, b) => b.adjPct - a.adjPct);
    return players;
  }, [ds, selectedDiv, minGames, multiLeague.leagues, isCrossLeague, showAllDivisions]);

  // Get all teams for team comparison mode
  const allTeams = useMemo(() => {
    if (!isCrossLeague) return [];

    const teams: TeamOption[] = [];
    for (const [leagueId, { meta, data }] of Object.entries(multiLeague.leagues)) {
      for (const [divCode, div] of Object.entries(data.divisions)) {
        for (const team of div.teams) {
          teams.push({
            name: team,
            div: divCode,
            leagueId,
            leagueShortName: meta.shortName,
            leagueColor: meta.primaryColor,
          });
        }
      }
    }
    teams.sort((a, b) => a.name.localeCompare(b.name));
    return teams;
  }, [isCrossLeague, multiLeague.leagues]);

  // Initialize from URL on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (!hash.startsWith('#/compare/')) return;

    const parts = hash.slice(2).split('/');
    if (parts.length < 3) return;

    const playerAParam = parts[2];
    const playerBParam = parts[3];

    if (playerAParam && playerAParam !== '_') {
      const decoded = decodePlayerParam(playerAParam);
      if (decoded) {
        const player = allPlayers.find(
          p => p.name === decoded.name && p.team === decoded.team
        );
        if (player) setSelectedPlayerA(player);
      }
    }

    if (playerBParam && playerBParam !== '_') {
      const decoded = decodePlayerParam(playerBParam);
      if (decoded) {
        const player = allPlayers.find(
          p => p.name === decoded.name && p.team === decoded.team
        );
        if (player) setSelectedPlayerB(player);
      }
    }
  }, [allPlayers]);

  useEffect(() => {
    updateURL();
  }, [updateURL]);

  // Filter players for dropdowns
  const filteredPlayersA = useMemo(() => {
    let players = allPlayers;
    if (selectedPlayerB) {
      players = players.filter(p =>
        !(p.name === selectedPlayerB.name && p.team === selectedPlayerB.team &&
          (p.leagueId || '') === (selectedPlayerB.leagueId || ''))
      );
    }
    if (searchPlayerA.length >= 2) {
      const q = searchPlayerA.toLowerCase();
      players = players.filter(p =>
        p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)
      );
    }
    return players;
  }, [allPlayers, searchPlayerA, selectedPlayerB]);

  const filteredPlayersB = useMemo(() => {
    let players = allPlayers;
    if (selectedPlayerA) {
      players = players.filter(p =>
        !(p.name === selectedPlayerA.name && p.team === selectedPlayerA.team &&
          (p.leagueId || '') === (selectedPlayerA.leagueId || ''))
      );
    }
    if (searchPlayerB.length >= 2) {
      const q = searchPlayerB.toLowerCase();
      players = players.filter(p =>
        p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)
      );
    }
    return players;
  }, [allPlayers, searchPlayerB, selectedPlayerA]);

  // Filter teams for dropdowns
  const filteredTeamsA = useMemo(() => {
    let teams = allTeams;
    if (selectedTeamB) {
      teams = teams.filter(t =>
        !(t.name === selectedTeamB.name && t.leagueId === selectedTeamB.leagueId)
      );
    }
    if (searchTeamA.length >= 2) {
      const q = searchTeamA.toLowerCase();
      teams = teams.filter(t => t.name.toLowerCase().includes(q));
    }
    return teams;
  }, [allTeams, searchTeamA, selectedTeamB]);

  const filteredTeamsB = useMemo(() => {
    let teams = allTeams;
    if (selectedTeamA) {
      teams = teams.filter(t =>
        !(t.name === selectedTeamA.name && t.leagueId === selectedTeamA.leagueId)
      );
    }
    if (searchTeamB.length >= 2) {
      const q = searchTeamB.toLowerCase();
      teams = teams.filter(t => t.name.toLowerCase().includes(q));
    }
    return teams;
  }, [allTeams, searchTeamB, selectedTeamA]);

  function handleSelectPlayerA(player: PlayerOption) {
    if (selectedPlayerB && player.name === selectedPlayerB.name && player.team === selectedPlayerB.team &&
        (player.leagueId || '') === (selectedPlayerB.leagueId || '')) return;
    setSelectedPlayerA(player);
    setSearchPlayerA('');
  }

  function handleSelectPlayerB(player: PlayerOption) {
    if (selectedPlayerA && player.name === selectedPlayerA.name && player.team === selectedPlayerA.team &&
        (player.leagueId || '') === (selectedPlayerA.leagueId || '')) return;
    setSelectedPlayerB(player);
    setSearchPlayerB('');
  }

  function handleClearAll() {
    setSelectedPlayerA(null);
    setSelectedPlayerB(null);
    setSelectedTeamA(null);
    setSelectedTeamB(null);
    setSearchPlayerA('');
    setSearchPlayerB('');
    setSearchTeamA('');
    setSearchTeamB('');
  }

  function handleScopeChange(mode: ScopeMode) {
    if (mode !== scopeMode) {
      handleClearAll();
      setScopeMode(mode);
    }
  }

  function handleCompareModeChange(mode: CompareMode) {
    if (mode !== compareMode) {
      handleClearAll();
      setCompareMode(mode);
    }
  }

  // Determine header title
  const headerTitle = isCrossLeague
    ? `Cross-League — ${compareMode === 'player' ? 'Player' : 'Team'} Comparison`
    : showAllDivisions
      ? 'All Divisions — Player Comparison'
      : `${divisionName} — Player Comparison`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card-interactive bg-surface-card rounded-card shadow-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
            {isCrossLeague ? (
              <Globe size={20} className="text-accent" />
            ) : (
              <>
                <GitCompare size={18} className="text-accent md:hidden" />
                <GitCompare size={20} className="text-accent hidden md:inline" />
              </>
            )}
            <span className="truncate">{headerTitle}</span>
          </h2>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Clear All button */}
            {(selectedPlayerA || selectedPlayerB || selectedTeamA || selectedTeamB) && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-medium bg-loss/20 text-loss hover:bg-loss/30 transition"
                title="Clear all selections"
              >
                <X size={14} />
                <span className="hidden sm:inline">Clear All</span>
                <span className="sm:hidden">Clear</span>
              </button>
            )}

            {/* Scope filter: Division | All | Cross-League */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleScopeChange('division')}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                  scopeMode === 'division' ? 'bg-baize text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                )}
              >
                Division
              </button>
              <button
                onClick={() => handleScopeChange('all')}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                  scopeMode === 'all' ? 'bg-baize text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                )}
              >
                All
              </button>
              <button
                onClick={() => handleScopeChange('cross-league')}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1',
                  scopeMode === 'cross-league' ? 'bg-baize text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                )}
              >
                <Globe size={12} />
                Cross-League
              </button>
            </div>

            {/* Compare mode toggle (only in cross-league) */}
            {isCrossLeague && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCompareModeChange('player')}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1',
                    compareMode === 'player' ? 'bg-accent text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                  )}
                >
                  <GitCompare size={12} />
                  Players
                </button>
                <button
                  onClick={() => handleCompareModeChange('team')}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1',
                    compareMode === 'team' ? 'bg-accent text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                  )}
                >
                  <Users size={12} />
                  Teams
                </button>
              </div>
            )}

            {/* Min games filter (player mode only) */}
            {compareMode === 'player' && (
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
          </div>
        </div>

        <p className="text-xs md:text-sm text-gray-400">
          {isCrossLeague
            ? multiLeague.loading
              ? 'Loading cross-league data...'
              : `Select two ${compareMode === 'player' ? 'players' : 'teams'} from any league to compare`
            : 'Select two players to compare their stats side-by-side'}
        </p>

        {/* Cross-league loading indicator */}
        {isCrossLeague && multiLeague.loading && (
          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
            <Loader2 size={14} className="animate-spin" />
            Loading data from all leagues...
          </div>
        )}

        {/* Cross-league error */}
        {isCrossLeague && multiLeague.error && (
          <div className="mt-3 text-xs text-loss">
            Error: {multiLeague.error}
          </div>
        )}
      </div>

      {/* Player Selectors (player mode) */}
      {compareMode === 'player' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Player A Selector */}
          <div className="card-interactive bg-surface-card rounded-card shadow-card p-4 md:p-6">
            <h3 className="text-sm font-semibold text-info mb-3">Player A</h3>

            {selectedPlayerA ? (
              <SelectedPlayerCard
                player={selectedPlayerA}
                onClear={() => { setSelectedPlayerA(null); setSearchPlayerA(''); }}
                isCrossLeague={isCrossLeague}
              />
            ) : (
              <PlayerSearchPanel
                search={searchPlayerA}
                setSearch={setSearchPlayerA}
                filteredPlayers={filteredPlayersA}
                onSelect={handleSelectPlayerA}
                totalCount={allPlayers.length}
                colorClass="text-info"
                isCrossLeague={isCrossLeague}
                isLoading={isCrossLeague && multiLeague.loading}
              />
            )}
          </div>

          {/* Player B Selector */}
          <div className="card-interactive bg-surface-card rounded-card shadow-card p-4 md:p-6">
            <h3 className="text-sm font-semibold text-success mb-3">Player B</h3>

            {selectedPlayerB ? (
              <SelectedPlayerCard
                player={selectedPlayerB}
                onClear={() => { setSelectedPlayerB(null); setSearchPlayerB(''); }}
                isCrossLeague={isCrossLeague}
              />
            ) : (
              <PlayerSearchPanel
                search={searchPlayerB}
                setSearch={setSearchPlayerB}
                filteredPlayers={filteredPlayersB}
                onSelect={handleSelectPlayerB}
                totalCount={allPlayers.length}
                colorClass="text-success"
                isCrossLeague={isCrossLeague}
                isLoading={isCrossLeague && multiLeague.loading}
              />
            )}
          </div>
        </div>
      )}

      {/* Team Selectors (team mode, cross-league only) */}
      {compareMode === 'team' && isCrossLeague && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Team A Selector */}
          <div className="card-interactive bg-surface-card rounded-card shadow-card p-4 md:p-6">
            <h3 className="text-sm font-semibold text-info mb-3">Team A</h3>

            {selectedTeamA ? (
              <SelectedTeamCard
                team={selectedTeamA}
                onClear={() => { setSelectedTeamA(null); setSearchTeamA(''); }}
              />
            ) : (
              <TeamSearchPanel
                search={searchTeamA}
                setSearch={setSearchTeamA}
                filteredTeams={filteredTeamsA}
                onSelect={(team) => { setSelectedTeamA(team); setSearchTeamA(''); }}
                totalCount={allTeams.length}
                colorClass="text-info"
                isLoading={multiLeague.loading}
              />
            )}
          </div>

          {/* Team B Selector */}
          <div className="card-interactive bg-surface-card rounded-card shadow-card p-4 md:p-6">
            <h3 className="text-sm font-semibold text-success mb-3">Team B</h3>

            {selectedTeamB ? (
              <SelectedTeamCard
                team={selectedTeamB}
                onClear={() => { setSelectedTeamB(null); setSearchTeamB(''); }}
              />
            ) : (
              <TeamSearchPanel
                search={searchTeamB}
                setSearch={setSearchTeamB}
                filteredTeams={filteredTeamsB}
                onSelect={(team) => { setSelectedTeamB(team); setSearchTeamB(''); }}
                totalCount={allTeams.length}
                colorClass="text-success"
                isLoading={multiLeague.loading}
              />
            )}
          </div>
        </div>
      )}

      {/* Comparison Display */}
      {compareMode === 'player' && selectedPlayerA && selectedPlayerB && (
        isCrossLeague ? (
          <CrossLeaguePlayerComparison
            player1={selectedPlayerA as PlayerOption & { leagueId: string; leagueShortName: string; leagueColor: string }}
            player2={selectedPlayerB as PlayerOption & { leagueId: string; leagueShortName: string; leagueColor: string }}
            multiLeagueData={multiLeague.leagues}
            strengths={strengths}
            onBack={handleClearAll}
          />
        ) : (
          <PlayerComparison
            player1={selectedPlayerA.name}
            player2={selectedPlayerB.name}
            onBack={handleClearAll}
          />
        )
      )}

      {compareMode === 'team' && selectedTeamA && selectedTeamB && (
        <CrossLeagueTeamComparison
          team1={selectedTeamA}
          team2={selectedTeamB}
          multiLeagueData={multiLeague.leagues}
          strengths={strengths}
          onBack={handleClearAll}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function LeagueBadge({ shortName, color }: { shortName: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-fixed-white"
      style={{ backgroundColor: color }}
    >
      {shortName}
    </span>
  );
}

function SelectedPlayerCard({
  player,
  onClear,
  isCrossLeague,
}: {
  player: PlayerOption;
  onClear: () => void;
  isCrossLeague: boolean;
}) {
  return (
    <div className="bg-surface border border-surface-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="font-medium text-white truncate" title={player.name}>{player.name}</div>
            {isCrossLeague && player.leagueShortName && player.leagueColor && (
              <LeagueBadge shortName={player.leagueShortName} color={player.leagueColor} />
            )}
          </div>
          <div className="text-xs text-gray-400 truncate" title={player.team}>
            {player.team}
            {isCrossLeague && <span className="text-gray-600"> ({player.div})</span>}
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-gray-500 hover:text-white transition ml-2 shrink-0"
          title="Clear selection"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex items-center gap-2 md:gap-3 text-xs flex-wrap">
        <span className="text-gray-500 whitespace-nowrap">
          P: <span className="text-gray-300">{player.p}</span>
        </span>
        <span className="text-gray-500 whitespace-nowrap">
          W: <span className="text-win">{player.w}</span>
        </span>
        <span className="text-gray-500 whitespace-nowrap">
          Adj%: <span className="text-white font-bold">{player.adjPct.toFixed(1)}%</span>
        </span>
      </div>
    </div>
  );
}

function PlayerSearchPanel({
  search,
  setSearch,
  filteredPlayers,
  onSelect,
  totalCount,
  colorClass,
  isCrossLeague,
  isLoading,
}: {
  search: string;
  setSearch: (s: string) => void;
  filteredPlayers: PlayerOption[];
  onSelect: (p: PlayerOption) => void;
  totalCount: number;
  colorClass: string;
  isCrossLeague: boolean;
  isLoading: boolean;
}) {
  return (
    <div>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder={isCrossLeague ? 'Search all leagues...' : 'Search players...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize"
          disabled={isLoading}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-6 md:py-8">
          <Loader2 size={32} className="mx-auto text-gray-600 mb-2 md:mb-3 animate-spin" />
          <p className="text-gray-500 text-xs md:text-sm">Loading leagues...</p>
        </div>
      ) : search.length >= 2 ? (
        filteredPlayers.length === 0 ? (
          <div className="text-center py-6 md:py-8">
            <UserX size={32} className="mx-auto text-gray-600 mb-2 md:mb-3" />
            <p className="text-gray-500 text-xs md:text-sm">No players found</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {filteredPlayers.slice(0, 20).map(player => (
              <button
                key={(player.leagueId || '') + player.name + player.team}
                onClick={() => onSelect(player)}
                className="w-full text-left p-2 rounded-lg hover:bg-surface-elevated transition border-b border-surface-border/30 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className={clsx('text-sm font-medium truncate', colorClass)} title={player.name}>
                        {player.name}
                      </div>
                      {isCrossLeague && player.leagueShortName && player.leagueColor && (
                        <LeagueBadge shortName={player.leagueShortName} color={player.leagueColor} />
                      )}
                    </div>
                    <div className="text-xs text-gray-400 truncate" title={player.team}>
                      {player.team}
                      {isCrossLeague && <span className="text-gray-600"> ({player.div})</span>}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 shrink-0">
                    {player.adjPct.toFixed(1)}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-6 md:py-8">
          <Search size={32} className="mx-auto text-gray-600 mb-2 md:mb-3" />
          <p className="text-gray-500 text-xs md:text-sm">Type to search {isCrossLeague ? 'all leagues' : 'players'}</p>
          <p className="text-gray-600 text-xs mt-1">{totalCount} players available</p>
        </div>
      )}
    </div>
  );
}

function SelectedTeamCard({
  team,
  onClear,
}: {
  team: TeamOption;
  onClear: () => void;
}) {
  return (
    <div className="bg-surface border border-surface-border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="font-medium text-white truncate" title={team.name}>{team.name}</div>
            <LeagueBadge shortName={team.leagueShortName} color={team.leagueColor} />
          </div>
          <div className="text-xs text-gray-400">{team.div}</div>
        </div>
        <button
          onClick={onClear}
          className="text-gray-500 hover:text-white transition ml-2 shrink-0"
          title="Clear selection"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function TeamSearchPanel({
  search,
  setSearch,
  filteredTeams,
  onSelect,
  totalCount,
  colorClass,
  isLoading,
}: {
  search: string;
  setSearch: (s: string) => void;
  filteredTeams: TeamOption[];
  onSelect: (t: TeamOption) => void;
  totalCount: number;
  colorClass: string;
  isLoading: boolean;
}) {
  return (
    <div>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize"
          disabled={isLoading}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-6 md:py-8">
          <Loader2 size={32} className="mx-auto text-gray-600 mb-2 md:mb-3 animate-spin" />
          <p className="text-gray-500 text-xs md:text-sm">Loading teams...</p>
        </div>
      ) : search.length >= 2 ? (
        filteredTeams.length === 0 ? (
          <div className="text-center py-6 md:py-8">
            <UserX size={32} className="mx-auto text-gray-600 mb-2 md:mb-3" />
            <p className="text-gray-500 text-xs md:text-sm">No teams found</p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {filteredTeams.slice(0, 20).map(team => (
              <button
                key={team.leagueId + team.name}
                onClick={() => onSelect(team)}
                className="w-full text-left p-2 rounded-lg hover:bg-surface-elevated transition border-b border-surface-border/30 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className={clsx('text-sm font-medium truncate', colorClass)} title={team.name}>
                        {team.name}
                      </div>
                      <LeagueBadge shortName={team.leagueShortName} color={team.leagueColor} />
                    </div>
                    <div className="text-xs text-gray-400">{team.div}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-6 md:py-8">
          <Users size={32} className="mx-auto text-gray-600 mb-2 md:mb-3" />
          <p className="text-gray-500 text-xs md:text-sm">Type to search teams</p>
          <p className="text-gray-600 text-xs mt-1">{totalCount} teams available</p>
        </div>
      )}
    </div>
  );
}
