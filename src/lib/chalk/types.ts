// ===== Chalk Table Types =====

export type GameMode = 'singles' | 'doubles' | 'killer' | 'challenge';
export type TableStatus = 'idle' | 'active' | 'private';
export type QueueEntryStatus = 'waiting' | 'on_hold' | 'called' | 'no_show_warning';
export type BreakRule = 'winner_breaks' | 'loser_breaks' | 'alternate';
export type FoulRule = 'two_shots' | 'ball_in_hand';
export type PlayerSide = 'holder' | 'challenger';

export interface HouseRules {
  breakRule: BreakRule;
  foulRule: FoulRule;
  blackSpotRule: boolean;
}

export type ChalkTheme = 'dark' | 'light';

export interface ChalkSettings {
  pinHash: string;
  tableName: string;
  noShowTimeoutSeconds: number;
  holdMaxMinutes: number;
  winLimitEnabled: boolean;
  winLimitCount: number;
  attractModeTimeoutMinutes: number;
  soundEnabled: boolean;
  soundVolume: number;
  houseRules: HouseRules;
  theme: ChalkTheme;
}

export interface QueueEntry {
  id: string;
  playerNames: string[];
  joinedAt: number;
  status: QueueEntryStatus;
  holdUntil: number | null;
  noShowDeadline: number | null;
  gameMode: GameMode;
  userId?: string;
  userIds?: Record<string, string>; // playerName → Firebase UID
}

export interface GamePlayer {
  name: string;
  side: PlayerSide;
  queueEntryId: string;
}

export interface KillerPlayerState {
  name: string;
  lives: number;
  isEliminated: boolean;
}

export interface KillerState {
  players: KillerPlayerState[];
  round: number;
}

export interface CurrentGame {
  id: string;
  mode: GameMode;
  startedAt: number;
  players: GamePlayer[];
  killerState: KillerState | null;
  consecutiveWins: number;
  breakingPlayer: string | null;
}

export interface PlayerSessionStats {
  wins: number;
  losses: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
}

export interface KingOfTable {
  playerName: string;
  consecutiveWins: number;
  crownedAt: number;
}

export interface SessionStats {
  gamesPlayed: number;
  playerStats: Record<string, PlayerSessionStats>;
  kingOfTable: KingOfTable | null;
}

export interface ChalkSession {
  startedAt: number;
  isPrivate: boolean;
  privatePlayerNames: string[];
}

export interface ChalkTable {
  id: string;
  shortCode: string;
  name: string;
  venueName: string;
  venueId: string | null;
  status: TableStatus;
  createdAt: number;
  lastActiveAt: number;
  idleSince: number | null;
  settings: ChalkSettings;
  queue: QueueEntry[];
  currentGame: CurrentGame | null;
  sessionStats: SessionStats;
  recentNames: string[];
  session: ChalkSession;
}

// ===== Venue Types =====

export interface ChalkVenue {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  tableIds: string[];
  logoUrl: string | null;
}

// ===== Lifetime Stats =====

export interface ChalkModeStats {
  wins: number;
  losses: number;
  gamesPlayed: number;
}

export interface ChalkLifetimeStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  lastGameAt: number;
  byMode: Partial<Record<GameMode, ChalkModeStats>>;
}

// ===== Game History =====

export interface GameHistoryRecord {
  id: string;
  tableId: string;
  mode: GameMode;
  players: GamePlayer[];
  winner: string | null;
  winnerSide: PlayerSide | null;
  startedAt: number;
  endedAt: number;
  duration: number;
  consecutiveWins: number;
  killerState: KillerState | null;
  playerUids?: Record<string, string>;
}

// ===== Short Code Index =====

export interface ChalkTableIndex {
  tableId: string;
  shortCode: string;
  createdAt: number;
}

// ===== Action payloads =====

export interface CreateTablePayload {
  venueName: string;
  tableName: string;
  pin: string;
  venueId?: string;
}

export interface CreateVenuePayload {
  name: string;
}

export interface ClaimTablePayload {
  shortCode: string;
  pin: string;
}

export interface AddToQueuePayload {
  playerNames: string[];
  gameMode: GameMode;
  userId?: string;
}

export interface ReportResultPayload {
  winningSide: PlayerSide;
  winnerNames: string[];
}

export interface KillerEliminationPayload {
  eliminatedPlayerName: string;
}

// ===== Provider types =====

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface ChalkTableContextValue {
  table: ChalkTable | null;
  loading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  // Queue actions
  addToQueue: (payload: AddToQueuePayload) => Promise<void>;
  removeFromQueue: (entryId: string) => Promise<void>;
  reorderQueue: (entryId: string, newIndex: number) => Promise<void>;
  holdPosition: (entryId: string) => Promise<void>;
  unholdPosition: (entryId: string) => Promise<void>;
  // Game actions
  startNextGame: () => Promise<void>;
  reportResult: (payload: ReportResultPayload) => Promise<void>;
  eliminateKillerPlayer: (payload: KillerEliminationPayload) => Promise<void>;
  finishKillerGame: (winnerName: string) => Promise<void>;
  cancelGame: () => Promise<void>;
  dismissNoShow: () => Promise<void>;
  // Settings actions
  updateSettings: (settings: Partial<ChalkSettings>) => Promise<void>;
  resetTable: () => Promise<void>;
  // Private mode
  togglePrivateMode: (playerNames?: string[]) => Promise<void>;
  // Claim queue spot
  claimQueueSpot: (entryId: string, playerName: string, userId: string) => Promise<void>;
}
