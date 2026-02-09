'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { TrendingUp, Trophy, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { CareerTrend } from '@/lib/types';

interface CareerTrendChartProps {
  careerTrend: CareerTrend;
  className?: string;
}

export default function CareerTrendChart({ careerTrend, className }: CareerTrendChartProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    return careerTrend.seasons.map(season => ({
      season: season.seasonId,
      winRate: Math.round(season.winRate * 100), // Convert to percentage
      rating: season.rating,
      gamesPlayed: season.gamesPlayed,
    }));
  }, [careerTrend.seasons]);

  // Check if we have rating data
  const hasRatingData = useMemo(() => {
    return careerTrend.seasons.some(s => s.rating !== null);
  }, [careerTrend.seasons]);

  // Format season ID for display (e.g., "2425" -> "24/25")
  const formatSeasonLabel = (seasonId: string) => {
    if (seasonId.length === 4) {
      return `${seasonId.slice(0, 2)}/${seasonId.slice(2)}`;
    }
    return seasonId;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-surface-card rounded-lg shadow-lg p-3 border border-surface-elevated">
        <div className="text-xs font-semibold text-gray-300 mb-2">
          Season {formatSeasonLabel(data.season)}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-win" />
            <span className="text-xs text-gray-400">Win Rate:</span>
            <span className="text-xs font-bold text-win">{data.winRate}%</span>
          </div>
          {data.rating !== null && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-info" />
              <span className="text-xs text-gray-400">Rating:</span>
              <span className="text-xs font-bold text-info">{data.rating.toFixed(0)}</span>
            </div>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {data.gamesPlayed} games played
          </div>
        </div>
      </div>
    );
  };

  // No data state
  if (chartData.length === 0) {
    return (
      <div className={clsx('bg-surface-card rounded-card shadow-card p-4', className)}>
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-300">Career Trajectory</h3>
        </div>
        <div className="text-center py-6">
          <Activity className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No career data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-surface-card rounded-card shadow-card p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-300">Career Trajectory</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Trophy size={12} className="text-gold" />
          <span>Peak: {formatSeasonLabel(careerTrend.peakWinRate.seasonId)}</span>
        </div>
      </div>

      {/* Career Stats Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Peak Win Rate */}
        <div className="bg-surface rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">Career Best</div>
          <div className="text-lg font-bold text-win">
            {Math.round(careerTrend.peakWinRate.value * 100)}%
          </div>
          <div className="text-[10px] text-gray-600">
            {formatSeasonLabel(careerTrend.peakWinRate.seasonId)}
          </div>
        </div>

        {/* Current vs Peak */}
        <div className="bg-surface rounded-lg p-3 text-center">
          <div className="text-xs text-gray-500 mb-1">vs Peak</div>
          <div
            className={clsx(
              'text-lg font-bold',
              careerTrend.currentVsPeak.winRateDiff >= 0 ? 'text-win' : 'text-loss'
            )}
          >
            {careerTrend.currentVsPeak.winRateDiff >= 0 ? '+' : ''}
            {Math.round(careerTrend.currentVsPeak.winRateDiff * 100)}%
          </div>
          <div className="text-[10px] text-gray-600">win rate</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <XAxis
              dataKey="season"
              tickFormatter={formatSeasonLabel}
              stroke="#6B7280"
              style={{ fontSize: '11px' }}
              tick={{ fill: '#9CA3AF' }}
            />
            {/* Left Y-axis for Win Rate */}
            <YAxis
              yAxisId="left"
              stroke="#0EA572"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              style={{ fontSize: '11px' }}
              tick={{ fill: '#0EA572' }}
              label={{
                value: 'Win Rate (%)',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: '11px', fill: '#0EA572' },
              }}
            />
            {/* Right Y-axis for Rating (if available) */}
            {hasRatingData && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3B82F6"
                style={{ fontSize: '11px' }}
                tick={{ fill: '#3B82F6' }}
                label={{
                  value: 'Rating',
                  angle: 90,
                  position: 'insideRight',
                  style: { fontSize: '11px', fill: '#3B82F6' },
                }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              iconType="line"
              formatter={(value: string) => (
                <span className="text-gray-400">{value}</span>
              )}
            />
            {/* Win Rate Line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="winRate"
              name="Win Rate"
              stroke="#0EA572"
              strokeWidth={2}
              dot={{ r: 4, fill: '#0EA572' }}
              activeDot={{ r: 6 }}
            />
            {/* Rating Line (if available) */}
            {hasRatingData && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rating"
                name="Rating"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 4, fill: '#3B82F6' }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            )}
            {/* Reference line at peak win rate */}
            <ReferenceLine
              yAxisId="left"
              y={Math.round(careerTrend.peakWinRate.value * 100)}
              stroke="#F59E0B"
              strokeDasharray="3 3"
              label={{
                value: 'Peak',
                position: 'right',
                style: { fontSize: '10px', fill: '#F59E0B' },
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Seasons count */}
      <div className="text-center text-xs text-gray-500 mt-3">
        {chartData.length} season{chartData.length !== 1 ? 's' : ''} tracked
      </div>
    </div>
  );
}
