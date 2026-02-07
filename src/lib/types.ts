// League data types

export interface Division {
  name: string;
  teams: string[];
}

export type DivisionCode = string;

export type Divisions = Record<DivisionCode, Division>;

export interface MatchResult {
  date: string;
  home: string;
  away: string;
  home_score: number;
  away_score: number;
  division: string;
  frames: number;
}

export interface Fixture {
  date: string;
  home: string;
  away: string;
  division: string;
}

export interface PlayerStats2425 {
  r: number; // rating
  w: number; // win percentage (0-1)
  p: number; // games played
}

export type PlayersMap = Record<string, PlayerStats2425>;

export type RostersMap = Record<string, string[]>;

export interface PlayerTeamStats2526 {
  team: string;
  div: string;
  p: number;
  w: number;
  pct: number;
  lag: number;
  bdF: number;
  bdA: number;
  forf: number;
  cup: boolean;
}

export interface PlayerData2526 {
  teams: PlayerTeamStats2526[];
  total: {
    p: number;
    w: number;
    pct: number;
  };
}

export type Players2526Map = Record<string, PlayerData2526>;

// Standings types
export interface StandingEntry {
  team: string;
  p: number;
  w: number;
  d: number;
  l: number;
  f: number;
  a: number;
  pts: number;
  diff: number;
}

// Team player (combined roster + stats)
export interface TeamPlayer {
  name: string;
  rating: number | null;
  winPct: number | null;
  played: number | null;
  s2526: PlayerTeamStats2526 | null;
  rostered: boolean;
}

// Team result (enriched)
export interface TeamResult {
  date: string;
  home: string;
  away: string;
  home_score: number;
  away_score: number;
  division: string;
  frames: number;
  isHome: boolean;
  opponent: string;
  teamScore: number;
  oppScore: number;
  result: 'W' | 'L' | 'D';
}

// Prediction types
export interface PredictionResult {
  pHomeWin: string;
  pDraw: string;
  pAwayWin: string;
  expectedHome: string;
  expectedAway: string;
  topScores: { score: string; pct: string }[];
  baseline?: PredictionResult;
}

// Prediction tracking types
export interface PredictionSnapshot {
  id: string;
  seasonId: string;
  date: string;
  home: string;
  away: string;
  division: string;
  predictedAt: number; // timestamp when prediction was made
  pHomeWin: number; // 0-1
  pDraw: number; // 0-1
  pAwayWin: number; // 0-1
  expectedHome: number;
  expectedAway: number;
  confidence: number; // max(pHomeWin, pDraw, pAwayWin)
  predictedWinner: 'home' | 'away' | 'draw';
  actualHomeScore?: number;
  actualAwayScore?: number;
  actualWinner?: 'home' | 'away' | 'draw';
  correct?: boolean;
}

export interface CalibrationBucket {
  minConfidence: number; // e.g., 0.6
  maxConfidence: number; // e.g., 0.7
  predictedRate: number; // midpoint, e.g., 0.65
  actualRate: number; // actual win rate in this bucket
  count: number; // number of predictions in bucket
}

export interface AccuracyByDivision {
  division: string;
  total: number;
  correct: number;
  accuracy: number; // 0-1
}

export interface AccuracyByConfidence {
  label: string; // e.g., "High (>70%)", "Medium (50-70%)", "Low (<50%)"
  minConfidence: number;
  maxConfidence: number;
  total: number;
  correct: number;
  accuracy: number; // 0-1
}

export interface AccuracyStats {
  totalPredictions: number;
  correctPredictions: number;
  overallAccuracy: number; // 0-1
  byDivision: AccuracyByDivision[];
  byConfidence: AccuracyByConfidence[];
  calibration: CalibrationBucket[];
  lastUpdated: number; // timestamp
}

// Simulation types
export interface SimulationResult {
  team: string;
  currentPts: number;
  avgPts: string;
  pTitle: string;
  pTop2: string;
  pBot2: string;
}

