/**
 * Player Identity Resolution Service
 *
 * Fuzzy matching algorithm for player names across leagues with confidence scoring.
 * Used to link players who appear in multiple leagues despite name variations.
 */

import { PlayerLink } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * A player in a specific league context.
 */
export interface LeaguePlayer {
  leagueId: string;
  playerId: string; // player name in that league
  displayName?: string;
}

/**
 * A suggested player match with confidence score.
 */
export interface PlayerMatch {
  player1: LeaguePlayer;
  player2: LeaguePlayer;
  confidence: number; // 0-1, higher is more confident
  reason: string; // explanation of the match
}

/**
 * Options for player matching algorithm.
 */
export interface MatchOptions {
  minConfidence?: number; // minimum confidence to return (default: 0.7)
  caseSensitive?: boolean; // case-sensitive matching (default: false)
  ignoreWhitespace?: boolean; // ignore whitespace differences (default: true)
}

// ============================================================================
// String Similarity Algorithms
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings.
 * Lower distance = more similar strings.
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Create a 2D array for dynamic programming
  const dp: number[][] = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j;
  }

  // Fill the dp table
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[len1][len2];
}

/**
 * Calculate similarity ratio between two strings (0-1).
 * 1.0 = identical, 0.0 = completely different.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);

  return 1 - distance / maxLen;
}

/**
 * Normalize a player name for comparison.
 */
