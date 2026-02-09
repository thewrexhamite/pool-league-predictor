'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DivisionCode } from './types';

export type TabId =
  | 'dashboard'
  | 'standings'
  | 'results'
  | 'simulate'
  | 'predict'
  | 'fixtures'
  | 'players'
  | 'stats'
  | 'compare'
  | 'optimizer'
  | 'captain'
  | 'team'
  | 'player';

interface RouteState {
  tab: TabId;
  div: DivisionCode;
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
  'dashboard', 'standings', 'results', 'simulate', 'predict',
  'fixtures', 'players', 'stats', 'compare', 'optimizer', 'captain', 'team', 'player',
]);

export function encodeRoute(tab: TabId, div: DivisionCode, params?: { team?: string; player?: string; home?: string; away?: string }): string {
  let hash = `#/${tab}/${div}`;
  if (tab === 'team' && params?.team) {
    hash += `/${encodeURIComponent(params.team)}`;
  } else if (tab === 'player' && params?.player) {
    hash += `/${encodeURIComponent(params.player)}`;
  } else if (tab === 'predict' && params?.home && params?.away) {
    hash += `/${encodeURIComponent(params.home)}/vs/${encodeURIComponent(params.away)}`;
  }
  return hash;
}

export function decodeRoute(hash: string, validDivs: Set<string>, defaultDiv: string): RouteState {
  const defaults: RouteState = { tab: 'dashboard', div: defaultDiv };
  if (!hash || hash.length < 2) return defaults;

  const cleaned = hash.startsWith('#/') ? hash.slice(2) : hash.startsWith('#') ? hash.slice(1) : hash;
  const parts = cleaned.split('/').map(decodeURIComponent);

  const tab = parts[0];
  if (!tab || !VALID_TABS.has(tab)) return defaults;

  const div = parts[1];
  if (!div || !validDivs.has(div)) return { ...defaults, tab: tab as TabId };

  const state: RouteState = { tab: tab as TabId, div: div as DivisionCode };

  if (tab === 'team' && parts[2]) {
    state.team = parts[2];
  } else if (tab === 'player' && parts[2]) {
    state.player = parts[2];
  } else if (tab === 'predict' && parts[2] && parts[3] === 'vs' && parts[4]) {
    state.home = parts[2];
    state.away = parts[4];
  }

  return state;
}

export function useHashRouter(options?: RouterOptions) {
  const opts = options || DEFAULT_OPTIONS;
  const validDivs = useMemo(() => new Set(opts.validDivisions), [opts.validDivisions]);
  const defaultDiv = opts.defaultDiv;

  const [route, setRouteState] = useState<RouteState>(() => {
    if (typeof window === 'undefined') return { tab: 'dashboard', div: defaultDiv };
    return decodeRoute(window.location.hash, validDivs, defaultDiv);
  });

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    function onHashChange() {
      setRouteState(decodeRoute(window.location.hash, validDivs, defaultDiv));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [validDivs, defaultDiv]);

  const navigate = useCallback((tab: TabId, div: DivisionCode, params?: { team?: string; player?: string; home?: string; away?: string }) => {
    const hash = encodeRoute(tab, div, params);
    window.location.hash = hash;
    // hashchange listener will update state
  }, []);

  const setTab = useCallback((tab: TabId) => {
    navigate(tab, route.div);
  }, [navigate, route.div]);

  const setDiv = useCallback((div: DivisionCode) => {
    const newTab = (route.tab === 'team' || route.tab === 'player') ? 'dashboard' : route.tab;
    navigate(newTab, div);
  }, [navigate, route.tab]);

  const openTeam = useCallback((team: string) => {
    navigate('team', route.div, { team });
  }, [navigate, route.div]);

  const openPlayer = useCallback((player: string) => {
    navigate('player', route.div, { player });
  }, [navigate, route.div]);

  const openPredict = useCallback((home: string, away: string) => {
    navigate('predict', route.div, { home, away });
  }, [navigate, route.div]);

  return {
    tab: route.tab,
    div: route.div,
    team: route.team,
    player: route.player,
    home: route.home,
    away: route.away,
    navigate,
    setTab,
    setDiv,
    openTeam,
    openPlayer,
    openPredict,
  };
}
