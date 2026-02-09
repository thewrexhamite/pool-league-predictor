'use client';

import { useState } from 'react';
import { Lightbulb, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAI } from '@/hooks/use-ai';
import { useLeague } from '@/lib/league-context';
import { useActiveData } from '@/lib/active-data-provider';
import {
  fetchPlayerCareerData,
  calculateCareerTrend,
  calculateImprovementRate,
  calculateConsistencyMetrics,
} from '@/lib/stats/career-stats';
import type { CareerStats } from '@/lib/types';

interface AIInsightsPanelProps {
  type: 'match' | 'player';
  homeTeam?: string;
  awayTeam?: string;
  playerName?: string;
}

export function AIInsightsPanel({ type, homeTeam, awayTeam, playerName }: AIInsightsPanelProps) {
  const { analyzeMatch, getPlayerInsight, isLoading, error } = useAI();
  const { selected } = useLeague();
  const { ds } = useActiveData();
  const leagueName = selected?.league?.name;
  const [insight, setInsight] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleGenerate = async () => {
    setExpanded(true);
    try {
      if (type === 'match' && homeTeam && awayTeam) {
        const result = await analyzeMatch(homeTeam, awayTeam, ds.divisions, ds.results, leagueName);
        if (result) setInsight(result);
      } else if (type === 'player' && playerName && selected?.league?.id) {
        // Fetch career data for the player
        let careerStats: CareerStats | null = null;
        try {
          const seasons = await fetchPlayerCareerData(playerName, selected.league.id);
          if (seasons.length > 0) {
            const trend = calculateCareerTrend(seasons);
            const improvement = calculateImprovementRate(seasons);
            const consistency = calculateConsistencyMetrics(seasons);

            if (trend) {
              const totalGamesPlayed = seasons.reduce((sum, s) => sum + s.gamesPlayed, 0);
              const totalWins = seasons.reduce((sum, s) => sum + s.wins, 0);
              const careerWinRate = totalGamesPlayed > 0 ? totalWins / totalGamesPlayed : 0;

              careerStats = {
                playerName,
                trend,
                improvement,
                consistency,
                totalSeasons: seasons.length,
                careerGamesPlayed: totalGamesPlayed,
                careerWins: totalWins,
                careerWinRate,
              };
            }
          }
        } catch (err) {
          // If career data fails to fetch, continue without it
          console.warn('Failed to fetch career data:', err);
        }

        const result = await getPlayerInsight(playerName, ds.divisions, ds.results, leagueName, careerStats);
        if (result) setInsight(result);
      }
    } catch {
      // error is handled by the hook
    }
  };

  if (!expanded) {
    return (
      <div className="mt-4">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="flex items-center gap-2 text-sm text-accent-light hover:text-accent transition"
        >
          <Lightbulb size={16} />
          {type === 'match' ? 'Get Match Analysis' : 'Get Player Insight'}
        </button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-4 bg-accent-muted/20 border border-accent/30 rounded-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-accent-light flex items-center gap-2">
            <Lightbulb size={16} />
            {type === 'match' ? 'Match Analysis' : 'Player Insight'}
          </h4>
          <button
            onClick={() => {
              setExpanded(false);
              setInsight(null);
            }}
            className="text-gray-500 hover:text-white transition p-1"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <RefreshCw size={16} className="animate-spin text-accent" />
            Analyzing...
          </div>
        )}

        {error && (
          <div className="text-sm text-loss">
            {error}
            <button
              onClick={handleGenerate}
              className="ml-2 text-accent-light hover:text-accent underline transition"
            >
              Retry
            </button>
          </div>
        )}

        {insight && (
          <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{insight}</div>
        )}

        {!isLoading && !error && !insight && (
          <p className="text-sm text-gray-500">
            This feature is currently unavailable.
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
