'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { doc, getDoc } from 'firebase/firestore';
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

import { DIVISIONS as STATIC_DIVISIONS } from './data';

function cacheKey(leagueId: string, seasonId: string) {
  return `pool-league-${leagueId}-${seasonId}-data`;
}

function cacheTsKey(leagueId: string, seasonId: string) {
  return `pool-league-${leagueId}-${seasonId}-ts`;
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
}

interface DataContextValue {
  data: LeagueData;
  loading: boolean;
  refreshing: boolean;
}

function getStaticData(): LeagueData {
  return {
    results: resultsData as MatchResult[],
    fixtures: fixturesData as Fixture[],
    players: playersData as PlayersMap,
    rosters: rostersData as RostersMap,
    players2526: players2526Data as Players2526Map,
    frames: [],
    divisions: STATIC_DIVISIONS,
    lastUpdated: 0,
    source: 'static',
  };
}

function getEmptyData(): LeagueData {
  return {
    results: [],
    fixtures: [],
    players: {},
    rosters: {},
    players2526: {},
    frames: [],
    divisions: {} as Divisions,
    lastUpdated: 0,
    source: 'static',
  };
}

function getCachedData(leagueId: string, seasonId: string): LeagueData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(cacheKey(leagueId, seasonId));
    const ts = localStorage.getItem(cacheTsKey(leagueId, seasonId));
    if (!cached || !ts) return null;
    const parsed = JSON.parse(cached) as Omit<LeagueData, 'source'>;
    return { ...parsed, source: 'cache' };
  } catch {
    return null;
  }
}

function setCachedData(leagueId: string, seasonId: string, data: LeagueData) {
  if (typeof window === 'undefined') return;
  try {
    const { source: _, ...rest } = data;
    localStorage.setItem(cacheKey(leagueId, seasonId), JSON.stringify(rest));
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
    const cached = getCachedData(leagueId, seasonId);
    if (cached) return cached;
    // Only use static fallback for the default league/season
    return isDefaultLeague ? getStaticData() : getEmptyData();
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Reset state when league/season changes
    const cached = getCachedData(leagueId, seasonId);
    if (cached) {
      setData(cached);
    } else if (isDefaultLeague) {
      setData(getStaticData());
    } else {
      setData(getEmptyData());
    }

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
          const cachedTs = parseInt(localStorage.getItem(cacheTsKey(leagueId, seasonId)) || '0', 10);

          if (raw.lastUpdated > cachedTs) {
            const staticDiv = isDefaultLeague ? STATIC_DIVISIONS : ({} as Divisions);
            const newData: LeagueData = {
              results: raw.results || [],
              fixtures: raw.fixtures || [],
              players: raw.players || {},
              rosters: raw.rosters || {},
              players2526: raw.players2526 || {},
              frames: raw.frames || [],
              divisions: raw.divisions || staticDiv,
              lastUpdated: raw.lastUpdated,
              source: 'firestore',
            };
            setData(newData);
            setCachedData(leagueId, seasonId, newData);
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

  return (
    <DataContext.Provider value={{ data, loading, refreshing }}>
      {children}
    </DataContext.Provider>
  );
}

export function useLeagueData() {
  return useContext(DataContext);
}
