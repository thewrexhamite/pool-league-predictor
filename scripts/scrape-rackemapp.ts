#!/usr/bin/env npx tsx

/**
 * RackEmApp Scraper
 *
 * Scrapes league data from RackEmApp and outputs it in the format expected
 * by pool-league-predictor.
 *
 * Supports two modes:
 *   - Scorecard mode: fetches individual match scorecards for frame-by-frame data
 *   - Averages mode: scrapes results, standings, and averages pages directly
 *     (for leagues that don't have detailed scorecard data)
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
 *   --no-scorecards     Force averages-based scraping even if scorecards exist
 *   --verbose           Show more detailed logging
 */

import * as fs from 'fs';
import * as path from 'path';
import { splitAndNormalizePlayerNames, normalizePlayerName } from './normalize-players';

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

interface DivConfig {
  id: string;
  division: string;
  name: string;
}

interface LeagueConfig {
  divisions: DivConfig[];
  hasScorecards: boolean;
}

// ============================================================================
// League Configurations
// ============================================================================

const LEAGUE_CONFIGS: Record<string, LeagueConfig> = {
  WrexhamTuesdayPoolLeague: {
    divisions: [
      { id: '1790', division: 'TD1', name: 'Division 1' },
      { id: '1791', division: 'TD2', name: 'Division 2' },
    ],
    hasScorecards: true,
  },
  ChesterPoolLeague: {
    divisions: [
      { id: '2824', division: 'PREM', name: 'Premium' },
      { id: '2825', division: 'D1', name: 'Division 1' },
      { id: '2826', division: 'D2', name: 'Division 2' },
    ],
    hasScorecards: true,
  },
};

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
const NO_SCORECARDS = args.includes('--no-scorecards');

const BASE_URL = 'https://www.rackemapp.com';
const TEST_SCORECARD = getArg('test-scorecard', ''); // Test parsing a single scorecard

// Get league config (or build a default one)
const leagueConfig: LeagueConfig = LEAGUE_CONFIGS[LEAGUE_ID] || {
  divisions: [],
  hasScorecards: true,
};

