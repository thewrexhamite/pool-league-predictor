'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import type {
  MatchResult,
  Fixture,
  PlayersMap,
  RostersMap,
  Players2526Map,
  FrameData,
  Divisions,
  SeasonData,
} from './types';

// Static JSON imports (fallback for wrexham/2526)
import resultsData from '@data/results.json';
import fixturesData from '@data/fixtures.json';
import playersData from '@data/players.json';
import rostersData from '@data/rosters.json';
import players2526Data from '@data/players2526.json';
import framesData from '@data/frames.json';

const CACHE_NAME = 'pool-league-data-v1';

function cacheKey(leagueId: string, seasonId: string) {
  return `pool-league-${leagueId}-${seasonId}-data`;
}

function cacheTsKey(leagueId: string, seasonId: string) {
  return `pool-league-${leagueId}-${seasonId}-ts`;
}

function cacheUrl(leagueId: string, seasonId: string) {
  return `/api/cache/${leagueId}/${seasonId}`;
}

export interface LeagueData {
  results: MatchResult[];
  fixtures: Fixture[];
  players: PlayersMap;
  rosters: RostersMap;
  players2526: Players2526Map;
  frames: FrameData[];
  divisions: Divisions;
  lastUpdated: number;
  source: 'static' | 'cache' | 'firestore';
  isOffline: boolean;
  cacheAge: number;
}

interface DataContextValue {
  data: LeagueData;
  loading: boolean;
  refreshing: boolean;
}

/**
 * Returns static JSON data for wrexham/2526 fallback.
 * Note: Divisions are intentionally empty here - they should come from Firestore.
 * Static data is only used when Firestore is unavailable or hasn't loaded yet.
 */
function getStaticData(): LeagueData {
  return {
    results: resultsData as MatchResult[],
    fixtures: fixturesData as Fixture[],
    players: playersData as PlayersMap,
    rosters: rostersData as RostersMap,
    players2526: players2526Data as Players2526Map,
    frames: framesData as FrameData[],
    divisions: {},
    lastUpdated: 0,
    source: 'static',
    isOffline: false,
    cacheAge: 0,
  };
}

/**
 * Returns empty data structure for leagues with no data available.
 * This is used for new leagues that haven't been configured yet.
 */
function getEmptyData(): LeagueData {
  return {
    results: [],
    fixtures: [],
    players: {},
    rosters: {},
    players2526: {},
    frames: [],
    divisions: {},
    lastUpdated: 0,
    source: 'static',
    isOffline: false,
    cacheAge: 0,
  };
}

/**
 * Synchronous helper for initial state (localStorage only).
 * Used during SSR and initial render where async is not possible.
 */
function getCachedDataSync(leagueId: string, seasonId: string): LeagueData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(cacheKey(leagueId, seasonId));
    const ts = localStorage.getItem(cacheTsKey(leagueId, seasonId));
    if (!cached || !ts) return null;
    const parsed = JSON.parse(cached) as Omit<LeagueData, 'source' | 'isOffline' | 'cacheAge'>;
    const now = Date.now();
    const isOffline = !navigator.onLine;
    const cacheAge = parsed.lastUpdated ? now - parsed.lastUpdated : 0;
    return { ...parsed, source: 'cache', isOffline, cacheAge };
  } catch {
    return null;
  }
}

/**
 * Async function that checks Cache API first, then falls back to localStorage.
 * Provides better offline support for PWAs.
 */
async function getCachedData(leagueId: string, seasonId: string): Promise<LeagueData | null> {
  if (typeof window === 'undefined') return null;

  // Try Cache API first (better for PWA/offline support)
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(cacheUrl(leagueId, seasonId));

      if (response) {
        const data = await response.json();
        const now = Date.now();
        const isOffline = !navigator.onLine;
        const cacheAge = data.lastUpdated ? now - data.lastUpdated : 0;
        return { ...data, source: 'cache' as const, isOffline, cacheAge };
      }
    }
  } catch {
    // Cache API failed, fall through to localStorage
  }

  // Fallback to localStorage
  return getCachedDataSync(leagueId, seasonId);
}

/**
 * Saves data to both Cache API and localStorage for redundancy.
 * Cache API provides better offline support, localStorage provides quick sync access.
 */
async function setCachedData(leagueId: string, seasonId: string, data: LeagueData): Promise<void> {
  if (typeof window === 'undefined') return;

  // Exclude computed/transient fields when saving
  const { source: _, isOffline: __, cacheAge: ___, ...rest } = data;
  const dataStr = JSON.stringify(rest);

  // Save to Cache API (better for PWA/offline)
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const response = new Response(dataStr, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=31536000',
        },
      });
      await cache.put(cacheUrl(leagueId, seasonId), response);
    }
  } catch {
    // Cache API failed, continue to localStorage
  }

  // Also save to localStorage for sync access
  try {
    localStorage.setItem(cacheKey(leagueId, seasonId), dataStr);
    localStorage.setItem(cacheTsKey(leagueId, seasonId), String(data.lastUpdated));
  } catch {
    // localStorage full or unavailable
  }
}

const DataContext = createContext<DataContextValue>({
  data: getStaticData(),
  loading: true,
  refreshing: false,
});

interface DataProviderProps {
  leagueId?: string;
  seasonId?: string;
  children: ReactNode;
}

