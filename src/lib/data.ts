import type {
  Divisions,
  DivisionCode,
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

export const DIVISIONS: Divisions = {
  SD1: {
    name: 'Sunday Div 1',
    teams: [
      'Breakroom Lions', 'Breakroom Llay', 'Gresford Colliery', 'Gwersyllt Club',
      'Gwersyllt WMC', 'Johnstown Legion', 'Magnet A', 'Miners Brymbo',
      'Red Lion Marchweil', 'Y Tai',
    ],
  },
  SD2: {
    name: 'Sunday Div 2',
    teams: [
      'Brymbo Sports', 'Cross Foxes Coedpoeth', 'Four Dogs A', 'Four Dogs B',
      'Magnet B', 'Old Black Horse', 'Rhos Snooker Club', 'Rollers A',
      'Rollers B', 'Sun Rhos', 'The Drunk Monk',
    ],
  },
  WD1: {
    name: 'Wednesday Div 1',
    teams: [
      'Breakroom Lions.', 'Colliers Dogs', 'Crown Summerhill', 'Golden Lion Cp',
      'Golden Lion Wxm', 'Gwersyllt Club.', 'Gwersyllt Union', 'Hill Street Social',
      'Miners Brymbo.', 'War Memorial A',
    ],
  },
  WD2: {
    name: 'Wednesday Div 2',
    teams: [
      'Crown Caergwrle', 'Gresford Legion', 'Greyhound', 'Hafod Club Rhos',
      'Kings Mills', 'Plough Gresford', 'Ruabon Cons A', 'Ruabon Cons B',
      'War Memorial B', 'White Lion Hope', 'Y Tai.',
    ],
  },
};

export const HOME_ADV = 0.2;

export const DIVISION_CODES: DivisionCode[] = ['SD1', 'SD2', 'WD1', 'WD2'];

// Re-export the Firestore-backed hook for components that need live data
export { useLeagueData } from './data-provider';
