'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import type { ClaimedProfile } from '@/lib/auth';
import type { FrameData, LeagueMeta } from '@/lib/types';
import { getPlayerLeagueMatches, type LeagueMatchItem } from '@/lib/unified-history';

/**
 * Fetches league frame history for each of the user's claimed profiles,
 * then groups into per-match items.
 */
export function useLeagueMatchHistory(
  claimedProfiles: ClaimedProfile[],
  leagues: LeagueMeta[],
) {
  const [matches, setMatches] = useState<LeagueMatchItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (claimedProfiles.length === 0 || leagues.length === 0) {
      setMatches([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchAll() {
      const { db } = await import('@/lib/firebase');
      const allItems: LeagueMatchItem[] = [];

      for (const cp of claimedProfiles) {
        const league = leagues.find((l) => l.id === cp.league);
        if (!league) continue;

        try {
          // Try subcollection first, fall back to inline
          let frames: FrameData[] = [];

          const seasonDocRef = doc(db, 'leagues', cp.league, 'seasons', cp.season);
          const framesRef = collection(db, 'leagues', cp.league, 'seasons', cp.season, 'frames');
          const framesSnap = await getDocs(framesRef);

          if (!framesSnap.empty) {
            frames = framesSnap.docs.map((d) => d.data() as FrameData);
          } else {
            // Fall back to inline frames on the season doc
            const seasonSnap = await getDoc(seasonDocRef);
            if (seasonSnap.exists()) {
              const raw = seasonSnap.data();
              if (raw.frames && raw.frames.length > 0) {
                frames = raw.frames as FrameData[];
              }
            }
          }

          if (frames.length > 0) {
            const items = getPlayerLeagueMatches(cp.name, frames, league);
            allItems.push(...items);
          }
        } catch {
          // Skip this league on error
        }
      }

      if (!cancelled) {
        setMatches(allItems);
        setLoading(false);
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  // Serialize claimedProfiles to avoid re-running on same data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(claimedProfiles), leagues]);

  return { matches, loading };
}
