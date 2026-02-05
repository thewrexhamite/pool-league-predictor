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

// Static JSON imports (fallback)
import resultsData from '@data/results.json';
import fixturesData from '@data/fixtures.json';
import playersData from '@data/players.json';
import rostersData from '@data/rosters.json';
import players2526Data from '@data/players2526.json';

import { DIVISIONS as STATIC_DIVISIONS } from './data';

const CACHE_KEY = 'pool-league-season-data';
const CACHE_TS_KEY = 'pool-league-season-ts';

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

function getCachedData(): LeagueData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (!cached || !ts) return null;
    const parsed = JSON.parse(cached) as Omit<LeagueData, 'source'>;
    return { ...parsed, source: 'cache' };
  } catch {
    return null;
  }
}

function setCachedData(data: LeagueData) {
  if (typeof window === 'undefined') return;
  try {
    const { source: _, ...rest } = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(rest));
    localStorage.setItem(CACHE_TS_KEY, String(data.lastUpdated));
  } catch {
    // localStorage full or unavailable
  }
}

const DataContext = createContext<DataContextValue>({
  data: getStaticData(),
  loading: true,
  refreshing: false,
});

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LeagueData>(() => {
    const cached = getCachedData();
    return cached || getStaticData();
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchFromFirestore() {
      setRefreshing(true);
      try {
        const { db } = await import('./firebase');
        const docRef = doc(db, 'seasons', '2526');
        const snap = await getDoc(docRef);

        if (cancelled) return;

        if (snap.exists()) {
          const raw = snap.data() as SeasonData;
          const cachedTs = parseInt(localStorage.getItem(CACHE_TS_KEY) || '0', 10);

          if (raw.lastUpdated > cachedTs) {
            const newData: LeagueData = {
              results: raw.results || [],
              fixtures: raw.fixtures || [],
              players: raw.players || {},
              rosters: raw.rosters || {},
              players2526: raw.players2526 || {},
              frames: raw.frames || [],
              divisions: raw.divisions || STATIC_DIVISIONS,
              lastUpdated: raw.lastUpdated,
              source: 'firestore',
            };
            setData(newData);
            setCachedData(newData);
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
  }, []);

  return (
    <DataContext.Provider value={{ data, loading, refreshing }}>
      {children}
    </DataContext.Provider>
  );
}

export function useLeagueData() {
  return useContext(DataContext);
}
