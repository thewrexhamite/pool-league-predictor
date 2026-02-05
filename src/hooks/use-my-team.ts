'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DivisionCode } from '@/lib/types';

const STORAGE_KEY = 'pool-league-pro-my-team';

interface MyTeamValue {
  team: string;
  div: DivisionCode;
}

export function useMyTeam() {
  const [myTeam, setMyTeamState] = useState<MyTeamValue | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as MyTeamValue;
        if (parsed.team && parsed.div) {
          setMyTeamState(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const setMyTeam = useCallback((team: string, div: DivisionCode) => {
    const value: MyTeamValue = { team, div };
    setMyTeamState(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, []);

  const clearMyTeam = useCallback(() => {
    setMyTeamState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { myTeam, setMyTeam, clearMyTeam };
}
