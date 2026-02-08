'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Award,
  Target,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';

export interface SeasonPlayerStats {
  seasonLabel: string;
  seasonId: string;
  rating: number | null;
  winPct: number | null;
  gamesPlayed: number | null;
}

interface SeasonComparisonChartProps {
  playerName: string;
  seasons: SeasonPlayerStats[];
  chartType?: 'bar' | 'line';
  className?: string;
}

export default function SeasonComparisonChart({
  playerName,
  seasons,
  chartType = 'line',
  className,
}: SeasonComparisonChartProps) {
  // Filter out seasons with no data
  const validSeasons = useMemo(() => {
    return seasons.filter(
      s => s.rating !== null || s.winPct !== null || s.gamesPlayed !== null
    );
  }, [seasons]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return validSeasons.map(s => ({
      season: s.seasonLabel,
      rating: s.rating || 0,
      winPct: s.winPct !== null ? Math.round(s.winPct * 100) : 0,
      gamesPlayed: s.gamesPlayed || 0,
    }));
  }, [validSeasons]);

  // Calculate trends (compare latest season to previous)
  const trends = useMemo(() => {
    if (validSeasons.length < 2) return null;

    const latest = validSeasons[validSeasons.length - 1];
    const previous = validSeasons[validSeasons.length - 2];

    const ratingChange =
      latest.rating !== null && previous.rating !== null
        ? latest.rating - previous.rating
        : null;

    const winPctChange =
      latest.winPct !== null && previous.winPct !== null
        ? (latest.winPct - previous.winPct) * 100
        : null;

    const gamesChange =
      latest.gamesPlayed !== null && previous.gamesPlayed !== null
        ? latest.gamesPlayed - previous.gamesPlayed
        : null;

    return {
      rating: ratingChange,
      winPct: winPctChange,
      games: gamesChange,
    };
  }, [validSeasons]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-surface-elevated border border-gray-700 rounded-lg shadow-lg p-3">
        <p className="text-xs font-semibold text-white mb-2">{data.season}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400">Rating:</span>
            <span className="text-xs font-medium text-info">{data.rating}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400">Win %:</span>
            <span className="text-xs font-medium text-win">{data.winPct}%</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-400">Games:</span>
            <span className="text-xs font-medium text-accent">{data.gamesPlayed}</span>
          </div>
        </div>
      </div>
    );
  };

  // No data state
  if (validSeasons.length === 0) {
    return (
      <div className={clsx('bg-surface-card rounded-card shadow-card p-4', className)}>
        <div className="flex items-center gap-1.5 mb-3">
          <Activity size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-300">Season Comparison</h3>
        </div>
        <div className="text-center py-6">
          <Activity className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No historical data available</p>
          <p className="text-xs text-gray-500 mt-1">
            Player stats will appear here after multiple seasons
          </p>
        </div>
      </div>
    );
  }

  // Single season state
  if (validSeasons.length === 1) {
    const season = validSeasons[0];
    return (
      <div className={clsx('bg-surface-card rounded-card shadow-card p-4', className)}>
        <div className="flex items-center gap-1.5 mb-3">
          <Award size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-300">Season Stats</h3>
        </div>
        <div className="text-center py-4">
          <p className="text-xs text-gray-400 mb-3">{season.seasonLabel}</p>
          <div className="grid grid-cols-3 gap-3">
            {season.rating !== null && (
              <div className="bg-surface rounded-lg p-3">
                <div className="text-lg font-bold text-info">{season.rating}</div>
                <div className="text-[10px] text-gray-500">Rating</div>
              </div>
            )}
            {season.winPct !== null && (
              <div className="bg-surface rounded-lg p-3">
                <div className="text-lg font-bold text-win">
                  {Math.round(season.winPct * 100)}%
                </div>
                <div className="text-[10px] text-gray-500">Win %</div>
              </div>
            )}
            {season.gamesPlayed !== null && (
              <div className="bg-surface rounded-lg p-3">
                <div className="text-lg font-bold text-accent">{season.gamesPlayed}</div>
                <div className="text-[10px] text-gray-500">Games</div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            More data will appear after additional seasons
          </p>
        </div>
      </div>
    );
  }

  // Multi-season comparison view
  return (
    <div className={clsx('bg-surface-card rounded-card shadow-card p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Activity size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-300">Season Comparison</h3>
        </div>
        <span className="text-xs text-gray-500">
          {validSeasons.length} {validSeasons.length === 1 ? 'season' : 'seasons'}
        </span>
      </div>

      {/* Trend indicators */}
      {trends && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {trends.rating !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-lg p-2 flex items-center justify-between"
            >
              <div>
                <div className="text-[10px] text-gray-500">Rating</div>
                <div className="text-xs font-semibold text-white flex items-center gap-1">
                  {trends.rating > 0 ? (
                    <TrendingUp size={12} className="text-win" />
                  ) : trends.rating < 0 ? (
                    <TrendingDown size={12} className="text-lose" />
                  ) : (
                    <Target size={12} className="text-gray-500" />
                  )}
                  <span
                    className={clsx(
                      trends.rating > 0
                        ? 'text-win'
                        : trends.rating < 0
                        ? 'text-lose'
                        : 'text-gray-400'
                    )}
                  >
                    {trends.rating > 0 ? '+' : ''}
                    {trends.rating}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {trends.winPct !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-surface rounded-lg p-2 flex items-center justify-between"
            >
              <div>
                <div className="text-[10px] text-gray-500">Win %</div>
                <div className="text-xs font-semibold text-white flex items-center gap-1">
                  {trends.winPct > 0 ? (
                    <TrendingUp size={12} className="text-win" />
                  ) : trends.winPct < 0 ? (
                    <TrendingDown size={12} className="text-lose" />
                  ) : (
                    <Target size={12} className="text-gray-500" />
                  )}
                  <span
                    className={clsx(
                      trends.winPct > 0
                        ? 'text-win'
                        : trends.winPct < 0
                        ? 'text-lose'
                        : 'text-gray-400'
                    )}
                  >
                    {trends.winPct > 0 ? '+' : ''}
                    {trends.winPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {trends.games !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-surface rounded-lg p-2 flex items-center justify-between"
            >
              <div>
                <div className="text-[10px] text-gray-500">Games</div>
                <div className="text-xs font-semibold text-white flex items-center gap-1">
                  {trends.games > 0 ? (
                    <TrendingUp size={12} className="text-accent" />
                  ) : trends.games < 0 ? (
                    <TrendingDown size={12} className="text-gray-500" />
                  ) : (
                    <Target size={12} className="text-gray-500" />
                  )}
                  <span
                    className={clsx(
                      trends.games > 0
                        ? 'text-accent'
                        : trends.games < 0
                        ? 'text-gray-400'
                        : 'text-gray-400'
                    )}
                  >
                    {trends.games > 0 ? '+' : ''}
                    {trends.games}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="h-64 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="season"
                stroke="#9CA3AF"
                fontSize={11}
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis stroke="#9CA3AF" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconSize={10}
              />
              <Bar dataKey="rating" fill="#3B82F6" name="Rating" radius={[4, 4, 0, 0]} />
              <Bar dataKey="winPct" fill="#10B981" name="Win %" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="gamesPlayed"
                fill="#F59E0B"
                name="Games"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="season"
                stroke="#9CA3AF"
                fontSize={11}
                tick={{ fill: '#9CA3AF' }}
              />
              <YAxis stroke="#9CA3AF" fontSize={11} tick={{ fill: '#9CA3AF' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                iconSize={10}
              />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Rating"
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="winPct"
                stroke="#10B981"
                strokeWidth={2}
                name="Win %"
                dot={{ fill: '#10B981', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="gamesPlayed"
                stroke="#F59E0B"
                strokeWidth={2}
                name="Games"
                dot={{ fill: '#F59E0B', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-surface/50 rounded-lg p-2">
          <div className="text-xs font-semibold text-info">
            {validSeasons[validSeasons.length - 1].rating || 'N/A'}
          </div>
          <div className="text-[10px] text-gray-500">Current Rating</div>
        </div>
        <div className="bg-surface/50 rounded-lg p-2">
          <div className="text-xs font-semibold text-win">
            {validSeasons[validSeasons.length - 1].winPct !== null
              ? `${Math.round(validSeasons[validSeasons.length - 1].winPct! * 100)}%`
              : 'N/A'}
          </div>
          <div className="text-[10px] text-gray-500">Current Win %</div>
        </div>
        <div className="bg-surface/50 rounded-lg p-2">
          <div className="text-xs font-semibold text-accent">
            {validSeasons[validSeasons.length - 1].gamesPlayed || 'N/A'}
          </div>
          <div className="text-[10px] text-gray-500">Current Games</div>
        </div>
      </div>
    </div>
  );
}
