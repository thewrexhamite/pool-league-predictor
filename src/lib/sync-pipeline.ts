import * as fs from 'fs';
import * as path from 'path';
import { parse as parseHTML } from 'node-html-parser';
import { normalizePlayerName } from '../../scripts/normalize-players';
import { syncRackEmAppLeague } from './rackemapp-scraper';

/**
 * LeagueAppLive → Firestore + JSON sync library.
 *
 * Provides reusable sync functions for scraping results, fixtures, and frame-level
 * player data from LeagueAppLive leagues, then writing to Firestore and static JSON files.
 */

const BASE_URL = 'https://live.leagueapplive.com';

// --- League configuration ---

export interface LeagueConfig {
  site: string;           // LeagueAppLive sitename parameter, or 'rackemapp'
  rackemappLeague?: string; // rackemapp league URL slug (e.g. 'ChesterPoolLeague')
  leagueId: string;       // Firestore league ID
  seasonId: string;       // Firestore season ID
  leagueName: string;     // Full display name
  shortName: string;      // Short display name
  dataDir: string;        // Output directory for JSON files
  divisions: { code: string; siteGroup: string; rackemappId?: string }[];
  cupGroups?: { code: string; siteGroup: string }[];
  teamNameMap: Record<string, string>;
}

export interface ExistingData {
  results?: Array<{ date: string; home: string; away: string }>;
  fixtures?: Array<{ date: string; home: string; away: string }>;
  frames?: ScrapedMatchFrames[];
  players?: Record<string, unknown>;
  players2526?: Record<string, PlayerStats>;
  rosters?: Record<string, string[]>;
}

export interface SyncOptions {
  dryRun?: boolean;
  projectRoot?: string;
  incremental?: boolean;
  writeJsonFiles?: boolean;
  existingData?: ExistingData;
}

// Load league configurations from external JSON file
export function loadLeagueConfigs(projectRoot: string): Record<string, LeagueConfig> {
  const configPath = path.join(projectRoot, 'league-config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`League configuration file not found: ${configPath}`);
  }
  const rawConfigs = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Process each config to resolve dataDir paths relative to project root
  const configs: Record<string, LeagueConfig> = {};
  for (const [key, cfg] of Object.entries(rawConfigs)) {
    const rawConfig = cfg as LeagueConfig;
    configs[key] = {
      ...rawConfig,
      dataDir: path.join(projectRoot, rawConfig.dataDir),
    };
  }
  return configs;
}

// --- Anti-detection ---

const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

const BASE_DELAY = 2500;
const BATCH_SIZE = 10;
const BATCH_PAUSE_MIN = 15000;
const BATCH_PAUSE_MAX = 30000;
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 3;

// Adaptive backoff state
let adaptiveMultiplier = 1.0;
const SLOW_RESPONSE_THRESHOLD = 5000; // 5s

function randomDelay(): number {
  const jitter = 0.8 + Math.random() * 0.4; // ±20% jitter
  return BASE_DELAY * adaptiveMultiplier * jitter;
}

// Types
export interface ScrapedResult {
  date: string;
  home: string;
  away: string;
  home_score: number;
  away_score: number;
  division: string;
  frames: number;
  matchId: string;
  cup?: boolean;
}

export interface ScrapedFixture {
  date: string;
  home: string;
  away: string;
  division: string;
  cup?: boolean;
}

export interface ScrapedFrame {
  frameNum: number;
  set: number;
  homePlayer: string;
  awayPlayer: string;
  winner: 'home' | 'away';
  breakDish: boolean;
  forfeit: boolean;
}

export interface ScrapedMatchFrames {
  matchId: string;
  date: string;
  home: string;
  away: string;
  division: string;
  frames: ScrapedFrame[];
}

export interface PlayerStats {
  teams: {
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
  }[];
  total: { p: number; w: number; pct: number };
}

