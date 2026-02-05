'use client';

import { useState } from 'react';
import { Lightbulb, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useAI } from '@/hooks/use-ai';

interface AIInsightsPanelProps {
  type: 'match' | 'player';
  homeTeam?: string;
  awayTeam?: string;
  playerName?: string;
}

export function AIInsightsPanel({ type, homeTeam, awayTeam, playerName }: AIInsightsPanelProps) {
  const { analyzeMatch, getPlayerInsight, isLoading, error } = useAI();
  const [insight, setInsight] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleGenerate = async () => {
    setExpanded(true);
    try {
      if (type === 'match' && homeTeam && awayTeam) {
        const result = await analyzeMatch(homeTeam, awayTeam);
        if (result) setInsight(result);
      } else if (type === 'player' && playerName) {
        const result = await getPlayerInsight(playerName);
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
            This feature requires configuration. Set GEMINI_API_KEY in your environment.
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
