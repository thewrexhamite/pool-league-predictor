'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Trophy,
  ClipboardList,
  Dices,
  Target,
  Calendar,
  Users,
  Search,
  X,
  Star,
  RefreshCw,
  Clock,
  ArrowLeft,
  Menu,
} from 'lucide-react';
import type {
  DivisionCode,
  PredictionResult,
  SimulationResult,
  WhatIfResult,
  SquadOverrides,
  UserSession,
} from '@/lib/types';
import { useLeagueData } from '@/lib/data-provider';
import { ActiveDataProvider, useActiveData } from '@/lib/active-data-provider';
import { useUserSession } from '@/hooks/use-user-session';
import { useMyTeam } from '@/hooks/use-my-team';
import { useHashRouter, type TabId } from '@/lib/router';
import {
  calcStandings,
  calcTeamStrength,
  calcStrengthAdjustments,
  predictFrame,
  getAllRemainingFixtures,
  getAllLeaguePlayers,
  runPredSim,
  runSeasonSimulation,
  getDiv,
  type DataSources,
} from '@/lib/predictions';
import { getAvailableMatchDates } from '@/lib/time-machine';
import { DIVISIONS } from '@/lib/data';

import { ToastProvider, useToast } from './ToastProvider';
import DashboardTab from './DashboardTab';
import StandingsTab from './StandingsTab';
import ResultsTab from './ResultsTab';
import SimulateTab from './SimulateTab';
import PredictTab from './PredictTab';
import FixturesTab from './FixturesTab';
import PlayersTab from './PlayersTab';
import TeamDetail from './TeamDetail';
import PlayerDetail from './PlayerDetail';
import Glossary from './Glossary';
import ThemeToggle from './ThemeToggle';

const TABS: { id: TabId; label: string; shortLabel: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dash', icon: LayoutDashboard },
  { id: 'standings', label: 'Standings', shortLabel: 'Table', icon: Trophy },
  { id: 'results', label: 'Results', shortLabel: 'Results', icon: ClipboardList },
  { id: 'simulate', label: 'Simulate', shortLabel: 'Sim', icon: Dices },
  { id: 'predict', label: 'Predict', shortLabel: 'Predict', icon: Target },
  { id: 'fixtures', label: 'Fixtures', shortLabel: 'Fix', icon: Calendar },
  { id: 'players', label: 'Players', shortLabel: 'Players', icon: Users },
];

/** Outer shell: owns time-machine state + wraps children with ActiveDataProvider */
function AppInner() {
  const { data: leagueData, refreshing } = useLeagueData();
  const [timeMachineDate, setTimeMachineDate] = useState<string | null>(null);

  return (
    <ActiveDataProvider leagueData={leagueData} timeMachineDate={timeMachineDate}>
      <AppContent
        refreshing={refreshing}
        timeMachineDate={timeMachineDate}
        setTimeMachineDate={setTimeMachineDate}
      />
    </ActiveDataProvider>
  );
}

interface AppContentProps {
  refreshing: boolean;
  timeMachineDate: string | null;
  setTimeMachineDate: (d: string | null) => void;
}