// Build division URLs from config
const DIVISION_URLS = leagueConfig.divisions.map(d => ({
  url: `/leagues/{league}/results/${d.id}`,
  division: d.division,
  name: d.name,
}));

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
  // Also handles "Thursday, 05 February 2026"
  // We need to output "DD-MM-YYYY"

  // Try DD/MM/YYYY format first
  const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  const months: Record<string, string> = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12'
  };

  // Try "DD Month YYYY" or "Day, DD Month YYYY" format (e.g., "Thursday, 05 February 2026")
  const fullMatch = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (fullMatch) {
    const [, day, monthStr, year] = fullMatch;
    const month = months[monthStr.toLowerCase()];
    if (month) {
      return `${day.padStart(2, '0')}-${month}-${year}`;
    }
  }

  // Try "Day DD Mon" format (e.g., "Tue 21 Jan")
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

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
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
// Scorecard-based Parsing (existing flow)
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
    home = decodeHtmlEntities(teamNames[0]);
    away = decodeHtmlEntities(teamNames[1]);
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

  // Extract division - try both "Division N" and specific division names
  const divMatch = html.match(/<h4[^>]*>\s*(.*?)\s*<\/h4>/i);
  if (divMatch) {
    const divText = divMatch[1].replace(/<[^>]+>/g, '').trim();
    // Check if we have a config for this league to map division names
    const config = LEAGUE_CONFIGS[LEAGUE_ID];
    if (config) {
      const found = config.divisions.find(d =>
        divText.toLowerCase().includes(d.name.toLowerCase())
      );
      if (found) {
        division = found.division;
      }
    }
    if (!division) {
      const numMatch = divText.match(/Division\s*(\d+)/i);
      if (numMatch) {
        division = `TD${numMatch[1]}`;
      }
    }
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
// No-Scorecard Parsing (averages-based flow)
// ============================================================================

/**
 * Parse results from a division results page.
 * Structure: <h5> date headers, then <div class="row pb-3 mx-0"> blocks
 * with team links and GetScorecard buttons containing scores.
 */
function parseResultsPage(html: string, division: string): MatchResult[] {
  const results: MatchResult[] = [];

  // Split into sections by the result row divs
  // First, find all date headers and their positions
  const dateHeaders: { date: string; index: number }[] = [];
  const h5Regex = /<h5[^>]*>[\s\S]*?(\d{1,2}\s+\w+\s+\d{4})[\s\S]*?<\/h5>/gi;
  let h5Match;
  while ((h5Match = h5Regex.exec(html)) !== null) {
    dateHeaders.push({ date: parseDate(h5Match[1]), index: h5Match.index });
  }

  // Find all result rows
  const rowRegex = /<div class="row pb-3 mx-0">/gi;
  let rowStart;
  while ((rowStart = rowRegex.exec(html)) !== null) {
    // Find the date for this row (closest preceding date header)
    let date = '';
    for (let i = dateHeaders.length - 1; i >= 0; i--) {
      if (dateHeaders[i].index < rowStart.index) {
        date = dateHeaders[i].date;
        break;
      }
    }
    if (!date) continue;

    // Extract content until the next row or end
    const nextRowMatch = html.indexOf('<div class="row pb-3 mx-0">', rowStart.index + 1);
    const nextH5Match = html.indexOf('<h5', rowStart.index + 1);
    const endIdx = Math.min(
      nextRowMatch > 0 ? nextRowMatch : html.length,
      nextH5Match > 0 ? nextH5Match : html.length
    );
    const rowHtml = html.substring(rowStart.index, endIdx);

    // Extract team links: <a href="/leagues/.../team/...">Team Name</a>
    const teamLinks = [...rowHtml.matchAll(/<a href="\/leagues\/[^/]+\/team\/\d+"[^>]*>([^<]+)<\/a>/gi)]
      .map(m => decodeHtmlEntities(m[1].trim()));

    if (teamLinks.length < 2) continue;

    // Extract scores from the GetScorecard button or score spans
    // Button pattern: <span class="text-lighter">\n  4\n  <span...>|</span>\n  3\n  </span>
    const scoreMatch = rowHtml.match(/text-lighter[^>]*>\s*(\d+)\s*<span[^>]*>\|<\/span>\s*(\d+)/i);

    if (scoreMatch) {
      const homeScore = parseInt(scoreMatch[1], 10);
      const awayScore = parseInt(scoreMatch[2], 10);

      results.push({
        date,
        home: teamLinks[0],
        away: teamLinks[1],
        home_score: homeScore,
        away_score: awayScore,
        division,
        frames: homeScore + awayScore,
      });
    }
  }

  return results;
}

/**
 * Parse fixtures from a division fixtures page.
 * Structure: <h5>Matchday N <span>...</span></h5>, <h6>date</h6>, <h6>division</h6>,
 * then <div class="row pb-3 mx-0"> blocks with team links and "vs" badge.
 */
function parseFixturesPage(html: string, division: string): Fixture[] {
  const fixtures: Fixture[] = [];

  // Find all date headers: <h6 class="text-lighter">Thursday, 12 February 2026</h6>
  const dateHeaders: { date: string; index: number }[] = [];
  const h6Regex = /<h6[^>]*class="text-lighter"[^>]*>\s*\w+,\s+(\d{1,2}\s+\w+\s+\d{4})\s*<\/h6>/gi;
  let h6Match;
  while ((h6Match = h6Regex.exec(html)) !== null) {
    dateHeaders.push({ date: parseDate(h6Match[1]), index: h6Match.index });
  }

  // Find all fixture rows
  const rowRegex = /<div class="row pb-3 mx-0">/gi;
  let rowStart;
  while ((rowStart = rowRegex.exec(html)) !== null) {
    // Find the date for this row (closest preceding date header)
    let date = '';
    for (let i = dateHeaders.length - 1; i >= 0; i--) {
      if (dateHeaders[i].index < rowStart.index) {
        date = dateHeaders[i].date;
        break;
      }
    }
    if (!date) continue;

    // Extract content until the next row or section
    const nextRowMatch = html.indexOf('<div class="row pb-3 mx-0">', rowStart.index + 1);
    const nextH5Match = html.indexOf('<h5', rowStart.index + 1);
    const endIdx = Math.min(
      nextRowMatch > 0 ? nextRowMatch : html.length,
      nextH5Match > 0 ? nextH5Match : html.length
    );
    const rowHtml = html.substring(rowStart.index, endIdx);

    // Only process fixture rows (have "vs" badge, not score button)
    if (!rowHtml.includes('badge badge-secondary') && !rowHtml.includes('>vs<')) continue;

    // Skip competition/cup fixtures (they appear under different h6 headers)
    if (rowHtml.includes('competitions/')) continue;

    const teamLinks = [...rowHtml.matchAll(/<a href="\/leagues\/[^/]+\/team\/\d+"[^>]*>([^<]+)<\/a>/gi)]
      .map(m => decodeHtmlEntities(m[1].trim()));

    if (teamLinks.length >= 2) {
      fixtures.push({
        date,
        home: teamLinks[0],
        away: teamLinks[1],
        division,
      });
    }
  }

  return fixtures;
}

/**
 * Parse standings from a division tables page.
 * Returns team list with their standings data.
 */
function parseStandingsPage(html: string, divName: string): { teams: string[] } {
  const teams: string[] = [];

  // Find team links in the table: <a href="/leagues/.../team/...">Team Name</a>
  const teamRegex = /<td[^>]*border-start[^>]*font-weight-bold[^>]*text-wrap[^>]*>\s*<a href="\/leagues\/[^/]+\/team\/\d+"[^>]*>\s*([^<]+?)\s*<\/a>/gi;
  let match;
  while ((match = teamRegex.exec(html)) !== null) {
    teams.push(decodeHtmlEntities(match[1].trim()));
  }

  return { teams };
}

/**
 * Parse player averages from the averages page.
 * Table columns: Rank, (avatar), Name, Team, App, POTM, B/Dish, R/Dish, P, W, Total Ave %
 */
function parseAveragesPage(html: string, division: string): {
  players: Record<string, PlayerData>;
  rosters: Record<string, Set<string>>;
} {
  const players: Record<string, PlayerData> = {};
  const rosters: Record<string, Set<string>> = {};

  // Find the averages table body
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return { players, rosters };

  const tbody = tbodyMatch[1];

  // Parse each row
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(tbody)) !== null) {
    const rowHtml = rowMatch[1];

    // Extract player name from player link
    const playerMatch = rowHtml.match(/<a href="\/leagues\/[^/]+\/player\/\d+"[^>]*>([^<]+)<\/a>/i);
    if (!playerMatch) continue;
    const playerName = decodeHtmlEntities(playerMatch[1].trim());

    // Extract team name from team link
    const teamMatch = rowHtml.match(/<a href="\/leagues\/[^/]+\/team\/\d+"[^>]*>([^<]+)<\/a>/i);
    if (!teamMatch) continue;
    const teamName = decodeHtmlEntities(teamMatch[1].trim());

    // Extract all td values
    const tdValues: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      const text = tdMatch[1].replace(/<[^>]+>/g, '').trim();
      tdValues.push(text);
    }

    // Column order: Rank, (avatar), Name, Team, App, POTM, B/Dish, R/Dish, P, W, Total Ave %
    // But we can't rely on exact column positions because some are hidden on mobile
    // Instead, find P and W from the last few numeric columns before the % column
    const pctIdx = tdValues.findIndex(v => v.endsWith('%'));
    if (pctIdx < 2) continue;

    const w = parseInt(tdValues[pctIdx - 1], 10) || 0;
    const p = parseInt(tdValues[pctIdx - 2], 10) || 0;
    const pctStr = tdValues[pctIdx].replace('%', '');
    const pct = parseFloat(pctStr) || 0;

    // Extract B/Dish (break & dish) count - it's 2 positions before P
    const bdF = parseInt(tdValues[pctIdx - 4], 10) || 0;

    const normalizedName = normalizePlayerName(playerName, teamName, OUTPUT_DIR);

    if (!players[normalizedName]) {
      players[normalizedName] = { teams: [], total: { p: 0, w: 0, pct: 0 } };
    }

    // Add team stats entry
    players[normalizedName].teams.push({
      team: teamName,
      div: division,
      p,
      w,
      pct,
      lag: 0,
      bdF,
      bdA: 0,
      forf: 0,
      cup: false,
    });

    // Add to roster
    const rosterKey = `${division}:${teamName}`;
    if (!rosters[rosterKey]) rosters[rosterKey] = new Set();
    rosters[rosterKey].add(normalizedName);
  }

  // Calculate totals for players
  for (const player of Object.values(players)) {
    let totalP = 0;
    let totalW = 0;
    for (const team of player.teams) {
      totalP += team.p;
      totalW += team.w;
    }
    player.total = {
      p: totalP,
      w: totalW,
      pct: totalP > 0 ? (totalW / totalP) * 100 : 0,
    };
  }

  return { players, rosters };
}

