/**
 * Career Stats Module
 *
 * Aggregate player statistics from season data.
 */

import type { FrameData, Players2526Map, PlayerData2526 } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface SeasonStats {
  season: string;
  league: string;
  team: string;
  division: string;
  played: number;
  won: number;
  winPct: number;
  breakDishFor: number;
  breakDishAgainst: number;
}

export interface PlayerForm {
  last5: { played: number; won: number; pct: number };
  last10: { played: number; won: number; pct: number };
  trend: 'hot' | 'cold' | 'steady';
}

export interface CareerMilestone {
  type: 'first_game' | 'games_played' | 'win_streak' | 'season_best';
  description: string;
  date: string;
  season: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate win percentage from wins and played.
 */
export function calculateWinPct(wins: number, played: number): number {
  if (played === 0) return 0;
  return (wins / played) * 100;
}

/**
 * Format win percentage for display.
 */
export function formatWinPct(pct: number): string {
  return pct.toFixed(1) + '%';
}

/**
 * Parse a date string in DD-MM-YYYY format.
 */
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date for display.
 */
export function formatDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get season label from season ID.
 */
export function getSeasonLabel(seasonId: string): string {
  if (seasonId.length === 4) {
    const start = parseInt(seasonId.slice(0, 2), 10);
    const end = parseInt(seasonId.slice(2, 4), 10);
    return `20${start}/20${end}`;
  }
  return seasonId;
}

// ============================================================================
// Stats from Season Data
// ============================================================================

/**
 * Get a player's stats from the players2526 map.
 */
export function getPlayerStats(
  playerName: string,
  players2526: Players2526Map
): PlayerData2526 | null {
  return players2526[playerName] || null;
}

/**
 * Calculate current form from recent frame data.
 */
export function calculateCurrentForm(
  playerName: string,
  frames: FrameData[]
): PlayerForm | null {
  // Find player's recent games
  const playerFrames: Array<{ date: string; won: boolean }> = [];

  for (const match of frames) {
    for (const frame of match.frames) {
      const isHome = frame.homePlayer.includes(playerName);
      const isAway = frame.awayPlayer.includes(playerName);

      if (isHome || isAway) {
        const won = (isHome && frame.winner === 'home') || (isAway && frame.winner === 'away');
        playerFrames.push({ date: match.date, won });
      }
    }
  }

  if (playerFrames.length === 0) {
    return null;
  }

  // Sort by date (most recent first)
  playerFrames.sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  // Calculate last 5 and last 10
  const last5 = playerFrames.slice(0, 5);
  const last10 = playerFrames.slice(0, 10);

  const last5Won = last5.filter((f) => f.won).length;
  const last10Won = last10.filter((f) => f.won).length;

  const last5Pct = calculateWinPct(last5Won, last5.length);
  const last10Pct = calculateWinPct(last10Won, last10.length);

  // Determine trend
  let trend: 'hot' | 'cold' | 'steady' = 'steady';
  if (last5Pct >= 70) trend = 'hot';
  else if (last5Pct <= 30) trend = 'cold';

  return {
    last5: { played: last5.length, won: last5Won, pct: last5Pct },
    last10: { played: last10.length, won: last10Won, pct: last10Pct },
    trend,
  };
}

/**
 * Get all games for a player from frame data.
 */
export function getPlayerGames(
  playerName: string,
  frames: FrameData[]
): Array<{
  date: string;
  matchId: string;
  opponent: string;
  won: boolean;
  team: string;
  opponentTeam: string;
  isHome: boolean;
}> {
  const games: Array<{
    date: string;
    matchId: string;
    opponent: string;
    won: boolean;
    team: string;
    opponentTeam: string;
    isHome: boolean;
  }> = [];

  for (const match of frames) {
    for (const frame of match.frames) {
      const isHome = frame.homePlayer.includes(playerName);
      const isAway = frame.awayPlayer.includes(playerName);

      if (isHome) {
        games.push({
          date: match.date,
          matchId: match.matchId,
          opponent: frame.awayPlayer,
          won: frame.winner === 'home',
          team: match.home,
          opponentTeam: match.away,
          isHome: true,
        });
      } else if (isAway) {
        games.push({
          date: match.date,
          matchId: match.matchId,
          opponent: frame.homePlayer,
          won: frame.winner === 'away',
          team: match.away,
          opponentTeam: match.home,
          isHome: false,
        });
      }
    }
  }

  // Sort by date (most recent first)
  games.sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  return games;
}

/**
 * Find milestones for a player from their game history.
 */
export function findMilestones(
  playerName: string,
  frames: FrameData[],
  season: string
): CareerMilestone[] {
  const games = getPlayerGames(playerName, frames);
  const milestones: CareerMilestone[] = [];

  if (games.length === 0) return milestones;

  // Sort chronologically for milestone detection
  const chronological = [...games].reverse();

  let totalGames = 0;
  let currentStreak = 0;
  let maxStreak = 0;

  for (const game of chronological) {
    totalGames++;

    // First game
    if (totalGames === 1) {
      milestones.push({
        type: 'first_game',
        description: 'First recorded game',
        date: game.date,
        season,
      });
    }

    // Win streak
    if (game.won) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }

    // Games played milestones
    if ([50, 100, 200, 500].includes(totalGames)) {
      milestones.push({
        type: 'games_played',
        description: `${totalGames} games played`,
        date: game.date,
        season,
      });
    }
  }

  // Add max streak if notable
  if (maxStreak >= 5) {
    milestones.push({
      type: 'win_streak',
      description: `${maxStreak} game winning streak`,
      date: '',
      season,
    });
  }

  return milestones;
}
