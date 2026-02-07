'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Activity,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { usePredictionAccuracy } from '@/hooks/use-prediction-accuracy';
import type { DivisionCode } from '@/lib/types';

interface PredictionAccuracyPanelProps {
  selectedDiv?: DivisionCode;
}

export default function PredictionAccuracyPanel({ selectedDiv }: PredictionAccuracyPanelProps) {
  const { accuracyStats, loading, error, refresh } = usePredictionAccuracy({
    division: selectedDiv,
  });

  // Format percentage
  const formatPct = (val: number) => `${Math.round(val * 100)}%`;

  // Get division-specific accuracy if available
  const divisionAccuracy = useMemo(() => {
    if (!accuracyStats || !selectedDiv) return null;
    return accuracyStats.byDivision.find(d => d.division === selectedDiv);
  }, [accuracyStats, selectedDiv]);

  // Loading state
  if (loading) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-400">Loading accuracy data...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
            <Target size={16} />
            Prediction Accuracy
          </h3>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 mb-3">{error}</p>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated hover:bg-surface-card text-gray-300 text-sm rounded-lg transition"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!accuracyStats || accuracyStats.totalPredictions === 0) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
            <Target size={16} />
            Prediction Accuracy
          </h3>
        </div>
        <div className="text-center py-6">
          <Activity className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No predictions tracked yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Make predictions on fixtures to see accuracy stats
          </p>
        </div>
      </div>
    );
  }

  const { totalPredictions, correctPredictions, overallAccuracy, byDivision, byConfidence } =
    accuracyStats;
  const incorrectPredictions = totalPredictions - correctPredictions;
  const displayAccuracy = divisionAccuracy ? divisionAccuracy.accuracy : overallAccuracy;
  const displayTotal = divisionAccuracy ? divisionAccuracy.total : totalPredictions;
  const displayCorrect = divisionAccuracy ? divisionAccuracy.correct : correctPredictions;
  const displayIncorrect = displayTotal - displayCorrect;

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-1.5">
          <Target size={16} />
          Prediction Accuracy
          {selectedDiv && <span className="text-xs text-gray-500">({selectedDiv})</span>}
        </h3>
        <button
          onClick={refresh}
          className="text-gray-400 hover:text-gray-300 transition"
          title="Refresh accuracy data"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Overall Accuracy */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Overall Accuracy</span>
          <span className={clsx(
            'text-2xl font-bold',
            displayAccuracy >= 0.7 ? 'text-win' :
            displayAccuracy >= 0.5 ? 'text-draw' :
            'text-lose'
          )}>
            {formatPct(displayAccuracy)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
          <motion.div
            className={clsx(
              'h-full rounded-full',
              displayAccuracy >= 0.7 ? 'bg-win' :
              displayAccuracy >= 0.5 ? 'bg-draw' :
              'bg-lose'
            )}
            initial={{ width: 0 }}
            animate={{ width: `${displayAccuracy * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Total */}
        <div className="bg-surface-elevated rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <Activity size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">Total</span>
          </div>
          <p className="text-lg font-bold text-gray-200">{displayTotal}</p>
        </div>

        {/* Correct */}
        <div className="bg-surface-elevated rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle2 size={14} className="text-win" />
            <span className="text-xs text-gray-400">Correct</span>
          </div>
          <p className="text-lg font-bold text-win">{displayCorrect}</p>
        </div>

        {/* Incorrect */}
        <div className="bg-surface-elevated rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <XCircle size={14} className="text-lose" />
            <span className="text-xs text-gray-400">Wrong</span>
          </div>
          <p className="text-lg font-bold text-lose">{displayIncorrect}</p>
        </div>
      </div>

      {/* By Confidence */}
      {byConfidence.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
            <TrendingUp size={12} />
            By Confidence Level
          </h4>
          <div className="space-y-2">
            {byConfidence.map(conf => (
              <div
                key={conf.label}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-gray-400">{conf.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">
                    {conf.correct}/{conf.total}
                  </span>
                  <span className={clsx(
                    'font-semibold min-w-[45px] text-right',
                    conf.accuracy >= 0.7 ? 'text-win' :
                    conf.accuracy >= 0.5 ? 'text-draw' :
                    'text-lose'
                  )}>
                    {formatPct(conf.accuracy)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Division (only show when viewing all divisions) */}
      {!selectedDiv && byDivision.length > 1 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 mb-2">By Division</h4>
          <div className="space-y-2">
            {byDivision
              .sort((a, b) => b.accuracy - a.accuracy)
              .map(div => (
                <div
                  key={div.division}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-gray-400 font-medium">{div.division}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">
                      {div.correct}/{div.total}
                    </span>
                    <span className={clsx(
                      'font-semibold min-w-[45px] text-right',
                      div.accuracy >= 0.7 ? 'text-win' :
                      div.accuracy >= 0.5 ? 'text-draw' :
                      'text-lose'
                    )}>
                      {formatPct(div.accuracy)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
