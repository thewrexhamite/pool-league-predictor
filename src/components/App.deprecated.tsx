'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Trophy,
  Search,
  X,
  Star,
  RefreshCw,
  Clock,
  ArrowLeft,
  ChevronDown,
  Menu,
  Users,
} from 'lucide-react';
import type {
  DivisionCode,
  LeagueMeta,
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
} from '@/lib/predictions/index';
import { getAvailableMatchDates } from '@/lib/time-machine';
import { TABS } from '@/lib/tabs';
import { useLeague } from '@/lib/league-context';
import { useLeagueBranding } from '@/lib/league-branding';

import { useRouter } from 'next/navigation';
import { ToastProvider, useToast } from './ToastProvider';
import BottomTabBar from './BottomTabBar';
import BackToTopButton from './BackToTopButton';
import DashboardTab from './DashboardTab';
import StandingsTab from './StandingsTab';
import ResultsTab from './ResultsTab';
import SimulateTab from './SimulateTab';
import PredictTab from './PredictTab';
import FixturesTab from './FixturesTab';
import PlayersTab from './PlayersTab';
import StatsTab from './StatsTab';
import TeamDetail from './TeamDetail';
import PlayerDetail from './PlayerDetail';
import Glossary from './Glossary';
import ThemeToggle from './ThemeToggle';
import { UserMenu } from './auth';
import NotificationSettings from './NotificationSettings';

/** Outer shell: owns time-machine state + wraps children with ActiveDataProvider */
function AppInner({ league }: { league?: LeagueMeta }) {
  const { data: leagueData, refreshing, loading } = useLeagueData();
  const [timeMachineDate, setTimeMachineDate] = useState<string | null>(null);

  // Show loading state while data is being fetched or if no divisions exist yet
  const hasDivisions = Object.keys(leagueData.divisions).length > 0;
  if (loading || !hasDivisions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="skeleton w-12 h-12 rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading league data...</p>
        </div>
      </div>
    );
  }

  return (
    <ActiveDataProvider leagueData={leagueData} timeMachineDate={timeMachineDate}>
      <AppContent
        league={league}
        refreshing={refreshing}
        timeMachineDate={timeMachineDate}
        setTimeMachineDate={setTimeMachineDate}
      />
    </ActiveDataProvider>
  );
}

interface AppContentProps {
  league?: LeagueMeta;
  refreshing: boolean;
  timeMachineDate: string | null;
  setTimeMachineDate: (d: string | null) => void;
}

