'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PredictionResult, SquadOverrides } from '@/lib/types';
import type { DataSources } from '@/lib/predictions/core';
import {
  getDiv,
  calcTeamStrength,
  calcStrengthAdjustments,
  predictFrame,
  runPredSim,
} from '@/lib/predictions';

interface UsePredictionOptions {
  ds: DataSources;
  squadOverrides: SquadOverrides;
  squadTopN: number;
}

export function usePrediction({ ds, squadOverrides, squadTopN }: UsePredictionOptions) {
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  // Calculate prediction whenever teams or squad overrides change
  useEffect(() => {
    if (!homeTeam || !awayTeam) {
      setPrediction(null);
      return;
    }

    const div = getDiv(homeTeam, ds);
    if (!div) return;

    const strengths = calcTeamStrength(div, ds);
    const hasSquadChanges =
      Object.keys(squadOverrides).length > 0 &&
      (squadOverrides[homeTeam] || squadOverrides[awayTeam]);

    const modStr = { ...strengths };
    const pAdj = calcStrengthAdjustments(div, squadOverrides, squadTopN, ds);
    Object.entries(pAdj).forEach(([t, adj]) => {
      if (modStr[t] !== undefined) modStr[t] += adj;
    });

    const p = predictFrame(modStr[homeTeam] || 0, modStr[awayTeam] || 0);
    const pred = runPredSim(p);

    if (hasSquadChanges) {
      const pBase = predictFrame(strengths[homeTeam] || 0, strengths[awayTeam] || 0);
      const base = runPredSim(pBase);
      pred.baseline = base;
    }

    setPrediction(pred);
  }, [homeTeam, awayTeam, squadOverrides, squadTopN, ds]);

  const setPredictionTeams = useCallback((home: string, away: string) => {
    setHomeTeam(home);
    setAwayTeam(away);
  }, []);

  const clearPrediction = useCallback(() => {
    setHomeTeam('');
    setAwayTeam('');
    setPrediction(null);
  }, []);

  return {
    homeTeam,
    awayTeam,
    prediction,
    setHomeTeam,
    setAwayTeam,
    setPredictionTeams,
    clearPrediction,
  };
}
