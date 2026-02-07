'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPredictions, calculateAccuracy } from '@/lib/prediction-tracking';
import type { PredictionSnapshot, AccuracyStats } from '@/lib/types';

export interface UsePredictionAccuracyOptions {
  seasonId?: string;
  division?: string;
}

export function usePredictionAccuracy({ seasonId, division }: UsePredictionAccuracyOptions = {}) {
  const [predictions, setPredictions] = useState<PredictionSnapshot[]>([]);
  const [accuracyStats, setAccuracyStats] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedPredictions = await getPredictions(seasonId, division);
      setPredictions(fetchedPredictions);

      // Calculate accuracy stats from predictions
      const stats = calculateAccuracy(fetchedPredictions);
      setAccuracyStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  }, [seasonId, division]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return {
    predictions,
    accuracyStats,
    loading,
    error,
    refresh,
  };
}
