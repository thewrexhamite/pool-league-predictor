// Player Insight System types

export type LabelCategory = 'performance' | 'consistency' | 'clutch' | 'tactical' | 'social';

export interface PlayerLabel {
  id: string;
  name: string;
  description: string;
  earnedAt: number;
  expiresAt: number; // 4 weeks after earning
  category: LabelCategory;
}

export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface FormIndicator {
  metric: string; // e.g. 'Win Rate', 'Consistency', 'Match Impact'
  trend: TrendDirection;
  arrow: '↑' | '→' | '↓';
  value: string; // formatted display value e.g. '62%', '0.85'
  rawValue: number; // numeric for sorting/comparison
  divisionContext: string; // e.g. 'Top 30% in Division 1'
  percentile: number; // 0-100
}

export type SeasonPhase = 'early' | 'mid' | 'late' | 'complete';

export interface KeyMoment {
  date: string;
  description: string;
  type: 'form_change' | 'streak' | 'milestone';
}

export interface SeasonSnapshot {
  phase: SeasonPhase;
  narrative: string; // e.g. 'Strong start, consistent through mid-season'
  rollingWinPct: number[]; // rolling 5-match win% for sparkline
  keyMoments: KeyMoment[];
}

export type UnlockableTool =
  | 'pressure_frame_analysis'
  | 'opponent_deep_dive'
  | 'season_trajectory'
  | 'captains_toolkit'
  | 'division_radar';

export interface UsageCounters {
  playersViewed: number;
  comparisonsRun: number;
  scoutingReportsViewed: number;
  simulationsRun: number;
  tutorialsCompleted: number;
  featuresUsed: string[]; // unique feature IDs used
}

export interface PlayerInsights {
  labels: PlayerLabel[];
  usage: UsageCounters;
  unlockedTools: UnlockableTool[];
  insightsEnabled: boolean;
  usageTrackingEnabled: boolean;
  predictions: {
    total: number;
    correct: number;
  };
  miniLeagues: string[]; // mini-league IDs
  lastUpdated: number;
}

// Keep MiniLeague for mini-league feature
export interface MiniLeague {
  id: string;
  name: string;
  createdBy: string;
  inviteCode: string;
  members: string[];
  maxMembers: number;
  seasonId: string;
  createdAt: number;
}

// Simplified leaderboard entry for mini-league standings only
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  xp: number;
  weeklyXP: number;
  level: number;
  tier: number;
  rank: number;
  movement: number;
}

export const DEFAULT_USAGE: UsageCounters = {
  playersViewed: 0,
  comparisonsRun: 0,
  scoutingReportsViewed: 0,
  simulationsRun: 0,
  tutorialsCompleted: 0,
  featuresUsed: [],
};

export const DEFAULT_INSIGHTS: PlayerInsights = {
  labels: [],
  usage: { ...DEFAULT_USAGE },
  unlockedTools: [],
  insightsEnabled: true,
  usageTrackingEnabled: true,
  predictions: {
    total: 0,
    correct: 0,
  },
  miniLeagues: [],
  lastUpdated: Date.now(),
};