export function normalizePlayerName(
  name: string,
  options: MatchOptions = {}
): string {
  let normalized = name;

  if (!options.caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  if (options.ignoreWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }

  return normalized;
}

// ============================================================================
// Player Matching Functions
// ============================================================================

/**
 * Calculate confidence score for a potential player match.
 * Returns a score from 0-1 based on multiple factors.
 */
export function calculateMatchConfidence(
  player1: LeaguePlayer,
  player2: LeaguePlayer,
  options: MatchOptions = {}
): number {
  // Can't match players in the same league
  if (player1.leagueId === player2.leagueId) {
    return 0.0;
  }

  const name1 = normalizePlayerName(player1.playerId, options);
  const name2 = normalizePlayerName(player2.playerId, options);

  // Exact match after normalization
  if (name1 === name2) {
    return 1.0;
  }

  // Calculate base similarity
  const similarity = calculateSimilarity(name1, name2);

  // Additional factors can be added here:
  // - Common nicknames/abbreviations
  // - First initial + last name matching
  // - Statistical similarity (similar win rates, etc.)

  return similarity;
}

/**
 * Find potential matches for a player across other leagues.
 */
export function findPotentialMatches(
  targetPlayer: LeaguePlayer,
  candidatePlayers: LeaguePlayer[],
  options: MatchOptions = {}
): PlayerMatch[] {
  const minConfidence = options.minConfidence ?? 0.7;
  const matches: PlayerMatch[] = [];

  for (const candidate of candidatePlayers) {
    // Skip if same league
    if (candidate.leagueId === targetPlayer.leagueId) {
      continue;
    }

    const confidence = calculateMatchConfidence(
      targetPlayer,
      candidate,
      options
    );

    if (confidence >= minConfidence) {
      const reason = confidence === 1.0
        ? 'Exact name match'
        : `${Math.round(confidence * 100)}% name similarity`;

      matches.push({
        player1: targetPlayer,
        player2: candidate,
        confidence,
        reason,
      });
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
}

/**
 * Find all potential player matches across multiple leagues.
 * Returns suggested links grouped by canonical player.
 */
export function findAllPotentialMatches(
  players: LeaguePlayer[],
  options: MatchOptions = {}
): PlayerMatch[] {
  const matches: PlayerMatch[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const player1 = players[i];
      const player2 = players[j];

      // Skip if same league
      if (player1.leagueId === player2.leagueId) {
        continue;
      }

      // Create a unique key for this pair
      const key = [
        `${player1.leagueId}:${player1.playerId}`,
        `${player2.leagueId}:${player2.playerId}`,
      ]
        .sort()
        .join('|');

      if (processed.has(key)) {
        continue;
      }

      const confidence = calculateMatchConfidence(player1, player2, options);
      const minConfidence = options.minConfidence ?? 0.7;

      if (confidence >= minConfidence) {
        const reason = confidence === 1.0
          ? 'Exact name match'
          : `${Math.round(confidence * 100)}% name similarity`;

        matches.push({
          player1,
          player2,
          confidence,
          reason,
        });

        processed.add(key);
      }
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
}

// ============================================================================
// Player Link Management
// ============================================================================

/**
 * Create a PlayerLink from a group of matched players.
 */
export function createPlayerLink(
  canonicalId: string,
  players: { leagueId: string; playerId: string; confidence: number }[]
): PlayerLink {
  return {
    id: canonicalId,
    linkedPlayers: players,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Merge multiple PlayerLinks into a single link.
 * Used when discovering that two existing links should be combined.
 */
export function mergePlayerLinks(links: PlayerLink[]): PlayerLink {
  if (links.length === 0) {
    throw new Error('Cannot merge empty array of player links');
  }

  if (links.length === 1) {
    return links[0];
  }

  // Use the oldest link as the canonical ID
  const sortedByAge = [...links].sort((a, b) => a.createdAt - b.createdAt);
  const canonicalLink = sortedByAge[0];

  // Collect all linked players
  const allLinkedPlayers = new Map<
    string,
    { leagueId: string; playerId: string; confidence: number }
  >();

  for (const link of links) {
    for (const player of link.linkedPlayers) {
      const key = `${player.leagueId}:${player.playerId}`;
      const existing = allLinkedPlayers.get(key);

      // Keep the higher confidence score if duplicate
      if (!existing || player.confidence > existing.confidence) {
        allLinkedPlayers.set(key, player);
      }
    }
  }

  return {
    id: canonicalLink.id,
    linkedPlayers: Array.from(allLinkedPlayers.values()),
    createdAt: canonicalLink.createdAt,
    updatedAt: Date.now(),
  };
}

/**
 * Add a player to an existing PlayerLink.
 */
export function addPlayerToLink(
  link: PlayerLink,
  player: { leagueId: string; playerId: string; confidence: number }
): PlayerLink {
  // Check if player already exists in the link
  const existingIndex = link.linkedPlayers.findIndex(
    (p) => p.leagueId === player.leagueId && p.playerId === player.playerId
  );

  const linkedPlayers = [...link.linkedPlayers];

  if (existingIndex >= 0) {
    // Update existing player with higher confidence
    if (player.confidence > linkedPlayers[existingIndex].confidence) {
      linkedPlayers[existingIndex] = player;
    }
  } else {
    // Add new player
    linkedPlayers.push(player);
  }

  return {
    ...link,
    linkedPlayers,
    updatedAt: Date.now(),
  };
}

/**
 * Remove a player from a PlayerLink.
 */
export function removePlayerFromLink(
  link: PlayerLink,
  leagueId: string,
  playerId: string
): PlayerLink {
  const linkedPlayers = link.linkedPlayers.filter(
    (p) => !(p.leagueId === leagueId && p.playerId === playerId)
  );

  return {
    ...link,
    linkedPlayers,
    updatedAt: Date.now(),
  };
}

/**
 * Resolve a player's canonical ID from existing links.
 * Returns the canonical ID if found, null otherwise.
 */
export function resolveCanonicalId(
  leagueId: string,
  playerId: string,
  links: PlayerLink[]
): string | null {
  for (const link of links) {
    const found = link.linkedPlayers.find(
      (p) => p.leagueId === leagueId && p.playerId === playerId
    );

    if (found) {
      return link.id;
    }
  }

  return null;
}

/**
 * Get all player identities linked to a canonical ID.
 */
export function getLinkedPlayers(
  canonicalId: string,
  links: PlayerLink[]
): { leagueId: string; playerId: string; confidence: number }[] {
  const link = links.find((l) => l.id === canonicalId);
  return link ? link.linkedPlayers : [];
}

/**
 * Generate a canonical player ID from a player name.
 * Normalizes the name and creates a consistent identifier.
 */
export function generateCanonicalId(playerName: string): string {
  // Normalize to lowercase, remove extra whitespace
  const normalized = normalizePlayerName(playerName, {
    caseSensitive: false,
    ignoreWhitespace: true,
  });

  // Create a URL-safe ID
  const id = normalized
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .replace(/\s+/g, '-') // replace spaces with hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, ''); // trim hyphens

  // Add a timestamp suffix to ensure uniqueness
  const timestamp = Date.now().toString(36);

  return `${id}-${timestamp}`;
}
