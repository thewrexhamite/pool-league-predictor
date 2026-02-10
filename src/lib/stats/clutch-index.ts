/**
 * Clutch Performance Index Module
 *
 * Track player performance in close matches (decided by 1-2 frames).
 * Clutch vs choke tendencies.
 */

import type { DivisionCode, FrameData, ClutchProfile, Players2526Map } from '../types';
import { getDiv } from '../predictions/core';

/**
 * Determine if a match result is "close" (decided by 1-2 frames).
 * Close match: absolute frame difference <= 2
 */
function isCloseMatch(homeScore: number, awayScore: number): boolean {
  return Math.abs(homeScore - awayScore) <= 2;
}

/**
 * Calculate clutch index for a single player.
 *
 * clutchRating = (closeMatchWinPct - overallWinPct) * 0.6
 *              + (lateFrameWinPct - overallWinPct) * 0.4
 * Scale: -1 to +1
 */
export function calcClutchIndex(
  player: string,
  frames: FrameData[],
  results: { home: string; away: string; home_score: number; away_score: number }[]
): Omit<ClutchProfile, 'team' | 'played'> | null {
  // Build a map of match results: "home:away:date" -> { homeScore, awayScore }
  const matchResultMap = new Map<string, { homeScore: number; awayScore: number }>();
  for (const r of results) {
    matchResultMap.set(`${r.home}:${r.away}`, { homeScore: r.home_score, awayScore: r.away_score });
  }

  // Track overall performance and close-match performance
  let totalGames = 0;
  let totalWins = 0;
  let closeGames = 0;
  let closeWins = 0;
  let lateGames = 0; // frames 8-10 in close situations
  let lateWins = 0;

  for (const match of frames) {
    const matchKey = `${match.home}:${match.away}`;
    const matchResult = matchResultMap.get(matchKey);
    const isClose = matchResult ? isCloseMatch(matchResult.homeScore, matchResult.awayScore) : false;

    for (const f of match.frames) {
      const isPlayerHome = f.homePlayer === player;
      const isPlayerAway = f.awayPlayer === player;
      if (!isPlayerHome && !isPlayerAway) continue;

      const won = (isPlayerHome && f.winner === 'home') || (isPlayerAway && f.winner === 'away');

      totalGames++;
      if (won) totalWins++;

      // Close match frames
      if (isClose) {
        closeGames++;
        if (won) closeWins++;
      }

      // Late frames (8-10) in close matches
      if (f.frameNum >= 8 && isClose) {
        lateGames++;
        if (won) lateWins++;
      }
    }
  }

  if (totalGames < 5) return null;

  const overallPct = totalGames > 0 ? totalWins / totalGames : 0.5;
  const closePct = closeGames > 0 ? closeWins / closeGames : overallPct;
  const latePct = lateGames > 0 ? lateWins / lateGames : overallPct;

  // Calculate clutch rating (-1 to +1)
  const closeComponent = closeGames >= 3 ? (closePct - overallPct) * 0.6 : 0;
  const lateComponent = lateGames >= 2 ? (latePct - overallPct) * 0.4 : 0;
  const rawRating = closeComponent + lateComponent;
  const clutchRating = Math.max(-1, Math.min(1, rawRating * 3)); // Scale up for visibility

  // Label
  let label: 'clutch' | 'neutral' | 'choke';
  if (clutchRating > 0.15) label = 'clutch';
  else if (clutchRating < -0.15) label = 'choke';
  else label = 'neutral';

  return {
    player,
    clutchRating,
    closeMatchRecord: {
      p: closeGames,
      w: closeWins,
      pct: closeGames > 0 ? (closeWins / closeGames) * 100 : 0,
    },
    lateFrameRecord: {
      p: lateGames,
      w: lateWins,
      pct: lateGames > 0 ? (lateWins / lateGames) * 100 : 0,
    },
    overallPct: overallPct * 100,
    label,
  };
}

/**
 * Get clutch leaderboard for all players in a division.
 */
export function getClutchLeaderboard(
  div: DivisionCode,
  ds: { results: { home: string; away: string; home_score: number; away_score: number; division?: string }[]; divisions: Record<string, { teams: string[] }> },
  frames: FrameData[],
  players2526: Players2526Map,
  limit: number = 20
): ClutchProfile[] {
  // Filter results and frames to this division
  const teams = new Set(ds.divisions[div]?.teams || []);
  const divResults = ds.results.filter(r => teams.has(r.home) || teams.has(r.away));
  const divFrames = frames.filter(f => teams.has(f.home) || teams.has(f.away));

  // Collect all players in this division
  const playerTeamMap = new Map<string, string>();
  for (const [name, data] of Object.entries(players2526)) {
    for (const t of data.teams) {
      if (t.div === div && t.p >= 5) {
        playerTeamMap.set(name, t.team);
      }
    }
  }

  const profiles: ClutchProfile[] = [];

  for (const [player, team] of playerTeamMap) {
    const result = calcClutchIndex(player, divFrames, divResults);
    if (!result) continue;

    const playerData = players2526[player];
    const teamStats = playerData?.teams.find(t => t.team === team && t.div === div);
    const played = teamStats?.p ?? 0;

    profiles.push({
      ...result,
      team,
      played,
    });
  }

  // Sort by clutch rating descending
  profiles.sort((a, b) => b.clutchRating - a.clutchRating);
  return profiles.slice(0, limit);
}
