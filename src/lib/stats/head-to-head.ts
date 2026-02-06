/**
 * Head-to-Head Statistics Module
 *
 * Calculate and analyze head-to-head records between players.
 */

import type { FrameData } from '../types';
import { calculateWinPct } from './career-stats';

// ============================================================================
// Types
// ============================================================================

export interface H2HMatch {
  date: string;
  matchId: string;
  opponent: string;
  won: boolean;
  homeTeam: string;
  awayTeam: string;
  wasHome: boolean;
}

export interface H2HRecord {
  opponent: string;
  played: number;
  won: number;
  lost: number;
  winPct: number;
  matches: H2HMatch[];
  lastMet: string | null;
  streak: {
    type: 'win' | 'loss' | 'none';
    count: number;
  };
}

export interface H2HSummary {
  totalOpponents: number;
  mostPlayed: H2HRecord | null;
  bestRecord: H2HRecord | null;
  worstRecord: H2HRecord | null;
  nemesis: H2HRecord | null; // Most losses against
  victim: H2HRecord | null; // Most wins against
}

// ============================================================================
// H2H Calculation
// ============================================================================

/**
 * Calculate head-to-head records for a player against all opponents.
 */
export function calculateH2HRecords(
  playerName: string,
  frames: FrameData[]
): Map<string, H2HRecord> {
  const records = new Map<string, H2HRecord>();

  for (const match of frames) {
    for (const frame of match.frames) {
      const isHome = frame.homePlayer.includes(playerName);
      const isAway = frame.awayPlayer.includes(playerName);

      if (!isHome && !isAway) continue;

      const opponent = isHome ? frame.awayPlayer : frame.homePlayer;
      const won = (isHome && frame.winner === 'home') || (isAway && frame.winner === 'away');

      // Get or create record
      let record = records.get(opponent);
      if (!record) {
        record = {
          opponent,
          played: 0,
          won: 0,
          lost: 0,
          winPct: 0,
          matches: [],
          lastMet: null,
          streak: { type: 'none', count: 0 },
        };
        records.set(opponent, record);
      }

      // Update record
      record.played++;
      if (won) {
        record.won++;
      } else {
        record.lost++;
      }

      // Add match
      record.matches.push({
        date: match.date,
        matchId: match.matchId,
        opponent,
        won,
        homeTeam: match.home,
        awayTeam: match.away,
        wasHome: isHome,
      });
    }
  }

  // Calculate final stats
  for (const record of records.values()) {
    record.winPct = calculateWinPct(record.won, record.played);

    // Sort matches by date (most recent first)
    record.matches.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB.getTime() - dateA.getTime();
    });

    record.lastMet = record.matches[0]?.date || null;

    // Calculate current streak
    record.streak = calculateStreak(record.matches);
  }

  return records;
}

/**
 * Get a summary of H2H statistics.
 */
export function getH2HSummary(records: Map<string, H2HRecord>): H2HSummary {
  const recordsArray = Array.from(records.values());

  if (recordsArray.length === 0) {
    return {
      totalOpponents: 0,
      mostPlayed: null,
      bestRecord: null,
      worstRecord: null,
      nemesis: null,
      victim: null,
    };
  }

  // Filter for meaningful records (at least 3 games)
  const qualifiedRecords = recordsArray.filter((r) => r.played >= 3);

  // Most played
  const mostPlayed = [...recordsArray].sort((a, b) => b.played - a.played)[0];

  // Best/worst win percentages (with minimum games)
  const sortedByPct = [...qualifiedRecords].sort((a, b) => b.winPct - a.winPct);
  const bestRecord = sortedByPct[0] || null;
  const worstRecord = sortedByPct[sortedByPct.length - 1] || null;

  // Nemesis (most losses)
  const nemesis = [...recordsArray].sort((a, b) => b.lost - a.lost)[0] || null;

  // Victim (most wins)
  const victim = [...recordsArray].sort((a, b) => b.won - a.won)[0] || null;

  return {
    totalOpponents: recordsArray.length,
    mostPlayed,
    bestRecord: bestRecord !== worstRecord ? bestRecord : null,
    worstRecord: worstRecord !== bestRecord ? worstRecord : null,
    nemesis: nemesis && nemesis.lost > 0 ? nemesis : null,
    victim: victim && victim.won > 0 ? victim : null,
  };
}

/**
 * Get a specific H2H record between two players.
 */
export function getH2HBetween(
  player1: string,
  player2: string,
  frames: FrameData[]
): H2HRecord | null {
  const records = calculateH2HRecords(player1, frames);
  return records.get(player2) || null;
}

// ============================================================================
// Streak Calculation
// ============================================================================

/**
 * Calculate current streak from matches (already sorted by date, most recent first).
 */
function calculateStreak(matches: H2HMatch[]): { type: 'win' | 'loss' | 'none'; count: number } {
  if (matches.length === 0) {
    return { type: 'none', count: 0 };
  }

  const firstResult = matches[0].won;
  let count = 0;

  for (const match of matches) {
    if (match.won === firstResult) {
      count++;
    } else {
      break;
    }
  }

  return {
    type: firstResult ? 'win' : 'loss',
    count,
  };
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Find players with a positive record against the given player.
 */
export function findWinningOpponents(
  playerName: string,
  frames: FrameData[],
  minGames = 3
): H2HRecord[] {
  const records = calculateH2HRecords(playerName, frames);
  return Array.from(records.values())
    .filter((r) => r.played >= minGames && r.winPct < 50)
    .sort((a, b) => a.winPct - b.winPct);
}

/**
 * Find players the given player dominates.
 */
export function findDominatedOpponents(
  playerName: string,
  frames: FrameData[],
  minGames = 3,
  minWinPct = 70
): H2HRecord[] {
  const records = calculateH2HRecords(playerName, frames);
  return Array.from(records.values())
    .filter((r) => r.played >= minGames && r.winPct >= minWinPct)
    .sort((a, b) => b.winPct - a.winPct);
}

/**
 * Find recent H2H opponents.
 */
export function findRecentOpponents(
  playerName: string,
  frames: FrameData[],
  limit = 5
): H2HRecord[] {
  const records = calculateH2HRecords(playerName, frames);
  return Array.from(records.values())
    .filter((r) => r.lastMet !== null)
    .sort((a, b) => {
      const dateA = parseDate(a.lastMet!);
      const dateB = parseDate(b.lastMet!);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, limit);
}

// ============================================================================
// Helpers
// ============================================================================

function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format H2H record for display.
 */
export function formatH2HRecord(record: H2HRecord): string {
  return `${record.won}W-${record.lost}L (${record.winPct.toFixed(0)}%)`;
}
