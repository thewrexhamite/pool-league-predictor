#!/usr/bin/env npx tsx

/**
 * RackEmApp Scraper
 *
 * Scrapes league data from RackEmApp and outputs it in the format expected
 * by pool-league-predictor.
 *
 * Usage:
 *   npx tsx scripts/scrape-rackemapp.ts
 *
 * Options:
 *   --league <id>       League ID (default: WrexhamTuesdayPoolLeague)
 *   --output <dir>      Output directory (default: ./data-wrexham-tuesday)
 *   --delay <ms>        Base delay between requests in ms (default: 2000)
 *   --dry-run           Don't write files, just log what would be fetched
 *   --from-html <file>  Parse match IDs from a saved HTML file instead of fetching
 *   --match-ids <ids>   Comma-separated list of match IDs to fetch directly
 *   --verbose           Show more detailed logging
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

interface MatchResult {
  date: string;
  home: string;
  away: string;
  home_score: number;
  away_score: number;
  division: string;
  frames: number;
}

interface FrameData {
  matchId: string;
  date: string;
  home: string;
  away: string;
  division: string;
  frames: {
    frameNum: number;
    set: number;
    homePlayer: string;
    awayPlayer: string;
    winner: 'home' | 'away';
    breakDish: boolean;
    forfeit: boolean;
  }[];
}

interface PlayerTeamStats {
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

interface PlayerData {
  teams: PlayerTeamStats[];
  total: {
    p: number;
    w: number;
    pct: number;
  };
}

interface Fixture {
  date: string;
  home: string;
  away: string;
  division: string;
}

interface Division {
  name: string;
  teams: string[];
}

interface ScrapedMatch {
  matchId: string;
  date: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  division: string;
}

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const getArg = (name: string, defaultVal: string): string => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
};

const LEAGUE_ID = getArg('league', 'WrexhamTuesdayPoolLeague');
const OUTPUT_DIR = getArg('output', './data-wrexham-tuesday');
const BASE_DELAY = parseInt(getArg('delay', '2000'), 10);
const DRY_RUN = args.includes('--dry-run');
const FROM_HTML = getArg('from-html', '');
const MATCH_IDS = getArg('match-ids', '');
const VERBOSE = args.includes('--verbose');

const BASE_URL = 'https://www.rackemapp.com';
const TEST_SCORECARD = getArg('test-scorecard', ''); // Test parsing a single scorecard

// Division-specific results pages (these have the actual match data)
const DIVISION_URLS = [
  { url: '/leagues/{league}/results/1790', division: 'TD1', name: 'Division 1' },
  { url: '/leagues/{league}/results/1791', division: 'TD2', name: 'Division 2' },
];

// Fallback URL patterns if division URLs don't work
const RESULTS_URL_PATTERNS = [
  '/leagues/{league}/results/all',
  '/leagues/{league}',
];

// Realistic browser headers
const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(): number {
  // Random delay between BASE_DELAY and BASE_DELAY * 2
  return BASE_DELAY + Math.random() * BASE_DELAY;
}

function log(message: string): void {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] ${message}`);
}

function parseDate(dateStr: string): string {
  // RackEmApp uses formats like "Tue 21 Jan" or "21/01/2025"
  // We need to output "DD-MM-YYYY"

  // Try DD/MM/YYYY format first
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  // Try "Day DD Mon" format (e.g., "Tue 21 Jan")
  const months: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };

  const wordMatch = dateStr.match(/(\d{1,2})\s+(\w{3})/i);
  if (wordMatch) {
    const [, day, monthStr] = wordMatch;
    const month = months[monthStr.toLowerCase()];
    if (month) {
      // Assume current season (2025/2026)
      const year = month >= '08' ? '2025' : '2026';
      return `${day.padStart(2, '0')}-${month}-${year}`;
    }
  }

  // Fallback: return as-is
  return dateStr;
}

function inferDivision(divText: string): string {
  // Map division names to codes
  const text = divText.toLowerCase();
  if (text.includes('tuesday') || text.includes('tues')) {
    if (text.includes('1') || text.includes('one') || text.includes('premier')) {
      return 'TD1';
    }
    if (text.includes('2') || text.includes('two')) {
      return 'TD2';
    }
  }
  // Default: use first letter + number pattern or generate from name
  const match = divText.match(/(\w)\w*\s*(\d)/);
  if (match) {
    return `${match[1].toUpperCase()}D${match[2]}`;
  }
  // Fallback
  return divText.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase();
}

// ============================================================================
// Fetching
// ============================================================================

async function fetchPage(url: string, referer?: string): Promise<string> {
  const headers = { ...HEADERS };
  if (referer) {
    headers['Referer'] = referer;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

// ============================================================================
// Parsing
// ============================================================================

function extractMatchIds(html: string): ScrapedMatch[] {
  const matches: ScrapedMatch[] = [];

  // Look for GetScorecard calls: GetScorecard('LeagueId', matchId)
  const scorecardRegex = /GetScorecard\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\d+)\s*\)/g;
  const matchIds = new Set<string>();

  let match;
  while ((match = scorecardRegex.exec(html)) !== null) {
    matchIds.add(match[2]);
  }

  // Now parse the results table to get match details
  // Look for table rows with match data
  // Pattern: date | home team | score | away team

  // First, find all result blocks - they typically have the match info near the scorecard call
  const resultBlockRegex = /<tr[^>]*>[\s\S]*?GetScorecard\s*\([^)]+,\s*(\d+)\s*\)[\s\S]*?<\/tr>/gi;

  // Alternative: parse the entire results structure
  // RackEmApp typically shows results in a table or card format

  // Let's look for patterns in the HTML structure
  // Common pattern: <td>Date</td><td>Home</td><td>Score</td><td>Away</td>

  const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = tableRowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Check if this row has a scorecard link
    const scorecardMatch = rowHtml.match(/GetScorecard\s*\(\s*['"][^'"]+['"]\s*,\s*(\d+)\s*\)/);
    if (!scorecardMatch) continue;

    const matchId = scorecardMatch[1];

    // Extract cell contents
    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      // Strip HTML tags and trim
      const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
      cells.push(text);
    }

    // Try to identify date, teams, and score from cells
    // This varies by site structure, so we'll be flexible

    if (cells.length >= 4) {
      // Try to find a date-like cell
      const dateCell = cells.find(c => /\d{1,2}[\/-]\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));
      // Try to find a score-like cell (e.g., "5 - 5" or "5-5")
      const scoreCell = cells.find(c => /^\d+\s*[-–]\s*\d+$/.test(c.trim()));

      if (dateCell && scoreCell) {
        const scoreMatch = scoreCell.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (scoreMatch) {
          const homeScore = parseInt(scoreMatch[1], 10);
          const awayScore = parseInt(scoreMatch[2], 10);

          // Find team names (cells that aren't date or score)
          const teamCells = cells.filter(c => c !== dateCell && c !== scoreCell && c.length > 2);

          if (teamCells.length >= 2) {
            matches.push({
              matchId,
              date: parseDate(dateCell),
              home: teamCells[0].trim(),
              away: teamCells[1].trim(),
              homeScore,
              awayScore,
              division: '', // Will be filled in later
            });
          }
        }
      }
    }
  }

  // If table parsing didn't work well, return just the IDs for manual scorecard fetching
  if (matches.length === 0 && matchIds.size > 0) {
    log(`Found ${matchIds.size} match IDs but couldn't parse table structure`);
    log('Will fetch scorecards directly to get match details');

    for (const id of matchIds) {
      matches.push({
        matchId: id,
        date: '',
        home: '',
        away: '',
        homeScore: 0,
        awayScore: 0,
        division: '',
      });
    }
  }

  return matches;
}

function parseScorecard(html: string, matchId: string): { match: ScrapedMatch; frames: FrameData['frames'] } | null {
  // Parse the scorecard HTML to extract frame-by-frame data
  // RackEmApp uses Bootstrap-style row/col layout, not tables

  const frames: FrameData['frames'] = [];

  let home = '';
  let away = '';
  let date = '';
  let division = '';
  let homeScore = 0;
  let awayScore = 0;

  // Extract team names - look for bold tags in col-5 divs
  const boldMatches = [...html.matchAll(/<b>([^<]+)<\/b>/gi)];
  const teamNames = boldMatches
    .map(m => m[1].trim())
    .filter(t => t.length > 2 && !/^\d+$/.test(t) && !/first|second|set/i.test(t));

  if (teamNames.length >= 2) {
    home = teamNames[0].replace(/&amp;/g, '&');
    away = teamNames[1].replace(/&amp;/g, '&');
  }

  // Extract final score from display-1 headers
  const displayScores = [...html.matchAll(/display-1[^>]*>(\d+)</gi)];
  if (displayScores.length >= 2) {
    homeScore = parseInt(displayScores[0][1], 10);
    awayScore = parseInt(displayScores[1][1], 10);
  }

  // Extract date - "Matchday X - Day DD Mon YYYY"
  const dateMatch = html.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (dateMatch) {
    date = parseDate(`${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}`);
  }

  // Extract division
  const divMatch = html.match(/Division\s*(\d+)/i);
  if (divMatch) {
    division = `TD${divMatch[1]}`;
  }

  // Parse frames by finding player links and their associated borders
  // Strategy: Find all player links, then look back to find their border class

  // Split HTML into frame sections using frame numbers as anchors
  // Frame rows start with: <div class="col-1 mt-1"><b>N</b></div>
  const frameStartPattern = /<div class="col-1 mt-1">\s*<b>(\d+)<\/b>/gi;
  const frameStarts: { frameNum: number; index: number }[] = [];

  let startMatch;
  while ((startMatch = frameStartPattern.exec(html)) !== null) {
    frameStarts.push({
      frameNum: parseInt(startMatch[1], 10),
      index: startMatch.index,
    });
  }

  // Process each frame section
  for (let i = 0; i < frameStarts.length; i++) {
    const { frameNum, index: startIdx } = frameStarts[i];
    const endIdx = i < frameStarts.length - 1 ? frameStarts[i + 1].index : html.length;
    const frameHtml = html.substring(startIdx, endIdx);

    // Find the two col-5 sections within this frame
    // Home side has border-success or border-default
    // Look for border class to determine winner

    const borderSuccessCount = (frameHtml.match(/border-success/g) || []).length;
    const homeWon = frameHtml.indexOf('border-success') < frameHtml.lastIndexOf('border-success')
      ? frameHtml.indexOf('border-success') < frameHtml.length / 2
      : borderSuccessCount > 0 && frameHtml.indexOf('border-success') < frameHtml.length / 2;

    // Find player names in this frame section
    const playerLinks = [...frameHtml.matchAll(/<a[^>]+player[^>]*>([^<]+)<\/a>/gi)]
      .map(m => m[1].trim())
      .filter(name => name.length > 0);

    // In the HTML structure, home players come first, then away players
    // For singles: 1 home, 1 away
    // For doubles (frames 5, 10): 2 home, 2 away
    const isDoubles = frameNum === 5 || frameNum === 10;

    let homePlayer = 'Unknown';
    let awayPlayer = 'Unknown';

    if (isDoubles && playerLinks.length >= 2) {
      // First half are home players, second half are away
      const midPoint = Math.ceil(playerLinks.length / 2);
      const homePlayers = playerLinks.slice(0, midPoint);
      const awayPlayers = playerLinks.slice(midPoint);
      homePlayer = homePlayers.join(' & ');
      awayPlayer = awayPlayers.length > 0 ? awayPlayers.join(' & ') : 'Unknown';
    } else if (playerLinks.length >= 1) {
      homePlayer = playerLinks[0];
      awayPlayer = playerLinks.length > 1 ? playerLinks[1] : 'Unknown';
    }

    // Determine winner - check which side has border-success class
    // The home side col-5 comes first
    const homeSectionMatch = frameHtml.match(/col-5\s+px-0[\s\S]*?border-(success|default)/i);
    const awaySectionMatch = frameHtml.match(/col-5\s+px-0[\s\S]*?border-(success|default)[\s\S]*?col-5\s+px-0[\s\S]*?border-(success|default)/i);

    let winner: 'home' | 'away' = 'home';
    if (homeSectionMatch && awaySectionMatch) {
      winner = awaySectionMatch[2] === 'success' ? 'away' : 'home';
    } else if (homeSectionMatch) {
      winner = homeSectionMatch[1] === 'success' ? 'home' : 'away';
    }

    frames.push({
      frameNum,
      set: frameNum <= 5 ? 1 : 2,
      homePlayer,
      awayPlayer,
      winner,
      breakDish: isDoubles,
      forfeit: awayPlayer === 'Unknown' || homePlayer === 'Unknown',
    });
  }

  // Validate we got reasonable data
  if (frames.length === 0) {
    if (VERBOSE) log(`Warning: No frames parsed from scorecard ${matchId}`);
    return null;
  }

  return {
    match: {
      matchId,
      date,
      home,
      away,
      homeScore,
      awayScore,
      division,
    },
    frames,
  };
}

// ============================================================================
// Data Processing
// ============================================================================

/**
 * Split a player name field into individual player names.
 * Handles doubles pairs like "James Collier & Shaun Jones" -> ["James Collier", "Shaun Jones"]
 * Filters out invalid names like "Unknown"
 */
