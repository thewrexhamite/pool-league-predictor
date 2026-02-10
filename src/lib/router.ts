'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DivisionCode } from './types';

export type TabId =
  | 'home'
  | 'standings'
  | 'matches'
  | 'stats'
  | 'myteam'
  | 'team'
  | 'player';

export type SubView =
  // Standings sub-views
  | 'current'
  | 'projected'
  | 'power'
  // Matches sub-views
  | 'upcoming'
  | 'results'
  | 'whatif'
  // Stats sub-views
  | 'leaderboards'
  | 'players'
  | 'compare'
  // My Team sub-views
  | 'overview'
  | 'squad'
  | 'optimizer';

interface RouteState {
  tab: TabId;
  div: DivisionCode;
  subView?: SubView;
  team?: string;
  player?: string;
  home?: string;
  away?: string;
}

export interface RouterOptions {
  validDivisions: string[];
  defaultDiv: string;
}

const DEFAULT_OPTIONS: RouterOptions = {
  validDivisions: ['SD1', 'SD2', 'WD1', 'WD2'],
  defaultDiv: 'SD2',
};

const VALID_TABS = new Set<string>([
  'home', 'standings', 'matches', 'stats', 'myteam', 'team', 'player',
  // Legacy tabs for migration
  'dashboard', 'fixtures', 'results', 'simulate', 'predict', 'players', 'compare', 'optimizer', 'captain',
]);

const VALID_SUB_VIEWS = new Set<string>([
  'current', 'projected', 'power',
  'upcoming', 'results', 'whatif',
  'leaderboards', 'players', 'compare',
  'overview', 'squad', 'optimizer',
]);

/** Map legacy routes to new tab + sub-view */
const LEGACY_ROUTE_MAP: Record<string, { tab: TabId; subView?: SubView }> = {
  'dashboard': { tab: 'home' },
  'fixtures': { tab: 'matches', subView: 'upcoming' },
  'results': { tab: 'matches', subView: 'results' },
  'simulate': { tab: 'standings', subView: 'projected' },
  'predict': { tab: 'matches', subView: 'upcoming' },
  'players': { tab: 'stats', subView: 'players' },
  'compare': { tab: 'stats', subView: 'compare' },
  'optimizer': { tab: 'myteam', subView: 'optimizer' },
  'captain': { tab: 'myteam', subView: 'overview' },
};

export function encodeRoute(
  tab: TabId,
  div: DivisionCode,
  params?: { team?: string; player?: string; home?: string; away?: string; subView?: SubView },
): string {
  let hash = `#/${tab}/${div}`;
  if (tab === 'team' && params?.team) {
    hash += `/${encodeURIComponent(params.team)}`;
  } else if (tab === 'player' && params?.player) {
    hash += `/${encodeURIComponent(params.player)}`;
  } else if (params?.subView) {
    hash += `/${params.subView}`;
  }
  return hash;
}

export function decodeRoute(hash: string, validDivs: Set<string>, defaultDiv: string): RouteState {
  const defaults: RouteState = { tab: 'home', div: defaultDiv };
  if (!hash || hash.length < 2) return defaults;

  const cleaned = hash.startsWith('#/') ? hash.slice(2) : hash.startsWith('#') ? hash.slice(1) : hash;
  const parts = cleaned.split('/').map(decodeURIComponent);

  const rawTab = parts[0];
  if (!rawTab || !VALID_TABS.has(rawTab)) return defaults;

  const div = parts[1];
  if (!div || !validDivs.has(div)) {
    // Handle legacy migration even without valid div
    const legacy = LEGACY_ROUTE_MAP[rawTab];
    if (legacy) {
      return { ...defaults, tab: legacy.tab, subView: legacy.subView };
    }
    return { ...defaults, tab: rawTab as TabId };
  }

  // Migrate legacy routes
  const legacy = LEGACY_ROUTE_MAP[rawTab];
  if (legacy) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[router] Legacy route /${rawTab} redirected to /${legacy.tab}${legacy.subView ? '/' + legacy.subView : ''}`);
    }
    return { tab: legacy.tab, div: div as DivisionCode, subView: legacy.subView };
  }

  const state: RouteState = { tab: rawTab as TabId, div: div as DivisionCode };

  if (rawTab === 'team' && parts[2]) {
    state.team = parts[2];
  } else if (rawTab === 'player' && parts[2]) {
    state.player = parts[2];
  } else if (parts[2] && VALID_SUB_VIEWS.has(parts[2])) {
    state.subView = parts[2] as SubView;
  }

  return state;
}

export function useHashRouter(options?: RouterOptions) {
  const opts = options || DEFAULT_OPTIONS;
  const validDivs = useMemo(() => new Set(opts.validDivisions), [opts.validDivisions]);
  const defaultDiv = opts.defaultDiv;

  const [route, setRouteState] = useState<RouteState>(() => {
    if (typeof window === 'undefined') return { tab: 'home', div: defaultDiv };
    return decodeRoute(window.location.hash, validDivs, defaultDiv);
  });

  // Rewrite legacy hash routes to canonical new routes on load
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    const cleaned = hash.startsWith('#/') ? hash.slice(2) : hash.startsWith('#') ? hash.slice(1) : hash;
    const rawTab = cleaned.split('/')[0];
    if (rawTab && LEGACY_ROUTE_MAP[rawTab]) {
      const decoded = decodeRoute(hash, validDivs, defaultDiv);
      const canonical = encodeRoute(decoded.tab, decoded.div, { subView: decoded.subView });
      window.history.replaceState(null, '', canonical);
    }
  }, []); // Run once on mount

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    function onHashChange() {
      setRouteState(decodeRoute(window.location.hash, validDivs, defaultDiv));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [validDivs, defaultDiv]);

  const navigate = useCallback((
    tab: TabId,
    div: DivisionCode,
    params?: { team?: string; player?: string; home?: string; away?: string; subView?: SubView },
  ) => {
    const hash = encodeRoute(tab, div, params);
    window.location.hash = hash;
    // hashchange listener will update state
  }, []);

  const setTab = useCallback((tab: TabId) => {
    navigate(tab, route.div);
  }, [navigate, route.div]);

  const setSubView = useCallback((subView: SubView) => {
    const newTab = (route.tab === 'team' || route.tab === 'player') ? 'home' : route.tab;
    navigate(newTab, route.div, { subView });
  }, [navigate, route.tab, route.div]);

  const setDiv = useCallback((div: DivisionCode) => {
    const newTab = (route.tab === 'team' || route.tab === 'player') ? 'home' : route.tab;
    navigate(newTab, div, route.subView ? { subView: route.subView } : undefined);
  }, [navigate, route.tab, route.subView]);

  const openTeam = useCallback((team: string) => {
    navigate('team', route.div, { team });
  }, [navigate, route.div]);

  const openPlayer = useCallback((player: string) => {
    navigate('player', route.div, { player });
  }, [navigate, route.div]);

  const openPredict = useCallback((home: string, away: string) => {
    navigate('matches', route.div, { subView: 'upcoming' });
  }, [navigate, route.div]);

  return {
    tab: route.tab,
    div: route.div,
    subView: route.subView,
    team: route.team,
    player: route.player,
    home: route.home,
    away: route.away,
    navigate,
    setTab,
    setSubView,
    setDiv,
    openTeam,
    openPlayer,
    openPredict,
  };
}