// ============================================================================
// Data Processing (scorecard-based)
// ============================================================================

/**
 * Strip "Unknown" entries from frame data.
 * - Removes frames where BOTH players are Unknown (no useful data)
 * - Keeps frames where only one side is Unknown (the known player's data is still used)
 * - Removes entire match entries where all frames were stripped
 * Returns a new array (does not mutate input).
 */
function cleanFrames(allFrames: FrameData[]): FrameData[] {
  const cleaned: FrameData[] = [];
  let droppedFrames = 0;
  let droppedMatches = 0;

  for (const match of allFrames) {
    const goodFrames = match.frames.filter(f => {
      if (f.homePlayer === 'Unknown' && f.awayPlayer === 'Unknown') {
        droppedFrames++;
        return false;
      }
      return true;
    });

    if (goodFrames.length > 0) {
      cleaned.push({ ...match, frames: goodFrames });
    } else {
      droppedMatches++;
    }
  }

  if (droppedFrames > 0) {
    log(`Cleaned frames: dropped ${droppedFrames} unknown-vs-unknown frames across ${droppedMatches} fully-unknown matches`);
  }

  return cleaned;
}

/**
 * Split a player name field into individual player names.
 * Handles doubles pairs like "James Collier & Shaun Jones" -> ["James Collier", "Shaun Jones"]
 * Filters out invalid names like "Unknown"
 * Applies normalization (HTML decoding, whitespace, aliases) but NOT team disambiguation
 * (disambiguation requires team context and is applied in buildPlayerStats)
 */
