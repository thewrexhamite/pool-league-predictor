'use client';

import { useState } from 'react';
import {
  analyzeMatchAction,
  askQuestionAction,
  getPlayerInsightAction,
} from '@/lib/ai-actions';

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeMatch = async (homeTeam: string, awayTeam: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeMatchAction(homeTeam, awayTeam);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze match';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const askQuestion = async (
    question: string
  ): Promise<{
    answer: string;
    suggestedFollowUps: string[];
  } | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await askQuestionAction(question);
      return {
        answer: result.answer,
        suggestedFollowUps: result.suggestedFollowUps,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to answer question';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getPlayerInsight = async (playerName: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPlayerInsightAction(playerName);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get player insight';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    analyzeMatch,
    askQuestion,
    getPlayerInsight,
    isLoading,
    error,
  };
}
