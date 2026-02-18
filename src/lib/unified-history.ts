import type { GameHistoryRecord } from '@/lib/chalk/types';
import type { FrameData, LeagueMeta } from '@/lib/types';

// ===== Unified match history types =====

export interface ChalkHistoryItem {
  type: 'chalk';
  date: number; // endedAt timestamp
  game: GameHistoryRecord;
}

export interface LeagueMatchItem {
  type: 'league';
  date: number; // parsed from FrameData.date
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  playerName: string;
  framesWon: number;
  framesPlayed: number;
  teamWon: boolean; // whether the player's team won the match overall
  leagueName: string;
  leagueColor: string;
  matchDate: string; // raw date string for display
}

export type UnifiedHistoryItem = ChalkHistoryItem | LeagueMatchItem;

// ===== Helpers =====

/**
 * Group FrameData entries into per-match summaries for a specific player.
 */
export function getPlayerLeagueMatches(
  playerName: string,
  frames: FrameData[],
  league: LeagueMeta,
): LeagueMatchItem[] {
  const items: LeagueMatchItem[] = [];
  const nameLower = playerName.toLowerCase();

  for (const match of frames) {
    // Find frames this player participated in
    const playerFrames = match.frames.filter(
      (f) =>
        f.homePlayer.toLowerCase() === nameLower ||
        f.awayPlayer.toLowerCase() === nameLower,
    );

    if (playerFrames.length === 0) continue;

    // Determine which side the player is on
    const isHome = playerFrames[0].homePlayer.toLowerCase() === nameLower;

    // Count frames won by this player
    const framesWon = playerFrames.filter((f) => {
      if (isHome) return f.winner === 'home';
      return f.winner === 'away';
    }).length;

    // Count total match frames won by each side to determine match winner
    const totalHomeWins = match.frames.filter((f) => f.winner === 'home').length;
    const totalAwayWins = match.frames.filter((f) => f.winner === 'away').length;
    const teamWon = isHome ? totalHomeWins > totalAwayWins : totalAwayWins > totalHomeWins;

    // Parse date string (format: "DD/MM/YYYY" or "YYYY-MM-DD")
    let dateTs: number;
    if (match.date.includes('/')) {
      const [d, m, y] = match.date.split('/');
      dateTs = new Date(`${y}-${m}-${d}`).getTime();
    } else {
      dateTs = new Date(match.date).getTime();
    }

    items.push({
      type: 'league',
      date: dateTs,
      matchId: match.matchId,
      homeTeam: match.home,
      awayTeam: match.away,
      playerName,
      framesWon,
      framesPlayed: playerFrames.length,
      teamWon,
      leagueName: league.shortName,
      leagueColor: league.primaryColor,
      matchDate: match.date,
    });
  }

  return items;
}