function splitPlayerNames(playerField: string): string[] {
  // Use the shared normalization without team context
  // Team disambiguation will be applied in buildPlayerStats where we have team info
  return splitAndNormalizePlayerNames(playerField, undefined, OUTPUT_DIR);
}

function buildPlayerStats(allFrames: FrameData[]): Record<string, PlayerData> {
  const stats: Record<string, PlayerData> = {};

  for (const match of allFrames) {
    for (const frame of match.frames) {
      // Process home player(s) - split doubles pairs into individual players
      const homePlayersRaw = splitPlayerNames(frame.homePlayer);
      for (const rawName of homePlayersRaw) {
        // Apply team disambiguation to get the final player key
        const playerName = normalizePlayerName(rawName, match.home, OUTPUT_DIR);

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
      const awayPlayersRaw = splitPlayerNames(frame.awayPlayer);
      for (const rawName of awayPlayersRaw) {
        // Apply team disambiguation to get the final player key
        const playerName = normalizePlayerName(rawName, match.away, OUTPUT_DIR);

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
      // Split doubles pairs into individual players, normalize with team disambiguation
      for (const rawName of splitPlayerNames(frame.homePlayer)) {
        const player = normalizePlayerName(rawName, match.home, OUTPUT_DIR);
        rosters[homeKey].add(player);
      }
      for (const rawName of splitPlayerNames(frame.awayPlayer)) {
        const player = normalizePlayerName(rawName, match.away, OUTPUT_DIR);
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

function buildDivisions(allFrames: FrameData[], config?: LeagueConfig): Record<string, Division> {
  const divisions: Record<string, Set<string>> = {};
  const divNames: Record<string, string> = {};

  // Pre-populate division names from config
  if (config) {
    for (const d of config.divisions) {
      divNames[d.division] = d.name;
    }
  }

  for (const match of allFrames) {
    if (!divisions[match.division]) {
      divisions[match.division] = new Set();
      if (!divNames[match.division]) {
        // Generate a readable name
        const code = match.division;
        if (code.startsWith('TD')) {
          divNames[code] = `Tuesday Div ${code.charAt(2)}`;
        } else {
          divNames[code] = code;
        }
      }
    }

    divisions[match.division].add(match.home);
    divisions[match.division].add(match.away);
  }

  const result: Record<string, Division> = {};
  for (const [code, teams] of Object.entries(divisions)) {
    result[code] = {
      name: divNames[code] || code,
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

/**
 * No-scorecard scraping flow: scrape results, fixtures, standings, and averages pages directly.
 */
async function scrapeWithoutScorecards(): Promise<void> {
  log(`Scraping league ${LEAGUE_ID} using averages-based flow (no individual scorecards)`);

  const config = LEAGUE_CONFIGS[LEAGUE_ID];
  if (!config) {
    log(`Error: No league config found for ${LEAGUE_ID}`);
    return;
  }

  const allResults: MatchResult[] = [];
  const allFixtures: Fixture[] = [];
  const allPlayers: Record<string, PlayerData> = {};
  const allRosters: Record<string, Set<string>> = {};
  const divisions: Record<string, Division> = {};

  for (const div of config.divisions) {
    const divId = div.id;
    const divCode = div.division;
    const divName = div.name;

    log(`\n--- ${divName} (${divCode}) ---`);

    // 1. Scrape standings page for team list
    try {
      const tablesUrl = `${BASE_URL}/leagues/${LEAGUE_ID}/tables/${divId}`;
      log(`Fetching standings: ${tablesUrl}`);
      const tablesHtml = await fetchPage(tablesUrl);
      const standings = parseStandingsPage(tablesHtml, divName);
      divisions[divCode] = { name: divName, teams: standings.teams };
      log(`  Found ${standings.teams.length} teams`);
      await sleep(randomDelay());
    } catch (error) {
      log(`  Failed to fetch standings: ${error}`);
      divisions[divCode] = { name: divName, teams: [] };
    }

    // 2. Scrape results page
    try {
      const resultsUrl = `${BASE_URL}/leagues/${LEAGUE_ID}/results/${divId}`;
      log(`Fetching results: ${resultsUrl}`);
      const resultsHtml = await fetchPage(resultsUrl);
      const results = parseResultsPage(resultsHtml, divCode);
      allResults.push(...results);
      log(`  Found ${results.length} results`);
      await sleep(randomDelay());
    } catch (error) {
      log(`  Failed to fetch results: ${error}`);
    }

    // 3. Scrape fixtures page
    try {
      const fixturesUrl = `${BASE_URL}/leagues/${LEAGUE_ID}/fixtures/${divId}`;
      log(`Fetching fixtures: ${fixturesUrl}`);
      const fixturesHtml = await fetchPage(fixturesUrl);
      const fixtures = parseFixturesPage(fixturesHtml, divCode);
      allFixtures.push(...fixtures);
      log(`  Found ${fixtures.length} fixtures`);
      await sleep(randomDelay());
    } catch (error) {
      log(`  Failed to fetch fixtures: ${error}`);
    }

    // 4. Scrape averages page for player stats
    try {
      const averagesUrl = `${BASE_URL}/leagues/${LEAGUE_ID}/averages/${divId}`;
      log(`Fetching averages: ${averagesUrl}`);
      const averagesHtml = await fetchPage(averagesUrl);
      const { players, rosters } = parseAveragesPage(averagesHtml, divCode);

      // Merge players
      for (const [name, data] of Object.entries(players)) {
        if (allPlayers[name]) {
          allPlayers[name].teams.push(...data.teams);
          allPlayers[name].total.p += data.total.p;
          allPlayers[name].total.w += data.total.w;
        } else {
          allPlayers[name] = data;
        }
      }

      // Merge rosters
      for (const [key, playerSet] of Object.entries(rosters)) {
        if (!allRosters[key]) allRosters[key] = new Set();
        for (const p of playerSet) allRosters[key].add(p);
      }

      log(`  Found ${Object.keys(players).length} players`);
      await sleep(randomDelay());
    } catch (error) {
      log(`  Failed to fetch averages: ${error}`);
    }
  }

  // Recalculate overall percentages for players in multiple divisions
  for (const player of Object.values(allPlayers)) {
    player.total.pct = player.total.p > 0 ? (player.total.w / player.total.p) * 100 : 0;
  }

  // Convert roster sets to sorted arrays
  const rostersOut: Record<string, string[]> = {};
  for (const [key, players] of Object.entries(allRosters)) {
    rostersOut[key] = Array.from(players).sort();
  }

  // Write output files
  if (!DRY_RUN) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    log('\nWriting results.json...');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'results.json'), JSON.stringify(allResults, null, 2));

    log('Writing fixtures.json...');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'fixtures.json'), JSON.stringify(allFixtures, null, 2));

    log('Writing frames.json (empty - no frame data)...');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'frames.json'), JSON.stringify([], null, 2));

    log('Writing players2526.json...');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'players2526.json'), JSON.stringify(allPlayers, null, 2));

    log('Writing rosters.json...');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'rosters.json'), JSON.stringify(rostersOut, null, 2));

    log('Writing players.json (empty - no historical data)...');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'players.json'), JSON.stringify({}, null, 2));

    log('Writing divisions.json...');
    fs.writeFileSync(path.join(OUTPUT_DIR, 'divisions.json'), JSON.stringify(divisions, null, 2));

    log(`\nDone! Output written to ${OUTPUT_DIR}/`);
  } else {
    log('\nDRY RUN complete. No files written.');
  }

  // Summary
  log('\n=== Summary ===');
  log(`Results: ${allResults.length}`);
  log(`Fixtures: ${allFixtures.length}`);
  log(`Players: ${Object.keys(allPlayers).length}`);
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

  // Check if we should use no-scorecard mode
  const useScorecards = leagueConfig.hasScorecards && !NO_SCORECARDS;

  if (!useScorecards) {
    await scrapeWithoutScorecards();
    return;
  }

  // === Scorecard-based flow (original) ===

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
      log('  3. Use --no-scorecards to scrape from averages/results pages instead');
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

  // Step 4: Clean unknown frames and build derived data structures
  const cleanedFrames = cleanFrames(allFrames);

  log('Building player statistics...');
  const players2526 = buildPlayerStats(cleanedFrames);
  log(`Processed ${Object.keys(players2526).length} players`);

  log('Building rosters...');
  const rosters = buildRosters(cleanedFrames);
  log(`Built rosters for ${Object.keys(rosters).length} teams`);

  log('Building divisions...');
  const divisions = buildDivisions(allFrames, leagueConfig);
  log(`Found ${Object.keys(divisions).length} divisions`);

  // Also scrape fixtures page for the scorecard flow
  const allFixtures: Fixture[] = [];
  for (const div of leagueConfig.divisions) {
    try {
      const fixturesUrl = `${BASE_URL}/leagues/${LEAGUE_ID}/fixtures/${div.id}`;
      log(`Fetching fixtures for ${div.name}: ${fixturesUrl}`);
      const fixturesHtml = await fetchPage(fixturesUrl);
      const fixtures = parseFixturesPage(fixturesHtml, div.division);
      allFixtures.push(...fixtures);
      log(`  Found ${fixtures.length} fixtures`);
      await sleep(randomDelay());
    } catch (error) {
      log(`  Failed to fetch fixtures for ${div.name}: ${error}`);
    }
  }

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
      JSON.stringify(cleanedFrames, null, 2)
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

    log('Writing fixtures.json...');
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'fixtures.json'),
      JSON.stringify(allFixtures, null, 2)
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
  log(`Frames: ${cleanedFrames.reduce((sum, m) => sum + m.frames.length, 0)}`);
  log(`Players: ${Object.keys(players2526).length}`);
  log(`Teams: ${Object.values(divisions).reduce((sum, d) => sum + d.teams.length, 0)}`);
  log(`Divisions: ${Object.keys(divisions).length}`);
  log(`Fixtures: ${allFixtures.length}`);

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
