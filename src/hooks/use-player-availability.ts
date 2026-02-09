'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useUser } from '@/lib/auth/auth-context';
import type { PlayerAvailability } from '@/lib/types';

const STORAGE_KEY = 'pool-league-pro-player-availability';
const DEBOUNCE_MS = 2000;

// Map of fixtureDate -> PlayerAvailability[]
type AvailabilityMap = Record<string, PlayerAvailability[]>;

export function usePlayerAvailability(fixtureDate: string | null) {
  const [availabilityMap, setAvailabilityMap] = useState<AvailabilityMap>({});
  const [initialized, setInitialized] = useState(false);
  const user = useUser();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage
  function loadLocalAvailability(): AvailabilityMap {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as AvailabilityMap;
      }
    } catch {
      // ignore
    }
    return {};
  }

  // Save to localStorage
  function saveLocalAvailability(map: AvailabilityMap) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      // ignore
    }
  }

  // Restore on mount
  useEffect(() => {
    // Try localStorage first (instant)
    const local = loadLocalAvailability();
    if (Object.keys(local).length > 0) {
      setAvailabilityMap(local);
    }

    // Then try Firestore if authenticated (async reconciliation)
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && user && fixtureDate) {
      (async () => {
        try {
          const { db } = await import('@/lib/firebase');
          const docRef = doc(db, 'users', user.uid, 'userData', 'playerAvailability', fixtureDate);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const remote = snap.data() as { records: PlayerAvailability[] };
            if (remote.records && Array.isArray(remote.records)) {
              setAvailabilityMap(prev => {
                const updated = { ...prev, [fixtureDate]: remote.records };
                saveLocalAvailability(updated);
                return updated;
              });
            }
          }
        } catch {
          // Firestore unavailable, local value is fine
        }
      })();
    }

    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync to Firestore when value changes (debounced)
  useEffect(() => {
    if (!initialized) return;

    // Always save to localStorage immediately
    saveLocalAvailability(availabilityMap);

    // Debounce Firestore writes
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !user) return;
      try {
        const { db } = await import('@/lib/firebase');

        // Write each fixture date as a separate document
        const dates = Object.keys(availabilityMap);
        await Promise.all(
          dates.map(async (date) => {
            const docRef = doc(db, 'users', user.uid, 'userData', 'playerAvailability', date);
            const records = availabilityMap[date];
            if (records && records.length > 0) {
              await setDoc(docRef, { records });
            } else {
              await deleteDoc(docRef);
            }
          })
        );
      } catch {
        // Firestore unavailable
      }
    }, DEBOUNCE_MS);
  }, [initialized, availabilityMap, user]);

  // Get availability for a specific fixture
  const getAvailability = useCallback(
    (date: string): PlayerAvailability[] => {
      return availabilityMap[date] || [];
    },
    [availabilityMap]
  );

  // Set availability for a specific player on a specific fixture
  const setAvailability = useCallback(
    (
      date: string,
      playerId: string,
      playerName: string,
      available: boolean,
      reason?: string
    ) => {
      setAvailabilityMap(prev => {
        const existing = prev[date] || [];
        const existingIndex = existing.findIndex(a => a.playerId === playerId);

        const newRecord: PlayerAvailability = {
          playerId,
          playerName,
          fixtureDate: date,
          available,
          reason,
          updatedAt: Date.now(),
        };

        let updated: PlayerAvailability[];
        if (existingIndex >= 0) {
          updated = [...existing];
          updated[existingIndex] = newRecord;
        } else {
          updated = [...existing, newRecord];
        }

        return { ...prev, [date]: updated };
      });
    },
    []
  );

  // Clear all availability for a specific fixture
  const clearAvailability = useCallback((date: string) => {
    setAvailabilityMap(prev => {
      const updated = { ...prev };
      delete updated[date];
      return updated;
    });
  }, []);

  // Get current fixture's availability (if fixtureDate is provided)
  const currentAvailability = fixtureDate ? getAvailability(fixtureDate) : [];

  return {
    availability: currentAvailability,
    getAvailability,
    setAvailability,
    clearAvailability,
  };
}
