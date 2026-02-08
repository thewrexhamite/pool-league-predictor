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

// Re-export advanced analytics with original names for direct access
export {
  calcBDStats as calcAdvancedBDStatsNew,
  calcPlayerForm as calcPlayerFormNew,
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

// Re-export some functions with compatibility names
export {
  calcTeamHomeAwaySplit as calcTeamHomeAway,
} from './analytics';

export {
  getH2HRecord,
  calcPlayerHomeAway,
  calcTeamBDStats,
  getSquadH2H,
  getPlayerFrameHistory,
  calcFixtureImportance,
  calcPlayerForm,
  calcBDStats,
  generateScoutingReport,
} from './compatibility';
