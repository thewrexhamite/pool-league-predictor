'use client';

import { useState, useCallback, useRef } from 'react';
import type { DivisionCode, FixtureImportance, SquadOverrides, WhatIfResult } from '@/lib/types';
import type { DataSources } from '@/lib/predictions/index';
import { calcFixtureImportance } from '@/lib/predictions';

interface UseFixtureImportanceOptions {
  div: DivisionCode;
  squadOverrides: SquadOverrides;
  squadTopN: number;
  whatIfResults: WhatIfResult[];
  ds: DataSources;
}

interface UseFixtureImportanceReturn {
  importance: Map<string, FixtureImportance>;
  loading: boolean;
  calculate: (team: string) => void;
  clear: () => void;
  team: string | null;
}

/**
 * Hook wrapping calcFixtureImportance() with caching and loading state.
 * Uses requestAnimationFrame to avoid blocking the UI during computation.
 */
export function useFixtureImportance({
  div,
  squadOverrides,
  squadTopN,
  whatIfResults,
  ds,
}: UseFixtureImportanceOptions): UseFixtureImportanceReturn {
  const [importance, setImportance] = useState<Map<string, FixtureImportance>>(new Map());
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, Map<string, FixtureImportance>>>(new Map());

  const calculate = useCallback((targetTeam: string) => {
    // Check cache first
    const cacheKey = `${div}:${targetTeam}:${whatIfResults.length}`;
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setImportance(cached);
      setTeam(targetTeam);
      return;
    }

    setLoading(true);
    setTeam(targetTeam);

    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      setTimeout(() => {
        const results = calcFixtureImportance(div, targetTeam, squadOverrides, squadTopN, whatIfResults, ds);
        const map = new Map<string, FixtureImportance>();
        for (const fi of results) {
          map.set(`${fi.home}:${fi.away}`, fi);
        }

        // Cache the result
        cacheRef.current.set(cacheKey, map);

        setImportance(map);
        setLoading(false);
      }, 0);
    });
  }, [div, squadOverrides, squadTopN, whatIfResults, ds]);

  const clear = useCallback(() => {
    setImportance(new Map());
    setTeam(null);
    cacheRef.current.clear();
  }, []);

  return { importance, loading, calculate, clear, team };
}
