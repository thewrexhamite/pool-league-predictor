import type {
  Divisions,
  MatchResult,
  Fixture,
  PlayersMap,
  RostersMap,
  Players2526Map,
} from './types';

import resultsData from '@data/results.json';
import fixturesData from '@data/fixtures.json';
import playersData from '@data/players.json';
import rostersData from '@data/rosters.json';
import players2526Data from '@data/players2526.json';

export const RESULTS: MatchResult[] = resultsData as MatchResult[];
export const FIXTURES: Fixture[] = fixturesData as Fixture[];
export const PLAYERS: PlayersMap = playersData as PlayersMap;
export const ROSTERS: RostersMap = rostersData as RostersMap;
export const PLAYERS_2526: Players2526Map = players2526Data as Players2526Map;

export const HOME_ADV = 0.2;

// Re-export the Firestore-backed hook for components that need live data
export { useLeagueData } from './data-provider';
