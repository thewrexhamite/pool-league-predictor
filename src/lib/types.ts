// League data types

export interface Division {
  name: string;
  teams: string[];
}

export type DivisionCode = 'SD1' | 'SD2' | 'WD1' | 'WD2';

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

// League player (for search)
export interface LeaguePlayer {
  name: string;
  rating: number | null;
  teams2526: string[];
  totalPct2526: number | null;
  totalPlayed2526: number | null;
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
