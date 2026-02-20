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
  TOURNAMENT_MIN_PLAYERS: 3,
  TOURNAMENT_MAX_PLAYERS: 16,
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
    breakRule: 'loser_breaks',
    foulRule: 'two_shots',
    blackSpotRule: false,
  },
  theme: 'dark',
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
  tournament: 'Tournament',
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

export const TOURNAMENT_FORMAT_LABELS: Record<string, string> = {
  knockout: 'Knockout',
  round_robin: 'Round Robin',
  group_knockout: 'Group + Knockout',
};

export const TOURNAMENT_RACE_TO_MIN = 1;
export const TOURNAMENT_RACE_TO_MAX = 13;

// ===== Venue + Kiosk constants =====

export const VENUES_COLLECTION = 'chalkVenues';
export const KIOSK_PERSISTENCE_KEY = 'chalk-kiosk-config';
export const KIOSK_PERSISTENCE_MAX_AGE_DAYS = 90;
