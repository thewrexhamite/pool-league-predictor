'use client';

/**
 * useClaimSearch Hook
 *
 * Orchestrates cross-league player search for the claim page:
 * - Fetches player index docs (lightweight, denormalized) instead of full season docs
 * - Requests browser geolocation (non-blocking)
 * - Generates suggested profiles from display name
 * - Provides debounced cross-league search
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LeagueMeta, PlayerIndexDoc } from '@/lib/types';
import type { UserProfile } from '@/lib/auth';
import {
  getUserLocation,
  rankLeaguesByDistance,
  searchAllLeagues,
  getSuggestedProfiles,
  type UserLocation,
  type LeagueWithDistance,
  type CrossLeaguePlayer,
  type AllLeagueData,
} from '@/lib/claim-search';

export type GeoStatus = 'pending' | 'granted' | 'denied' | 'unavailable';

interface UseClaimSearchResult {
  geoStatus: GeoStatus;
  leagueDistances: LeagueWithDistance[];
  suggestions: CrossLeaguePlayer[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: CrossLeaguePlayer[];
  selectedPlayer: CrossLeaguePlayer | null;
  selectPlayer: (player: CrossLeaguePlayer) => void;
  clearSelection: () => void;
  loading: boolean;
  allProfiles: UserProfile['claimedProfiles'];
}

const DEBOUNCE_MS = 200;

export function useClaimSearch(profile: UserProfile | null): UseClaimSearchResult {
  // Core state
  const [leagues, setLeagues] = useState<LeagueMeta[]>([]);
  const [allLeagueData, setAllLeagueData] = useState<AllLeagueData[]>([]);
  const [loading, setLoading] = useState(true);

  // Geo state
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('pending');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<CrossLeaguePlayer | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Distance map (leagueId -> distance in miles)
  const distances = useMemo(() => {
    const map = new Map<string, number | null>();
    const ranked = rankLeaguesByDistance(leagues, userLocation);
    for (const { league, distance } of ranked) {
      map.set(league.id, distance);
    }
    return map;
  }, [leagues, userLocation]);

  // League distances for display
  const leagueDistances = useMemo(
    () => rankLeaguesByDistance(leagues, userLocation),
    [leagues, userLocation]
  );

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Fetch leagues and player index on mount
  useEffect(() => {
    async function loadLeagues() {
      try {
        const leaguesRef = collection(db, 'leagues');
        const snapshot = await getDocs(leaguesRef);
        const leagueData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LeagueMeta[];
        setLeagues(leagueData);
        return leagueData;
      } catch (err) {
        console.error('Failed to load leagues:', err);
        return [];
      }
    }

    async function loadPlayerIndex(leagueList: LeagueMeta[]) {
      const results: AllLeagueData[] = [];

      try {
        // Fetch player index docs (lightweight, one per league/season)
        const indexRef = collection(db, 'players_index');
        const indexSnap = await getDocs(indexRef);

        // Build a lookup of league metadata
        const leagueMap = new Map<string, LeagueMeta>();
        for (const league of leagueList) {
          leagueMap.set(league.id, league);
        }

        for (const doc of indexSnap.docs) {
          const data = doc.data() as PlayerIndexDoc;
          const league = leagueMap.get(data.leagueId);
          if (!league) continue;

          // Convert PlayerIndexEntry to Players2526Map shape for compatibility
          const players: Record<string, { teams: { team: string; div: string; p: number; w: number; pct: number; lag: number; bdF: number; bdA: number; forf: number; cup: boolean }[]; total: { p: number; w: number; pct: number } }> = {};
          for (const [name, entry] of Object.entries(data.players)) {
            players[name] = {
              teams: entry.teams.map(team => ({
                team,
                div: '',
                p: entry.p,
                w: entry.w,
                pct: entry.pct,
                lag: 0,
                bdF: 0,
                bdA: 0,
                forf: 0,
                cup: false,
              })),
              total: { p: entry.p, w: entry.w, pct: entry.pct },
            };
          }

          results.push({
            leagueId: data.leagueId,
            seasonId: data.seasonId,
            league,
            players,
          });
        }
      } catch (err) {
        console.error('Failed to load player index, falling back to season docs:', err);
        // Fallback: load from season docs (legacy behavior)
        return loadAllPlayersLegacy(leagueList);
      }

      return results;
    }

    async function loadAllPlayersLegacy(leagueList: LeagueMeta[]) {
      const { doc, getDoc } = await import('firebase/firestore');
      const results: AllLeagueData[] = [];

      const promises = leagueList.map(async (league) => {
        const currentSeason = league.seasons.find((s) => s.current);
        if (!currentSeason) return null;

        try {
          const seasonRef = doc(db, 'leagues', league.id, 'seasons', currentSeason.id);
          const seasonSnap = await getDoc(seasonRef);

          if (seasonSnap.exists()) {
            const data = seasonSnap.data();
            return {
              leagueId: league.id,
              seasonId: currentSeason.id,
              league,
              players: (data.playerStats || data.players2526 || {}) as AllLeagueData['players'],
            };
          }
        } catch (err) {
          console.error(`Failed to load players for ${league.id}:`, err);
        }
        return null;
      });

      const settled = await Promise.all(promises);
      for (const result of settled) {
        if (result) results.push(result);
      }

      return results;
    }

    async function init() {
      setLoading(true);
      const leagueList = await loadLeagues();
      const playerData = await loadPlayerIndex(leagueList);
      setAllLeagueData(playerData);
      setLoading(false);
    }

    init();
  }, []);

  // Request geolocation in parallel (non-blocking)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('unavailable');
      return;
    }

    getUserLocation()
      .then((location) => {
        setUserLocation(location);
        setGeoStatus('granted');
      })
      .catch(() => {
        setGeoStatus('denied');
      });
  }, []);

  // Compute suggestions from display name
  const suggestions = useMemo(() => {
    if (loading || !profile?.displayName || allLeagueData.length === 0) return [];
    return getSuggestedProfiles(profile.displayName, allLeagueData, distances, profile);
  }, [loading, profile, allLeagueData, distances]);

  // Compute search results
  const searchResults = useMemo(() => {
    if (loading || debouncedQuery.length < 2) return [];
    return searchAllLeagues(debouncedQuery, allLeagueData, distances, profile);
  }, [loading, debouncedQuery, allLeagueData, distances, profile]);

  // All claimed profiles (across all leagues)
  const allProfiles = profile?.claimedProfiles || [];

  const selectPlayer = useCallback((player: CrossLeaguePlayer) => {
    setSelectedPlayer(player);
    setSearchQuery('');
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPlayer(null);
  }, []);

  return {
    geoStatus,
    leagueDistances,
    suggestions,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedPlayer,
    selectPlayer,
    clearSelection,
    loading,
    allProfiles,
  };
}
