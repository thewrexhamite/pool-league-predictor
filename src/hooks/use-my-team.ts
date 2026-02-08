'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useUser } from '@/lib/auth/auth-context';
import type { DivisionCode } from '@/lib/types';

const STORAGE_KEY = 'pool-league-pro-my-team';
const DEBOUNCE_MS = 2000;

interface MyTeamValue {
  team: string;
  div: DivisionCode;
}

export function useMyTeam() {
  const [myTeam, setMyTeamState] = useState<MyTeamValue | null>(null);
  const [initialized, setInitialized] = useState(false);
  const user = useUser();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from localStorage
  function loadLocalMyTeam(): MyTeamValue | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MyTeamValue;
        if (parsed.team && parsed.div) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  // Save to localStorage
  function saveLocalMyTeam(value: MyTeamValue | null) {
    if (typeof window === 'undefined') return;
    try {
      if (value) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  // Restore on mount
  useEffect(() => {
    // Try localStorage first (instant)
    const local = loadLocalMyTeam();
    if (local) {
      setMyTeamState(local);
    }

    // Then try Firestore if authenticated (async reconciliation)
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY && user) {
      (async () => {
        try {
          const { db } = await import('@/lib/firebase');
          const docRef = doc(db, 'users', user.uid, 'userData', 'myTeam');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const remote = snap.data() as MyTeamValue;
            if (remote.team && remote.div) {
              setMyTeamState(remote);
              saveLocalMyTeam(remote);
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
    saveLocalMyTeam(myTeam);

    // Debounce Firestore writes
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY || !user) return;
      try {
        const { db } = await import('@/lib/firebase');
        const docRef = doc(db, 'users', user.uid, 'userData', 'myTeam');
        if (myTeam) {
          await setDoc(docRef, myTeam);
        } else {
          await deleteDoc(docRef);
        }
      } catch {
        // Firestore unavailable
      }
    }, DEBOUNCE_MS);
  }, [initialized, myTeam, user]);

  const setMyTeam = useCallback((team: string, div: DivisionCode) => {
    const value: MyTeamValue = { team, div };
    setMyTeamState(value);
  }, []);

  const clearMyTeam = useCallback(() => {
    setMyTeamState(null);
  }, []);

  return { myTeam, setMyTeam, clearMyTeam };
}
