'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calcStandings, parseDate } from '@/lib/predictions/core';
import type { LinkedTeam } from '@/lib/chalk/types';
import type { SeasonData, StandingEntry, MatchResult, Fixture, DivisionCode } from '@/lib/types';

export interface LinkedTeamData {
  teamName: string;
  divisionCode: string;
  divisionName: string;
  standings: StandingEntry[];
  teamPosition: number;
  nextFixture: Fixture | null;
  lastResult: MatchResult | null;
  leagueName: string;
}

interface UseLeagueStandingsResult {
  teams: LinkedTeamData[];
  loading: boolean;
}

const CACHE_KEY = 'chalk_league_standings';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  teams: LinkedTeamData[];
  timestamp: number;
}

function loadCache(): LinkedTeamData[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) return null;
    return cached.teams;
  } catch {
    return null;
  }
}

function saveCache(teams: LinkedTeamData[]) {
  try {
    const data: CachedData = { teams, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable
  }
}

function getTodayComparable(): string {
  const d = new Date();
  const yyyy = d.getFullYear().toString();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function useLeagueStandings(linkedTeams: LinkedTeam[] | undefined): UseLeagueStandingsResult {
  const [teams, setTeams] = useState<LinkedTeamData[]>(() => {
    if (!linkedTeams?.length) return [];
    return loadCache() ?? [];
  });
  const [loading, setLoading] = useState(() => !!linkedTeams?.length);
  const fetchRef = useRef(0);
  const linkedTeamsRef = useRef(linkedTeams);
  linkedTeamsRef.current = linkedTeams;

  const fetchData = useCallback(async () => {
    const currentTeams = linkedTeamsRef.current;
    if (!currentTeams?.length) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const fetchId = ++fetchRef.current;
    setLoading(true);

    try {
      // Group by leagueId:seasonId to deduplicate Firestore reads
      const grouped = new Map<string, { leagueId: string; seasonId: string; teams: LinkedTeam[] }>();
      for (const lt of currentTeams) {
        const key = `${lt.leagueId}:${lt.seasonId}`;
        if (!grouped.has(key)) {
          grouped.set(key, { leagueId: lt.leagueId, seasonId: lt.seasonId, teams: [] });
        }
        grouped.get(key)!.teams.push(lt);
      }

      const results: LinkedTeamData[] = [];
      const today = getTodayComparable();

      for (const [, group] of grouped) {
        // Fetch season data
        const seasonRef = doc(db, 'leagues', group.leagueId, 'seasons', group.seasonId);
        const seasonSnap = await getDoc(seasonRef);
        if (!seasonSnap.exists()) continue;
        const seasonData = seasonSnap.data() as SeasonData;

        // Also fetch league metadata for the name
        const leagueRef = doc(db, 'leagues', group.leagueId);
        const leagueSnap = await getDoc(leagueRef);
        const leagueName = leagueSnap.exists() ? (leagueSnap.data().name as string) ?? group.leagueId : group.leagueId;

        if (fetchId !== fetchRef.current) return;

        for (const lt of group.teams) {
          const divData = seasonData.divisions[lt.divisionCode];
          if (!divData) continue;

          // Build minimal DataSources for calcStandings
          const ds = {
            divisions: seasonData.divisions,
            results: seasonData.results,
            fixtures: seasonData.fixtures,
            players: seasonData.players ?? {},
            rosters: seasonData.rosters ?? {},
            players2526: seasonData.playerStats ?? seasonData.players2526 ?? {},
          };

          const standings = calcStandings(lt.divisionCode as DivisionCode, ds);
          const teamPosition = standings.findIndex(s => s.team === lt.teamName) + 1;

          // Find next fixture
          const nextFixture = seasonData.fixtures
            .filter(f => f.division === lt.divisionCode && (f.home === lt.teamName || f.away === lt.teamName))
            .filter(f => parseDate(f.date) >= today)
            .sort((a, b) => parseDate(a.date).localeCompare(parseDate(b.date)))[0] ?? null;

          // Find last result
          const lastResult = seasonData.results
            .filter(r => r.division === lt.divisionCode && (r.home === lt.teamName || r.away === lt.teamName))
            .sort((a, b) => parseDate(b.date).localeCompare(parseDate(a.date)))[0] ?? null;

          results.push({
            teamName: lt.teamName,
            divisionCode: lt.divisionCode,
            divisionName: divData.name,
            standings,
            teamPosition,
            nextFixture,
            lastResult,
            leagueName,
          });
        }
      }

      if (fetchId !== fetchRef.current) return;

      setTeams(results);
      saveCache(results);
    } catch (err) {
      console.error('Failed to fetch league standings:', err);
    } finally {
      if (fetchId === fetchRef.current) {
        setLoading(false);
      }
    }
  }, []); // No deps — reads from ref

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh every 5 minutes
  useEffect(() => {
    if (!linkedTeams?.length) return;
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData, linkedTeams?.length]);

  // Re-fetch when linkedTeams config changes
  const linkedTeamsKey = JSON.stringify(linkedTeams ?? []);
  const prevKeyRef = useRef(linkedTeamsKey);
  useEffect(() => {
    if (linkedTeamsKey !== prevKeyRef.current) {
      prevKeyRef.current = linkedTeamsKey;
      fetchData();
    }
  }, [linkedTeamsKey, fetchData]);

  if (!linkedTeams?.length) {
    return { teams: [], loading: false };
  }

  return { teams, loading };
}