// --- Fetch helpers ---

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] [SYNC] [${level}] ${message}`);
}

let requestCount = 0;

async function fetchPage(url: string, config: LeagueConfig): Promise<string> {
  requestCount++;
  if (requestCount > 1) await sleep(randomDelay());
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}/${url}`;
  log(`[${requestCount}] ${fullUrl.substring(BASE_URL.length)}`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const resp = await fetch(fullUrl, {
        headers: {
          ...HEADERS,
          'Referer': `${BASE_URL}/?sitename=${config.site}`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      // Adaptive backoff: adjust multiplier based on response time
      const elapsed = Date.now() - startTime;
      if (elapsed > SLOW_RESPONSE_THRESHOLD) {
        adaptiveMultiplier = Math.min(adaptiveMultiplier * 1.3, 3.0);
        log(`Slow response (${elapsed}ms), increasing delay multiplier to ${adaptiveMultiplier.toFixed(1)}x`, 'WARN');
      } else if (adaptiveMultiplier > 1.0) {
        adaptiveMultiplier = Math.max(adaptiveMultiplier * 0.95, 1.0);
      }

      if (resp.status === 429) {
        const backoff = [10000, 20000, 40000][attempt - 1] || 60000;
        const jitter = 0.8 + Math.random() * 0.4;
        log(`Rate limited (429), backing off ${Math.round(backoff * jitter / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`, 'WARN');
        await sleep(backoff * jitter);
        continue;
      }

      if (resp.status >= 500) {
        const backoff = [5000, 10000, 20000][attempt - 1] || 30000;
        const jitter = 0.8 + Math.random() * 0.4;
        log(`Server error (${resp.status}), backing off ${Math.round(backoff * jitter / 1000)}s (attempt ${attempt}/${MAX_RETRIES})`, 'WARN');
        await sleep(backoff * jitter);
        continue;
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${fullUrl}`);
      return resp.text();
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        log(`Request timeout after ${REQUEST_TIMEOUT}ms (attempt ${attempt}/${MAX_RETRIES})`, 'WARN');
        if (attempt === MAX_RETRIES) throw new Error(`Request timed out after ${MAX_RETRIES} attempts: ${fullUrl}`);
        await sleep(5000 * attempt);
        continue;
      }
      // Re-throw non-retryable errors
      if (attempt === MAX_RETRIES) throw err;
      log(`Request failed: ${err instanceof Error ? err.message : err} (attempt ${attempt}/${MAX_RETRIES})`, 'WARN');
      await sleep(5000 * attempt);
    }
  }

  throw new Error(`Failed after ${MAX_RETRIES} attempts: ${fullUrl}`);
}

function buildUrl(page: string, params: Record<string, string>, config: LeagueConfig): string {
  const sp = new URLSearchParams({ sitename: config.site, ...params });
  return `${BASE_URL}/${page}?${sp.toString()}`;
}

function mapTeamName(siteName: string, config: LeagueConfig): string {
  return config.teamNameMap[siteName] || siteName;
}

// --- Scraping functions ---

async function scrapeStandings(divCode: string, siteGroup: string, config: LeagueConfig): Promise<string[]> {
  const html = await fetchPage(buildUrl('table5.php', { sel_group: siteGroup }, config), config);
  const root = parseHTML(html);
  const teams: string[] = [];

  // Team names are in links with act1=details1
  const links = root.querySelectorAll('a[href*="act1=details1"]');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    // Extract team name from href: name=TEAM_NAME
    const nameMatch = href.match(/name=([^&]+)/);
    if (nameMatch) {
      const name = decodeURIComponent(nameMatch[1]);
      const mapped = mapTeamName(name, config);
      if (!teams.includes(mapped)) {
        teams.push(mapped);
      }
    }
  }

  // Fallback: look for table rows with team names
  if (teams.length === 0) {
    const rows = root.querySelectorAll('table tr');
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        const nameCell = cells[0];
        const link = nameCell.querySelector('a');
        if (link) {
          const name = mapTeamName(link.text.trim(), config);
          if (name && !teams.includes(name)) teams.push(name);
        }
      }
    }
  }

  log(`${divCode}: ${teams.length} teams`);
  return teams;
}

async function scrapeTeamMatches(team: string, divCode: string, config: LeagueConfig): Promise<ScrapedResult[]> {
  const html = await fetchPage(buildUrl('table5.php', {
    act1: 'details1',
    name: team,
  }, config), config);
  const root = parseHTML(html);
  const results: ScrapedResult[] = [];

  // Table structure: [Home] [Away] [HomeScore] [AwayScore] [ShowFrames link]
  // No date column -- dates are resolved later from existing data
  const rows = root.querySelectorAll('table tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 4) continue;

    // Must have a "Show Frames" link with matchid
    const matchLink = row.querySelector('a[href*="matchid="]');
    if (!matchLink) continue;

    const href = matchLink.getAttribute('href') || '';
    const matchIdMatch = href.match(/matchid=(\d+)/);
    if (!matchIdMatch) continue;
    const matchId = matchIdMatch[1];

    const cellTexts = cells.map(c => c.text.trim());

    // Find score cells (numeric-only cells)
    const numericIndices: number[] = [];
    for (let i = 0; i < cellTexts.length; i++) {
      if (/^\d+$/.test(cellTexts[i])) numericIndices.push(i);
    }
    if (numericIndices.length < 2) continue;

    const homeScore = parseInt(cellTexts[numericIndices[0]], 10);
    const awayScore = parseInt(cellTexts[numericIndices[1]], 10);

    // Skip unplayed matches (0-0)
    if (homeScore === 0 && awayScore === 0) continue;

    // Team names are the non-numeric, non-link-text cells before the scores
    const teamNames: string[] = [];
    for (let i = 0; i < numericIndices[0]; i++) {
      const text = cellTexts[i];
      if (text && text.length > 1 && !/^\d+$/.test(text)) {
        teamNames.push(mapTeamName(text, config));
      }
    }

    if (teamNames.length < 2) {
      // Try: first two text cells in the row
      for (let i = 0; i < cellTexts.length && teamNames.length < 2; i++) {
        const text = cellTexts[i];
        if (text && text.length > 1 && !/^\d+$/.test(text) &&
            !text.toLowerCase().includes('show') && !text.toLowerCase().includes('frame')) {
          const mapped = mapTeamName(text, config);
          if (!teamNames.includes(mapped)) teamNames.push(mapped);
        }
      }
    }

    if (teamNames.length < 2) continue;

    results.push({
      date: '', // resolved later
      home: teamNames[0],
      away: teamNames[1],
      home_score: homeScore,
      away_score: awayScore,
      division: divCode,
      frames: 10,
      matchId,
    });
  }

  return results;
}

async function scrapeFrameDetails(
  matchId: string,
  team: string,
  matchMeta: { home: string; away: string; date: string; division: string },
  config: LeagueConfig
): Promise<ScrapedMatchFrames> {
  const html = await fetchPage(buildUrl('table5.php', {
    act1: 'details1',
    name: team,
    act2: 'details2',
    matchid: matchId,
  }, config), config);
  const root = parseHTML(html);
  const frames: ScrapedFrame[] = [];

  // The frame details table has 14 columns:
  // [0]Set [1]Game [2]HomePlayer [3-5]empty/Reserve [6]AwayPlayer [7-9]empty/Reserve
  // [10]HomeWon [11]AwayWon [12]B&D [13]Forfeited
  // The match summary table only has ~5 columns, so filter by cell count
  const rows = root.querySelectorAll('table tr');
  let totalFrame = 0;

  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    // Frame details rows have 14 cells; match summary rows have ~5
    if (cells.length < 12) continue;

    const cellTexts = cells.map(c => c.text.trim());

    // Skip header rows
    if (cellTexts.some(t =>
      t.toLowerCase().includes('home player') ||
      t.toLowerCase().includes('away player') ||
      t.toLowerCase() === 'set' ||
      t.toLowerCase() === 'game'
    )) continue;

    const homePlayer = cellTexts[2] || '';
    const awayPlayer = cellTexts[6] || '';
    const homeWon = cellTexts[10] || '0';
    const awayWon = cellTexts[11] || '0';
    const breakDishText = cellTexts[12] || '';
    const forfeitText = cellTexts[13] || '';

    // Player names should be actual names (not pure numbers or empty)
    if (!homePlayer || !awayPlayer) continue;
    if (/^\d+$/.test(homePlayer) && /^\d+$/.test(awayPlayer)) continue;

    totalFrame++;
    const winner: 'home' | 'away' = homeWon === '1' ? 'home' : 'away';
    const breakDish = breakDishText.toLowerCase() === 'yes' || breakDishText === '1';
    const forfeit = forfeitText.toLowerCase() === 'yes' || forfeitText === '1';

    frames.push({
      frameNum: totalFrame,
      set: parseInt(cellTexts[0], 10) || 1,
      homePlayer,
      awayPlayer,
      winner,
      breakDish,
      forfeit,
    });
  }

  return {
    matchId,
    date: matchMeta.date,
    home: matchMeta.home,
    away: matchMeta.away,
    division: matchMeta.division,
    frames,
  };
}

async function scrapeFixtures(divCode: string, siteGroup: string, config: LeagueConfig): Promise<ScrapedFixture[]> {
  const html = await fetchPage(buildUrl('fixture1.php', { sel_group: siteGroup }, config), config);
  const root = parseHTML(html);
  const fixtures: ScrapedFixture[] = [];

  const rows = root.querySelectorAll('table tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 4) continue;

    const cellTexts = cells.map(c => c.text.trim());
    const datePattern = /^\d{2}-\d{2}-\d{4}$/;

    // Find date column
    let date = '';
    let home = '';
    let away = '';

    for (let i = 0; i < cellTexts.length; i++) {
      if (datePattern.test(cellTexts[i])) {
        date = cellTexts[i];
        // Next non-empty, non-time cells should be home and away
        let teamIdx = 0;
        for (let j = i + 1; j < cellTexts.length; j++) {
          const text = cellTexts[j];
          if (!text || /^\d{2}:\d{2}$/.test(text) || /^\d+$/.test(text)) continue;
          if (text.toLowerCase().includes('venue') || text.toLowerCase().includes('table')) continue;
          if (teamIdx === 0) { home = mapTeamName(text, config); teamIdx++; }
          else if (teamIdx === 1) { away = mapTeamName(text, config); teamIdx++; break; }
        }
        break;
      }
    }

    if (date && home && away) {
      fixtures.push({ date, home, away, division: divCode });
    }
  }

  log(`${divCode}: ${fixtures.length} fixtures`);
  return fixtures;
}

async function scrapeCupResults(cupCode: string, siteGroup: string, config: LeagueConfig): Promise<ScrapedResult[]> {
  const html = await fetchPage(buildUrl('results.php', { sel_group: siteGroup }, config), config);
  const root = parseHTML(html);
  const results: ScrapedResult[] = [];

  const rows = root.querySelectorAll('table tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 5) continue;

    const cellTexts = cells.map(c => c.text.trim());

    // Skip header rows
    if (cellTexts[0].toLowerCase() === 'date' || cellTexts[0] === '') continue;

    // Format: Date | Time | Home | Score | Away
    const datePattern = /^\d{2}-\d{2}-\d{4}$/;
    if (!datePattern.test(cellTexts[0])) continue;

    const date = cellTexts[0];
    const home = mapTeamName(cellTexts[2], config);
    const scoreText = cellTexts[3]; // "11 - 10"
    const away = mapTeamName(cellTexts[4], config);

    const scoreMatch = scoreText.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!scoreMatch) continue;

    const homeScore = parseInt(scoreMatch[1], 10);
    const awayScore = parseInt(scoreMatch[2], 10);

    // Generate a synthetic matchId for cup results (no frame-level data available)
    const matchId = `cup-${date}-${home}-${away}`.replace(/\s+/g, '_');

    results.push({
      date,
      home,
      away,
      home_score: homeScore,
      away_score: awayScore,
      division: cupCode,
      frames: homeScore + awayScore,
      matchId,
      cup: true,
    });
  }

  log(`${cupCode}: ${results.length} cup results`);
  return results;
}

async function scrapeCupFixtures(cupCode: string, siteGroup: string, config: LeagueConfig): Promise<ScrapedFixture[]> {
  const html = await fetchPage(buildUrl('fixture1.php', { sel_group: siteGroup }, config), config);
  const root = parseHTML(html);
  const fixtures: ScrapedFixture[] = [];

  const rows = root.querySelectorAll('table tr');
  for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length < 4) continue;

    const cellTexts = cells.map(c => c.text.trim());

    // Format: Date | Time | Home | Away | Venue | Tables
    const datePattern = /^\d{2}-\d{2}-\d{4}$/;
    if (!datePattern.test(cellTexts[0])) continue;

    const date = cellTexts[0];
    const home = mapTeamName(cellTexts[2], config);
    const away = mapTeamName(cellTexts[3], config);

    if (home && away) {
      fixtures.push({ date, home, away, division: cupCode, cup: true });
    }
  }

  log(`${cupCode}: ${fixtures.length} cup fixtures`);
  return fixtures;
}

// --- Aggregation ---

export function aggregatePlayerStats(
  allFrames: ScrapedMatchFrames[],
  config: LeagueConfig
): {
  players2526: Record<string, PlayerStats>;
  rosters: Record<string, string[]>;
} {
  // Track per-player, per-team stats
  const playerTeamStats: Record<string, Record<string, {
    p: number; w: number; lag: number; bdF: number; bdA: number; forf: number;
  }>> = {};

  // Track team-division mapping
  const teamDiv: Record<string, string> = {};

  // Track rosters (player appearances per team)
  const rosterSets: Record<string, Set<string>> = {};

  for (const match of allFrames) {
    teamDiv[match.home] = match.division;
    teamDiv[match.away] = match.division;

    const homeRosterKey = `${match.division}:${match.home}`;
    const awayRosterKey = `${match.division}:${match.away}`;
    if (!rosterSets[homeRosterKey]) rosterSets[homeRosterKey] = new Set();
    if (!rosterSets[awayRosterKey]) rosterSets[awayRosterKey] = new Set();

    for (const frame of match.frames) {
      // Home player - normalize with team context for disambiguation
      if (frame.homePlayer) {
        const homePlayerName = normalizePlayerName(frame.homePlayer, match.home, config.dataDir);
        rosterSets[homeRosterKey].add(homePlayerName);
        if (!playerTeamStats[homePlayerName]) playerTeamStats[homePlayerName] = {};
        if (!playerTeamStats[homePlayerName][match.home]) {
          playerTeamStats[homePlayerName][match.home] = { p: 0, w: 0, lag: 0, bdF: 0, bdA: 0, forf: 0 };
        }
        const stat = playerTeamStats[homePlayerName][match.home];
        stat.p++;
        if (frame.winner === 'home') {
          stat.w++;
          if (frame.breakDish) stat.bdF++;
        } else {
          if (frame.breakDish) stat.bdA++;
        }
        if (frame.forfeit) stat.forf++;
      }

      // Away player - normalize with team context for disambiguation
      if (frame.awayPlayer) {
        const awayPlayerName = normalizePlayerName(frame.awayPlayer, match.away, config.dataDir);
        rosterSets[awayRosterKey].add(awayPlayerName);
        if (!playerTeamStats[awayPlayerName]) playerTeamStats[awayPlayerName] = {};
        if (!playerTeamStats[awayPlayerName][match.away]) {
          playerTeamStats[awayPlayerName][match.away] = { p: 0, w: 0, lag: 0, bdF: 0, bdA: 0, forf: 0 };
        }
        const stat = playerTeamStats[awayPlayerName][match.away];
        stat.p++;
        if (frame.winner === 'away') {
          stat.w++;
          if (frame.breakDish) stat.bdF++;
        } else {
          if (frame.breakDish) stat.bdA++;
        }
        if (frame.forfeit) stat.forf++;
      }
    }
  }

  // Build players2526 map
  const players2526: Record<string, PlayerStats> = {};
  for (const [name, teams] of Object.entries(playerTeamStats)) {
    const teamEntries = Object.entries(teams).map(([team, stat]) => ({
      team,
      div: teamDiv[team] || '',
      p: stat.p,
      w: stat.w,
      pct: stat.p > 0 ? Math.round((stat.w / stat.p) * 10000) / 100 : 0,
      lag: stat.lag,
      bdF: stat.bdF,
      bdA: stat.bdA,
      forf: stat.forf,
      cup: false,
    }));

    const totalP = teamEntries.reduce((s, t) => s + t.p, 0);
    const totalW = teamEntries.reduce((s, t) => s + t.w, 0);

    players2526[name] = {
      teams: teamEntries,
      total: {
        p: totalP,
        w: totalW,
        pct: totalP > 0 ? Math.round((totalW / totalP) * 10000) / 100 : 0,
      },
    };
  }

  // Build rosters map
  const rosters: Record<string, string[]> = {};
  for (const [key, names] of Object.entries(rosterSets)) {
    rosters[key] = [...names].sort();
  }

  return { players2526, rosters };
}

// --- Firestore write ---

export async function writeToFirestore(
  data: {
    results: ScrapedResult[];
    fixtures: ScrapedFixture[];
    frames: ScrapedMatchFrames[];
    players: Record<string, unknown>;
    rosters: Record<string, string[]>;
    players2526: Record<string, PlayerStats>;
    divisions: Record<string, { name: string; teams: string[] }>;
  },
  config: LeagueConfig
) {
  try {
    // Dynamic import to handle missing credentials gracefully
    const admin = await import('firebase-admin');

    if (!admin.default.apps.length) {
      // Try service account key file first, then Application Default Credentials
      const keyPaths = [
        path.resolve('service-account.json'),
        path.resolve('serviceAccountKey.json'),
      ];
      let initialized = false;
      for (const keyPath of keyPaths) {
        if (fs.existsSync(keyPath)) {
          const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
          admin.default.initializeApp({
            credential: admin.default.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
          });
          initialized = true;
          break;
        }
      }
      if (!initialized) {
        admin.default.initializeApp({
          credential: admin.default.credential.applicationDefault(),
        });
      }
    }

    const db = admin.default.firestore();

    // Convert frames to the FrameData format for Firestore
    const frameData = data.frames.map(m => ({
      matchId: m.matchId,
      date: m.date,
      home: m.home,
      away: m.away,
      division: m.division,
      frames: m.frames.map(f => ({
        frameNum: f.frameNum,
        homePlayer: f.homePlayer,
        awayPlayer: f.awayPlayer,
        winner: f.winner,
        breakDish: f.breakDish,
        forfeit: f.forfeit,
      })),
    }));

    // Season payload WITHOUT frames (frames go to subcollection)
    // Use generic field name 'playerStats' instead of season-specific 'players2526'
    const seasonPayload = {
      results: data.results.map(r => ({
        date: r.date,
        home: r.home,
        away: r.away,
        home_score: r.home_score,
        away_score: r.away_score,
        division: r.division,
        frames: r.frames,
        ...(r.cup ? { cup: true } : {}),
      })),
      fixtures: data.fixtures,
      players: data.players,
      rosters: data.rosters,
      playerStats: data.players2526,
      divisions: data.divisions,
      lastUpdated: Date.now(),
      lastSyncedFrom: config.site,
    };

    // Write to new multi-league path
    const leagueSeasonRef = db.collection('leagues').doc(config.leagueId).collection('seasons').doc(config.seasonId);
    await leagueSeasonRef.set(seasonPayload);

    // Write frames to subcollection (one doc per match)
    const framesCollectionRef = leagueSeasonRef.collection('frames');
    const BATCH_LIMIT = 500; // Firestore batch limit
    for (let i = 0; i < frameData.length; i += BATCH_LIMIT) {
      const batch = db.batch();
      const chunk = frameData.slice(i, i + BATCH_LIMIT);
      for (const frame of chunk) {
        const frameDocRef = framesCollectionRef.doc(frame.matchId);
        batch.set(frameDocRef, frame);
      }
      await batch.commit();
    }
    log(`Firestore: ${frameData.length} frame docs written to subcollection`);

    // Write player search index (denormalized for cross-league search)
    await writePlayerIndex(db, data.players2526, config);

    // Also write/update league metadata
    const leagueRef = db.collection('leagues').doc(config.leagueId);
    const leagueSnap = await leagueRef.get();
    const divisionCodes = Object.keys(data.divisions);

    if (!leagueSnap.exists) {
      await leagueRef.set({
        name: config.leagueName,
        shortName: config.shortName,
        seasons: [{
          id: config.seasonId,
          label: `20${config.seasonId.slice(0, 2)}/${config.seasonId.slice(2)}`,
          current: true,
          status: 'active',
          divisions: divisionCodes,
        }],
      });
    }

    log(`Firestore: leagues/${config.leagueId}/seasons/${config.seasonId} written successfully`);
  } catch (err) {
    log('Firestore write failed (credentials may not be configured)', 'ERROR');
    log(err instanceof Error ? err.message : String(err), 'ERROR');
    log('JSON backup files were still written successfully.', 'WARN');
  }
}

/**
 * Write a denormalized player index for cross-league search.
 * Each index doc contains league metadata + player names with summary stats.
 */
async function writePlayerIndex(
  db: FirebaseFirestore.Firestore,
  players2526: Record<string, PlayerStats>,
  config: LeagueConfig
) {
  try {
    const indexId = `${config.leagueId}_${config.seasonId}`;
    const indexRef = db.collection('players_index').doc(indexId);

    // Build a lightweight player map with just search-relevant data
    const playersSummary: Record<string, { p: number; w: number; pct: number; teams: string[] }> = {};
    for (const [name, data] of Object.entries(players2526)) {
      playersSummary[name] = {
        p: data.total.p,
        w: data.total.w,
        pct: data.total.pct,
        teams: data.teams.map(t => t.team),
      };
    }

    await indexRef.set({
      leagueId: config.leagueId,
      seasonId: config.seasonId,
      leagueName: config.leagueName,
      leagueShortName: config.shortName,
      players: playersSummary,
      lastUpdated: Date.now(),
    });

    log(`Firestore: players_index/${indexId} written (${Object.keys(playersSummary).length} players)`);
  } catch (err) {
    log(`Failed to write player index: ${err instanceof Error ? err.message : err}`, 'WARN');
  }
}

// --- RackEmApp sync pipeline ---

async function syncRackEmAppPipeline(
  leagueKey: string,
  config: LeagueConfig,
  options: SyncOptions
): Promise<SyncResult> {
  const { dryRun = false, writeJsonFiles = true, existingData } = options;
  const syncStartTime = Date.now();

  try {
    log(`=== RackEmApp → Firestore Sync ===`);
    log(`League: ${config.leagueName} (${leagueKey})`);
    log(`Season: ${config.seasonId}`);
    log(`Output: ${config.dataDir}`);
    if (dryRun) log(`Mode: DRY RUN (Firestore writes skipped)`, 'WARN');
    log('');

    // Run the rackemapp scraper
    const scraped = await syncRackEmAppLeague(config, options);

    // Load existing players.json (24/25 historical data)
    let players2425: Record<string, unknown> = {};
    if (existingData?.players) {
      players2425 = existingData.players;
      log(`24/25 players loaded: ${Object.keys(players2425).length} (from provided data)`);
    } else {
      const playersPath = path.join(config.dataDir, 'players.json');
      if (fs.existsSync(playersPath)) {
        players2425 = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
        log(`24/25 players loaded: ${Object.keys(players2425).length}`);
      }
    }

    // Use scraped data, fallback to existing if scraped is empty
    let players2526 = scraped.players2526;
    let rosters = scraped.rosters;

    if (Object.keys(scraped.players2526).length === 0) {
      if (existingData?.players2526) {
        log('No frame data scraped -- keeping existing players2526 (from provided data)', 'WARN');
        players2526 = existingData.players2526;
      } else {
        const existingPlayers2526Path = path.join(config.dataDir, 'players2526.json');
        if (fs.existsSync(existingPlayers2526Path)) {
          log('No frame data scraped -- keeping existing players2526.json', 'WARN');
          players2526 = JSON.parse(fs.readFileSync(existingPlayers2526Path, 'utf8'));
        }
      }
    }
    if (Object.keys(scraped.rosters).length === 0) {
      if (existingData?.rosters) {
        log('No frame data scraped -- keeping existing rosters (from provided data)', 'WARN');
        rosters = existingData.rosters;
      } else {
        const existingRostersPath = path.join(config.dataDir, 'rosters.json');
        if (fs.existsSync(existingRostersPath)) {
          log('No frame data scraped -- keeping existing rosters.json', 'WARN');
          rosters = JSON.parse(fs.readFileSync(existingRostersPath, 'utf8'));
        }
      }
    }

    // Write JSON backup files
    if (writeJsonFiles) {
      log('Writing JSON backup files...');
      if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });

      const files: [string, unknown][] = [
        ['results.json', scraped.results],
        ['fixtures.json', scraped.fixtures],
        ['rosters.json', rosters],
        ['players2526.json', players2526],
        ['frames.json', scraped.frames],
      ];

      for (const [filename, data] of files) {
        const filePath = path.join(config.dataDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        const stat = fs.statSync(filePath);
        log(`${filename}: ${(stat.size / 1024).toFixed(1)} KB`);
      }
    } else {
      log('Skipping JSON file writes (cloud mode)');
    }

    // Write to Firestore
    if (dryRun) {
      log('Skipping Firestore write (--dry-run)', 'WARN');
    } else {
      log('Writing to Firestore...');
      await writeToFirestore({
        results: scraped.results,
        fixtures: scraped.fixtures,
        frames: scraped.frames,
        players: players2425,
        rosters,
        players2526,
        divisions: scraped.divisions,
      }, config);
    }

    const durationMs = Date.now() - syncStartTime;
    log(`=== Sync complete ===`);
    log(`Total HTTP requests: ${scraped.requestCount}`);
    log(`Skipped frames (incremental): ${scraped.skippedFrames}`);
    log(`Results: ${scraped.results.length}`);
    log(`Fixtures: ${scraped.fixtures.length}`);
    log(`Matches with frames: ${scraped.frames.length}`);
    log(`Players (25/26): ${Object.keys(players2526).length}`);
    log(`Duration: ${Math.round(durationMs / 1000)}s`);

    // Write sync metadata
    if (!dryRun) {
      try {
        const admin = await import('firebase-admin');
        if (!admin.default.apps.length) {
          const keyPaths = [
            path.resolve('service-account.json'),
            path.resolve('serviceAccountKey.json'),
          ];
          let initialized = false;
          for (const keyPath of keyPaths) {
            if (fs.existsSync(keyPath)) {
              const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
              admin.default.initializeApp({
                credential: admin.default.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id,
              });
              initialized = true;
              break;
            }
          }
          if (!initialized) {
            admin.default.initializeApp({
              credential: admin.default.credential.applicationDefault(),
            });
          }
        }
        const db = admin.default.firestore();
        await db.collection('leagues').doc(config.leagueId)
          .collection('syncMetadata').doc('latest').set({
            success: true,
            syncedAt: Date.now(),
            results: scraped.results.length,
            fixtures: scraped.fixtures.length,
            frames: scraped.frames.length,
            players: Object.keys(players2526).length,
            requestCount: scraped.requestCount,
            skippedFrames: scraped.skippedFrames,
            durationMs,
            source: !writeJsonFiles ? 'cloud-function' : 'manual',
          });
        log(`Sync metadata written to leagues/${config.leagueId}/syncMetadata/latest`);
      } catch (err) {
        log(`Failed to write sync metadata: ${err instanceof Error ? err.message : err}`, 'WARN');
      }
    }

    return {
      success: true,
      results: scraped.results.length,
      fixtures: scraped.fixtures.length,
      frames: scraped.frames.length,
      players: Object.keys(players2526).length,
      requestCount: scraped.requestCount,
      skippedFrames: scraped.skippedFrames,
      durationMs,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`RackEmApp sync failed: ${errorMessage}`, 'ERROR');
    return {
      success: false,
      results: 0,
      fixtures: 0,
      frames: 0,
      players: 0,
      requestCount: 0,
      skippedFrames: 0,
      durationMs: Date.now() - syncStartTime,
      error: errorMessage,
    };
  }
}

// --- Main sync function ---

export interface SyncResult {
  success: boolean;
  results: number;
  fixtures: number;
  frames: number;
  players: number;
  requestCount: number;
  skippedFrames: number;
  durationMs: number;
  error?: string;
}

export async function syncLeagueData(
  leagueKey: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const { dryRun = false, projectRoot = process.cwd(), incremental = false, writeJsonFiles = true, existingData } = options;
  const syncStartTime = Date.now();

  // Reset state for this sync
  requestCount = 0;
  adaptiveMultiplier = 1.0;
  let skippedFrames = 0;

  try {
    // Load league configs
    const LEAGUE_CONFIGS = loadLeagueConfigs(projectRoot);
    const config = LEAGUE_CONFIGS[leagueKey];
    if (!config) {
      throw new Error(`Unknown league: "${leagueKey}". Available: ${Object.keys(LEAGUE_CONFIGS).join(', ')}`);
    }

    // Dispatch to rackemapp scraper if this is a rackemapp league
    if (config.site === 'rackemapp') {
      return syncRackEmAppPipeline(leagueKey, config, options);
    }

    log(`=== LeagueAppLive → Firestore Sync ===`);
    log(`League: ${config.leagueName} (${leagueKey})`);
    log(`Season: ${config.seasonId}`);
    log(`Output: ${config.dataDir}`);
    if (dryRun) log(`Mode: DRY RUN (Firestore writes skipped)`, 'WARN');
    if (incremental) log(`Mode: INCREMENTAL (skipping already-scraped frames)`);
    log('');

    // 1. Scrape standings per division → team names
    log('Step 1: Scraping standings...');
    const divisionTeams: Record<string, string[]> = {};
    for (const div of config.divisions) {
      divisionTeams[div.code] = await scrapeStandings(div.code, div.siteGroup, config);
    }

    // Build divisions object
    const divisionsMap: Record<string, { name: string; teams: string[] }> = {};
    for (const div of config.divisions) {
      divisionsMap[div.code] = {
        name: div.siteGroup
          .replace('Sunday', 'Sun').replace('Wednesday', 'Wed')
          .replace('Division', 'Div'),
        teams: divisionTeams[div.code],
      };
    }

    // Build set of all known teams in this league (for cross-league filtering)
    const knownTeams = new Set<string>();
    for (const teams of Object.values(divisionTeams)) {
      for (const t of teams) knownTeams.add(t);
    }

    // 2. Scrape team match results
    log('Step 2: Scraping team results...');
    const allResults: ScrapedResult[] = [];
    const matchIdsSeen = new Set<string>();
    let crossLeagueFiltered = 0;

    for (const div of config.divisions) {
      for (const team of divisionTeams[div.code]) {
        const teamResults = await scrapeTeamMatches(team, div.code, config);
        for (const r of teamResults) {
          if (matchIdsSeen.has(r.matchId)) continue;
          // Filter out matches where either team isn't in this league
          if (!knownTeams.has(r.home) || !knownTeams.has(r.away)) {
            crossLeagueFiltered++;
            matchIdsSeen.add(r.matchId); // still mark seen to avoid re-checking
            continue;
          }
          matchIdsSeen.add(r.matchId);
          allResults.push(r);
        }
      }
    }
    if (crossLeagueFiltered > 0) {
      log(`Filtered ${crossLeagueFiltered} cross-league matches`);
    }
    log(`Total unique results: ${allResults.length}`);

    // 2b. Resolve dates from existing results + fixtures
    // The site doesn't show dates on match detail pages
    log('Resolving dates from existing data...');
    const dateMap = new Map<string, string>(); // "home:away" → date

    if (existingData?.results) {
      for (const r of existingData.results) {
        dateMap.set(`${r.home}:${r.away}`, r.date);
      }
      log(`Loaded ${existingData.results.length} existing results (from provided data)`);
    } else {
      const existingResultsPath = path.join(config.dataDir, 'results.json');
      if (fs.existsSync(existingResultsPath)) {
        const existing = JSON.parse(fs.readFileSync(existingResultsPath, 'utf8')) as Array<{ date: string; home: string; away: string }>;
        for (const r of existing) {
          dateMap.set(`${r.home}:${r.away}`, r.date);
        }
      }
    }

    if (existingData?.fixtures) {
      for (const f of existingData.fixtures) {
        if (!dateMap.has(`${f.home}:${f.away}`)) {
          dateMap.set(`${f.home}:${f.away}`, f.date);
        }
      }
    } else {
      const existingFixturesPath = path.join(config.dataDir, 'fixtures.json');
      if (fs.existsSync(existingFixturesPath)) {
        const existing = JSON.parse(fs.readFileSync(existingFixturesPath, 'utf8')) as Array<{ date: string; home: string; away: string }>;
        for (const f of existing) {
          if (!dateMap.has(`${f.home}:${f.away}`)) {
            dateMap.set(`${f.home}:${f.away}`, f.date);
          }
        }
      }
    }

    let datesResolved = 0;
    let datesMissing = 0;
    for (const r of allResults) {
      const key = `${r.home}:${r.away}`;
      const date = dateMap.get(key);
      if (date) {
        r.date = date;
        datesResolved++;
      } else {
        datesMissing++;
        // Use a placeholder -- these are new matches not in existing data
        r.date = '01-01-2026';
        log(`WARNING: No date for ${r.home} vs ${r.away} (matchId: ${r.matchId})`, 'WARN');
      }
    }
    log(`Dates resolved: ${datesResolved}, missing: ${datesMissing}`);

    // 2c. Scrape cup results
    if (config.cupGroups && config.cupGroups.length > 0) {
      log('Step 2c: Scraping cup results...');
      for (const cup of config.cupGroups) {
        const cupResults = await scrapeCupResults(cup.code, cup.siteGroup, config);
        const cupTeams = new Set<string>();
        for (const r of cupResults) {
          if (!matchIdsSeen.has(r.matchId)) {
            matchIdsSeen.add(r.matchId);
            allResults.push(r);
          }
          cupTeams.add(r.home);
          cupTeams.add(r.away);
        }
        // Add cup division to divisions map
        divisionsMap[cup.code] = {
          name: 'Cup',
          teams: [...cupTeams].sort(),
        };
      }
      log(`Total results (incl. cup): ${allResults.length}`);
    }

    // 3. Scrape frame details for each match
    log('Step 3: Scraping frame details...');
    const allFrames: ScrapedMatchFrames[] = [];
    const processedMatchIds = new Set<string>();
    let frameIdx = 0;

    // Incremental: load existing frames to skip already-scraped matches
    const existingFramesMap = new Map<string, ScrapedMatchFrames>();
    if (incremental) {
      if (existingData?.frames) {
        for (const f of existingData.frames) {
          existingFramesMap.set(f.matchId, f);
        }
        log(`Incremental: ${existingFramesMap.size} matches already have frame data (from provided data)`);
      } else {
        const existingFramesPath = path.join(config.dataDir, 'frames.json');
        if (fs.existsSync(existingFramesPath)) {
          const existingFrames = JSON.parse(fs.readFileSync(existingFramesPath, 'utf8')) as ScrapedMatchFrames[];
          for (const f of existingFrames) {
            existingFramesMap.set(f.matchId, f);
          }
          log(`Incremental: ${existingFramesMap.size} matches already have frame data`);
        }
      }
    }

    for (const result of allResults) {
      if (processedMatchIds.has(result.matchId)) continue;
      processedMatchIds.add(result.matchId);

      // Skip cup results (no frame-level data available on site)
      if (result.cup) continue;

      // Incremental: skip matches that already have frame data
      if (incremental && existingFramesMap.has(result.matchId)) {
        const existing = existingFramesMap.get(result.matchId)!;
        if (existing.frames.length > 0) {
          allFrames.push(existing);
          skippedFrames++;
          continue;
        }
      }

      // Batch pause every BATCH_SIZE requests
      if (frameIdx > 0 && frameIdx % BATCH_SIZE === 0) {
        const batchPause = BATCH_PAUSE_MIN + Math.random() * (BATCH_PAUSE_MAX - BATCH_PAUSE_MIN);
        log(`Batch pause: ${Math.round(batchPause / 1000)}s before next batch...`);
        await sleep(batchPause);
      }
      frameIdx++;

      const frameData = await scrapeFrameDetails(result.matchId, result.home, {
        home: result.home,
        away: result.away,
        date: result.date,
        division: result.division,
      }, config);
      if (frameData.frames.length > 0) {
        allFrames.push(frameData);
      }
    }
    if (skippedFrames > 0) {
      log(`Incremental: skipped ${skippedFrames} already-scraped matches, fetched ${frameIdx} new`);
    }
    log(`Total matches with frames: ${allFrames.length}`);

    // 4. Scrape fixtures (league + cup)
    log('Step 4: Scraping fixtures...');
    const allFixtures: ScrapedFixture[] = [];
    for (const div of config.divisions) {
      const divFixtures = await scrapeFixtures(div.code, div.siteGroup, config);
      allFixtures.push(...divFixtures);
    }
    if (config.cupGroups && config.cupGroups.length > 0) {
      for (const cup of config.cupGroups) {
        const cupFixtures = await scrapeCupFixtures(cup.code, cup.siteGroup, config);
        allFixtures.push(...cupFixtures);
      }
    }
    log(`Total fixtures: ${allFixtures.length}`);

    // 5. Aggregate frame data into player stats and rosters
    log('Step 5: Aggregating player stats...');
    const { players2526: scrapedPlayers2526, rosters: scrapedRosters } = aggregatePlayerStats(allFrames, config);
    log(`Players from frames: ${Object.keys(scrapedPlayers2526).length}`);
    log(`Roster entries from frames: ${Object.keys(scrapedRosters).length}`);

    // 6. Load existing data (keep what we can't scrape)
    let players2425: Record<string, unknown> = {};
    if (existingData?.players) {
      players2425 = existingData.players;
      log(`24/25 players loaded: ${Object.keys(players2425).length} (from provided data)`);
    } else {
      const playersPath = path.join(config.dataDir, 'players.json');
      if (fs.existsSync(playersPath)) {
        players2425 = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
        log(`24/25 players loaded: ${Object.keys(players2425).length}`);
      }
    }

    // Load existing players2526 and rosters as fallback if scraped frame data is sparse
    let players2526 = scrapedPlayers2526;
    let rosters = scrapedRosters;

    if (Object.keys(scrapedPlayers2526).length === 0) {
      if (existingData?.players2526) {
        log('No frame data scraped -- keeping existing players2526 (from provided data)', 'WARN');
        players2526 = existingData.players2526;
      } else {
        const existingPlayers2526Path = path.join(config.dataDir, 'players2526.json');
        if (fs.existsSync(existingPlayers2526Path)) {
          log('No frame data scraped -- keeping existing players2526.json', 'WARN');
          players2526 = JSON.parse(fs.readFileSync(existingPlayers2526Path, 'utf8'));
        }
      }
    }
    if (Object.keys(scrapedRosters).length === 0) {
      if (existingData?.rosters) {
        log('No frame data scraped -- keeping existing rosters (from provided data)', 'WARN');
        rosters = existingData.rosters;
      } else {
        const existingRostersPath = path.join(config.dataDir, 'rosters.json');
        if (fs.existsSync(existingRostersPath)) {
          log('No frame data scraped -- keeping existing rosters.json', 'WARN');
          rosters = JSON.parse(fs.readFileSync(existingRostersPath, 'utf8'));
        }
      }
    }

    // Build final results: merge scraped with existing to preserve dates
    // Scraped results have scores from the live site; existing has dates
    const resultsJson = allResults.map(r => ({
      date: r.date,
      home: r.home,
      away: r.away,
      home_score: r.home_score,
      away_score: r.away_score,
      division: r.division,
      frames: r.frames,
      ...(r.cup ? { cup: true } : {}),
    }));

    // 7. Write to JSON backup files (skipped in cloud mode)
    if (writeJsonFiles) {
      log('Step 6: Writing JSON backup files...');
      if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });

      const files: [string, unknown][] = [
        ['results.json', resultsJson],
        ['fixtures.json', allFixtures],
        ['rosters.json', rosters],
        ['players2526.json', players2526],
        ['frames.json', allFrames],
      ];

      for (const [filename, data] of files) {
        const filePath = path.join(config.dataDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        const stat = fs.statSync(filePath);
        log(`${filename}: ${(stat.size / 1024).toFixed(1)} KB`);
      }
    } else {
      log('Step 6: Skipping JSON file writes (cloud mode)');
    }

    // 8. Write to Firestore (unless --dry-run)
    if (dryRun) {
      log('Step 7: Skipping Firestore write (--dry-run)', 'WARN');
    } else {
      log('Step 7: Writing to Firestore...');
      await writeToFirestore({
        results: allResults,
        fixtures: allFixtures,
        frames: allFrames,
        players: players2425,
        rosters,
        players2526,
        divisions: divisionsMap,
      }, config);
    }

    const durationMs = Date.now() - syncStartTime;
    log(`=== Sync complete ===`);
    log(`Total HTTP requests: ${requestCount}`);
    log(`Skipped frames (incremental): ${skippedFrames}`);
    log(`Results: ${allResults.length}`);
    log(`Fixtures: ${allFixtures.length}`);
    log(`Matches with frames: ${allFrames.length}`);
    log(`Players (25/26): ${Object.keys(players2526).length}`);
    log(`Duration: ${Math.round(durationMs / 1000)}s`);

    // Write sync metadata to Firestore
    if (!dryRun) {
      try {
        const admin = await import('firebase-admin');
        if (!admin.default.apps.length) {
          const keyPaths = [
            path.resolve('service-account.json'),
            path.resolve('serviceAccountKey.json'),
          ];
          let initialized = false;
          for (const keyPath of keyPaths) {
            if (fs.existsSync(keyPath)) {
              const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
              admin.default.initializeApp({
                credential: admin.default.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id,
              });
              initialized = true;
              break;
            }
          }
          if (!initialized) {
            admin.default.initializeApp({
              credential: admin.default.credential.applicationDefault(),
            });
          }
        }
        const db = admin.default.firestore();
        await db.collection('leagues').doc(config.leagueId)
          .collection('syncMetadata').doc('latest').set({
            success: true,
            syncedAt: Date.now(),
            results: allResults.length,
            fixtures: allFixtures.length,
            frames: allFrames.length,
            players: Object.keys(players2526).length,
            requestCount,
            skippedFrames,
            durationMs,
            source: !writeJsonFiles ? 'cloud-function' : 'manual',
          });
        log(`Sync metadata written to leagues/${config.leagueId}/syncMetadata/latest`);
      } catch (err) {
        log(`Failed to write sync metadata: ${err instanceof Error ? err.message : err}`, 'WARN');
      }
    }

    return {
      success: true,
      results: allResults.length,
      fixtures: allFixtures.length,
      frames: allFrames.length,
      players: Object.keys(players2526).length,
      requestCount,
      skippedFrames,
      durationMs,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log(`Sync failed: ${errorMessage}`, 'ERROR');
    return {
      success: false,
      results: 0,
      fixtures: 0,
      frames: 0,
      players: 0,
      requestCount,
      skippedFrames,
      durationMs: Date.now() - syncStartTime,
      error: errorMessage,
    };
  }
}