function splitPlayerNames(playerField: string): string[] {
  if (!playerField || playerField === 'Unknown') {
    return [];
  }

  // Split on " & " for doubles pairs
  const names = playerField.split(/\s*&\s*/).map(n => n.trim()).filter(n => n.length > 0 && n !== 'Unknown');
  return names;
}

function buildPlayerStats(allFrames: FrameData[]): Record<string, PlayerData> {
  const stats: Record<string, PlayerData> = {};

  for (const match of allFrames) {
    for (const frame of match.frames) {
      // Process home player(s) - split doubles pairs into individual players
      const homePlayers = splitPlayerNames(frame.homePlayer);
      for (const playerName of homePlayers) {
        if (!stats[playerName]) {
          stats[playerName] = { teams: [], total: { p: 0, w: 0, pct: 0 } };
        }

        // Find or create team entry
        let teamStats = stats[playerName].teams.find(
          t => t.team === match.home && t.div === match.division
        );
        if (!teamStats) {
          teamStats = {
            team: match.home,
            div: match.division,
            p: 0,
            w: 0,
            pct: 0,
            lag: 0,
            bdF: 0,
            bdA: 0,
            forf: 0,
            cup: false,
          };
          stats[playerName].teams.push(teamStats);
        }

        teamStats.p++;
        if (frame.winner === 'home') teamStats.w++;
        if (frame.breakDish) {
          if (frame.winner === 'home') teamStats.bdF++;
          else teamStats.bdA++;
        }
      }

      // Process away player(s) - split doubles pairs into individual players
      const awayPlayers = splitPlayerNames(frame.awayPlayer);
      for (const playerName of awayPlayers) {
        if (!stats[playerName]) {
          stats[playerName] = { teams: [], total: { p: 0, w: 0, pct: 0 } };
        }

        let teamStats = stats[playerName].teams.find(
          t => t.team === match.away && t.div === match.division
        );
        if (!teamStats) {
          teamStats = {
            team: match.away,
            div: match.division,
            p: 0,
            w: 0,
            pct: 0,
            lag: 0,
            bdF: 0,
            bdA: 0,
            forf: 0,
            cup: false,
          };
          stats[playerName].teams.push(teamStats);
        }

        teamStats.p++;
        if (frame.winner === 'away') teamStats.w++;
        if (frame.breakDish) {
          if (frame.winner === 'away') teamStats.bdF++;
          else teamStats.bdA++;
        }
      }
    }
  }

  // Calculate percentages and totals
  for (const player of Object.values(stats)) {
    let totalP = 0;
    let totalW = 0;

    for (const team of player.teams) {
      team.pct = team.p > 0 ? (team.w / team.p) * 100 : 0;
      totalP += team.p;
      totalW += team.w;
    }

    player.total = {
      p: totalP,
      w: totalW,
      pct: totalP > 0 ? (totalW / totalP) * 100 : 0,
    };
  }

  return stats;
}

