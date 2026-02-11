/**
 * Season Arc — narrative from match data.
 *
 * Uses existing CareerStats and ImprovementMetrics to build a
 * season narrative with rolling form, phase detection, and key moments.
 */

import type { SeasonPhase, SeasonSnapshot, KeyMoment } from './types';
import type { FrameData } from '../types';

/**
 * Get the current season phase based on how far through the season we are.
 */
export function getSeasonPhase(seasonPct: number): SeasonPhase {
  if (seasonPct >= 0.95) return 'complete';
  if (seasonPct >= 0.65) return 'late';
  if (seasonPct >= 0.30) return 'mid';
  return 'early';
}

/**
 * Get player's game history sorted chronologically.
 */
function getPlayerGames(playerName: string, frames: FrameData[]): { date: string; won: boolean }[] {
  const games: { date: string; won: boolean }[] = [];
  const normalised = playerName.toLowerCase();

  for (const match of frames) {
    for (const frame of match.frames) {
      const isHome = frame.homePlayer.toLowerCase() === normalised;
      const isAway = frame.awayPlayer.toLowerCase() === normalised;
      if (!isHome && !isAway) continue;

      const won = (frame.winner === 'home' && isHome) || (frame.winner === 'away' && isAway);
      // Only count as one game per match (take first frame as representative? No — aggregate per match)
      const existing = games.find(g => g.date === match.date);
      if (!existing) {
        games.push({ date: match.date, won });
      }
    }
  }

  // Actually, we want frame-level wins, not match-level. Let's redo properly:
  // Group by match and calculate if player won majority of their frames
  const matchResults = new Map<string, { won: number; lost: number; date: string }>();

  for (const match of frames) {
    for (const frame of match.frames) {
      const isHome = frame.homePlayer.toLowerCase() === normalised;
      const isAway = frame.awayPlayer.toLowerCase() === normalised;
      if (!isHome && !isAway) continue;

      const key = match.matchId || `${match.date}-${match.home}-${match.away}`;
      if (!matchResults.has(key)) {
        matchResults.set(key, { won: 0, lost: 0, date: match.date });
      }
      const entry = matchResults.get(key)!;
      const frameWon = (frame.winner === 'home' && isHome) || (frame.winner === 'away' && isAway);
      if (frameWon) entry.won++;
      else entry.lost++;
    }
  }

  const sorted = [...matchResults.values()].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map(m => ({
    date: m.date,
    won: m.won > m.lost,
  }));
}

/**
 * Compute rolling 5-match win percentage.
 * Returns an array of percentages (0-1), one per match from index 4 onwards.
 */
export function getSeasonTrajectory(playerName: string, frames: FrameData[]): number[] {
  const games = getPlayerGames(playerName, frames);
  if (games.length < 5) return games.map((_, i, arr) => {
    const slice = arr.slice(0, i + 1);
    return slice.filter(g => g.won).length / slice.length;
  });

  const rolling: number[] = [];
  for (let i = 0; i < games.length; i++) {
    const start = Math.max(0, i - 4);
    const window = games.slice(start, i + 1);
    rolling.push(window.filter(g => g.won).length / window.length);
  }
  return rolling;
}

/**
 * Identify key moments in the season — notable form changes, streaks, milestones.
 */
export function getKeyMoments(playerName: string, frames: FrameData[]): KeyMoment[] {
  const games = getPlayerGames(playerName, frames);
  const moments: KeyMoment[] = [];

  if (games.length === 0) return moments;

  // Detect win streaks of 4+
  let streak = 0;
  let streakStart = '';
  for (const game of games) {
    if (game.won) {
      if (streak === 0) streakStart = game.date;
      streak++;
    } else {
      if (streak >= 4) {
        moments.push({
          date: streakStart,
          description: `${streak}-match winning streak`,
          type: 'streak',
        });
      }
      streak = 0;
    }
  }
  if (streak >= 4) {
    moments.push({
      date: streakStart,
      description: `${streak}-match winning streak (ongoing)`,
      type: 'streak',
    });
  }

  // Detect form changes: compare rolling 3 to previous rolling 3
  if (games.length >= 6) {
    for (let i = 5; i < games.length; i++) {
      const recent3 = games.slice(i - 2, i + 1).filter(g => g.won).length / 3;
      const previous3 = games.slice(i - 5, i - 2).filter(g => g.won).length / 3;
      const diff = recent3 - previous3;

      if (diff >= 0.6) {
        moments.push({
          date: games[i].date,
          description: 'Form surge — winning streak began',
          type: 'form_change',
        });
      } else if (diff <= -0.6) {
        moments.push({
          date: games[i].date,
          description: 'Form dip — results dropped off',
          type: 'form_change',
        });
      }
    }
  }

  // Milestones
  const milestones = [10, 25, 50, 100];
  for (const m of milestones) {
    if (games.length >= m) {
      moments.push({
        date: games[m - 1].date,
        description: `${m} matches played this season`,
        type: 'milestone',
      });
    }
  }

  return moments.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Generate a narrative summary of the season so far.
 */
export function getSeasonSummary(
  playerName: string,
  frames: FrameData[],
  seasonPct: number,
): string {
  const games = getPlayerGames(playerName, frames);
  if (games.length === 0) return 'No matches played yet this season.';

  const phase = getSeasonPhase(seasonPct);
  const totalWins = games.filter(g => g.won).length;
  const winRate = totalWins / games.length;

  // Compare first half vs second half if enough games
  const half = Math.floor(games.length / 2);
  const firstHalfRate = half > 0 ? games.slice(0, half).filter(g => g.won).length / half : winRate;
  const secondHalfRate = half > 0 ? games.slice(half).filter(g => g.won).length / (games.length - half) : winRate;

  // Recent form (last 5)
  const recentGames = games.slice(-5);
  const recentRate = recentGames.filter(g => g.won).length / recentGames.length;

  let narrative = '';

  // Phase context
  switch (phase) {
    case 'early':
      narrative = `Early season: ${games.length} matches played. `;
      break;
    case 'mid':
      narrative = `Mid-season: ${games.length} matches in. `;
      break;
    case 'late':
      narrative = `Late season: ${games.length} matches played. `;
      break;
    case 'complete':
      narrative = `Season complete: ${games.length} matches played. `;
      break;
  }

  // Win rate context
  narrative += `Overall ${Math.round(winRate * 100)}% win rate. `;

  // Trajectory
  if (games.length >= 6) {
    const diff = secondHalfRate - firstHalfRate;
    if (diff > 0.1) {
      narrative += 'Form improving as the season progresses. ';
    } else if (diff < -0.1) {
      narrative += 'Form has dipped compared to earlier in the season. ';
    } else {
      narrative += 'Consistent form throughout the season. ';
    }
  }

  // Recent form
  if (recentRate >= 0.8) {
    narrative += 'Currently in excellent form.';
  } else if (recentRate >= 0.6) {
    narrative += 'Solid recent run.';
  } else if (recentRate <= 0.2) {
    narrative += 'Tough recent patch.';
  } else {
    narrative += 'Mixed recent results.';
  }

  return narrative;
}

/**
 * Build a complete season snapshot.
 */
export function buildSeasonSnapshot(
  playerName: string,
  frames: FrameData[],
  seasonPct: number,
): SeasonSnapshot {
  return {
    phase: getSeasonPhase(seasonPct),
    narrative: getSeasonSummary(playerName, frames, seasonPct),
    rollingWinPct: getSeasonTrajectory(playerName, frames),
    keyMoments: getKeyMoments(playerName, frames),
  };
}
