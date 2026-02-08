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