function buildRosters(allFrames: FrameData[]): Record<string, string[]> {
  const rosters: Record<string, Set<string>> = {};

  for (const match of allFrames) {
    const homeKey = `${match.division}:${match.home}`;
    const awayKey = `${match.division}:${match.away}`;

    if (!rosters[homeKey]) rosters[homeKey] = new Set();
    if (!rosters[awayKey]) rosters[awayKey] = new Set();

    for (const frame of match.frames) {
      // Split doubles pairs into individual players and filter out "Unknown"
      for (const player of splitPlayerNames(frame.homePlayer)) {
        rosters[homeKey].add(player);
      }
      for (const player of splitPlayerNames(frame.awayPlayer)) {
        rosters[awayKey].add(player);
      }
    }
  }

  // Convert sets to sorted arrays
  const result: Record<string, string[]> = {};
  for (const [key, players] of Object.entries(rosters)) {
    result[key] = Array.from(players).sort();
  }

  return result;
}

function buildDivisions(allFrames: FrameData[]): Record<string, Division> {
  const divisions: Record<string, Set<string>> = {};
  const divNames: Record<string, string> = {};

  for (const match of allFrames) {
    if (!divisions[match.division]) {
      divisions[match.division] = new Set();
      // Generate a readable name
      const code = match.division;
      if (code.startsWith('TD')) {
        divNames[code] = `Tuesday Div ${code.charAt(2)}`;
      } else {
        divNames[code] = code;
      }
    }

    divisions[match.division].add(match.home);
    divisions[match.division].add(match.away);
  }

  const result: Record<string, Division> = {};
  for (const [code, teams] of Object.entries(divisions)) {
    result[code] = {
      name: divNames[code],
      teams: Array.from(teams).sort(),
    };
  }

  return result;
}

