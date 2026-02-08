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
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { usePredictionAccuracy } from '@/hooks/use-prediction-accuracy';
import type { DivisionCode } from '@/lib/types';

interface PredictionAccuracyPanelProps {
  selectedDiv?: DivisionCode;
  seasonId?: string;
  seasonLabel?: string;
}

export default function PredictionAccuracyPanel({ selectedDiv, seasonId, seasonLabel }: PredictionAccuracyPanelProps) {
  const { predictions, accuracyStats, loading, error, refresh } = usePredictionAccuracy({
    seasonId,
    division: selectedDiv,
  });

  // Format percentage
  const formatPct = (val: number) => `${Math.round(val * 100)}%`;

  // Get division-specific accuracy if available
  const divisionAccuracy = useMemo(() => {
    if (!accuracyStats || !selectedDiv) return null;
    return accuracyStats.byDivision.find(d => d.division === selectedDiv);
  }, [accuracyStats, selectedDiv]);

  // Prepare historical trend data
  const trendData = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];

    // Filter to only completed predictions with results
    const completed = predictions.filter(
      p => p.actualWinner !== undefined && p.correct !== undefined
    );

    if (completed.length === 0) return [];

    // Sort by predictedAt timestamp
    const sorted = [...completed].sort((a, b) => a.predictedAt - b.predictedAt);

    // Group by date (day)
    const byDate = new Map<string, { correct: number; total: number }>();
    for (const pred of sorted) {
      const date = new Date(pred.predictedAt).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
      });
      const stats = byDate.get(date) || { correct: 0, total: 0 };
      stats.total++;
      if (pred.correct) stats.correct++;
      byDate.set(date, stats);
    }

    // Convert to array format for chart
    return Array.from(byDate.entries()).map(([date, stats]) => ({
      date,
      accuracy: (stats.correct / stats.total) * 100,
      total: stats.total,
    }));
  }, [predictions]);

  // Prepare calibration chart data
  const calibrationData = useMemo(() => {
    if (!accuracyStats || accuracyStats.byConfidence.length === 0) return [];

    return accuracyStats.byConfidence
      .map(conf => {
        // Extract predicted probability from label (e.g., "60-70%" -> 65)
        const match = conf.label.match(/(\d+)-(\d+)%/);
        if (!match) return null;

        const lower = parseInt(match[1]);
        const upper = parseInt(match[2]);
        const predicted = (lower + upper) / 2;
        const actual = conf.accuracy * 100;

        return {
          predicted,
          actual,
          label: conf.label,
          count: conf.total,
        };
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .sort((a, b) => a.predicted - b.predicted);
  }, [accuracyStats]);

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
          {seasonLabel && (
            <span className="text-xs text-gray-500 font-normal">
              &bull; {seasonLabel}
            </span>
          )}
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

      {/* Calibration Chart */}
      {calibrationData.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">Calibration Chart</h4>
          <p className="text-[10px] text-gray-500 mb-3">
            Shows how well predicted win rates match actual outcomes. Perfect calibration follows the diagonal line.
          </p>
          <div className="bg-surface/50 rounded-lg p-3">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calibrationData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                  <XAxis
                    dataKey="predicted"
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(value) => `${value}%`}
                    stroke="#6B7280"
                    style={{ fontSize: '10px' }}
                    label={{ value: 'Predicted Win %', position: 'bottom', offset: 0, fill: '#9CA3AF', fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(value) => `${value}%`}
                    stroke="#6B7280"
                    style={{ fontSize: '10px' }}
                    label={{ value: 'Actual Win %', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1d23',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#D1D5DB' }}
                    formatter={(value?: number | string, name?: string) => [
                      `${Number(value ?? 0).toFixed(1)}%`,
                      name === 'actual' ? 'Actual' : 'Predicted'
                    ]}
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        return `${data.label} (n=${data.count})`;
                      }
                      return '';
                    }}
                  />
                  {/* Perfect calibration line */}
                  <ReferenceLine
                    segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
                    stroke="#6B7280"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                  {/* Actual accuracy line */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#0EA572"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#0EA572', strokeWidth: 2, stroke: '#1a1d23' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Historical Trend Chart */}
      {trendData.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1">
            <TrendingUp size={12} />
            Accuracy Trend
          </h4>
          <p className="text-[10px] text-gray-500 mb-3">
            Track how prediction accuracy has changed over time
          </p>
          <div className="bg-surface/50 rounded-lg p-3">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                  <XAxis
                    dataKey="date"
                    stroke="#6B7280"
                    style={{ fontSize: '10px' }}
                    label={{ value: 'Date', position: 'bottom', offset: 0, fill: '#9CA3AF', fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(value) => `${value}%`}
                    stroke="#6B7280"
                    style={{ fontSize: '10px' }}
                    label={{ value: 'Accuracy', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1d23',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: '#D1D5DB' }}
                    formatter={(value?: number | string) => [`${Number(value ?? 0).toFixed(1)}%`, 'Accuracy']}
                    labelFormatter={(_, payload) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        return `${data.date} (${data.total} prediction${data.total > 1 ? 's' : ''})`;
                      }
                      return '';
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#1a1d23' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Individual Predictions */}
      {predictions && predictions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 mb-2">Recent Predictions</h4>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {[...predictions]
              .sort((a, b) => b.predictedAt - a.predictedAt)
              .slice(0, 20)
              .map((pred, i) => {
                const isComplete = pred.actualWinner !== undefined;
                const isCorrect = pred.correct === true;
                const isIncorrect = pred.correct === false;
                const isEven = i % 2 === 0;

                // Format date
                const date = new Date(pred.predictedAt).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={`${pred.home}-${pred.away}-${pred.predictedAt}`}
                    className={clsx(
                      'flex items-center text-xs rounded py-1.5 px-2',
                      isEven && 'bg-surface-elevated/20',
                      isComplete && (isCorrect ? 'border-l-2 border-l-win' : 'border-l-2 border-l-lose')
                    )}
                  >
                    {/* Date */}
                    <span className="text-gray-600 w-16 shrink-0 text-[10px]">{date}</span>

                    {/* Home Team */}
                    <span
                      className={clsx(
                        'flex-1 text-right',
                        pred.predictedWinner === 'home' && 'font-semibold text-gray-200',
                        pred.predictedWinner !== 'home' && 'text-gray-400'
                      )}
                    >
                      {pred.home}
                      {isComplete && pred.actualWinner === 'home' && (
                        <span className="text-win ml-1">{'\u2713'}</span>
                      )}
                    </span>

                    {/* VS */}
                    <span className="mx-2 text-gray-600 text-[10px]">vs</span>

                    {/* Away Team */}
                    <span
                      className={clsx(
                        'flex-1',
                        pred.predictedWinner === 'away' && 'font-semibold text-gray-200',
                        pred.predictedWinner !== 'away' && 'text-gray-400'
                      )}
                    >
                      {isComplete && pred.actualWinner === 'away' && (
                        <span className="text-win mr-1">{'\u2713'}</span>
                      )}
                      {pred.away}
                    </span>

                    {/* Result Indicator */}
                    <div className="ml-2 w-16 flex items-center justify-end">
                      {!isComplete && (
                        <span className="text-[10px] text-gray-500 italic">Pending</span>
                      )}
                      {isCorrect && (
                        <div className="flex items-center gap-0.5 text-win">
                          <CheckCircle2 size={12} />
                          <span className="text-[10px] font-medium">Correct</span>
                        </div>
                      )}
                      {isIncorrect && (
                        <div className="flex items-center gap-0.5 text-lose">
                          <XCircle size={12} />
                          <span className="text-[10px] font-medium">Wrong</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