// What-if types
export interface WhatIfResult {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

// Squad override types
export interface SquadOverride {
  added: string[];
  removed: string[];
}

export type SquadOverrides = Record<string, SquadOverride>;

// Confidence-adjusted effective percentage
export interface EffectivePct {
  pct: number;
  adjPct: number;
  weight: number;
  wins: number;
}

// League player (for search)
export interface LeaguePlayer {
  name: string;
  rating: number | null;
  teams2526: string[];
  totalPct2526: number | null;
  totalPlayed2526: number | null;
  adjPct2526: number | null;
}

// Frame-level data (per-frame player results from LeagueAppLive)
export interface FrameData {
  matchId: string;
  date: string;
  home: string;
  away: string;
  division: string;
  frames: {
    frameNum: number;
    homePlayer: string;
    awayPlayer: string;
    winner: 'home' | 'away';
    breakDish: boolean;
    forfeit: boolean;
  }[];
}

// User session persistence
export interface UserSession {
  whatIfResults: WhatIfResult[];
  squadOverrides: SquadOverrides;
  selectedDiv: DivisionCode;
  lastActive: number; // timestamp
}

// Season document shape in Firestore
export interface SeasonData {
  results: MatchResult[];
  fixtures: Fixture[];
  frames: FrameData[];
  players: PlayersMap;
  rosters: RostersMap;
  players2526: Players2526Map;
  divisions: Record<DivisionCode, Division>;
  lastUpdated: number; // timestamp
  lastSyncedFrom: string;
}

// Multi-league types
export interface SeasonMeta {
  id: string;
  label: string;
  current: boolean;
  divisions: string[];
}

export interface LeagueMeta {
  id: string;
  name: string;
  shortName: string;
  seasons: SeasonMeta[];
}

// Tactical edge types

export interface PlayerFormData {
  last5: { p: number; w: number; pct: number };
  last8?: { p: number; w: number; pct: number };
  last10: { p: number; w: number; pct: number };
  seasonPct: number;
  trend: 'hot' | 'cold' | 'steady';
}

export interface HomeAwaySplit {
  home: { p: number; w: number; pct: number };
  away: { p: number; w: number; pct: number };
}

export interface TeamHomeAwaySplit {
  home: { p: number; w: number; d: number; l: number; f: number; a: number; winPct: number };
  away: { p: number; w: number; d: number; l: number; f: number; a: number; winPct: number };
}

export interface H2HRecord {
  playerA: string;
  playerB: string;
  wins: number;   // A's wins
  losses: number; // A's losses
  details: { date: string; winner: string }[];
}

export interface SetPerformance {
  set1: { won: number; played: number; pct: number };
  set2: { won: number; played: number; pct: number };
  bias: number; // positive = stronger in set 1
}

export interface BDStats {
  bdFRate: number;   // B&D for per game
  bdARate: number;   // B&D against per game
  netBD: number;     // bdF - bdA
  forfRate: number;  // forfeits per game
}

// Phase 2: Composite tactical types

export interface PlayerAppearance {
  name: string;
  appearances: number;
  totalMatches: number;
  rate: number; // 0-1
  category: 'core' | 'rotation' | 'fringe';
}

export interface PredictedLineup {
  players: PlayerAppearance[];
  recentPlayers: string[]; // players who appeared in last 3 matches
}

export interface FixtureImportance {
  home: string;
  away: string;
  date: string;
  importance: number; // abs difference in pTop2 between win/loss scenarios
  pTop2IfWin: number;
  pTop2IfLoss: number;
}

export interface ScoutingReport {
  opponent: string;
  teamForm: ('W' | 'L' | 'D')[];
  homeAway: TeamHomeAwaySplit;
  setPerformance: SetPerformance | null;
  bdStats: BDStats;
  predictedLineup: PredictedLineup;
  strongestPlayers: { name: string; pct: number; adjPct: number; p: number }[];
  weakestPlayers: { name: string; pct: number; adjPct: number; p: number }[];
  forfeitRate: number;
}

export interface LineupScore {
  name: string;
  score: number;
  formPct: number | null;
  h2hAdvantage: number; // net wins against likely opponents
  homeAwayPct: number | null;
  suggestedSet: 1 | 2;
}

export interface LineupSuggestion {
  set1: LineupScore[];
  set2: LineupScore[];
  insights: string[];
}

// Team report types
export interface TeamReportData {
  teamName: string;
  divisionName: string;
  leagueName?: string;
  position: number;
  totalTeams: number;
  standing: { p: number; w: number; d: number; l: number; f: number; a: number; pts: number; diff: number };
  form: ('W' | 'L' | 'D')[];
  recentResults: { opponent: string; teamScore: number; oppScore: number; result: 'W' | 'L' | 'D'; isHome: boolean }[];
  homeAway: { home: { p: number; w: number; d: number; l: number; winPct: number }; away: { p: number; w: number; d: number; l: number; winPct: number } };
  playerSummaries: { name: string; played: number; winPct: number; adjPct: number; trend: 'hot' | 'cold' | 'steady' | null; category: 'core' | 'rotation' | 'fringe' | null }[];
  setPerformance: { set1Pct: number; set2Pct: number; bias: number } | null;
  bdStats: { bdFRate: number; bdARate: number; netBD: number; forfRate: number };
  nextOpponent: string | null;
  nextIsHome: boolean | null;
  gapToLeader: number;
  gapToSafety: number;
}

export interface TeamReportOutput {
  overallAssessment: string;
  playerPerformances: string;
  trends: string;
  statsHighlights: string;
  outlook: string;
}

export interface StoredTeamReport {
  id: string;
  teamName: string;
  divisionCode: DivisionCode;
  generatedAt: number;
  report: TeamReportOutput;
}

// AI types
export interface MatchAnalysisInput {
  homeTeam: string;
  awayTeam: string;
  division: string;
  homeStrength: number;
  awayStrength: number;
  prediction: PredictionResult;
  homeStanding: StandingEntry;
  awayStanding: StandingEntry;
  homeSquad: TeamPlayer[];
  awaySquad: TeamPlayer[];
}

export interface MatchAnalysisOutput {
  preview: string;
  tacticalInsights: string[];
  keyFactors: string[];
  predictedOutcome: string;
}

export interface NaturalLanguageInput {
  question: string;
  leagueContext: string;
}

export interface NaturalLanguageOutput {
  answer: string;
  referencedTeams: string[];
  referencedPlayers: string[];
  suggestedFollowUps: string[];
}

export interface PlayerInsightInput {
  playerName: string;
  stats2425: PlayerStats2425 | null;
  stats2526: PlayerData2526 | null;
  teams: { div: string; team: string }[];
  divisionContext: string;
}

export interface PlayerInsightOutput {
  scoutingReport: string;
  formAssessment: string;
  seasonComparison: string;
  strengths: string[];
  weaknesses: string[];
}
