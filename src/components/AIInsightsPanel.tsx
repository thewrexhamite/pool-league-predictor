'use client';

import { useState } from 'react';
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
          className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          {type === 'match' ? 'Get AI Match Analysis' : 'Get AI Player Insight'}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-purple-400 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          {type === 'match' ? 'AI Match Analysis' : 'AI Player Insight'}
        </h4>
        <button
          onClick={() => {
            setExpanded(false);
            setInsight(null);
          }}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          Close
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full" />
          Analyzing...
        </div>
      )}

      {error && (
        <div className="text-sm text-red-400">
          {error}
          <button
            onClick={handleGenerate}
            className="ml-2 text-purple-400 hover:text-purple-300 underline"
          >
            Retry
          </button>
        </div>
      )}

      {insight && (
        <div className="text-sm text-gray-300 whitespace-pre-wrap">{insight}</div>
      )}

      {!isLoading && !error && !insight && (
        <p className="text-sm text-gray-500">
          AI features require a Gemini API key. Set GEMINI_API_KEY in your environment.
        </p>
      )}
    </div>
  );
}