// ============================================================================
// Main Scraping Logic
// ============================================================================

async function fetchDivisionResults(): Promise<{ matches: ScrapedMatch[]; url: string } | null> {
  const allMatches: ScrapedMatch[] = [];

  // Try fetching each division's results page
  for (const divConfig of DIVISION_URLS) {
    const url = BASE_URL + divConfig.url.replace('{league}', LEAGUE_ID);
    try {
      log(`Fetching ${divConfig.name}: ${url}`);
      const html = await fetchPage(url);

      const matches = extractMatchIds(html);
      // Set division for all matches from this page
      for (const match of matches) {
        match.division = divConfig.division;
      }

      log(`  Found ${matches.length} matches in ${divConfig.name}`);
      allMatches.push(...matches);

      await sleep(randomDelay()); // Delay between division pages
    } catch (error) {
      log(`  Failed to fetch ${divConfig.name}: ${error}`);
    }
  }

  if (allMatches.length > 0) {
    return { matches: allMatches, url: DIVISION_URLS[0].url.replace('{league}', LEAGUE_ID) };
  }

  // Fallback to single results page
  for (const pattern of RESULTS_URL_PATTERNS) {
    const url = BASE_URL + pattern.replace('{league}', LEAGUE_ID);
    try {
      log(`Trying fallback: ${url}`);
      const html = await fetchPage(url);
      if (/GetScorecard/i.test(html)) {
        log(`Found results at: ${url}`);
        return { matches: extractMatchIds(html), url };
      }
      if (VERBOSE) log(`  No scorecards found at this URL`);
    } catch (error) {
      if (VERBOSE) log(`  Failed: ${error}`);
    }
    await sleep(1000);
  }

  return null;
}

