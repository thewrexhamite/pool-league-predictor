/**
 * Bridge Player Detection
 *
 * Detects players who appear in multiple divisions (same league) or multiple
 * leagues. Bridge players provide paired data points for calibrating relative
 * division and league strength.
 */

import type {
  BridgePlayer,
  LeagueMeta,
  PlayerTeamStats2526,
  Players2526Map,
} from '../types';
import type { LeagueData } from '../data-provider';
import {
  normalizePlayerName,
  calculateSimilarity,
} from '../player-identity';

// ============================================================================
// Intra-League Bridge Players (same league, different divisions)
// ============================================================================

/**
 * Find players who appear in 2+ divisions within a single league.
 * These players have stats in multiple divisions from playing on
 * different teams or being transferred mid-season.
 */
export function findIntraLeagueBridgePlayers(
  leagueId: string,
  leagueData: LeagueData
): BridgePlayer[] {
  const bridgePlayers: BridgePlayer[] = [];
  const players2526 = leagueData.players2526;

  for (const [name, data] of Object.entries(players2526)) {
    // Filter to non-cup team stats only
    const leagueStats = data.teams.filter(t => !t.cup);
    if (leagueStats.length < 2) continue;

    // Check that they appear in at least 2 different divisions
    const divisions = new Set(leagueStats.map(t => t.div));
    if (divisions.size < 2) continue;

    const contexts = leagueStats.map(t => ({
      leagueId,
      divisionCode: t.div,
      stats: t,
    }));

    bridgePlayers.push({
      name,
      canonicalName: normalizePlayerName(name),
      contexts,
      matchConfidence: 1.0, // Exact match within same league
    });
  }

  return bridgePlayers;
}

// ============================================================================
// Cross-League Bridge Players
// ============================================================================

/**
 * Find players who appear across multiple leagues.
 * Uses exact name matching first, then fuzzy matching via player-identity.
 */
export function findCrossLeagueBridgePlayers(
  multiLeagueData: Record<string, { meta: LeagueMeta; data: LeagueData }>,
  minConfidence = 0.85
): BridgePlayer[] {
  const leagueIds = Object.keys(multiLeagueData);
  if (leagueIds.length < 2) return [];

  // Build a flat list of all players with their league context
  const allPlayers: {
    name: string;
    normalized: string;
    leagueId: string;
    stats: PlayerTeamStats2526[];
  }[] = [];

  for (const [leagueId, { data }] of Object.entries(multiLeagueData)) {
    for (const [name, playerData] of Object.entries(data.players2526)) {
      const leagueStats = playerData.teams.filter(t => !t.cup);
      if (leagueStats.length === 0) continue;

      allPlayers.push({
        name,
        normalized: normalizePlayerName(name),
        leagueId,
        stats: leagueStats,
      });
    }
  }

  // Group by normalized name for exact matches
  const nameGroups = new Map<string, typeof allPlayers>();
  for (const player of allPlayers) {
    const existing = nameGroups.get(player.normalized) || [];
    existing.push(player);
    nameGroups.set(player.normalized, existing);
  }

  const bridgePlayers: BridgePlayer[] = [];
  const matched = new Set<string>(); // "leagueId:name" to avoid duplicate matches

  // Phase 1: Exact name matches (after normalization)
  for (const [, group] of nameGroups) {
    // Need players from at least 2 different leagues
    const leagueSet = new Set(group.map(p => p.leagueId));
    if (leagueSet.size < 2) continue;

    const contexts: BridgePlayer['contexts'] = [];
    for (const player of group) {
      for (const stat of player.stats) {
        contexts.push({
          leagueId: player.leagueId,
          divisionCode: stat.div,
          stats: stat,
        });
      }
      matched.add(`${player.leagueId}:${player.name}`);
    }

    bridgePlayers.push({
      name: group[0].name,
      canonicalName: group[0].normalized,
      contexts,
      matchConfidence: 1.0,
    });
  }

  // Phase 2: Fuzzy matching for remaining unmatched players
  const unmatched = allPlayers.filter(p => !matched.has(`${p.leagueId}:${p.name}`));

  // Group unmatched by league for cross-league comparison
  const byLeague = new Map<string, typeof allPlayers>();
  for (const player of unmatched) {
    const list = byLeague.get(player.leagueId) || [];
    list.push(player);
    byLeague.set(player.leagueId, list);
  }

  const leagueList = [...byLeague.entries()];
  for (let i = 0; i < leagueList.length; i++) {
    for (let j = i + 1; j < leagueList.length; j++) {
      const [, playersA] = leagueList[i];
      const [, playersB] = leagueList[j];

      for (const pa of playersA) {
        if (matched.has(`${pa.leagueId}:${pa.name}`)) continue;

        for (const pb of playersB) {
          if (matched.has(`${pb.leagueId}:${pb.name}`)) continue;

          const similarity = calculateSimilarity(pa.normalized, pb.normalized);
          if (similarity < minConfidence) continue;

          const contexts: BridgePlayer['contexts'] = [];
          for (const stat of pa.stats) {
            contexts.push({
              leagueId: pa.leagueId,
              divisionCode: stat.div,
              stats: stat,
            });
          }
          for (const stat of pb.stats) {
            contexts.push({
              leagueId: pb.leagueId,
              divisionCode: stat.div,
              stats: stat,
            });
          }

          bridgePlayers.push({
            name: pa.name,
            canonicalName: pa.normalized,
            contexts,
            matchConfidence: similarity,
          });

          matched.add(`${pa.leagueId}:${pa.name}`);
          matched.add(`${pb.leagueId}:${pb.name}`);
        }
      }
    }
  }

  return bridgePlayers;
}

/**
 * Find all bridge players: intra-league + cross-league combined.
 */
export function findAllBridgePlayers(
  multiLeagueData: Record<string, { meta: LeagueMeta; data: LeagueData }>
): BridgePlayer[] {
  const intraLeague: BridgePlayer[] = [];

  for (const [leagueId, { data }] of Object.entries(multiLeagueData)) {
    intraLeague.push(...findIntraLeagueBridgePlayers(leagueId, data));
  }

  const crossLeague = findCrossLeagueBridgePlayers(multiLeagueData);

  return [...intraLeague, ...crossLeague];
}
