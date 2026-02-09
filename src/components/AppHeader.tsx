'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
import type { DivisionCode, LeagueMeta, SimulationResult } from '@/lib/types';
import { useLeagueData } from '@/lib/data-provider';
import { useActiveData } from '@/lib/active-data-provider';
import { useMyTeam } from '@/hooks/use-my-team';
import { useHashRouter } from '@/lib/router';
import { getAllRemainingFixtures, getAllLeaguePlayers } from '@/lib/predictions';
import { TABS } from '@/lib/tabs';
import { useLeague } from '@/lib/league-context';
import { useLeagueBranding } from '@/lib/league-branding';
import { useToast } from './ToastProvider';
import ThemeToggle from './ThemeToggle';
import SeasonSelector from './SeasonSelector';
import { UserMenu } from './auth';

interface AppHeaderProps {
  timeMachineDate: string | null;
  setTimeMachineDate: (date: string | null) => void;
  setSimResults: (results: SimulationResult[] | null) => void;
  setShowMyTeamModal: (show: boolean) => void;
  setShowNotificationSettings: (show: boolean) => void;
  setShowQuickLookup: (show: boolean) => void;
  refreshing: boolean;
  availableDates: string[];
  league?: LeagueMeta;
}

export default function AppHeader({
  timeMachineDate,
  setTimeMachineDate,
  setSimResults,
  setShowMyTeamModal,
  setShowNotificationSettings,
  setShowQuickLookup,
  refreshing,
  availableDates,
  league,
}: AppHeaderProps) {
  const { ds } = useActiveData();
  const { data: leagueData } = useLeagueData();
  const { addToast } = useToast();
  const { myTeam } = useMyTeam();
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

  // Ensure division is valid for current league
  const safeDiv = useMemo(() => {
    if (divisionCodes.length === 0) return '' as DivisionCode;
    if (ds.divisions[router.div]) return router.div;
    return (divisionCodes[0] as DivisionCode) || router.div;
  }, [router.div, ds.divisions, divisionCodes]);

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

  const resetDivision = (key: DivisionCode) => {
    router.setDiv(key);
    setSimResults(null);
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
    if (!searchOpen) return;
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [searchOpen]);

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

  const totalRemaining = getAllRemainingFixtures(ds).length;
  const totalPlayed = ds.results.length;
  const seasonPct = totalPlayed + totalRemaining > 0
    ? Math.round((totalPlayed / (totalPlayed + totalRemaining)) * 100)
    : 0;

  return (
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
              onClick={() => clearSelection()}
              className="text-lg md:text-xl font-bold hover:opacity-80 transition-opacity"
              title="Back to landing page"
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
            {selected && selected.league.seasons.length > 1 && (
              <div className="hidden md:block">
                <SeasonSelector />
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
            {/* Quick Lookup button (desktop) */}
            <button
              onClick={() => setShowQuickLookup(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white bg-surface-card border border-surface-border rounded-lg transition hover:border-baize"
              title="Quick Lookup (Cmd+K)"
            >
              <Search size={14} />
              <span className="text-[10px] text-gray-500 border border-surface-border rounded px-1 py-0.5 font-mono">⌘K</span>
            </button>

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

                {/* Season selector */}
                {selected && selected.league.seasons.length > 1 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Season</div>
                    <SeasonSelector />
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

                {/* My Team + Time Machine + Quick Lookup */}
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
                <button
                  onClick={() => { setShowQuickLookup(true); setMobileMenuOpen(false); }}
                  className="flex items-center justify-center gap-1.5 bg-surface-card border border-surface-border rounded-lg py-2 text-xs text-gray-300 hover:text-white transition"
                >
                  <Search size={14} />
                  Quick Lookup
                </button>

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
  );
}
