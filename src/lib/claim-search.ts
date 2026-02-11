/**
 * Claim Search Utilities
 *
 * Cross-league player search with geolocation-based ranking and fuzzy name matching.
 * Used by the claim page to suggest and search player profiles across all leagues.
 */

import { calculateSimilarity, normalizePlayerName } from './player-identity';
import type { LeagueMeta, Players2526Map, PlayerData2526 } from './types';
import type { UserProfile } from './auth';

// ============================================================================
// Types
// ============================================================================

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface LeagueWithDistance {
  league: LeagueMeta;
  distance: number | null; // miles, null if no geo
}

export interface CrossLeaguePlayer {
  name: string;
  data: PlayerData2526;
  leagueId: string;
  leagueName: string;
  leagueShortName: string;
  leagueColor: string;
  seasonId: string;
  distance: number | null;
  matchScore: number;
  combinedScore: number;
  isClaimed: boolean;
  isFuzzy: boolean; // true if match is fuzzy (not exact substring)
}

export interface AllLeagueData {
  leagueId: string;
  seasonId: string;
  league: LeagueMeta;
  players: Players2526Map;
}

// ============================================================================
// Geolocation
// ============================================================================

/**
 * Get the user's current location via browser Geolocation API.
 * Returns { lat, lng } or rejects on error/timeout.
 */
export function getUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // cache for 5 minutes
      }
    );
  });
}

// ============================================================================
// Distance Calculations
// ============================================================================

/**
 * Calculate the distance in miles between two coordinates using the Haversine formula.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get a distance weight factor based on miles from user.
 * Closer leagues get higher weight in search ranking.
 */
function getDistanceWeight(distance: number | null): number {
  if (distance === null) return 0.8;
  if (distance <= 5) return 1.0;
  if (distance <= 15) return 0.95;
  if (distance <= 30) return 0.85;
  if (distance <= 60) return 0.7;
  return 0.5;
}

/**
 * Rank leagues by distance from user location.
 * Returns all leagues with distance info, sorted by proximity.
 */
export function rankLeaguesByDistance(
  leagues: LeagueMeta[],
  userLocation: UserLocation | null
): LeagueWithDistance[] {
  return leagues
    .map((league) => {
      let distance: number | null = null;
      if (userLocation && league.lat != null && league.lng != null) {
        distance = haversineDistance(
          userLocation.lat,
          userLocation.lng,
          league.lat,
          league.lng
        );
      }
      return { league, distance };
    })
    .sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
}

// ============================================================================
// Fuzzy Name Matching
// ============================================================================

/**
 * Compute a composite match score between a search query and a candidate player name.
 * Uses calculateSimilarity from player-identity plus bonuses for common patterns.
 * Returns a score from 0 to ~1.4 (can exceed 1 with bonuses). Minimum threshold 0.35.
 */
export function fuzzyNameMatch(query: string, candidateName: string): number {
  const normQuery = normalizePlayerName(query);
  const normCandidate = normalizePlayerName(candidateName);

  if (!normQuery || !normCandidate) return 0;

  // Base similarity score
  let score = calculateSimilarity(normQuery, normCandidate);

  // Exact substring match bonus
  if (normCandidate.includes(normQuery) || normQuery.includes(normCandidate)) {
    score += 0.2;
  }

  // Split into parts for first/last name matching
  const queryParts = normQuery.split(' ').filter(Boolean);
  const candidateParts = normCandidate.split(' ').filter(Boolean);

  if (queryParts.length > 0 && candidateParts.length > 0) {
    // First name match
    if (queryParts[0] === candidateParts[0]) {
      score += 0.15;
    }

    // Last name match
    const queryLast = queryParts[queryParts.length - 1];
    const candidateLast = candidateParts[candidateParts.length - 1];
    if (queryLast === candidateLast) {
      score += 0.15;
    }

    // Prefix match (candidate name starts with query)
    if (normCandidate.startsWith(normQuery)) {
      score += 0.1;
    }
  }

  return score;
}

// ============================================================================
// Cross-League Search
// ============================================================================

/**
 * Search for players across all leagues using fuzzy name matching.
 * Returns results ranked by combined name match and distance score.
 */
export function searchAllLeagues(
  query: string,
  allLeagueData: AllLeagueData[],
  distances: Map<string, number | null>,
  profile: UserProfile | null,
  threshold = 0.35,
  limit = 15
): CrossLeaguePlayer[] {
  const normQuery = normalizePlayerName(query);
  if (normQuery.length < 2) return [];

  const results: CrossLeaguePlayer[] = [];

  for (const { leagueId, seasonId, league, players } of allLeagueData) {
    const distance = distances.get(leagueId) ?? null;
    const distanceWeight = getDistanceWeight(distance);

    for (const [name, data] of Object.entries(players)) {
      const matchScore = fuzzyNameMatch(query, name);

      if (matchScore < threshold) continue;

      const combinedScore = matchScore * distanceWeight;
      const normName = normalizePlayerName(name);
      const isFuzzy = !normName.includes(normQuery) && !normQuery.includes(normName);

      const isClaimed = profile
        ? profile.claimedProfiles.some(
            (p) => p.league === leagueId && p.season === seasonId && p.name === name
          )
        : false;

      results.push({
        name,
        data,
        leagueId,
        leagueName: league.name,
        leagueShortName: league.shortName,
        leagueColor: league.primaryColor,
        seasonId,
        distance,
        matchScore,
        combinedScore,
        isClaimed,
        isFuzzy,
      });
    }
  }

  // Sort by combined score descending
  results.sort((a, b) => b.combinedScore - a.combinedScore);

  return results.slice(0, limit);
}

/**
 * Generate suggested profiles based on the user's Google display name.
 * Lower threshold and fewer results than manual search.
 */
export function getSuggestedProfiles(
  displayName: string,
  allLeagueData: AllLeagueData[],
  distances: Map<string, number | null>,
  profile: UserProfile | null
): CrossLeaguePlayer[] {
  if (!displayName || displayName.trim().length < 2) return [];

  return searchAllLeagues(
    displayName,
    allLeagueData,
    distances,
    profile,
    0.3,
    5
  );
}
