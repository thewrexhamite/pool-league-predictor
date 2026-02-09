import * as fs from 'fs';
import * as path from 'path';
import { parse as parseHTML } from 'node-html-parser';
import { normalizePlayerName } from '../../scripts/normalize-players';

/**
 * LeagueAppLive → Firestore + JSON sync library.
 *
 * Provides reusable sync functions for scraping results, fixtures, and frame-level
 * player data from LeagueAppLive leagues, then writing to Firestore and static JSON files.
 */

const BASE_URL = 'https://live.leagueapplive.com';

// --- League configuration ---

export interface LeagueConfig {
  site: string;           // LeagueAppLive sitename parameter
  leagueId: string;       // Firestore league ID
  seasonId: string;       // Firestore season ID
  leagueName: string;     // Full display name
  shortName: string;      // Short display name
  dataDir: string;        // Output directory for JSON files
  divisions: { code: string; siteGroup: string }[];
  teamNameMap: Record<string, string>;
}

export interface SyncOptions {
  dryRun?: boolean;
  projectRoot?: string;
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

const BASE_DELAY = 1500;
const BATCH_SIZE = 10;
const BATCH_PAUSE_MIN = 10000;
const BATCH_PAUSE_MAX = 20000;

function randomDelay(): number {
  return BASE_DELAY + Math.random() * BASE_DELAY;
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
}

export interface ScrapedFixture {
  date: string;
  home: string;
  away: string;
  division: string;
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
  const resp = await fetch(fullUrl, {
    headers: {
      ...HEADERS,
      'Referer': `${BASE_URL}/?sitename=${config.site}`,
    },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${fullUrl}`);
  return resp.text();
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
      admin.default.initializeApp({
        credential: admin.default.credential.applicationDefault(),
      });
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

    const seasonPayload = {
      results: data.results.map(r => ({
        date: r.date,
        home: r.home,
        away: r.away,
        home_score: r.home_score,
        away_score: r.away_score,
        division: r.division,
        frames: r.frames,
      })),
      fixtures: data.fixtures,
      frames: frameData,
      players: data.players,
      rosters: data.rosters,
      players2526: data.players2526,
      divisions: data.divisions,
      lastUpdated: Date.now(),
      lastSyncedFrom: 'leagueapplive',
    };

    // Write to new multi-league path
    const leagueSeasonRef = db.collection('leagues').doc(config.leagueId).collection('seasons').doc(config.seasonId);
    await leagueSeasonRef.set(seasonPayload);

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
          divisions: divisionCodes,
        }],
      });
    }

    // Write to legacy path for backward compatibility (wrexham only)
    if (config.leagueId === 'wrexham') {
      const legacyRef = db.collection('seasons').doc(config.seasonId);
      await legacyRef.set(seasonPayload);
      log(`Firestore: seasons/${config.seasonId} (legacy) written successfully`);
    }

    log(`Firestore: leagues/${config.leagueId}/seasons/${config.seasonId} written successfully`);
  } catch (err) {
    log('Firestore write failed (credentials may not be configured)', 'ERROR');
    log(err instanceof Error ? err.message : String(err), 'ERROR');
    log('JSON backup files were still written successfully.', 'WARN');
  }
}

// --- Main sync function ---

export async function syncLeagueData(
  leagueKey: string,
  options: SyncOptions = {}
): Promise<{
  success: boolean;
  results: number;
  fixtures: number;
  frames: number;
  players: number;
  error?: string;
}> {
  const { dryRun = false, projectRoot = process.cwd() } = options;

  // Reset request counter for this sync
  requestCount = 0;

  try {
    // Load league configs
    const LEAGUE_CONFIGS = loadLeagueConfigs(projectRoot);
    const config = LEAGUE_CONFIGS[leagueKey];
    if (!config) {
      throw new Error(`Unknown league: "${leagueKey}". Available: ${Object.keys(LEAGUE_CONFIGS).join(', ')}`);
    }

    log(`=== LeagueAppLive → Firestore Sync ===`);
    log(`League: ${config.leagueName} (${leagueKey})`);
    log(`Season: ${config.seasonId}`);
    log(`Output: ${config.dataDir}`);
    if (dryRun) log(`Mode: DRY RUN (Firestore writes skipped)`, 'WARN');
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

    // 2b. Resolve dates from existing results.json + fixtures.json
    // The site doesn't show dates on match detail pages
    log('Resolving dates from existing data...');
    const existingResultsPath = path.join(config.dataDir, 'results.json');
    const existingFixturesPath = path.join(config.dataDir, 'fixtures.json');
    const dateMap = new Map<string, string>(); // "home:away" → date

    if (fs.existsSync(existingResultsPath)) {
      const existing = JSON.parse(fs.readFileSync(existingResultsPath, 'utf8')) as Array<{ date: string; home: string; away: string }>;
      for (const r of existing) {
        dateMap.set(`${r.home}:${r.away}`, r.date);
      }
    }
    if (fs.existsSync(existingFixturesPath)) {
      const existing = JSON.parse(fs.readFileSync(existingFixturesPath, 'utf8')) as Array<{ date: string; home: string; away: string }>;
      for (const f of existing) {
        if (!dateMap.has(`${f.home}:${f.away}`)) {
          dateMap.set(`${f.home}:${f.away}`, f.date);
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

    // 3. Scrape frame details for each match
    log('Step 3: Scraping frame details...');
    const allFrames: ScrapedMatchFrames[] = [];
    const processedMatchIds = new Set<string>();
    let frameIdx = 0;

    for (const result of allResults) {
      if (processedMatchIds.has(result.matchId)) continue;
      processedMatchIds.add(result.matchId);

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
    log(`Total matches with frames: ${allFrames.length}`);

    // 4. Scrape fixtures
    log('Step 4: Scraping fixtures...');
    const allFixtures: ScrapedFixture[] = [];
    for (const div of config.divisions) {
      const divFixtures = await scrapeFixtures(div.code, div.siteGroup, config);
      allFixtures.push(...divFixtures);
    }
    log(`Total fixtures: ${allFixtures.length}`);

    // 5. Aggregate frame data into player stats and rosters
    log('Step 5: Aggregating player stats...');
    const { players2526: scrapedPlayers2526, rosters: scrapedRosters } = aggregatePlayerStats(allFrames, config);
    log(`Players from frames: ${Object.keys(scrapedPlayers2526).length}`);
    log(`Roster entries from frames: ${Object.keys(scrapedRosters).length}`);

    // 6. Load existing data (keep what we can't scrape)
    const playersPath = path.join(config.dataDir, 'players.json');
    let players2425: Record<string, unknown> = {};
    if (fs.existsSync(playersPath)) {
      players2425 = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
      log(`24/25 players loaded: ${Object.keys(players2425).length}`);
    }

    // Load existing players2526 and rosters as fallback if scraped frame data is sparse
    const existingPlayers2526Path = path.join(config.dataDir, 'players2526.json');
    const existingRostersPath = path.join(config.dataDir, 'rosters.json');
    let players2526 = scrapedPlayers2526;
    let rosters = scrapedRosters;

    if (Object.keys(scrapedPlayers2526).length === 0 && fs.existsSync(existingPlayers2526Path)) {
      log('No frame data scraped -- keeping existing players2526.json', 'WARN');
      players2526 = JSON.parse(fs.readFileSync(existingPlayers2526Path, 'utf8'));
    }
    if (Object.keys(scrapedRosters).length === 0 && fs.existsSync(existingRostersPath)) {
      log('No frame data scraped -- keeping existing rosters.json', 'WARN');
      rosters = JSON.parse(fs.readFileSync(existingRostersPath, 'utf8'));
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
    }));

    // 7. Write to JSON backup files
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

    log(`=== Sync complete ===`);
    log(`Total HTTP requests: ${requestCount}`);
    log(`Results: ${allResults.length}`);
    log(`Fixtures: ${allFixtures.length}`);
    log(`Matches with frames: ${allFrames.length}`);
    log(`Players (25/26): ${Object.keys(players2526).length}`);

    return {
      success: true,
      results: allResults.length,
      fixtures: allFixtures.length,
      frames: allFrames.length,
      players: Object.keys(players2526).length,
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
      error: errorMessage,
    };
  }
}