function AppContent({ league, refreshing, timeMachineDate, setTimeMachineDate }: AppContentProps) {
  const { data: activeData, ds } = useActiveData();
  const { data: leagueData, loading: dataLoading } = useLeagueData();
  const { addToast } = useToast();
  const { myTeam, setMyTeam, clearMyTeam } = useMyTeam();
  const { leagues, selected, selectLeague, clearSelection } = useLeague();
  const { logo } = useLeagueBranding();
  const nextRouter = useRouter();

  // Dynamic divisions from data
  const divisionCodes = useMemo(() => Object.keys(ds.divisions), [ds.divisions]);
  const routerOptions = useMemo(() => ({
    validDivisions: divisionCodes.length > 0 ? divisionCodes : [],
    defaultDiv: divisionCodes[0] || '',
  }), [divisionCodes]);
  const router = useHashRouter(routerOptions);

  // Ensure division is valid for current league (handles switching between leagues)
  const safeDiv = useMemo(() => {
    if (divisionCodes.length === 0) return '' as DivisionCode;
    if (ds.divisions[router.div]) return router.div;
    return (divisionCodes[0] as DivisionCode) || router.div;
  }, [router.div, ds.divisions, divisionCodes]);

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

  // League switcher
  const [leagueDropdownOpen, setLeagueDropdownOpen] = useState(false);
  const leagueDropdownRef = useRef<HTMLDivElement>(null);

  // Mobile hamburger menu
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // My Team modal
  const [showMyTeamModal, setShowMyTeamModal] = useState(false);

  // Notification Settings modal
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [router.tab]);

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
    selectedDiv: safeDiv,
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

  const standings = calcStandings(safeDiv, ds);
  const totalRemaining = getAllRemainingFixtures(ds).length;
  const totalPlayed = ds.results.length;

  const runSimulation = useCallback(() => {
    setIsSimulating(true);
    setTimeout(() => {
      const results = runSeasonSimulation(safeDiv, squadOverrides, squadTopN, whatIfResults, ds);
      setSimResults(results);
      setWhatIfSimResults(whatIfResults.length > 0 ? [...whatIfResults] : null);
      setIsSimulating(false);
      addToast('Simulation complete — 1,000 seasons', 'success');
    }, 100);
  }, [safeDiv, squadOverrides, squadTopN, whatIfResults, ds, addToast]);

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

  // Click-outside to close league dropdown
  useEffect(() => {
    if (!leagueDropdownOpen) return;
    function handleClick(e: MouseEvent) {
      if (leagueDropdownRef.current && !leagueDropdownRef.current.contains(e.target as Node)) {
        setLeagueDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [leagueDropdownOpen]);

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

  // League switcher handler
  const handleSwitchLeague = (leagueId: string) => {
    const targetLeague = leagues.find(l => l.id === leagueId);
    if (!targetLeague) return;
    const currentSeason = targetLeague.seasons.find(s => s.current) || targetLeague.seasons[0];
    if (!currentSeason) return;
    selectLeague(leagueId, currentSeason.id);
    setLeagueDropdownOpen(false);
    setMobileMenuOpen(false);
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
  const selectedDiv = safeDiv;
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
              {logo && (
                <Image
                  src={logo}
                  alt="League logo"
                  width={40}
                  height={40}
                  className="w-8 h-8 md:w-10 md:h-10 object-contain"
                  unoptimized
                />
              )}
              <button
                onClick={() => router.setTab('dashboard')}
                className="text-lg md:text-xl font-bold hover:opacity-80 transition-opacity"
              >
                <span className="text-gray-100">Pool League </span><span className="text-accent">Pro</span>
              </button>
              {selected && leagues.length > 0 && (
                <div className="hidden md:block relative" ref={leagueDropdownRef}>
                  <button
                    onClick={() => setLeagueDropdownOpen(prev => !prev)}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition px-1.5 py-0.5 rounded border border-surface-border/50 hover:border-surface-border"
                  >
                    {selected.league.shortName}
                    <ChevronDown size={10} className={clsx('transition-transform', leagueDropdownOpen && 'rotate-180')} />
                  </button>
                  {leagueDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-surface-card border border-surface-border rounded-lg shadow-elevated z-50 min-w-[160px] overflow-hidden">
                      {leagues.map(l => {
                        const isActive = l.id === selected.leagueId;
                        return (
                          <button
                            key={l.id}
                            onClick={() => handleSwitchLeague(l.id)}
                            className={clsx(
                              'w-full text-left px-3 py-2 text-xs transition hover:bg-surface-elevated',
                              isActive ? 'font-bold' : 'text-gray-300'
                            )}
                            style={isActive ? { color: 'var(--league-primary)' } : undefined}
                          >
                            {l.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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
                      ? 'text-fixed-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  )}
                  style={selectedDiv === key ? { backgroundColor: 'var(--league-primary)' } : undefined}
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

              {/* User menu — desktop only */}
              <div className="hidden md:block">
                <UserMenu
                  onLoginClick={() => nextRouter.push('/auth/login')}
                  onNotificationSettingsClick={() => setShowNotificationSettings(true)}
                />
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

                  {/* League switcher */}
                  {selected && leagues.length > 1 && (
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">League</div>
                      <div className="flex gap-1">
                        {leagues.map(l => (
                          <button
                            key={l.id}
                            onClick={() => handleSwitchLeague(l.id)}
                            className={clsx(
                              'flex-1 py-1.5 rounded-lg text-xs font-medium transition text-center',
                              l.id === selected.leagueId
                                ? 'text-fixed-white'
                                : 'bg-surface-card text-gray-400'
                            )}
                            style={l.id === selected.leagueId ? { backgroundColor: 'var(--league-primary)' } : undefined}
                          >
                            {l.shortName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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
                              ? 'text-fixed-white'
                              : 'bg-surface-card text-gray-400'
                          )}
                          style={selectedDiv === key ? { backgroundColor: 'var(--league-primary)' } : undefined}
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

                  {/* Account */}
                  <div className="flex items-center justify-between bg-surface-card border border-surface-border rounded-lg px-3 py-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Account</span>
                    <UserMenu
                      onLoginClick={() => { setMobileMenuOpen(false); nextRouter.push('/auth/login'); }}
                      onNotificationSettingsClick={() => { setMobileMenuOpen(false); setShowNotificationSettings(true); }}
                    />
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
            {league ? `${league.shortName} \u2014 ` : ''}{ds.divisions[selectedDiv]?.name} &bull; {totalPlayed} played &bull; {totalRemaining} remaining &bull; {seasonPct}% complete
          </p>
        </div>

        {/* Tab bar — hidden on mobile, bottom bar used instead */}
        <div className="hidden md:block border-t border-surface-border/50">
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
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6">
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

            {activeTab === 'stats' && (
              <StatsTab
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
                timeMachineDate={timeMachineDate}
                onTimeMachineDateChange={(date) => { setTimeMachineDate(date); setSimResults(null); }}
                availableDates={availableDates}
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
          Home Win = 2pts &bull; Away Win = 3pts &bull; Draw = 1pt each
        </p>
        <p className="text-center text-gray-600 text-xs mt-2">
          &copy; Mike Lewis {new Date().getFullYear()} &bull; Pool League Pro
        </p>
      </main>

      {/* Back to top button */}
      <BackToTopButton />

      {/* Bottom tab bar — mobile only */}
      <div className="md:hidden">
        <BottomTabBar activeTab={activeTab} onTabChange={tab => { setMobileMenuOpen(false); router.setTab(tab); }} />
      </div>

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
              {(Object.entries(ds.divisions) as [DivisionCode, { name: string; teams: string[] }][]).map(([divCode, divData]) => (
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

      {/* Notification Settings Modal */}
      <AnimatePresence>
        {showNotificationSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowNotificationSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-card border border-surface-border rounded-card shadow-elevated p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <NotificationSettings onUnsubscribe={() => setShowNotificationSettings(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App({ league }: { league?: LeagueMeta }) {
  return (
    <ToastProvider>
      <AppInner league={league} />
    </ToastProvider>
  );
}