function AppContent({ refreshing, timeMachineDate, setTimeMachineDate }: AppContentProps) {
  const { data: activeData, ds } = useActiveData();
  const { data: leagueData } = useLeagueData();
  const { addToast } = useToast();
  const { myTeam, setMyTeam, clearMyTeam } = useMyTeam();
  const router = useHashRouter();

  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [simResults, setSimResults] = useState<SimulationResult[] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [whatIfResults, setWhatIfResults] = useState<WhatIfResult[]>([]);
  const [whatIfSimResults, setWhatIfSimResults] = useState<WhatIfResult[] | null>(null);
  const [squadOverrides, setSquadOverrides] = useState<SquadOverrides>({});
  const [squadBuilderTeam, setSquadBuilderTeam] = useState('');
  const [squadPlayerSearch, setSquadPlayerSearch] = useState('');
  const [squadTopN, setSquadTopN] = useState(5);

  // Time machine UI state
  const [timeMachineOpen, setTimeMachineOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocusIndex, setSearchFocusIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mobile hamburger menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // My Team modal
  const [showMyTeamModal, setShowMyTeamModal] = useState(false);

  // Sync predict teams from router
  useEffect(() => {
    if (router.tab === 'predict' && router.home && router.away) {
      setHomeTeam(router.home);
      setAwayTeam(router.away);
    }
  }, [router.tab, router.home, router.away]);

  // Available match dates for time machine (always from raw data)
  const availableDates = useMemo(
    () => getAvailableMatchDates(leagueData.results),
    [leagueData.results]
  );

  const handleSessionRestore = useCallback((session: UserSession) => {
    if (session.whatIfResults.length > 0) setWhatIfResults(session.whatIfResults);
    if (Object.keys(session.squadOverrides).length > 0) setSquadOverrides(session.squadOverrides);
  }, []);

  useUserSession({
    selectedDiv: router.div,
    whatIfResults,
    squadOverrides,
    onRestore: handleSessionRestore,
  });

  // Prediction
  useEffect(() => {
    if (!homeTeam || !awayTeam) {
      setPrediction(null);
      return;
    }
    const div = getDiv(homeTeam, ds);
    if (!div) return;
    const strengths = calcTeamStrength(div, ds);
    const hasSquadChanges =
      Object.keys(squadOverrides).length > 0 &&
      (squadOverrides[homeTeam] || squadOverrides[awayTeam]);

    const modStr = { ...strengths };
    const pAdj = calcStrengthAdjustments(div, squadOverrides, squadTopN, ds);
    Object.entries(pAdj).forEach(([t, adj]) => {
      if (modStr[t] !== undefined) modStr[t] += adj;
    });
    const p = predictFrame(modStr[homeTeam] || 0, modStr[awayTeam] || 0);
    const pred = runPredSim(p);

    if (hasSquadChanges) {
      const pBase = predictFrame(strengths[homeTeam] || 0, strengths[awayTeam] || 0);
      const base = runPredSim(pBase);
      pred.baseline = base;
    }

    setPrediction(pred);
  }, [homeTeam, awayTeam, squadOverrides, squadTopN, ds]);

  const standings = calcStandings(router.div, ds);
  const totalRemaining = getAllRemainingFixtures(ds).length;
  const totalPlayed = ds.results.length;

  const runSimulation = useCallback(() => {
    setIsSimulating(true);
    setTimeout(() => {
      const results = runSeasonSimulation(router.div, squadOverrides, squadTopN, whatIfResults, ds);
      setSimResults(results);
      setWhatIfSimResults(whatIfResults.length > 0 ? [...whatIfResults] : null);
      setIsSimulating(false);
      addToast('Simulation complete — 1,000 seasons', 'success');
    }, 100);
  }, [router.div, squadOverrides, squadTopN, whatIfResults, ds, addToast]);

  const addWhatIf = (home: string, away: string, homeScore: number, awayScore: number) => {
    setWhatIfResults(prev => [
      ...prev.filter(wi => wi.home !== home || wi.away !== away),
      { home, away, homeScore, awayScore },
    ]);
    setSimResults(null);
    addToast(`Result locked: ${home} ${homeScore}-${awayScore} ${away}`, 'success');
  };

  const removeWhatIf = (home: string, away: string) => {
    setWhatIfResults(prev => prev.filter(wi => wi.home !== home || wi.away !== away));
    setSimResults(null);
    addToast('Result removed', 'info');
  };

  const addSquadPlayer = (team: string, playerName: string) => {
    setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      if (existing.removed.includes(playerName)) {
        const newOv = { ...existing, removed: existing.removed.filter(n => n !== playerName) };
        if (newOv.added.length === 0 && newOv.removed.length === 0) {
          const { [team]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [team]: newOv };
      }
      if (existing.added.includes(playerName)) return prev;
      return { ...prev, [team]: { ...existing, added: [...existing.added, playerName] } };
    });
    setSimResults(null);
    addToast(`Added ${playerName} to ${team}`, 'success');
  };

  const removeSquadPlayer = (team: string, playerName: string) => {
    setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      if (existing.added.includes(playerName)) {
        const newOv = { ...existing, added: existing.added.filter(n => n !== playerName) };
        if (newOv.added.length === 0 && newOv.removed.length === 0) {
          const { [team]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [team]: newOv };
      }
      if (existing.removed.includes(playerName)) return prev;
      return { ...prev, [team]: { ...existing, removed: [...existing.removed, playerName] } };
    });
    setSimResults(null);
    addToast(`Removed ${playerName} from ${team}`, 'warning');
  };

  const restoreSquadPlayer = (team: string, playerName: string) => {
    setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      const newOv = { ...existing, removed: existing.removed.filter(n => n !== playerName) };
      if (newOv.added.length === 0 && newOv.removed.length === 0) {
        const { [team]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [team]: newOv };
    });
    setSimResults(null);
  };

  const unaddSquadPlayer = (team: string, playerName: string) => {
    setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      const newOv = { ...existing, added: existing.added.filter(n => n !== playerName) };
      if (newOv.added.length === 0 && newOv.removed.length === 0) {
        const { [team]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [team]: newOv };
    });
    setSimResults(null);
  };

  const openTeamDetail = (team: string) => {
    router.openTeam(team);
  };

  const openPlayerDetail = (name: string) => {
    router.openPlayer(name);
  };

  const resetDivision = (key: DivisionCode) => {
    router.setDiv(key);
    setSimResults(null);
    setWhatIfSimResults(null);
    setWhatIfResults([]);
    setSquadOverrides({});
    setSquadBuilderTeam('');
    setSquadPlayerSearch('');
    setSquadTopN(5);
    setHomeTeam('');
    setAwayTeam('');
    setMobileMenuOpen(false);
  };

  // Search
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const results: { type: 'team' | 'player'; name: string; detail: string; div?: DivisionCode }[] = [];

    // Search teams
    for (const [divCode, divData] of Object.entries(ds.divisions) as [DivisionCode, { name: string; teams: string[] }][]) {
      for (const team of divData.teams) {
        if (team.toLowerCase().includes(q)) {
          results.push({ type: 'team', name: team, detail: divCode, div: divCode });
        }
      }
    }

    // Search players
    const allPlayers = getAllLeaguePlayers(ds);
    for (const player of allPlayers) {
      if (player.name.toLowerCase().includes(q)) {
        results.push({
          type: 'player',
          name: player.name,
          detail: player.teams2526.slice(0, 2).join(', ') || 'Unknown team',
        });
      }
    }

    return results.slice(0, 8);
  }, [searchQuery, ds]);

  // Click-outside to close search
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Click-outside to close mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [mobileMenuOpen]);

  const handleSearchSelect = (result: typeof searchResults[0]) => {
    setSearchQuery('');
    setSearchOpen(false);
    setMobileMenuOpen(false);
    if (result.type === 'team' && result.div) {
      if (result.div !== router.div) {
        resetDivision(result.div);
      }
      router.openTeam(result.name);
    } else if (result.type === 'player') {
      router.openPlayer(result.name);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery('');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchFocusIndex(i => Math.min(i + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchFocusIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && searchFocusIndex >= 0 && searchResults[searchFocusIndex]) {
      e.preventDefault();
      handleSearchSelect(searchResults[searchFocusIndex]);
    }
  };

  // My team handler
  const handleSetMyTeam = (team: string, div: DivisionCode) => {
    setMyTeam(team, div);
    setShowMyTeamModal(false);
    if (div !== router.div) resetDivision(div);
    addToast(`My Team set to ${team}`, 'success');
  };

  // Time ago helper
  const timeAgo = useMemo(() => {
    if (!leagueData.lastUpdated) return null;
    const diff = Date.now() - leagueData.lastUpdated;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'just now';
  }, [leagueData.lastUpdated]);

  const activeTab = router.tab;
  const selectedDiv = router.div;
  const selectedTeam = router.team || null;
  const selectedPlayer = router.player || null;

  const seasonPct = totalPlayed + totalRemaining > 0
    ? Math.round((totalPlayed / (totalPlayed + totalRemaining)) * 100)
    : 0;

  return (
    <div className="min-h-screen text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-surface-border">
        <div className="max-w-6xl mx-auto px-4 py-2 md:py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Logo + title */}
            <div className="flex items-center gap-2 shrink-0">
              <svg width="32" height="32" viewBox="0 0 512 512" className="shrink-0">
                <defs>
                  <radialGradient id="logoGrad" cx="35%" cy="35%" r="65%">
                    <stop offset="0%" stopColor="#3A3A3A"/>
                    <stop offset="100%" stopColor="#111111"/>
                  </radialGradient>
                </defs>
                <rect width="512" height="512" rx="96" fill="#0C1222"/>
                <circle cx="256" cy="256" r="179" fill="url(#logoGrad)"/>
                <circle cx="256" cy="256" r="63" fill="white"/>
                <text x="256" y="256" textAnchor="middle" dominantBaseline="central" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="62" fill="#0C1222">8</text>
                <path d="M 350 370 A 155 155 0 0 1 270 425" fill="none" stroke="#D4A855" strokeWidth="4" strokeLinecap="round"/>
              </svg>
              <button
                onClick={() => router.setTab('dashboard')}
                className="text-lg md:text-xl font-bold hover:opacity-80 transition-opacity"
              >
                <span className="text-gray-100">Pool League </span><span className="text-accent">Pro</span>
              </button>
              {myTeam && (
                <button
                  onClick={() => setShowMyTeamModal(true)}
                  className="hidden md:flex items-center gap-1 text-xs bg-accent-muted/50 text-accent-light px-2 py-0.5 rounded-full"
                >
                  <Star size={10} className="fill-current" />
                  {myTeam.team}
                </button>
              )}
            </div>

            {/* Centre: Division segmented control */}
            <div className="hidden md:flex items-center bg-surface-card rounded-lg p-0.5">
              {(Object.keys(ds.divisions) as DivisionCode[]).map((key, i, arr) => (
                <button
                  key={key}
                  onClick={() => resetDivision(key)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-medium transition-all',
                    i === 0 && 'rounded-l-md',
                    i === arr.length - 1 && 'rounded-r-md',
                    selectedDiv === key
                      ? 'bg-baize text-fixed-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Right: Search + Time Machine + My Team */}
            <div className="flex items-center gap-2" ref={searchRef}>
              {/* Desktop search */}
              <div className="hidden md:block relative">
                <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search teams, players..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setSearchFocusIndex(-1);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={handleSearchKeyDown}
                  className="bg-surface-card border border-surface-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder-gray-500 w-52 focus:w-72 transition-all focus:outline-none focus:border-baize"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setSearchFocusIndex(-1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-surface-card border border-surface-border rounded-lg shadow-elevated overflow-hidden">
                    {searchResults.map((r, i) => (
                      <button
                        key={r.type + r.name}
                        onClick={() => handleSearchSelect(r)}
                        className={clsx(
                          'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-elevated transition',
                          i === searchFocusIndex && 'bg-surface-elevated'
                        )}
                      >
                        {r.type === 'team' ? <Trophy size={14} className="text-baize shrink-0" /> : <Users size={14} className="text-info shrink-0" />}
                        <span className="text-white flex-1 truncate">{r.name}</span>
                        <span className="text-gray-500 text-xs">{r.detail}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Machine button (desktop only) */}
              <div className="hidden md:block relative">
                <button
                  onClick={() => setTimeMachineOpen(!timeMachineOpen)}
                  className={clsx(
                    'p-2 rounded transition',
                    timeMachineDate
                      ? 'text-accent bg-accent-muted/30'
                      : 'text-gray-400 hover:text-white'
                  )}
                  aria-label="Time Machine"
                  title="Time Machine"
                >
                  <Clock size={18} />
                </button>
                {timeMachineOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-surface-card border border-surface-border rounded-lg shadow-elevated z-50 w-52 max-h-64 overflow-y-auto">
                    <div className="p-2 border-b border-surface-border/30">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Time Machine</div>
                    </div>
                    <button
                      onClick={() => { setTimeMachineDate(null); setTimeMachineOpen(false); setSimResults(null); }}
                      className={clsx(
                        'w-full text-left px-3 py-1.5 text-xs transition hover:bg-surface-elevated',
                        !timeMachineDate ? 'text-baize font-bold' : 'text-gray-300'
                      )}
                    >
                      Present (live)
                    </button>
                    {[...availableDates].reverse().map(date => (
                      <button
                        key={date}
                        onClick={() => { setTimeMachineDate(date); setTimeMachineOpen(false); setSimResults(null); addToast(`Time Machine: viewing as of ${date}`, 'info'); }}
                        className={clsx(
                          'w-full text-left px-3 py-1.5 text-xs transition hover:bg-surface-elevated',
                          timeMachineDate === date ? 'text-accent font-bold' : 'text-gray-400'
                        )}
                      >
                        {date}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Theme toggle — desktop only */}
              <div className="hidden md:block">
                <ThemeToggle variant="icon" />
              </div>

              {/* My Team button — desktop only (if not set) */}
              {!myTeam && (
                <button
                  onClick={() => setShowMyTeamModal(true)}
                  className="hidden md:block p-2 text-gray-400 hover:text-accent-light transition"
                  aria-label="Set My Team"
                  title="Set My Team"
                >
                  <Star size={20} />
                </button>
              )}

              {/* Data freshness (desktop only) */}
              {timeAgo && (
                <button
                  className={clsx(
                    'hidden md:flex items-center gap-1 text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-300 transition',
                    refreshing && 'animate-pulse-subtle'
                  )}
                  title="Refresh data"
                >
                  <RefreshCw size={12} className={clsx(refreshing && 'animate-spin')} />
                  {timeAgo}
                </button>
              )}

              {/* Mobile hamburger button */}
              <button
                onClick={() => setMobileMenuOpen(prev => !prev)}
                className="md:hidden p-2 text-gray-400 hover:text-white transition"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile slide-down menu panel */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                ref={mobileMenuRef}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden overflow-hidden"
              >
                <div className="pt-3 pb-2 space-y-3 border-t border-surface-border/50 mt-2">
                  {/* Search */}
                  <div className="relative" ref={searchRef}>
                    <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search teams, players..."
                      value={searchQuery}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setSearchFocusIndex(-1);
                      }}
                      onFocus={() => setSearchOpen(true)}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full bg-surface-card border border-surface-border rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => { setSearchQuery(''); setSearchFocusIndex(-1); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        <X size={14} />
                      </button>
                    )}
                    {searchOpen && searchResults.length > 0 && (
                      <div className="absolute top-full mt-1 w-full bg-surface-card border border-surface-border rounded-lg shadow-elevated overflow-hidden z-50">
                        {searchResults.map((r, i) => (
                          <button
                            key={r.type + r.name}
                            onClick={() => handleSearchSelect(r)}
                            className={clsx(
                              'w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left hover:bg-surface-elevated transition',
                              i === searchFocusIndex && 'bg-surface-elevated'
                            )}
                          >
                            {r.type === 'team' ? <Trophy size={14} className="text-baize shrink-0" /> : <Users size={14} className="text-info shrink-0" />}
                            <span className="text-white flex-1 truncate">{r.name}</span>
                            <span className="text-gray-500 text-xs">{r.detail}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Division pills */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Division</div>
                    <div className="flex gap-1">
                      {(Object.keys(ds.divisions) as DivisionCode[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => resetDivision(key)}
                          className={clsx(
                            'flex-1 py-1.5 rounded-lg text-xs font-medium transition text-center',
                            selectedDiv === key
                              ? 'bg-baize text-fixed-white'
                              : 'bg-surface-card text-gray-400'
                          )}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* My Team + Time Machine side by side */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowMyTeamModal(true); setMobileMenuOpen(false); }}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-surface-card border border-surface-border rounded-lg py-2 text-xs text-gray-300 hover:text-white transition"
                    >
                      <Star size={14} className={myTeam ? 'text-accent fill-current' : 'text-gray-400'} />
                      {myTeam ? myTeam.team : 'Set My Team'}
                    </button>
                    <button
                      onClick={() => setTimeMachineOpen(prev => !prev)}
                      className={clsx(
                        'flex-1 flex items-center justify-center gap-1.5 bg-surface-card border border-surface-border rounded-lg py-2 text-xs transition',
                        timeMachineDate ? 'text-accent border-accent/30' : 'text-gray-300 hover:text-white'
                      )}
                    >
                      <Clock size={14} />
                      {timeMachineDate || 'Time Machine'}
                    </button>
                  </div>

                  {/* Theme picker */}
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Theme</div>
                    <ThemeToggle variant="segmented" />
                  </div>

                  {/* Inline Time Machine date picker */}
                  {timeMachineOpen && (
                    <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
                      <div className="p-2 border-b border-surface-border/30">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Time Machine</div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        <button
                          onClick={() => { setTimeMachineDate(null); setTimeMachineOpen(false); setSimResults(null); }}
                          className={clsx(
                            'w-full text-left px-3 py-1.5 text-xs transition hover:bg-surface-elevated',
                            !timeMachineDate ? 'text-baize font-bold' : 'text-gray-300'
                          )}
                        >
                          Present (live)
                        </button>
                        {[...availableDates].reverse().map(date => (
                          <button
                            key={date}
                            onClick={() => { setTimeMachineDate(date); setTimeMachineOpen(false); setSimResults(null); addToast(`Time Machine: viewing as of ${date}`, 'info'); }}
                            className={clsx(
                              'w-full text-left px-3 py-1.5 text-xs transition hover:bg-surface-elevated',
                              timeMachineDate === date ? 'text-accent font-bold' : 'text-gray-400'
                            )}
                          >
                            {date}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data freshness */}
                  {timeAgo && (
                    <div className={clsx(
                      'flex items-center justify-center gap-1 text-xs text-gray-500',
                      refreshing && 'animate-pulse-subtle'
                    )}>
                      <RefreshCw size={10} className={clsx(refreshing && 'animate-spin')} />
                      Data updated {timeAgo}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Time Machine banner */}
          {timeMachineDate && (
            <div className="mt-2 flex items-center justify-center gap-2 bg-accent-muted/20 border border-accent/30 rounded-lg px-3 py-1.5 text-xs">
              <Clock size={12} className="text-accent" />
              <span className="text-accent-light font-medium">Time Machine: Viewing as of {timeMachineDate}</span>
              <button
                onClick={() => { setTimeMachineDate(null); setSimResults(null); }}
                className="flex items-center gap-1 text-gray-400 hover:text-white transition ml-2"
              >
                <ArrowLeft size={12} />
                Back to present
              </button>
            </div>
          )}

          {/* Subtitle */}
          <p className="text-center text-gray-500 text-xs mt-1.5">
            {ds.divisions[selectedDiv]?.name} &bull; {totalPlayed} played &bull; {totalRemaining} remaining &bull; {seasonPct}% complete
          </p>
        </div>

        {/* Tab bar */}
        <div className="border-t border-surface-border/50">
          <div className="max-w-6xl mx-auto px-4">
            <nav className="flex overflow-x-auto scrollbar-none -mb-px" role="tablist">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => { setMobileMenuOpen(false); router.setTab(tab.id); }}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium whitespace-nowrap transition-colors border-b-[3px] min-w-0',
                      isActive
                        ? 'border-baize text-baize-light'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    )}
                  >
                    <Icon size={16} />
                    <span className="hidden md:inline">{tab.label}</span>
                    <span className="md:hidden">{tab.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (activeTab === 'team' ? selectedTeam : '') + (activeTab === 'player' ? selectedPlayer : '')}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            role="tabpanel"
          >
            {activeTab === 'dashboard' && (
              <DashboardTab
                selectedDiv={selectedDiv}
                standings={standings}
                myTeam={myTeam}
                onTeamClick={openTeamDetail}
                onPlayerClick={openPlayerDetail}
                onPredict={(home, away) => {
                  setHomeTeam(home);
                  setAwayTeam(away);
                  router.openPredict(home, away);
                }}
              />
            )}

            {activeTab === 'standings' && (
              <StandingsTab
                selectedDiv={selectedDiv}
                standings={standings}
                myTeam={myTeam}
                onTeamClick={openTeamDetail}
              />
            )}

            {activeTab === 'results' && (
              <ResultsTab selectedDiv={selectedDiv} onTeamClick={openTeamDetail} onPlayerClick={openPlayerDetail} />
            )}

            {activeTab === 'team' && selectedTeam && (
              <TeamDetail
                team={selectedTeam}
                selectedDiv={selectedDiv}
                standings={standings}
                onBack={() => router.setTab('standings')}
                onTeamClick={openTeamDetail}
                onPlayerClick={openPlayerDetail}
              />
            )}

            {activeTab === 'player' && selectedPlayer && (
              <PlayerDetail
                player={selectedPlayer}
                selectedTeam={selectedTeam}
                onBack={() => {
                  if (selectedTeam) router.openTeam(selectedTeam);
                  else router.setTab('players');
                }}
                onTeamClick={(team, div) => {
                  if (div !== router.div) resetDivision(div as DivisionCode);
                  router.openTeam(team);
                }}
              />
            )}

            {activeTab === 'players' && (
              <PlayersTab
                selectedDiv={selectedDiv}
                onTeamClick={openTeamDetail}
                onPlayerClick={openPlayerDetail}
              />
            )}

            {activeTab === 'simulate' && (
              <SimulateTab
                selectedDiv={selectedDiv}
                simResults={simResults}
                isSimulating={isSimulating}
                whatIfResults={whatIfResults}
                whatIfSimResults={whatIfSimResults}
                squadOverrides={squadOverrides}
                squadTopN={squadTopN}
                myTeam={myTeam}
                onRunSimulation={runSimulation}
                onTeamClick={openTeamDetail}
              />
            )}

            {activeTab === 'predict' && (
              <PredictTab
                selectedDiv={selectedDiv}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                prediction={prediction}
                squadOverrides={squadOverrides}
                onHomeTeamChange={setHomeTeam}
                onAwayTeamChange={setAwayTeam}
                onTeamClick={openTeamDetail}
                onPlayerClick={openPlayerDetail}
              />
            )}

            {activeTab === 'fixtures' && (
              <FixturesTab
                selectedDiv={selectedDiv}
                whatIfResults={whatIfResults}
                myTeam={myTeam}
                squadOverrides={squadOverrides}
                squadBuilderTeam={squadBuilderTeam}
                squadPlayerSearch={squadPlayerSearch}
                squadTopN={squadTopN}
                onAddWhatIf={addWhatIf}
                onRemoveWhatIf={removeWhatIf}
                onPredict={(home, away) => {
                  setHomeTeam(home);
                  setAwayTeam(away);
                  router.setTab('predict');
                }}
                onTeamClick={openTeamDetail}
                onSimulate={() => {
                  router.setTab('simulate');
                  setTimeout(runSimulation, 200);
                }}
                onClearWhatIf={() => {
                  setWhatIfResults([]);
                  setSimResults(null);
                  setWhatIfSimResults(null);
                }}
                onSquadBuilderTeamChange={team => {
                  setSquadBuilderTeam(team);
                  setSquadPlayerSearch('');
                }}
                onSquadPlayerSearchChange={setSquadPlayerSearch}
                onSquadTopNChange={n => {
                  setSquadTopN(n);
                  setSimResults(null);
                }}
                onAddSquadPlayer={addSquadPlayer}
                onRemoveSquadPlayer={removeSquadPlayer}
                onRestoreSquadPlayer={restoreSquadPlayer}
                onUnaddSquadPlayer={unaddSquadPlayer}
                onClearAll={() => {
                  setWhatIfResults([]);
                  setSquadOverrides({});
                  setSquadBuilderTeam('');
                  setSimResults(null);
                  setWhatIfSimResults(null);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>


        {/* Glossary */}
        <Glossary />

        <p className="text-center text-gray-600 text-xs mt-4">
          Frame-differential ratings &bull; Logistic prediction &bull; Points: HW=2, AW=3, D=1
        </p>
        <p className="text-center text-gray-600 text-xs mt-2">
          &copy; Mike Lewis {new Date().getFullYear()}
        </p>
      </main>

      {/* My Team Modal */}
      <AnimatePresence>
        {showMyTeamModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowMyTeamModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-card border border-surface-border rounded-card shadow-elevated p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Star size={20} className="text-accent" />
                Set My Team
              </h3>
              {(Object.entries(DIVISIONS) as [DivisionCode, { name: string; teams: string[] }][]).map(([divCode, divData]) => (
                <div key={divCode} className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{divData.name}</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {divData.teams.map(team => (
                      <button
                        key={team}
                        onClick={() => handleSetMyTeam(team, divCode)}
                        className={clsx(
                          'text-left text-sm px-3 py-1.5 rounded transition',
                          myTeam?.team === team
                            ? 'bg-accent text-fixed-white'
                            : 'text-gray-300 hover:bg-surface-elevated'
                        )}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {myTeam && (
                <button
                  onClick={() => { clearMyTeam(); setShowMyTeamModal(false); addToast('My Team cleared', 'info'); }}
                  className="w-full mt-2 text-loss text-sm py-2 hover:bg-loss-muted/20 rounded transition"
                >
                  Clear My Team
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
