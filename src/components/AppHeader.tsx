'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Search,
  X,
  Star,
  RefreshCw,
  Clock,
  ArrowLeft,
  ChevronDown,
  Menu,
  CircleDot,
  ScanLine,
  User,
} from 'lucide-react';
import type { DivisionCode, LeagueMeta, SimulationResult } from '@/lib/types';
import { useLeagueData } from '@/lib/data-provider';
import { useActiveData } from '@/lib/active-data-provider';
import { useAuth, useIsAuthenticated } from '@/lib/auth';
import { useMyTeam } from '@/hooks/use-my-team';
import { useHashRouter } from '@/lib/router';
import { getAllRemainingFixtures } from '@/lib/predictions';
import { TABS } from '@/lib/tabs';
import { useLeague } from '@/lib/league-context';
import { useLeagueBranding } from '@/lib/league-branding';
import { withViewTransition } from '@/lib/view-transitions';
import { useToast } from './ToastProvider';
import ThemeToggle from './ThemeToggle';
import SeasonSelector from './SeasonSelector';
import { UserMenu } from './auth';
import { useTutorial } from './tutorial/TutorialProvider';

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
  isKnockout?: boolean;
  setShowQRScanner: (show: boolean) => void;
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
  isKnockout = false,
  setShowQRScanner,
}: AppHeaderProps) {
  const { ds } = useActiveData();
  const { data: leagueData } = useLeagueData();
  const { user, profile } = useAuth();
  const isAuthenticated = useIsAuthenticated();
  const { addToast } = useToast();
  const { myTeam } = useMyTeam();
  const { leagues, selected, selectLeague, clearSelection } = useLeague();
  const { logo } = useLeagueBranding();
  const nextRouter = useRouter();
  const { startTutorial, completedTutorials, availableTutorials } = useTutorial();
  const handleStartTutorial = () => {
    const next = availableTutorials.find(t => !completedTutorials.includes(t.id));
    startTutorial(next?.id || 'command-centre');
  };

  // Dynamic divisions from data
  const divisionCodes = useMemo(() => Object.keys(ds.divisions), [ds.divisions]);
  const knockoutCodes = useMemo(
    () => new Set((leagueData.knockouts || []).map(k => k.code)),
    [leagueData.knockouts]
  );
  const leagueDivCodes = useMemo(
    () => divisionCodes.filter(c => !knockoutCodes.has(c)) as DivisionCode[],
    [divisionCodes, knockoutCodes]
  );
  const cupDivCodes = useMemo(
    () => divisionCodes.filter(c => knockoutCodes.has(c)) as DivisionCode[],
    [divisionCodes, knockoutCodes]
  );
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

  // Resolve detail tabs to their parent for highlighting
  const activeTab = router.tab === 'team' ? 'standings' : router.tab === 'player' ? 'stats' : router.tab;
  const selectedDiv = safeDiv;

  const totalRemaining = getAllRemainingFixtures(ds).length;
  const totalPlayed = ds.results.length;
  const seasonPct = totalPlayed + totalRemaining > 0
    ? Math.round((totalPlayed / (totalPlayed + totalRemaining)) * 100)
    : 0;

  const visibleTabs = useMemo(
    () => isKnockout ? TABS.filter(t => t.id === 'home' || t.id === 'standings') : TABS,
    [isKnockout]
  );

  return (
    <header data-tutorial="header" className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-surface-border glass glass-edge header-scroll-shadow vt-header">
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
                style={{ viewTransitionName: 'app-logo' }}
                unoptimized
              />
            )}
            <button
              onClick={() => withViewTransition(() => clearSelection())}
              className="text-lg md:text-xl font-bold hover:opacity-80 transition-opacity btn-press"
              title="Back to landing page"
            >
              <span className="text-gray-100">Pool League </span><span className="text-accent">Pro</span>
            </button>
            {selected && leagues.length > 0 && (
              <div data-tutorial="league-switcher" className="hidden md:block relative" ref={leagueDropdownRef}>
                <button
                  onClick={() => setLeagueDropdownOpen(prev => !prev)}
                  className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition px-1.5 py-0.5 rounded border border-surface-border/50 hover:border-surface-border btn-press"
                >
                  {selected.league.shortName}
                  <ChevronDown size={10} className={clsx('transition-transform', leagueDropdownOpen && 'rotate-180')} />
                </button>
                <div className="absolute top-full left-0 mt-1 bg-surface-card border border-surface-border rounded-lg shadow-elevated z-50 min-w-[160px] overflow-hidden dropdown-animated" hidden={!leagueDropdownOpen}>
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
          <div className="hidden md:flex items-center bg-surface-card rounded-lg p-0.5 vt-division-control">
            {leagueDivCodes.map((key, i) => (
              <button
                key={key}
                onClick={() => resetDivision(key)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-baize focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
                  i === 0 && 'rounded-l-md',
                  cupDivCodes.length === 0 && i === leagueDivCodes.length - 1 && 'rounded-r-md',
                  selectedDiv === key
                    ? 'text-fixed-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                )}
                style={selectedDiv === key ? { backgroundColor: 'var(--league-primary)' } : undefined}
              >
                {key}
              </button>
            ))}
            {cupDivCodes.length > 0 && (
              <>
                <div className="w-px h-5 bg-surface-border/50 mx-1" />
                {cupDivCodes.map((key, i) => (
                  <button
                    key={key}
                    onClick={() => resetDivision(key)}
                    className={clsx(
                      'px-3 py-1.5 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-baize focus-visible:ring-offset-1 focus-visible:ring-offset-surface',
                      i === cupDivCodes.length - 1 && 'rounded-r-md',
                      selectedDiv === key
                        ? 'text-fixed-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    )}
                    style={selectedDiv === key ? { backgroundColor: 'var(--league-primary)' } : undefined}
                  >
                    {ds.divisions[key]?.name || key}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Right: Search + Time Machine + My Team */}
          <div className="flex items-center gap-2">
            {/* Quick Lookup button (desktop) */}
            <button
              onClick={() => setShowQuickLookup(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white bg-surface-card border border-surface-border rounded-lg transition hover:border-baize btn-press"
              title="Quick Lookup (Cmd+K)"
            >
              <Search size={14} />
              <span className="text-[10px] text-gray-500 border border-surface-border rounded px-1 py-0.5 font-mono">⌘K</span>
            </button>

            {/* Desktop search — uses Quick Lookup overlay */}

            {/* Time Machine button (desktop only) */}
            <div className="hidden md:block relative">
              <button
                onClick={() => setTimeMachineOpen(!timeMachineOpen)}
                aria-expanded={timeMachineOpen}
                className={clsx(
                  'p-2 rounded transition btn-press',
                  timeMachineDate
                    ? 'text-accent bg-accent-muted/30'
                    : 'text-gray-400 hover:text-white'
                )}
                aria-label="Time Machine"
                title="Time Machine"
              >
                <Clock size={18} />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-surface-card border border-surface-border rounded-lg shadow-elevated z-50 w-52 max-h-64 overflow-y-auto dropdown-animated" hidden={!timeMachineOpen}>
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
            </div>

            {/* Theme toggle — desktop only */}
            <div data-tutorial="theme-toggle" className="hidden md:block">
              <ThemeToggle variant="icon" />
            </div>

            {/* User menu — desktop only */}
            <div data-tutorial="user-menu" className="hidden md:block">
              <UserMenu
                onLoginClick={() => nextRouter.push('/auth/login')}
                onNotificationSettingsClick={() => setShowNotificationSettings(true)}
                onStartTutorial={handleStartTutorial}
              />
            </div>

            {/* My Team button — desktop only (if not set) */}
            {!myTeam && (
              <button
                onClick={() => setShowMyTeamModal(true)}
                className="hidden md:block p-2 text-gray-400 hover:text-accent-light transition btn-press"
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

            {/* Mobile QR scan button */}
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setShowQRScanner(true);
                } else {
                  nextRouter.push('/auth/login');
                }
              }}
              className="md:hidden p-2 text-gray-400 hover:text-white transition btn-press"
              aria-label="Scan QR code"
            >
              <ScanLine size={20} />
            </button>

            {/* Mobile profile avatar */}
            <button
              onClick={() => {
                if (isAuthenticated) {
                  nextRouter.push('/profile');
                } else {
                  nextRouter.push('/auth/login');
                }
              }}
              className="md:hidden flex items-center justify-center transition btn-press"
              aria-label="Profile"
            >
              {isAuthenticated && profile?.photoURL ? (
                <Image
                  src={profile.photoURL}
                  alt="Profile"
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-surface-border"
                  unoptimized
                />
              ) : isAuthenticated && profile?.displayName ? (
                <div className="w-7 h-7 rounded-full bg-baize/20 text-baize flex items-center justify-center text-xs font-bold ring-1 ring-surface-border">
                  {profile.displayName.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-surface-card flex items-center justify-center ring-1 ring-surface-border">
                  <User size={14} className="text-gray-400" />
                </div>
              )}
            </button>

            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition btn-press"
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
                  <div className="flex flex-wrap gap-1">
                    {leagueDivCodes.map((key) => (
                      <button
                        key={key}
                        onClick={() => resetDivision(key)}
                        className={clsx(
                          'flex-1 py-1.5 rounded-lg text-xs font-medium transition text-center focus-visible:ring-2 focus-visible:ring-baize',
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
                {cupDivCodes.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Cup</div>
                    <div className="flex flex-wrap gap-1">
                      {cupDivCodes.map((key) => (
                        <button
                          key={key}
                          onClick={() => resetDivision(key)}
                          className={clsx(
                            'flex-1 py-1.5 rounded-lg text-xs font-medium transition text-center focus-visible:ring-2 focus-visible:ring-baize',
                            selectedDiv === key
                              ? 'text-fixed-white'
                              : 'bg-surface-card text-gray-400'
                          )}
                          style={selectedDiv === key ? { backgroundColor: 'var(--league-primary)' } : undefined}
                        >
                          {ds.divisions[key]?.name || key}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                <button
                  onClick={() => { setMobileMenuOpen(false); nextRouter.push('/kiosk'); }}
                  className="flex items-center justify-center gap-1.5 bg-surface-card border border-surface-border rounded-lg py-2 text-xs text-gray-300 hover:text-white transition"
                >
                  <CircleDot size={14} />
                  The Chalk
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
                    onStartTutorial={handleStartTutorial}
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
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-tutorial={`tab-${tab.id}`}
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
