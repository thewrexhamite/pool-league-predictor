import * as fs from 'fs';
import * as path from 'path';
import { parse as parseHTML } from 'node-html-parser';

/**
 * LeagueAppLive → Firestore + JSON sync script.
 *
 * Scrapes results, fixtures, and frame-level player data from the
 * Wrexham pool league on LeagueAppLive, then writes to Firestore
 * and static JSON backup files.
 *
 * Usage:
 *   npm run sync-data
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run sync-data
 */

const BASE_URL = 'https://live.leagueapplive.com';
const SITE = 'wrexham';
const DATA_DIR = path.join(__dirname, '..', 'data');
const RATE_LIMIT_MS = 200;

// Configurable league/season for multi-league Firestore paths
const LEAGUE_ID = process.env.LEAGUE_ID || 'wrexham';
const SEASON_ID = process.env.SEASON_ID || '2526';

// Division mapping
const DIVISIONS = [
  { code: 'SD1' as const, siteGroup: 'Sunday Division 1' },
  { code: 'SD2' as const, siteGroup: 'Sunday Division 2' },
  { code: 'WD1' as const, siteGroup: 'Wednesday Division 1' },
  { code: 'WD2' as const, siteGroup: 'Wednesday Division 2' },
];

// Team name mapping: site name → app name
// Add entries here when the site uses a different name than the app
const TEAM_NAME_MAP: Record<string, string> = {
  // e.g. 'Golden Lion Wxm': 'Golden Lion Wxm',
  // Add mappings as needed if site names diverge from app names
};

function mapTeamName(siteName: string): string {
  return TEAM_NAME_MAP[siteName] || siteName;
}

// Types
interface ScrapedResult {
  date: string;
  home: string;
  away: string;
  home_score: number;
  away_score: number;
  division: string;
  frames: number;
  matchId: string;
}

interface ScrapedFixture {
  date: string;
  home: string;
  away: string;
  division: string;
}

interface ScrapedFrame {
  frameNum: number;
  set: number;
  homePlayer: string;
  awayPlayer: string;
  winner: 'home' | 'away';
  breakDish: boolean;
  forfeit: boolean;
}

interface ScrapedMatchFrames {
  matchId: string;
  date: string;
  home: string;
  away: string;
  division: string;
  frames: ScrapedFrame[];
}

interface PlayerStats {
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

let requestCount = 0;

async function fetchPage(url: string): Promise<string> {
  requestCount++;
  if (requestCount > 1) await sleep(RATE_LIMIT_MS);
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}/${url}`;
  process.stdout.write(`  [${requestCount}] ${fullUrl.substring(BASE_URL.length)}...\n`);
  const resp = await fetch(fullUrl);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${fullUrl}`);
  return resp.text();
}

function buildUrl(page: string, params: Record<string, string>): string {
  const sp = new URLSearchParams({ sitename: SITE, ...params });
  return `${BASE_URL}/${page}?${sp.toString()}`;
}

// --- Scraping functions ---

async function scrapeStandings(divCode: string, siteGroup: string): Promise<string[]> {
  const html = await fetchPage(buildUrl('table5.php', { sel_group: siteGroup }));
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
      const mapped = mapTeamName(name);
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
          const name = mapTeamName(link.text.trim());
          if (name && !teams.includes(name)) teams.push(name);
        }
      }
    }
  }

  console.log(`  ${divCode}: ${teams.length} teams`);
  return teams;
}

async function scrapeTeamMatches(team: string, divCode: string): Promise<ScrapedResult[]> {
  const html = await fetchPage(buildUrl('table5.php', {
    act1: 'details1',
    name: team,
  }));
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
        teamNames.push(mapTeamName(text));
      }
    }

    if (teamNames.length < 2) {
      // Try: first two text cells in the row
      for (let i = 0; i < cellTexts.length && teamNames.length < 2; i++) {
        const text = cellTexts[i];
        if (text && text.length > 1 && !/^\d+$/.test(text) &&
            !text.toLowerCase().includes('show') && !text.toLowerCase().includes('frame')) {
          const mapped = mapTeamName(text);
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
  matchMeta: { home: string; away: string; date: string; division: string }
): Promise<ScrapedMatchFrames> {
  const html = await fetchPage(buildUrl('table5.php', {
    act1: 'details1',
    name: team,
    act2: 'details2',
    matchid: matchId,
  }));
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

async function scrapeFixtures(divCode: string, siteGroup: string): Promise<ScrapedFixture[]> {
  const html = await fetchPage(buildUrl('fixture1.php', { sel_group: siteGroup }));
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
          if (teamIdx === 0) { home = mapTeamName(text); teamIdx++; }
          else if (teamIdx === 1) { away = mapTeamName(text); teamIdx++; break; }
        }
        break;
      }
    }

    if (date && home && away) {
      fixtures.push({ date, home, away, division: divCode });
    }
  }

  console.log(`  ${divCode}: ${fixtures.length} fixtures`);
  return fixtures;
}

