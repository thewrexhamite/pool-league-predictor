'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useLeague } from '@/lib/league-context';
import { useUserGameHistory } from '@/hooks/chalk/use-match-history';
import { useLeagueMatchHistory } from '@/hooks/use-league-match-history';
import type { ChalkHistoryItem, UnifiedHistoryItem } from '@/lib/unified-history';

/**
 * Combines chalk (casual) game history and league match history into a single
 * chronological feed, sorted newest first.
 */
export function useUnifiedMatchHistory(uid: string | undefined) {
  const { profile } = useAuth();
  const { leagues } = useLeague();

  const claimedProfiles = profile?.claimedProfiles || [];

  const {
    games: chalkGames,
    loading: chalkLoading,
    loadingMore,
    hasMore,
    loadMore,
  } = useUserGameHistory(uid);

  const { matches: leagueMatches, loading: leagueLoading } = useLeagueMatchHistory(
    claimedProfiles,
    leagues,
  );

  const items = useMemo<UnifiedHistoryItem[]>(() => {
    const chalkItems: ChalkHistoryItem[] = chalkGames.map((game) => ({
      type: 'chalk',
      date: game.endedAt,
      game,
    }));

    const merged: UnifiedHistoryItem[] = [...chalkItems, ...leagueMatches];
    merged.sort((a, b) => b.date - a.date);
    return merged;
  }, [chalkGames, leagueMatches]);

  return {
    items,
    loading: chalkLoading || leagueLoading,
    loadingMore,
    hasMore,
    loadMore,
  };
}
