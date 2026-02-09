'use client';

import { useState, useCallback } from 'react';
import type { SimulationResult, WhatIfResult, SquadOverrides, DivisionCode } from '@/lib/types';
import type { DataSources } from '@/lib/predictions/core';
import { runSeasonSimulation } from '@/lib/predictions';

interface UseSimulationOptions {
  ds: DataSources;
  selectedDiv: DivisionCode;
  squadOverrides: SquadOverrides;
  squadTopN: number;
  onSimulationComplete?: (message: string) => void;
  onAddWhatIf?: (message: string) => void;
  onRemoveWhatIf?: (message: string) => void;
}

export function useSimulation({
  ds,
  selectedDiv,
  squadOverrides,
  squadTopN,
  onSimulationComplete,
  onAddWhatIf: onAddWhatIfCallback,
  onRemoveWhatIf: onRemoveWhatIfCallback,
}: UseSimulationOptions) {
  const [simResults, setSimResults] = useState<SimulationResult[] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [whatIfResults, setWhatIfResults] = useState<WhatIfResult[]>([]);
  const [whatIfSimResults, setWhatIfSimResults] = useState<WhatIfResult[] | null>(null);

  const runSimulation = useCallback(() => {
    setIsSimulating(true);
    // Use setTimeout to allow UI to update with loading state
    setTimeout(() => {
      const results = runSeasonSimulation(selectedDiv, squadOverrides, squadTopN, whatIfResults, ds);
      setSimResults(results);
      setWhatIfSimResults(whatIfResults.length > 0 ? [...whatIfResults] : null);
      setIsSimulating(false);
      if (onSimulationComplete) {
        onSimulationComplete('Simulation complete — 1,000 seasons');
      }
    }, 100);
  }, [selectedDiv, squadOverrides, squadTopN, whatIfResults, ds, onSimulationComplete]);

  const addWhatIf = useCallback((home: string, away: string, homeScore: number, awayScore: number) => {
    setWhatIfResults(prev => [
      ...prev.filter(wi => wi.home !== home || wi.away !== away),
      { home, away, homeScore, awayScore },
    ]);
    // Clear simulation results when what-if changes
    setSimResults(null);
    if (onAddWhatIfCallback) {
      onAddWhatIfCallback(`Result locked: ${home} ${homeScore}-${awayScore} ${away}`);
    }
  }, [onAddWhatIfCallback]);

  const removeWhatIf = useCallback((home: string, away: string) => {
    setWhatIfResults(prev => prev.filter(wi => wi.home !== home || wi.away !== away));
    // Clear simulation results when what-if changes
    setSimResults(null);
    if (onRemoveWhatIfCallback) {
      onRemoveWhatIfCallback('Result removed');
    }
  }, [onRemoveWhatIfCallback]);

  const clearWhatIfResults = useCallback(() => {
    setWhatIfResults([]);
    setSimResults(null);
  }, []);

  const clearSimulation = useCallback(() => {
    setSimResults(null);
    setWhatIfSimResults(null);
  }, []);

  return {
    simResults,
    isSimulating,
    whatIfResults,
    whatIfSimResults,
    runSimulation,
    addWhatIf,
    removeWhatIf,
    clearWhatIfResults,
    clearSimulation,
    setWhatIfResults,
  };
}
