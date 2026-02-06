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
  type SeasonStats,
  type PlayerForm,
  type CareerMilestone,
} from './career-stats';

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
