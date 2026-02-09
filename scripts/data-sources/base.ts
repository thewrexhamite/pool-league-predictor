/**
 * Base Data Source Interface
 *
 * Defines the contract that all data source implementations must follow.
 * Data sources can fetch league data from various providers (LeagueAppLive,
 * RackEmApp, manual uploads, custom APIs, etc.)
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Match result data structure
 */
export interface MatchResult {
  date: string;          // DD-MM-YYYY format
  home: string;          // Home team name
  away: string;          // Away team name
  home_score: number;    // Home team score
  away_score: number;    // Away team score
  division: string;      // Division code (e.g., 'TD1', 'TD2')
  frames: number;        // Total frames in match
}

/**
 * Frame-level match data
 */
export interface FrameData {
  matchId: string;       // Unique match identifier
  date: string;          // DD-MM-YYYY format
  home: string;          // Home team name
  away: string;          // Away team name
  division: string;      // Division code
  frames: {
    frameNum: number;    // Frame number (1-based)
    set: number;         // Set number (1-based)
    homePlayer: string;  // Home player name
    awayPlayer: string;  // Away player name
    winner: 'home' | 'away'; // Frame winner
    breakDish: boolean;  // Break and dish scored
    forfeit: boolean;    // Frame forfeited
  }[];
}

/**
 * Player statistics data
 */
export interface PlayerData {
  teams: {
    team: string;        // Team name
    div: string;         // Division code
    p: number;           // Frames played
    w: number;           // Frames won
    pct: number;         // Win percentage
    lag: number;         // Lag wins
    bdF: number;         // Break & dish for
    bdA: number;         // Break & dish against
    forf: number;        // Forfeits
    cup: boolean;        // Cup competition
  }[];
  total: {
    p: number;           // Total frames played
    w: number;           // Total frames won
    pct: number;         // Total win percentage
  };
}

/**
 * Fixture (upcoming match) data
 */
export interface Fixture {
  date: string;          // DD-MM-YYYY format
  home: string;          // Home team name
  away: string;          // Away team name
  division: string;      // Division code
}

/**
 * Division structure
 */
export interface Division {
  name: string;          // Full division name (e.g., 'Division 1')
  teams: string[];       // Team names in division
}

/**
 * Data source configuration
 */
export interface DataSourceConfig {
  leagueId: string;      // League identifier
  sourceType: string;    // Data source type (e.g., 'leagueapplive', 'rackemapp', 'manual')
  config: Record<string, any>; // Source-specific configuration
  enabled?: boolean;     // Whether this source is active
}

/**
 * Fetch options for data retrieval
 */
export interface FetchOptions {
  verbose?: boolean;     // Enable verbose logging
  dryRun?: boolean;      // Don't write files, just log
  delay?: number;        // Delay between requests (ms)
  fromDate?: string;     // Fetch results from this date onwards
  toDate?: string;       // Fetch results up to this date
  divisions?: string[];  // Specific divisions to fetch
}

// ============================================================================
// Abstract Base Class
// ============================================================================

/**
 * Abstract base class for data sources.
 * All data source implementations must extend this class.
 */
export abstract class DataSource {
  protected config: DataSourceConfig;
  protected verbose: boolean = false;

  constructor(config: DataSourceConfig) {
    this.config = config;
  }

  /**
   * Log a message with timestamp
   */
  protected log(message: string): void {
    if (this.verbose) {
      const timestamp = new Date().toISOString().substring(11, 19);
      console.log(`[${timestamp}] ${message}`);
    }
  }

  /**
   * Fetch match results
   */
  abstract fetchResults(options?: FetchOptions): Promise<MatchResult[]>;

  /**
   * Fetch frame-level data for matches
   */
  abstract fetchFrames(options?: FetchOptions): Promise<FrameData[]>;

  /**
   * Fetch player statistics
   */
  abstract fetchPlayers(options?: FetchOptions): Promise<Map<string, PlayerData>>;

  /**
   * Fetch upcoming fixtures
   */
  abstract fetchFixtures(options?: FetchOptions): Promise<Fixture[]>;

  /**
   * Fetch division information
   */
  abstract fetchDivisions(options?: FetchOptions): Promise<Division[]>;

  /**
   * Validate configuration
   */
  abstract validateConfig(): boolean;

  /**
   * Get human-readable source name
   */
  abstract getSourceName(): string;
}
