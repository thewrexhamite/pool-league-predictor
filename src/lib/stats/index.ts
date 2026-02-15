/**
 * Stats Module
 *
 * Player statistics and analytics.
 */

// Career stats
export {
  calculateWinPct,
  formatWinPct,
  formatDate,
  getSeasonLabel,
  getPlayerStats,
  calculateCurrentForm,
  getPlayerGames,
  findMilestones,
  fetchPlayerCareerData,
  calculateCareerTrend,
  calculateImprovementRate,
  calculateConsistencyMetrics,
  type SeasonStats,
  type PlayerForm,
  type CareerMilestone,
} from './career-stats';

// Career stats types (from types.ts, used by career-stats functions)
export type {
  SeasonSummary,
  CareerTrend,
  ImprovementMetrics,
  ConsistencyMetrics,
  CareerStats,
} from '../types';

// Head-to-head
export {
  calculateH2HRecords,
  getH2HSummary,
  getH2HBetween,
  findWinningOpponents,
  findDominatedOpponents,
  findRecentOpponents,
  formatH2HRecord,
  type H2HMatch,
  type H2HRecord,
  type H2HSummary,
} from './head-to-head';

// League-wide stats
export {
  getTopPlayers,
  getBDLeaders,
  getTeamHomeAwayRecord,
  getMostImprovedPlayers,
  getActiveWinStreaks,
  type TopPlayerEntry,
  type BDLeaderEntry,
  type BDLeaders,
  type ImprovedPlayerEntry,
  type StreakLeaderEntry,
} from './league-stats';

// Power Rankings
export { calcPowerRankings } from './power-rankings';

// Strength of Schedule
export { calcAllTeamsSOS, calcScheduleStrength } from './strength-of-schedule';

// Home/Away Analytics
export {
  calcHomeAdvantage,
  calcPlayerVenueBias,
  getStrongestHomeTeams,
  type HomeAdvantageEntry,
  type PlayerVenueBias,
} from './home-away-analytics';

// Clutch Index
export { calcClutchIndex, getClutchLeaderboard } from './clutch-index';

// Rivalry Tracker
export { identifyRivalries } from './rivalry-tracker';

// League Health
export { calcCompetitivenessIndex, type LeagueHealthData } from './league-health';

// Cross-League Comparison
export {
  findIntraLeagueBridgePlayers,
  findCrossLeagueBridgePlayers,
  findAllBridgePlayers,
} from './bridge-players';

export { calculateDivisionStrengths } from './division-strength';

export { calculateLeagueStrengths } from './league-strength';

export {
  getAdjustedPlayerRating,
  getAdjustedTeamRating,
  computeGlobalPercentiles,
} from './adjusted-ratings';
