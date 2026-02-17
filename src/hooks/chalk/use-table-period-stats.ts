'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameHistoryRecord, SessionStats, PlayerSessionStats } from '@/lib/chalk/types';
import { getTableHistorySince } from '@/lib/chalk/firestore';

interface PeriodStats {
  stats: SessionStats;
  games: GameHistoryRecord[];
  gamesPlayed: number;
  champion: string | null;
}

interface TablePeriodStats {
  daily: PeriodStats;
  weekly: PeriodStats;
  monthly: PeriodStats;
  loading: boolean;
  refresh: () => void;
}

const EMPTY_STATS: SessionStats = {
  gamesPlayed: 0,
  playerStats: {},
  kingOfTable: null,
};

const EMPTY_PERIOD: PeriodStats = {
  stats: EMPTY_STATS,
  games: [],
  gamesPlayed: 0,
  champion: null,
};

function getStartOfDay(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfWeek(): number {
  const d = new Date();
  const day = d.getDay();
  // Monday = start of week
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfMonth(): number {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function aggregateGames(games: GameHistoryRecord[]): SessionStats {
  const playerStats: Record<string, PlayerSessionStats> = {};

  // Process games in chronological order so streaks are computed correctly
  const sorted = [...games].sort((a, b) => a.endedAt - b.endedAt);

  for (const game of sorted) {
    if (game.mode === 'killer') {
      // Killer: winner gets a win, all others get a loss
      for (const p of game.players) {
        if (!playerStats[p.name]) {
          playerStats[p.name] = { wins: 0, losses: 0, gamesPlayed: 0, currentStreak: 0, bestStreak: 0 };
        }
        const s = playerStats[p.name];
        s.gamesPlayed++;
        if (p.name === game.winner) {
          s.wins++;
          s.currentStreak++;
          s.bestStreak = Math.max(s.bestStreak, s.currentStreak);
        } else {
          s.losses++;
          s.currentStreak = 0;
        }
      }
    } else {
      // Standard game
      for (const p of game.players) {
        if (!playerStats[p.name]) {
          playerStats[p.name] = { wins: 0, losses: 0, gamesPlayed: 0, currentStreak: 0, bestStreak: 0 };
        }
        const s = playerStats[p.name];
        s.gamesPlayed++;
        const isWinner = p.side === game.winnerSide;
        if (isWinner) {
          s.wins++;
          s.currentStreak++;
          s.bestStreak = Math.max(s.bestStreak, s.currentStreak);
        } else {
          s.losses++;
          s.currentStreak = 0;
        }
      }
    }
  }

  // Find king (player with highest current streak >= 3)
  let kingOfTable: SessionStats['kingOfTable'] = null;
  let maxStreak = 0;
  for (const [name, s] of Object.entries(playerStats)) {
    if (s.currentStreak >= 3 && s.currentStreak > maxStreak) {
      maxStreak = s.currentStreak;
      kingOfTable = { playerName: name, consecutiveWins: s.currentStreak, crownedAt: Date.now() };
    }
  }

  return { gamesPlayed: sorted.length, playerStats, kingOfTable };
}

function getChampion(stats: SessionStats): string | null {
  const entries = Object.entries(stats.playerStats);
  if (entries.length === 0) return null;
  // Champion = most wins, then highest win rate
  entries.sort(([, a], [, b]) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const aRate = a.gamesPlayed > 0 ? a.wins / a.gamesPlayed : 0;
    const bRate = b.gamesPlayed > 0 ? b.wins / b.gamesPlayed : 0;
    return bRate - aRate;
  });
  return entries[0][0];
}

function buildPeriod(games: GameHistoryRecord[]): PeriodStats {
  if (games.length === 0) return EMPTY_PERIOD;
  const stats = aggregateGames(games);
  return {
    stats,
    games,
    gamesPlayed: games.length,
    champion: getChampion(stats),
  };
}

export function useTablePeriodStats(tableId: string): TablePeriodStats {
  const [daily, setDaily] = useState<PeriodStats>(EMPTY_PERIOD);
  const [weekly, setWeekly] = useState<PeriodStats>(EMPTY_PERIOD);
  const [monthly, setMonthly] = useState<PeriodStats>(EMPTY_PERIOD);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(0);

  const fetchStats = useCallback(async () => {
    const fetchId = ++fetchRef.current;
    setLoading(true);

    try {
      const startOfDay = getStartOfDay();
      const startOfWeek = getStartOfWeek();
      const startOfMonth = getStartOfMonth();

      // Fetch monthly (which includes all daily and weekly data)
      const monthlyGames = await getTableHistorySince(tableId, startOfMonth);

      if (fetchId !== fetchRef.current) return;

      // Filter subsets from the monthly data
      const weeklyGames = monthlyGames.filter((g) => g.endedAt >= startOfWeek);
      const dailyGames = weeklyGames.filter((g) => g.endedAt >= startOfDay);

      setDaily(buildPeriod(dailyGames));
      setWeekly(buildPeriod(weeklyGames));
      setMonthly(buildPeriod(monthlyGames));
    } catch (err) {
      console.error('Failed to fetch period stats:', err);
    } finally {
      if (fetchId === fetchRef.current) {
        setLoading(false);
      }
    }
  }, [tableId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { daily, weekly, monthly, loading, refresh: fetchStats };
}
