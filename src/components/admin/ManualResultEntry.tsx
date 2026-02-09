'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Save, X, Calendar } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, MatchResult } from '@/lib/types';
import { useLeagueData } from '@/lib/data-provider';

interface ManualResultEntryProps {
  selectedDiv?: DivisionCode;
  onSubmit: (result: Omit<MatchResult, 'division' | 'frames'>) => Promise<void>;
  onCancel?: () => void;
}

export default function ManualResultEntry({
  selectedDiv,
  onSubmit,
  onCancel,
}: ManualResultEntryProps) {
  const { data: leagueData } = useLeagueData();
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [homeScore, setHomeScore] = useState(5);
  const [awayScore, setAwayScore] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get available teams based on selected division
  const availableTeams = useMemo(() => {
    if (selectedDiv && leagueData.divisions[selectedDiv]) {
      return leagueData.divisions[selectedDiv].teams.sort();
    }
    // If no division selected, get all teams
    return Object.values(leagueData.divisions)
      .flatMap((div) => div.teams)
      .sort();
  }, [selectedDiv, leagueData.divisions]);

  const adjust = (side: 'home' | 'away', delta: number) => {
    if (side === 'home') {
      const v = Math.min(10, Math.max(0, homeScore + delta));
      setHomeScore(v);
      setAwayScore(10 - v);
    } else {
      const v = Math.min(10, Math.max(0, awayScore + delta));
      setAwayScore(v);
      setHomeScore(10 - v);
    }
    setError(null);
  };

  const validateForm = (): string | null => {
    if (!date) {
      return 'Please select a date';
    }
    if (!homeTeam) {
      return 'Please select a home team';
    }
    if (!awayTeam) {
      return 'Please select an away team';
    }
    if (homeTeam === awayTeam) {
      return 'Home and away teams must be different';
    }
    if (homeScore + awayScore !== 10) {
      return 'Scores must sum to 10';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        date,
        home: homeTeam,
        away: awayTeam,
        home_score: homeScore,
        away_score: awayScore,
      });

      // Reset form on success
      setHomeTeam('');
      setAwayTeam('');
      setHomeScore(5);
      setAwayScore(5);
      const today = new Date();
      setDate(today.toISOString().split('T')[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save result');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setHomeTeam('');
    setAwayTeam('');
    setHomeScore(5);
    setAwayScore(5);
    setError(null);
    const today = new Date();
    setDate(today.toISOString().split('T')[0]);
    onCancel?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-surface-card rounded-card shadow-card p-4 md:p-6"
    >
      <h2 className="text-lg font-bold mb-4 text-white">Manual Result Entry</h2>

      <div className="space-y-4">
        {/* Date Input */}
        <div>
          <label
            htmlFor="date"
            className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2"
          >
            Date
          </label>
          <div className="relative">
            <Calendar
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
              className="w-full pl-10 pr-4 py-2 bg-surface-elevated border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-baize transition"
            />
          </div>
        </div>

        {/* Team Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Home Team */}
          <div>
            <label
              htmlFor="homeTeam"
              className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2"
            >
              Home Team
            </label>
            <select
              id="homeTeam"
              value={homeTeam}
              onChange={(e) => {
                setHomeTeam(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-2 bg-surface-elevated border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-baize transition"
            >
              <option value="">Select home team...</option>
              {availableTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          {/* Away Team */}
          <div>
            <label
              htmlFor="awayTeam"
              className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2"
            >
              Away Team
            </label>
            <select
              id="awayTeam"
              value={awayTeam}
              onChange={(e) => {
                setAwayTeam(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-2 bg-surface-elevated border border-surface-border rounded-lg text-white text-sm focus:outline-none focus:border-baize transition"
            >
              <option value="">Select away team...</option>
              {availableTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Score Entry */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Score
          </label>
          <div className="flex items-center justify-center gap-2 flex-wrap bg-surface-elevated/30 border border-surface-border/30 rounded-lg p-4">
            <span
              className={clsx(
                'text-xs truncate max-w-[120px]',
                homeTeam ? 'text-gray-300' : 'text-gray-600'
              )}
            >
              {homeTeam || 'Home'}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjust('home', -1)}
                className="w-8 h-8 rounded bg-surface-elevated flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface transition"
                aria-label="Decrease home score"
                disabled={homeScore === 0}
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-bold text-2xl text-white">
                {homeScore}
              </span>
              <button
                onClick={() => adjust('home', 1)}
                className="w-8 h-8 rounded bg-surface-elevated flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface transition"
                aria-label="Increase home score"
                disabled={homeScore === 10}
              >
                <Plus size={16} />
              </button>
            </div>
            <span className="text-gray-600 text-sm font-bold">-</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjust('away', -1)}
                className="w-8 h-8 rounded bg-surface-elevated flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface transition"
                aria-label="Decrease away score"
                disabled={awayScore === 0}
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-bold text-2xl text-white">
                {awayScore}
              </span>
              <button
                onClick={() => adjust('away', 1)}
                className="w-8 h-8 rounded bg-surface-elevated flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface transition"
                aria-label="Increase away score"
                disabled={awayScore === 10}
              >
                <Plus size={16} />
              </button>
            </div>
            <span
              className={clsx(
                'text-xs truncate max-w-[120px]',
                awayTeam ? 'text-gray-300' : 'text-gray-600'
              )}
            >
              {awayTeam || 'Away'}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-loss/10 border border-loss/30 rounded-lg p-3 text-sm text-loss"
          >
            {error}
          </motion.div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={clsx(
              'flex items-center gap-2 bg-baize hover:bg-baize-dark px-4 py-2 rounded-lg text-sm font-medium text-fixed-white transition',
              submitting && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Save size={16} />
            {submitting ? 'Saving...' : 'Save Result'}
          </button>
          {onCancel && (
            <button
              onClick={handleCancel}
              disabled={submitting}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200 transition px-4 py-2"
            >
              <X size={16} />
              Cancel
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