// --- Aggregation ---

function aggregatePlayerStats(
  allFrames: ScrapedMatchFrames[]
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
      // Home player
      if (frame.homePlayer) {
        rosterSets[homeRosterKey].add(frame.homePlayer);
        if (!playerTeamStats[frame.homePlayer]) playerTeamStats[frame.homePlayer] = {};
        if (!playerTeamStats[frame.homePlayer][match.home]) {
          playerTeamStats[frame.homePlayer][match.home] = { p: 0, w: 0, lag: 0, bdF: 0, bdA: 0, forf: 0 };
        }
        const stat = playerTeamStats[frame.homePlayer][match.home];
        stat.p++;
        if (frame.winner === 'home') {
          stat.w++;
          if (frame.breakDish) stat.bdF++;
        } else {
          if (frame.breakDish) stat.bdA++;
        }
        if (frame.forfeit) stat.forf++;
      }

      // Away player
      if (frame.awayPlayer) {
        rosterSets[awayRosterKey].add(frame.awayPlayer);
        if (!playerTeamStats[frame.awayPlayer]) playerTeamStats[frame.awayPlayer] = {};
        if (!playerTeamStats[frame.awayPlayer][match.away]) {
          playerTeamStats[frame.awayPlayer][match.away] = { p: 0, w: 0, lag: 0, bdF: 0, bdA: 0, forf: 0 };
        }
        const stat = playerTeamStats[frame.awayPlayer][match.away];
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

async function writeToFirestore(data: {
  results: ScrapedResult[];
  fixtures: ScrapedFixture[];
  frames: ScrapedMatchFrames[];
  players: Record<string, unknown>;
  rosters: Record<string, string[]>;
  players2526: Record<string, PlayerStats>;
  divisions: Record<string, { name: string; teams: string[] }>;
}) {
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
    const leagueSeasonRef = db.collection('leagues').doc(LEAGUE_ID).collection('seasons').doc(SEASON_ID);
    await leagueSeasonRef.set(seasonPayload);

    // Also write/update league metadata
    const leagueRef = db.collection('leagues').doc(LEAGUE_ID);
    const leagueSnap = await leagueRef.get();
    const divisionCodes = Object.keys(data.divisions);

    if (!leagueSnap.exists) {
      await leagueRef.set({
        name: `${LEAGUE_ID.charAt(0).toUpperCase() + LEAGUE_ID.slice(1)} Pool League`,
        shortName: LEAGUE_ID.charAt(0).toUpperCase() + LEAGUE_ID.slice(1),
        seasons: [{
          id: SEASON_ID,
          label: `20${SEASON_ID.slice(0, 2)}/${SEASON_ID.slice(2)}`,
          current: true,
          divisions: divisionCodes,
        }],
      });
    }

    // Write to legacy path for backward compatibility
    const legacyRef = db.collection('seasons').doc(SEASON_ID);
    await legacyRef.set(seasonPayload);

    console.log(`\nFirestore: leagues/${LEAGUE_ID}/seasons/${SEASON_ID} written successfully`);
    console.log(`Firestore: seasons/${SEASON_ID} (legacy) written successfully`);
  } catch (err) {
    console.error('\nFirestore write failed (credentials may not be configured):');
    console.error(err instanceof Error ? err.message : err);
    console.log('JSON backup files were still written successfully.');
  }
}

// --- Main ---

async function main() {
  console.log('=== LeagueAppLive → Firestore Sync ===\n');

  // 1. Scrape standings per division → team names
  console.log('Step 1: Scraping standings...');
  const divisionTeams: Record<string, string[]> = {};
  for (const div of DIVISIONS) {
    divisionTeams[div.code] = await scrapeStandings(div.code, div.siteGroup);
  }

  // Build divisions object
  const divisionsMap: Record<string, { name: string; teams: string[] }> = {};
  for (const div of DIVISIONS) {
    divisionsMap[div.code] = {
      name: div.siteGroup.replace('Sunday', 'Sun').replace('Wednesday', 'Wed').replace('Division', 'Div'),
      teams: divisionTeams[div.code],
    };
  }

  // 2. Scrape team match results
  console.log('\nStep 2: Scraping team results...');
  const allResults: ScrapedResult[] = [];
  const matchIdsSeen = new Set<string>();

  for (const div of DIVISIONS) {
    for (const team of divisionTeams[div.code]) {
      const teamResults = await scrapeTeamMatches(team, div.code);
      for (const r of teamResults) {
        if (!matchIdsSeen.has(r.matchId)) {
          matchIdsSeen.add(r.matchId);
          allResults.push(r);
        }
      }
    }
  }
  console.log(`  Total unique results: ${allResults.length}`);

  // 2b. Resolve dates from existing results.json + fixtures.json
  // The site doesn't show dates on match detail pages
  console.log('\n  Resolving dates from existing data...');
  const existingResultsPath = path.join(DATA_DIR, 'results.json');
  const existingFixturesPath = path.join(DATA_DIR, 'fixtures.json');
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
      console.log(`    WARNING: No date for ${r.home} vs ${r.away} (matchId: ${r.matchId})`);
    }
  }
  console.log(`  Dates resolved: ${datesResolved}, missing: ${datesMissing}`);

  // 3. Scrape frame details for each match
  console.log('\nStep 3: Scraping frame details...');
  const allFrames: ScrapedMatchFrames[] = [];
  const processedMatchIds = new Set<string>();

  for (const result of allResults) {
    if (processedMatchIds.has(result.matchId)) continue;
    processedMatchIds.add(result.matchId);

    const frameData = await scrapeFrameDetails(result.matchId, result.home, {
      home: result.home,
      away: result.away,
      date: result.date,
      division: result.division,
    });
    if (frameData.frames.length > 0) {
      allFrames.push(frameData);
    }
  }
  console.log(`  Total matches with frames: ${allFrames.length}`);

  // 4. Scrape fixtures
  console.log('\nStep 4: Scraping fixtures...');
  const allFixtures: ScrapedFixture[] = [];
  for (const div of DIVISIONS) {
    const divFixtures = await scrapeFixtures(div.code, div.siteGroup);
    allFixtures.push(...divFixtures);
  }
  console.log(`  Total fixtures: ${allFixtures.length}`);

  // 5. Aggregate frame data into player stats and rosters
  console.log('\nStep 5: Aggregating player stats...');
  const { players2526: scrapedPlayers2526, rosters: scrapedRosters } = aggregatePlayerStats(allFrames);
  console.log(`  Players from frames: ${Object.keys(scrapedPlayers2526).length}`);
  console.log(`  Roster entries from frames: ${Object.keys(scrapedRosters).length}`);

  // 6. Load existing data (keep what we can't scrape)
  const playersPath = path.join(DATA_DIR, 'players.json');
  let players2425: Record<string, unknown> = {};
  if (fs.existsSync(playersPath)) {
    players2425 = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
    console.log(`  24/25 players loaded: ${Object.keys(players2425).length}`);
  }

  // Load existing players2526 and rosters as fallback if scraped frame data is sparse
  const existingPlayers2526Path = path.join(DATA_DIR, 'players2526.json');
  const existingRostersPath = path.join(DATA_DIR, 'rosters.json');
  let players2526 = scrapedPlayers2526;
  let rosters = scrapedRosters;

  if (Object.keys(scrapedPlayers2526).length === 0 && fs.existsSync(existingPlayers2526Path)) {
    console.log('  No frame data scraped -- keeping existing players2526.json');
    players2526 = JSON.parse(fs.readFileSync(existingPlayers2526Path, 'utf8'));
  }
  if (Object.keys(scrapedRosters).length === 0 && fs.existsSync(existingRostersPath)) {
    console.log('  No frame data scraped -- keeping existing rosters.json');
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
  console.log('\nStep 6: Writing JSON backup files...');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const files: [string, unknown][] = [
    ['results.json', resultsJson],
    ['fixtures.json', allFixtures],
    ['rosters.json', rosters],
    ['players2526.json', players2526],
    ['frames.json', allFrames],
  ];

  for (const [filename, data] of files) {
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    const stat = fs.statSync(filePath);
    console.log(`  ${filename}: ${(stat.size / 1024).toFixed(1)} KB`);
  }

  // 8. Write to Firestore
  console.log('\nStep 7: Writing to Firestore...');
  await writeToFirestore({
    results: allResults,
    fixtures: allFixtures,
    frames: allFrames,
    players: players2425,
    rosters,
    players2526,
    divisions: divisionsMap,
  });

  console.log(`\n=== Sync complete ===`);
  console.log(`  Total HTTP requests: ${requestCount}`);
  console.log(`  Results: ${allResults.length}`);
  console.log(`  Fixtures: ${allFixtures.length}`);
  console.log(`  Matches with frames: ${allFrames.length}`);
  console.log(`  Players (25/26): ${Object.keys(players2526).length}`);
}

main().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
