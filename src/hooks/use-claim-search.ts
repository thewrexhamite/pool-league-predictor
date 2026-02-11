'use client';

/**
 * useClaimSearch Hook
 *
 * Orchestrates cross-league player search for the claim page:
 * - Fetches all leagues and their player data in parallel
 * - Requests browser geolocation (non-blocking)
 * - Generates suggested profiles from display name
 * - Provides debounced cross-league search
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LeagueMeta, Players2526Map } from '@/lib/types';
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

  // Fetch all leagues on mount
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

    async function loadAllPlayers(leagueList: LeagueMeta[]) {
      const results: AllLeagueData[] = [];

      // Fetch all leagues' current season data in parallel
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
              players: (data.players2526 || {}) as Players2526Map,
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
      const playerData = await loadAllPlayers(leagueList);
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