async function scrapeLeague(): Promise<void> {
  // Test mode: just parse one scorecard and show results
  if (TEST_SCORECARD) {
    log(`Testing scorecard parsing for match ID: ${TEST_SCORECARD}`);
    try {
      const url = `${BASE_URL}/leagues/${LEAGUE_ID}/scorecard/${TEST_SCORECARD}`;
      log(`Fetching: ${url}`);
      const html = await fetchPage(url);

      // Save raw HTML for inspection
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      fs.writeFileSync(path.join(OUTPUT_DIR, `test-scorecard-${TEST_SCORECARD}.html`), html);
      log(`Saved raw HTML to ${OUTPUT_DIR}/test-scorecard-${TEST_SCORECARD}.html`);

      const parsed = parseScorecard(html, TEST_SCORECARD);
      if (parsed) {
        log('\n=== Parsed Result ===');
        log(`Home: ${parsed.match.home}`);
        log(`Away: ${parsed.match.away}`);
        log(`Score: ${parsed.match.homeScore} - ${parsed.match.awayScore}`);
        log(`Date: ${parsed.match.date}`);
        log(`Division: ${parsed.match.division}`);
        log(`\nFrames (${parsed.frames.length}):`);
        for (const f of parsed.frames) {
          log(`  ${f.frameNum}. ${f.homePlayer} vs ${f.awayPlayer} -> ${f.winner} wins${f.breakDish ? ' (doubles)' : ''}`);
        }
      } else {
        log('Failed to parse scorecard. Check the saved HTML file.');
      }
    } catch (error) {
      log(`Error: ${error}`);
    }
    return;
  }

  log(`Starting scrape of league: ${LEAGUE_ID}`);
  log(`Output directory: ${OUTPUT_DIR}`);
  log(`Base delay: ${BASE_DELAY}ms`);
  if (DRY_RUN) log('DRY RUN - no files will be written');

  let matches: ScrapedMatch[] = [];
  let resultsUrl = `${BASE_URL}/leagues/${LEAGUE_ID}`;

  // Mode 1: Manual match IDs provided
  if (MATCH_IDS) {
    log('Using provided match IDs...');
    const ids = MATCH_IDS.split(',').map(id => id.trim()).filter(id => id);
    matches = ids.map(matchId => ({
      matchId,
      date: '',
      home: '',
      away: '',
      homeScore: 0,
      awayScore: 0,
      division: '',
    }));
    log(`Loaded ${matches.length} match IDs`);
  }
  // Mode 2: Parse from local HTML file
  else if (FROM_HTML) {
    log(`Loading from HTML file: ${FROM_HTML}`);
    if (!fs.existsSync(FROM_HTML)) {
      log(`Error: File not found: ${FROM_HTML}`);
      return;
    }
    const resultsHtml = fs.readFileSync(FROM_HTML, 'utf-8');
    matches = extractMatchIds(resultsHtml);
    log(`Found ${matches.length} matches in HTML file`);
  }
  // Mode 3: Fetch from website
  else {
    log('Fetching results from division pages...');
    const result = await fetchDivisionResults();

    if (!result || result.matches.length === 0) {
      log('Could not find results. Tried division pages:');
      for (const div of DIVISION_URLS) {
        log(`  ${BASE_URL}${div.url.replace('{league}', LEAGUE_ID)}`);
      }
      log('\nAlternatives:');
      log('  1. Save the results page HTML manually and use --from-html <file>');
      log('  2. Provide match IDs directly with --match-ids 123,456,789');
      return;
    }

    resultsUrl = BASE_URL + result.url;
    matches = result.matches;
    log(`Found ${matches.length} total matches`);
  }

  if (matches.length === 0) {
    log('No matches to process.');
    return;
  }

  // Step 3: Fetch each scorecard
  const allFrames: FrameData[] = [];
  const allResults: MatchResult[] = [];
  let fetchedCount = 0;
  let errorCount = 0;

  // Process in batches with longer pauses
  const BATCH_SIZE = 10;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];

    // Batch pause
    if (i > 0 && i % BATCH_SIZE === 0) {
      const batchPause = 30000 + Math.random() * 30000; // 30-60 seconds
      log(`Batch pause: ${Math.round(batchPause / 1000)}s before next batch...`);
      await sleep(batchPause);
    }

    try {
      log(`Fetching scorecard ${i + 1}/${matches.length}: match ${match.matchId}`);

      const scorecardUrl = `${BASE_URL}/leagues/${LEAGUE_ID}/scorecard/${match.matchId}`;
      const scorecardHtml = await fetchPage(scorecardUrl, resultsUrl);

      const parsed = parseScorecard(scorecardHtml, match.matchId);

      if (parsed) {
        // Use parsed data, falling back to table-extracted data
        const finalMatch: ScrapedMatch = {
          ...match,
          ...parsed.match,
          // Prefer table data for teams/scores if available
          home: match.home || parsed.match.home,
          away: match.away || parsed.match.away,
          homeScore: match.homeScore || parsed.match.homeScore,
          awayScore: match.awayScore || parsed.match.awayScore,
          date: match.date || parsed.match.date,
          division: match.division || parsed.match.division || 'TD1',
        };

        // Add to results
        allResults.push({
          date: finalMatch.date,
          home: finalMatch.home,
          away: finalMatch.away,
          home_score: finalMatch.homeScore,
          away_score: finalMatch.awayScore,
          division: finalMatch.division,
          frames: parsed.frames.length,
        });

        // Add frame data
        allFrames.push({
          matchId: match.matchId,
          date: finalMatch.date,
          home: finalMatch.home,
          away: finalMatch.away,
          division: finalMatch.division,
          frames: parsed.frames,
        });

        fetchedCount++;
      } else {
        log(`Warning: Could not parse scorecard for match ${match.matchId}`);
        errorCount++;

        // Save for debugging
        if (!DRY_RUN) {
          fs.mkdirSync(path.join(OUTPUT_DIR, 'debug'), { recursive: true });
          fs.writeFileSync(
            path.join(OUTPUT_DIR, 'debug', `scorecard-${match.matchId}.html`),
            scorecardHtml
          );
        }
      }

      // Random delay before next request
      const delay = randomDelay();
      await sleep(delay);

    } catch (error) {
      log(`Error fetching match ${match.matchId}: ${error}`);
      errorCount++;
    }
  }

  log(`\nFetched ${fetchedCount} scorecards successfully, ${errorCount} errors`);

  if (allFrames.length === 0) {
    log('No frame data collected. Cannot generate output files.');
    return;
  }

  // Step 4: Build derived data structures
  log('Building player statistics...');
  const players2526 = buildPlayerStats(allFrames);
  log(`Processed ${Object.keys(players2526).length} players`);

  log('Building rosters...');
  const rosters = buildRosters(allFrames);
  log(`Built rosters for ${Object.keys(rosters).length} teams`);

  log('Building divisions...');
  const divisions = buildDivisions(allFrames);
  log(`Found ${Object.keys(divisions).length} divisions`);

  // Step 5: Write output files
  if (!DRY_RUN) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    log('Writing results.json...');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'results.json'),
      JSON.stringify(allResults, null, 2)
    );

    log('Writing frames.json...');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'frames.json'),
      JSON.stringify(allFrames, null, 2)
    );

    log('Writing players2526.json...');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'players2526.json'),
      JSON.stringify(players2526, null, 2)
    );

    log('Writing rosters.json...');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'rosters.json'),
      JSON.stringify(rosters, null, 2)
    );

    // Empty players.json (no historical data)
    log('Writing players.json (empty - no 24/25 data)...');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'players.json'),
      JSON.stringify({}, null, 2)
    );

    // Empty fixtures.json (would need to scrape fixtures page)
    log('Writing fixtures.json (empty)...');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'fixtures.json'),
      JSON.stringify([], null, 2)
    );

    // Write divisions for reference
    log('Writing divisions.json...');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'divisions.json'),
      JSON.stringify(divisions, null, 2)
    );

    log(`\nDone! Output written to ${OUTPUT_DIR}/`);
  } else {
    log('\nDRY RUN complete. No files written.');
  }

  // Summary
  log('\n=== Summary ===');
  log(`Matches: ${allResults.length}`);
  log(`Frames: ${allFrames.reduce((sum, m) => sum + m.frames.length, 0)}`);
  log(`Players: ${Object.keys(players2526).length}`);
  log(`Teams: ${Object.values(divisions).reduce((sum, d) => sum + d.teams.length, 0)}`);
  log(`Divisions: ${Object.keys(divisions).length}`);

  if (!DRY_RUN) {
    log('\n=== Next Steps ===');
    log('To add this league to the app, upload to Firestore:');
    log(`  npx tsx scripts/upload-to-firestore.ts --data ${OUTPUT_DIR}`);
    log('\nOr preview what would be uploaded:');
    log(`  npx tsx scripts/upload-to-firestore.ts --data ${OUTPUT_DIR} --dry-run`);
  }
}

// ============================================================================
// Entry Point
// ============================================================================

scrapeLeague().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
