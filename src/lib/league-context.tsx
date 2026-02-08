'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import type { LeagueMeta, SeasonMeta } from './types';
import { getFirebaseAnalytics } from './firebase';

const STORAGE_KEY = 'pool-league-selected';

interface LeagueSelection {
  leagueId: string;
  seasonId: string;
  league: LeagueMeta;
}

interface LeagueContextValue {
  leagues: LeagueMeta[];
  loading: boolean;
  selected: LeagueSelection | null;
  selectLeague: (leagueId: string, seasonId: string) => void;
  clearSelection: () => void;
}

const LeagueContext = createContext<LeagueContextValue>({
  leagues: [],
  loading: true,
  selected: null,
  selectLeague: () => {},
  clearSelection: () => {},
});

function getSelectionFromURL(): { leagueId: string; seasonId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const leagueId = params.get('league');
    const seasonId = params.get('season');
    if (leagueId && seasonId) return { leagueId, seasonId };
    return null;
  } catch {
    return null;
  }
}

function getSavedSelection(): { leagueId: string; seasonId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.leagueId && parsed.seasonId) return parsed;
    return null;
  } catch {
    return null;
  }
}

function saveSelection(leagueId: string, seasonId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ leagueId, seasonId }));
}

function clearSavedSelection() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// Default league metadata used when Firestore is unavailable
const DEFAULT_WREXHAM_LEAGUE: LeagueMeta = {
  id: 'wrexham',
  name: 'Wrexham & District Pool League',
  shortName: 'Wrexham',
  seasons: [
    { id: '2526', label: '2025/26', current: true, divisions: ['SD1', 'SD2', 'WD1', 'WD2'] },
  ],
};

export function LeagueProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [leagues, setLeagues] = useState<LeagueMeta[]>([DEFAULT_WREXHAM_LEAGUE]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<LeagueSelection | null>(null);

  // Fetch leagues from Firestore on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchLeagues() {
      try {
        const { db } = await import('./firebase');
        const snap = await getDocs(collection(db, 'leagues'));

        if (cancelled) return;

        if (!snap.empty) {
          const fetched: LeagueMeta[] = snap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || doc.id,
              shortName: data.shortName || doc.id,
              seasons: (data.seasons || []) as SeasonMeta[],
            };
          });
          setLeagues(fetched);
        }
      } catch {
        // Firestore unavailable — use default
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      fetchLeagues();
    } else {
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, []);

  // Restore saved selection once leagues are loaded
  // Priority: URL params > localStorage
  useEffect(() => {
    if (loading) return;

    // Try URL params first
    const fromURL = getSelectionFromURL();
    const saved = fromURL || getSavedSelection();

    if (saved) {
      const league = leagues.find(l => l.id === saved.leagueId);
      if (league) {
        const season = league.seasons.find(s => s.id === saved.seasonId);
        if (season) {
          setSelected({ leagueId: saved.leagueId, seasonId: saved.seasonId, league });
          // If restored from localStorage, update URL to match
          if (!fromURL) {
            const params = new URLSearchParams(searchParams?.toString());
            params.set('league', saved.leagueId);
            params.set('season', saved.seasonId);
            router.replace(`${pathname}?${params.toString()}`);
          }
        }
      }
    }
  }, [leagues, loading, pathname, router, searchParams]);

  const selectLeague = useCallback((leagueId: string, seasonId: string) => {
    const league = leagues.find(l => l.id === leagueId);
    if (!league) return;

    // Save to localStorage
    saveSelection(leagueId, seasonId);

    // Update URL with league and season params
    const params = new URLSearchParams(searchParams?.toString());
    params.set('league', leagueId);
    params.set('season', seasonId);
    router.replace(`${pathname}?${params.toString()}`);

    // Update state
    setSelected({ leagueId, seasonId, league });

    // Track analytics
    getFirebaseAnalytics().then(analytics => {
      if (analytics) {
        logEvent(analytics, 'select_content', {
          content_type: 'league',
          item_id: leagueId,
          season_id: seasonId,
        });
      }
    });
  }, [leagues, pathname, router, searchParams]);

  const clearSelection = useCallback(() => {
    // Clear localStorage
    clearSavedSelection();

    // Clear URL params
    const params = new URLSearchParams(searchParams?.toString());
    params.delete('league');
    params.delete('season');
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`);

    // Clear state
    setSelected(null);
  }, [pathname, router, searchParams]);

  return (
    <LeagueContext.Provider value={{ leagues, loading, selected, selectLeague, clearSelection }}>
      {children}
    </LeagueContext.Provider>
  );
}

export function useLeague() {
  return useContext(LeagueContext);
}
