/**
 * Predictions Module
 *
 * Pool league prediction engine with Monte Carlo simulation,
 * lineup optimization, and advanced analytics.
 */

// Core prediction functions
export {
  parseDate,
  getLatestResultDate,
  calcBayesianPct,
  getDiv,
  calcStandings,
  calcTeamStrength,
  type DataSources,
} from './core';

// Matchup prediction
export {
  predictFrame,
} from './matchup';

// Simulation
export {
  simulateMatch,
  runSeasonSimulation,
  runPredSim,
  type SimulationDataSources,
} from './simulation';

// Lineup optimization
export {
  getTopNPlayers,
  calcSquadStrength,
  calcModifiedSquadStrength,
  calcStrengthAdjustments,
  calcAppearanceRates,
  predictLineup,
  suggestLineup,
} from './lineup';

// Analytics
export {
  calcBDStats as calcAdvancedBDStats,
  compareBDStats,
  calcPlayerForm as calcPlayerFormAnalysis,
  analyzeH2H,
  calcTeamHomeAwaySplit,
  calcSetPerformance,
  generateScoutingReport as generateDetailedScoutingReport,
  type AdvancedBDStats,
  type FormAnalysis,
  type H2HAnalysis,
} from './analytics';

// Player stats
export {
  getTeamPlayers,
  getPlayerStats,
  getPlayerTeams,
  getPlayerStats2526,
  getTeamPlayers2526,
  getPlayerEffectivePct,
  getAllLeaguePlayers,
} from './player-stats';

// Fixtures
export {
  getRemainingFixtures,
  getAllRemainingFixtures,
  getTeamResults,
} from './fixtures';

// Temporary exports from old predictions.ts for backward compatibility
// TODO: Migrate these functions to appropriate modules
export {
  calcTeamHomeAway,
  calcPlayerHomeAway,
  calcTeamBDStats,
  getSquadH2H,
  getPlayerFrameHistory,
  getH2HRecord,
  calcFixtureImportance,
  calcPlayerForm,
  calcBDStats,
  generateScoutingReport,
} from '../predictions.deprecated';
