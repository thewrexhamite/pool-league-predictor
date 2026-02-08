'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useUser } from '@/lib/auth/auth-context';
import type { DivisionCode, WhatIfResult, SquadOverrides, UserSession } from '@/lib/types';

const SESSION_KEY = 'pool-league-session';
const DEVICE_ID_KEY = 'pool-league-device-id';
const DEBOUNCE_MS = 2000;

function generateDeviceId(): string {
  return 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function loadLocalSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserSession;
  } catch {
    return null;
  }
}

function saveLocalSession(session: UserSession) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage full or unavailable
  }
}

export interface UseUserSessionOptions {
  selectedDiv: DivisionCode;
  whatIfResults: WhatIfResult[];
  squadOverrides: SquadOverrides;
  onRestore: (session: UserSession) => void;
}

export function useUserSession({
  selectedDiv,
  whatIfResults,
  squadOverrides,
  onRestore,
}: UseUserSessionOptions) {
  const [initialized, setInitialized] = useState(false);
  const user = useUser();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceId = useRef('');

  // Restore session on mount
  useEffect(() => {
    deviceId.current = getDeviceId();

    // Try localStorage first (instant)
    const local = loadLocalSession();
    if (local && (local.whatIfResults.length > 0 || Object.keys(local.squadOverrides).length > 0)) {
      onRestore(local);
    }

    // Then try Firestore (async reconciliation)
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      (async () => {
        try {
          const { db } = await import('@/lib/firebase');
          // Use userId when authenticated, deviceId when not
          const docRef = user
            ? doc(db, 'users', user.uid, 'userData', 'session')
            : doc(db, 'userSessions', deviceId.current);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const remote = snap.data() as UserSession;
            // Use remote if it's newer than local
            if (!local || remote.lastActive > local.lastActive) {
              onRestore(remote);
              saveLocalSession(remote);
            }
          }
        } catch {
          // Firestore unavailable, local session is fine
        }
      })();
    }

    setInitialized(true);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save session on change (debounced)
  const saveSession = useCallback(() => {
    if (!initialized) return;

    const session: UserSession = {
      whatIfResults,
      squadOverrides,
      selectedDiv,
      lastActive: Date.now(),
    };

    // Always save to localStorage immediately
    saveLocalSession(session);

    // Debounce Firestore writes
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;
      // Skip Firestore write if not authenticated and no deviceId
      if (!user && !deviceId.current) return;
      try {
        const { db } = await import('@/lib/firebase');
        // Use userId when authenticated, deviceId when not
        const docRef = user
          ? doc(db, 'users', user.uid, 'userData', 'session')
          : doc(db, 'userSessions', deviceId.current);
        await setDoc(docRef, session);
      } catch {
        // Firestore unavailable
      }
    }, DEBOUNCE_MS);
  }, [initialized, whatIfResults, squadOverrides, selectedDiv, user]);

  useEffect(() => {
    saveSession();
  }, [saveSession]);

  return { initialized, deviceId: deviceId.current };
}
