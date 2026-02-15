'use client';

/**
 * useMultiLeagueData Hook
 *
 * Loads player/team data from ALL leagues in parallel from Firestore.
 * Lazy-loaded: only fetches when cross-league mode is activated.
 * Reuses the existing Firestore path pattern from data-provider.tsx.
 */

import { useState, useCallback, useRef } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import type { LeagueMeta, SeasonData } from '@/lib/types';
import type { LeagueData } from '@/lib/data-provider';
import { useLeague } from '@/lib/league-context';

interface MultiLeagueState {
  leagues: Record<string, { meta: LeagueMeta; data: LeagueData }>;
  loading: boolean;
  error: string | null;
}

export function useMultiLeagueData() {
  const { leagues } = useLeague();
  const [state, setState] = useState<MultiLeagueState>({
    leagues: {},
    loading: false,
    error: null,
  });
  const fetchedRef = useRef(false);

  const activate = useCallback(async () => {
    // Don't re-fetch if already loaded
    if (fetchedRef.current || state.loading) return;
    if (leagues.length === 0) return;

    fetchedRef.current = true;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { db } = await import('@/lib/firebase');
      const results: Record<string, { meta: LeagueMeta; data: LeagueData }> = {};

      const promises = leagues.map(async (league) => {
        const currentSeason = league.seasons.find(s => s.current);
        if (!currentSeason) return;

        try {
          const docRef = doc(db, 'leagues', league.id, 'seasons', currentSeason.id);
          const snap = await getDoc(docRef);

          if (snap.exists()) {
            const raw = snap.data() as SeasonData;

            // Load frames from subcollection or inline
            let frames: LeagueData['frames'] = [];
            if (raw.frames && raw.frames.length > 0) {
              frames = raw.frames;
            } else {
              try {
                const framesRef = collection(db, 'leagues', league.id, 'seasons', currentSeason.id, 'frames');
                const framesSnap = await getDocs(framesRef);
                frames = framesSnap.docs.map(d => d.data() as LeagueData['frames'][0]);
              } catch {
                // Frames subcollection may not exist
              }
            }

            results[league.id] = {
              meta: league,
              data: {
                results: raw.results || [],
                fixtures: raw.fixtures || [],
                players: raw.players || {},
                rosters: raw.rosters || {},
                players2526: raw.playerStats || raw.players2526 || {},
                frames,
                divisions: raw.divisions || {},
                knockouts: raw.knockouts || [],
                lastUpdated: raw.lastUpdated,
                source: 'firestore',
                isOffline: false,
                cacheAge: 0,
              },
            };
          }
        } catch (err) {
          console.error(`Failed to load league ${league.id}:`, err);
        }
      });

      await Promise.all(promises);

      setState({ leagues: results, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cross-league data';
      setState(prev => ({ ...prev, loading: false, error: message }));
      fetchedRef.current = false; // Allow retry on error
    }
  }, [leagues, state.loading]);

  return {
    ...state,
    activate,
    isActivated: fetchedRef.current && !state.loading,
  };
}
