'use client';

import { useState, useCallback } from 'react';
import type { SquadOverrides, SquadOverride } from '@/lib/types';

interface UseSquadBuilderOptions {
  onSquadChange?: () => void;
  onToast?: (message: string, type: 'success' | 'warning' | 'info') => void;
}

export function useSquadBuilder(options: UseSquadBuilderOptions = {}) {
  const { onSquadChange, onToast } = options;
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

  const addSquadPlayer = useCallback((team: string, playerName: string) => {
    setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      if (existing.removed.includes(playerName)) {
        const newOv = { ...existing, removed: existing.removed.filter(n => n !== playerName) };
        if (newOv.added.length === 0 && newOv.removed.length === 0) {
          const { [team]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [team]: newOv };
      }
      if (existing.added.includes(playerName)) return prev;
      return { ...prev, [team]: { ...existing, added: [...existing.added, playerName] } };
    });
    onSquadChange?.();
    onToast?.(`Added ${playerName} to ${team}`, 'success');
  }, [onSquadChange, onToast]);

  const removeSquadPlayer = useCallback((team: string, playerName: string) => {
    setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      if (existing.added.includes(playerName)) {
        const newOv = { ...existing, added: existing.added.filter(n => n !== playerName) };
        if (newOv.added.length === 0 && newOv.removed.length === 0) {
          const { [team]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [team]: newOv };
      }
      if (existing.removed.includes(playerName)) return prev;
      return { ...prev, [team]: { ...existing, removed: [...existing.removed, playerName] } };
    });
    onSquadChange?.();
    onToast?.(`Removed ${playerName} from ${team}`, 'warning');
  }, [onSquadChange, onToast]);

  const restoreSquadPlayer = useCallback((team: string, playerName: string) => {
    setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      const newOv = { ...existing, removed: existing.removed.filter(n => n !== playerName) };
      if (newOv.added.length === 0 && newOv.removed.length === 0) {
        const { [team]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [team]: newOv };
    });
    onSquadChange?.();
  }, [onSquadChange]);

  const unaddSquadPlayer = useCallback((team: string, playerName: string) => {
    setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      const newOv = { ...existing, added: existing.added.filter(n => n !== playerName) };
      if (newOv.added.length === 0 && newOv.removed.length === 0) {
        const { [team]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [team]: newOv };
    });
    onSquadChange?.();
  }, [onSquadChange]);

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
    addSquadPlayer,
    removeSquadPlayer,
    restoreSquadPlayer,
    unaddSquadPlayer,
  };
}
