'use client';

import { useState } from 'react';
import {
  analyzeMatchAction,
  askQuestionAction,
  getPlayerInsightAction,
  generateTeamReportAction,
} from '@/lib/ai-actions';
import type { TeamReportData, TeamReportOutput } from '@/lib/types';

export function useAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeMatch = async (homeTeam: string, awayTeam: string, leagueName?: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzeMatchAction(homeTeam, awayTeam, leagueName);
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
    question: string,
    leagueName?: string
  ): Promise<{
    answer: string;
    suggestedFollowUps: string[];
  } | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await askQuestionAction(question, leagueName);
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

  const getPlayerInsight = async (playerName: string, leagueName?: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPlayerInsightAction(playerName, leagueName);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get player insight';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const generateTeamReport = async (input: TeamReportData): Promise<TeamReportOutput | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateTeamReportAction(input);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate team report';
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
    generateTeamReport,
    isLoading,
    error,
  };
}