export function DataProvider({ leagueId = 'wrexham', seasonId = '2526', children }: DataProviderProps) {
  const isDefaultLeague = leagueId === 'wrexham' && seasonId === '2526';

  const [data, setData] = useState<LeagueData>(() => {
    // Use sync version for initial state (can't be async)
    const cached = getCachedDataSync(leagueId, seasonId);
    if (cached) return cached;
    // Only use static fallback for the default league/season
    return isDefaultLeague ? getStaticData() : getEmptyData();
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Load from cache (async, checks Cache API then localStorage)
    async function loadCachedData() {
      const cached = await getCachedData(leagueId, seasonId);
      if (cancelled) return;

      if (cached) {
        setData(cached);
      } else if (isDefaultLeague) {
        setData(getStaticData());
      } else {
        setData(getEmptyData());
      }
    }

    loadCachedData();

    async function fetchFromFirestore() {
      setRefreshing(true);
      try {
        const { db } = await import('./firebase');
        // Use new multi-league path
        const docRef = doc(db, 'leagues', leagueId, 'seasons', seasonId);
        const snap = await getDoc(docRef);

        if (cancelled) return;

        if (snap.exists()) {
          const raw = snap.data() as SeasonData;

          // Check cached timestamp (try localStorage for quick sync access)
          let cachedTs = 0;
          try {
            cachedTs = parseInt(localStorage.getItem(cacheTsKey(leagueId, seasonId)) || '0', 10);
          } catch {
            // If localStorage fails, check Cache API
            const cached = await getCachedData(leagueId, seasonId);
            cachedTs = cached?.lastUpdated || 0;
          }

          if (raw.lastUpdated > cachedTs) {
            // Load frames from subcollection (or fall back to inline for backward compat)
            let frames: FrameData[] = [];
            if (raw.frames && raw.frames.length > 0) {
              // Legacy: frames still inline on the season doc
              frames = raw.frames;
            } else {
              // New structure: frames in subcollection
              try {
                const framesRef = collection(db, 'leagues', leagueId, 'seasons', seasonId, 'frames');
                const framesSnap = await getDocs(framesRef);
                frames = framesSnap.docs.map(d => d.data() as FrameData);
              } catch {
                // Frames subcollection may not exist yet
              }
            }

            // All data, including divisions, comes from Firestore
            // No league gets special treatment or hardcoded fallbacks
            const newData: LeagueData = {
              results: raw.results || [],
              fixtures: raw.fixtures || [],
              players: raw.players || {},
              rosters: raw.rosters || {},
              players2526: raw.playerStats || raw.players2526 || {},
              frames,
              divisions: raw.divisions || {},
              lastUpdated: raw.lastUpdated,
              source: 'firestore',
              isOffline: false,
              cacheAge: 0,
            };
            setData(newData);
            await setCachedData(leagueId, seasonId, newData);
          }
        }
      } catch {
        // Firestore unreachable -- use cached or static data (already set)
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    // Only attempt Firestore if config is present
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      fetchFromFirestore();
    } else {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [leagueId, seasonId, isDefaultLeague]);

  // Background sync: refresh data when browser comes back online
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;

    let cancelled = false;

    async function syncOnOnline() {
      if (cancelled) return;

      setRefreshing(true);
      try {
        const { db } = await import('./firebase');
        const docRef = doc(db, 'leagues', leagueId, 'seasons', seasonId);
        const snap = await getDoc(docRef);

        if (cancelled) return;

        if (snap.exists()) {
          const raw = snap.data() as SeasonData;

          // Check cached timestamp
          let cachedTs = 0;
          try {
            cachedTs = parseInt(localStorage.getItem(cacheTsKey(leagueId, seasonId)) || '0', 10);
          } catch {
            const cached = await getCachedData(leagueId, seasonId);
            cachedTs = cached?.lastUpdated || 0;
          }

          if (raw.lastUpdated > cachedTs) {
            // Load frames from subcollection (or fall back to inline)
            let frames: FrameData[] = [];
            if (raw.frames && raw.frames.length > 0) {
              frames = raw.frames;
            } else {
              try {
                const framesRef = collection(db, 'leagues', leagueId, 'seasons', seasonId, 'frames');
                const framesSnap = await getDocs(framesRef);
                frames = framesSnap.docs.map(d => d.data() as FrameData);
              } catch {
                // Frames subcollection may not exist yet
              }
            }

            const newData: LeagueData = {
              results: raw.results || [],
              fixtures: raw.fixtures || [],
              players: raw.players || {},
              rosters: raw.rosters || {},
              players2526: raw.playerStats || raw.players2526 || {},
              frames,
              divisions: raw.divisions || {},
              lastUpdated: raw.lastUpdated,
              source: 'firestore',
              isOffline: false,
              cacheAge: 0,
            };
            setData(newData);
            await setCachedData(leagueId, seasonId, newData);
          }
        }
      } catch {
        // Firestore unreachable -- keep current data
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    window.addEventListener('online', syncOnOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', syncOnOnline);
    };
  }, [leagueId, seasonId]);

  return (
    <DataContext.Provider value={{ data, loading, refreshing }}>
      {children}
    </DataContext.Provider>
  );
}

export function useLeagueData() {
  return useContext(DataContext);
}
