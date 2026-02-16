import type { ChalkSettings, SessionStats, ChalkSession } from './types';

export const CHALK_DEFAULTS = {
  NO_SHOW_TIMEOUT_SECONDS: 120,
  HOLD_MAX_MINUTES: 15,
  WIN_LIMIT_COUNT: 3,
  ATTRACT_MODE_TIMEOUT_MINUTES: 1,
  SOUND_VOLUME: 0.7,
  MAX_QUEUE_SIZE: 30,
  MAX_RECENT_NAMES: 50,
  KILLER_DEFAULT_LIVES: 3,
  KILLER_MIN_PLAYERS: 3,
  KILLER_MAX_PLAYERS: 8,
  SHORT_CODE_LENGTH: 4,
  SHORT_CODE_PREFIX: 'CHALK',
  PIN_LENGTH: 4,
} as const;

export const DEFAULT_SETTINGS: ChalkSettings = {
  pinHash: '',
  tableName: '',
  noShowTimeoutSeconds: CHALK_DEFAULTS.NO_SHOW_TIMEOUT_SECONDS,
  holdMaxMinutes: CHALK_DEFAULTS.HOLD_MAX_MINUTES,
  winLimitEnabled: true,
  winLimitCount: CHALK_DEFAULTS.WIN_LIMIT_COUNT,
  attractModeTimeoutMinutes: CHALK_DEFAULTS.ATTRACT_MODE_TIMEOUT_MINUTES,
  soundEnabled: true,
  soundVolume: CHALK_DEFAULTS.SOUND_VOLUME,
  houseRules: {
    breakRule: 'winner_breaks',
    foulRule: 'two_shots',
    blackSpotRule: false,
  },
};

export const DEFAULT_SESSION_STATS: SessionStats = {
  gamesPlayed: 0,
  playerStats: {},
  kingOfTable: null,
};

export const DEFAULT_SESSION: ChalkSession = {
  startedAt: 0,
  isPrivate: false,
  privatePlayerNames: [],
};

export const GAME_MODE_LABELS: Record<string, string> = {
  singles: 'Singles',
  doubles: 'Doubles',
  killer: 'Killer',
  challenge: 'Challenge',
};

export const BREAK_RULE_LABELS: Record<string, string> = {
  winner_breaks: 'Winner breaks',
  loser_breaks: 'Loser breaks',
  alternate: 'Alternate break',
};

export const FOUL_RULE_LABELS: Record<string, string> = {
  two_shots: 'Two shots',
  ball_in_hand: 'Ball in hand',
};
