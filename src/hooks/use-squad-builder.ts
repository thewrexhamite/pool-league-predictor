'use client';

import { useState, useCallback } from 'react';
import type { SquadOverrides, SquadOverride } from '@/lib/types';

export function useSquadBuilder() {
  const [squadOverrides, setSquadOverrides] = useState<SquadOverrides>({});
  const [squadBuilderTeam, setSquadBuilderTeam] = useState('');
  const [squadPlayerSearch, setSquadPlayerSearch] = useState('');
  const [squadTopN, setSquadTopN] = useState(5);

  const setOverridesForTeam = useCallback((team: string, override: SquadOverride) => {
    setSquadOverrides((prev) => ({
      ...prev,
      [team]: override,
    }));
  }, []);

  const removeOverridesForTeam = useCallback((team: string) => {
    setSquadOverrides((prev) => {
      const next = { ...prev };
      delete next[team];
      return next;
    });
  }, []);

  const clearAllOverrides = useCallback(() => {
    setSquadOverrides({});
  }, []);

  const restoreOverrides = useCallback((overrides: SquadOverrides) => {
    setSquadOverrides(overrides);
  }, []);

  const selectTeam = useCallback((team: string) => {
    setSquadBuilderTeam(team);
  }, []);

  const clearTeam = useCallback(() => {
    setSquadBuilderTeam('');
  }, []);

  const setPlayerSearch = useCallback((search: string) => {
    setSquadPlayerSearch(search);
  }, []);

  const clearPlayerSearch = useCallback(() => {
    setSquadPlayerSearch('');
  }, []);

  const setTopN = useCallback((n: number) => {
    setSquadTopN(n);
  }, []);

  return {
    squadOverrides,
    squadBuilderTeam,
    squadPlayerSearch,
    squadTopN,
    setSquadOverrides,
    setOverridesForTeam,
    removeOverridesForTeam,
    clearAllOverrides,
    restoreOverrides,
    selectTeam,
    clearTeam,
    setPlayerSearch,
    clearPlayerSearch,
    setTopN,
  };
}
