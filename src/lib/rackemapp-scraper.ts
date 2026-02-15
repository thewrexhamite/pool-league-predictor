/**
 * RackEmApp Scraper Library
 *
 * Extracts league data from rackemapp.com for use in the sync pipeline.
 * Supports scorecard-based scraping with incremental match fetching.
 *
 * Adapted from scripts/scrape-rackemapp.ts for use as a library module.
 */

import { normalizePlayerName } from '../../scripts/normalize-players';
import type {
  LeagueConfig,
  SyncOptions,
  ScrapedResult,
  ScrapedFixture,
  ScrapedMatchFrames,
  ScrapedFrame,
  PlayerStats,
} from './sync-pipeline';

const RACKEMAPP_BASE_URL = 'https://www.rackemapp.com';

const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

const BASE_DELAY = 2000;
const BATCH_SIZE = 10;
const BATCH_PAUSE_MIN = 30000;
const BATCH_PAUSE_MAX = 60000;
const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 3;

// --- Utilities ---

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(): number {
  return BASE_DELAY + Math.random() * BASE_DELAY;
}

function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] [RACKEMAPP] [${level}] ${message}`);
}

function parseDate(dateStr: string): string {
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
    'dec': '12', 'december': '12',
  };

  // Try "DD Month YYYY" or "Day, DD Month YYYY" format
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
      const year = month >= '08' ? '2025' : '2026';
      return `${day.padStart(2, '0')}-${month}-${year}`;
    }
  }

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

// --- Fetching ---

let requestCount = 0;

async function fetchPage(url: string, referer?: string): Promise<string> {
  requestCount++;
  if (requestCount > 1) await sleep(randomDelay());
  log(`[${requestCount}] ${url.replace(RACKEMAPP_BASE_URL, '')}`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers = { ...HEADERS };
      if (referer) headers['Referer'] = referer;

      const resp = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

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

      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
      return resp.text();
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        log(`Request timeout after ${REQUEST_TIMEOUT}ms (attempt ${attempt}/${MAX_RETRIES})`, 'WARN');
        if (attempt === MAX_RETRIES) throw new Error(`Request timed out after ${MAX_RETRIES} attempts: ${url}`);
        await sleep(5000 * attempt);
        continue;
      }
      if (attempt === MAX_RETRIES) throw err;
      log(`Request failed: ${err instanceof Error ? err.message : err} (attempt ${attempt}/${MAX_RETRIES})`, 'WARN');
      await sleep(5000 * attempt);
    }
  }

  throw new Error(`Failed after ${MAX_RETRIES} attempts: ${url}`);
}

// --- Parsed match from results pages ---

interface RackEmAppMatch {
  matchId: string;
  date: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  division: string;
}

// --- Page Parsers ---

function extractMatchIds(html: string): RackEmAppMatch[] {
  const matches: RackEmAppMatch[] = [];

  const tableRowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = tableRowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    const scorecardMatch = rowHtml.match(/GetScorecard\s*\(\s*['"][^'"]+['"]\s*,\s*(\d+)\s*\)/);
    if (!scorecardMatch) continue;

    const matchId = scorecardMatch[1];

    const cells: string[] = [];
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const text = cellMatch[1].replace(/<[^>]+>/g, '').trim();
      cells.push(text);
    }

    if (cells.length >= 4) {
      const dateCell = cells.find(c => /\d{1,2}[\/-]\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(c));
      const scoreCell = cells.find(c => /^\d+\s*[-–]\s*\d+$/.test(c.trim()));

      if (dateCell && scoreCell) {
        const scoreMatch = scoreCell.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (scoreMatch) {
          const homeScore = parseInt(scoreMatch[1], 10);
          const awayScore = parseInt(scoreMatch[2], 10);

          const teamCells = cells.filter(c => c !== dateCell && c !== scoreCell && c.length > 2);

          if (teamCells.length >= 2) {
            matches.push({
              matchId,
              date: parseDate(dateCell),
              home: teamCells[0].trim(),
              away: teamCells[1].trim(),
              homeScore,
              awayScore,
              division: '',
            });
          }
        }
      }
    }
  }

  // Fallback: extract just match IDs if table parsing didn't work
  if (matches.length === 0) {
    const scorecardRegex = /GetScorecard\s*\(\s*['"]([^'"]+)['"]\s*,\s*(\d+)\s*\)/g;
    const matchIds = new Set<string>();
    let match;
    while ((match = scorecardRegex.exec(html)) !== null) {
      matchIds.add(match[2]);
    }
    if (matchIds.size > 0) {
      log(`Found ${matchIds.size} match IDs but couldn't parse table structure`);
      for (const id of matchIds) {
        matches.push({
          matchId: id, date: '', home: '', away: '',
          homeScore: 0, awayScore: 0, division: '',
        });
      }
    }
  }

  return matches;
}

function parseScorecard(
  html: string,
  matchId: string,
  divisionLookup: { id: string; code: string; name: string }[]
): { match: RackEmAppMatch; frames: ScrapedFrame[] } | null {
  const frames: ScrapedFrame[] = [];

  let home = '';
  let away = '';
  let date = '';
  let division = '';
  let homeScore = 0;
  let awayScore = 0;

  // Extract team names from bold tags
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

  // Extract date
  const dateMatch = html.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i);
  if (dateMatch) {
    date = parseDate(`${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}`);
  }

  // Extract division
  const divMatch = html.match(/<h4[^>]*>\s*(.*?)\s*<\/h4>/i);
  if (divMatch) {
    const divText = divMatch[1].replace(/<[^>]+>/g, '').trim();
    const found = divisionLookup.find(d =>
      divText.toLowerCase().includes(d.name.toLowerCase())
    );
    if (found) {
      division = found.code;
    }
  }

  // Parse frames
  const frameStartPattern = /<div class="col-1 mt-1">\s*<b>(\d+)<\/b>/gi;
  const frameStarts: { frameNum: number; index: number }[] = [];

  let startMatch;
  while ((startMatch = frameStartPattern.exec(html)) !== null) {
    frameStarts.push({
      frameNum: parseInt(startMatch[1], 10),
      index: startMatch.index,
    });
  }

  for (let i = 0; i < frameStarts.length; i++) {
    const { frameNum, index: startIdx } = frameStarts[i];
    const endIdx = i < frameStarts.length - 1 ? frameStarts[i + 1].index : html.length;
    const frameHtml = html.substring(startIdx, endIdx);

    const isDoubles = frameNum === 5 || frameNum === 10;

    // Find player names
    const playerLinks = [...frameHtml.matchAll(/<a[^>]+player[^>]*>([^<]+)<\/a>/gi)]
      .map(m => m[1].trim())
      .filter(name => name.length > 0);

    let homePlayer = 'Unknown';
    let awayPlayer = 'Unknown';

    if (isDoubles && playerLinks.length >= 2) {
      const midPoint = Math.ceil(playerLinks.length / 2);
      const homePlayers = playerLinks.slice(0, midPoint);
      const awayPlayers = playerLinks.slice(midPoint);
      homePlayer = homePlayers.join(' & ');
      awayPlayer = awayPlayers.length > 0 ? awayPlayers.join(' & ') : 'Unknown';
    } else if (playerLinks.length >= 1) {
      homePlayer = playerLinks[0];
      awayPlayer = playerLinks.length > 1 ? playerLinks[1] : 'Unknown';
    }

    // Determine winner
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

  if (frames.length === 0) {
    return null;
  }

  return {
    match: { matchId, date, home, away, homeScore, awayScore, division },
    frames,
  };
}

function parseResultsPage(html: string, division: string): ScrapedResult[] {
  const results: ScrapedResult[] = [];

  // Find date headers
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
    let date = '';
    for (let i = dateHeaders.length - 1; i >= 0; i--) {
      if (dateHeaders[i].index < rowStart.index) {
        date = dateHeaders[i].date;
        break;
      }
    }
    if (!date) continue;

    const nextRowMatch = html.indexOf('<div class="row pb-3 mx-0">', rowStart.index + 1);
    const nextH5Match = html.indexOf('<h5', rowStart.index + 1);
    const endIdx = Math.min(
      nextRowMatch > 0 ? nextRowMatch : html.length,
      nextH5Match > 0 ? nextH5Match : html.length
    );
    const rowHtml = html.substring(rowStart.index, endIdx);

    const teamLinks = [...rowHtml.matchAll(/<a href="\/leagues\/[^/]+\/team\/\d+"[^>]*>([^<]+)<\/a>/gi)]
      .map(m => decodeHtmlEntities(m[1].trim()));

    if (teamLinks.length < 2) continue;

    // Extract match ID from GetScorecard call
    const scorecardMatch = rowHtml.match(/GetScorecard\s*\(\s*['"][^'"]+['"]\s*,\s*(\d+)\s*\)/);
    const matchId = scorecardMatch ? scorecardMatch[1] : '';

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
        matchId,
      });
    }
  }

  return results;
}

function parseFixturesPage(html: string, division: string): ScrapedFixture[] {
  const fixtures: ScrapedFixture[] = [];

  const dateHeaders: { date: string; index: number }[] = [];
  const h6Regex = /<h6[^>]*class="text-lighter"[^>]*>\s*\w+,\s+(\d{1,2}\s+\w+\s+\d{4})\s*<\/h6>/gi;
  let h6Match;
  while ((h6Match = h6Regex.exec(html)) !== null) {
    dateHeaders.push({ date: parseDate(h6Match[1]), index: h6Match.index });
  }

  const rowRegex = /<div class="row pb-3 mx-0">/gi;
  let rowStart;
  while ((rowStart = rowRegex.exec(html)) !== null) {
    let date = '';
    for (let i = dateHeaders.length - 1; i >= 0; i--) {
      if (dateHeaders[i].index < rowStart.index) {
        date = dateHeaders[i].date;
        break;
      }
    }
    if (!date) continue;

    const nextRowMatch = html.indexOf('<div class="row pb-3 mx-0">', rowStart.index + 1);
    const nextH5Match = html.indexOf('<h5', rowStart.index + 1);
    const endIdx = Math.min(
      nextRowMatch > 0 ? nextRowMatch : html.length,
      nextH5Match > 0 ? nextH5Match : html.length
    );
    const rowHtml = html.substring(rowStart.index, endIdx);

    if (!rowHtml.includes('badge badge-secondary') && !rowHtml.includes('>vs<')) continue;
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

function parseStandingsPage(html: string): string[] {
  const teams: string[] = [];

  const teamRegex = /<td[^>]*border-start[^>]*font-weight-bold[^>]*text-wrap[^>]*>\s*<a href="\/leagues\/[^/]+\/team\/\d+"[^>]*>\s*([^<]+?)\s*<\/a>/gi;
  let match;
  while ((match = teamRegex.exec(html)) !== null) {
    teams.push(decodeHtmlEntities(match[1].trim()));
  }

  return teams;
}

// --- Frame cleaning ---

function cleanFrames(allFrames: ScrapedMatchFrames[]): ScrapedMatchFrames[] {
  const cleaned: ScrapedMatchFrames[] = [];
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

// --- Player name splitting for doubles ---

function splitPlayerNames(playerField: string): string[] {
  if (!playerField || playerField === 'Unknown') return [];

  // Split on " & " for doubles
  const names = playerField.split(/\s*&\s*/);
  return names
    .map(n => n.trim())
    .filter(n => n.length > 0 && n !== 'Unknown');
}

// --- Main export ---

export async function syncRackEmAppLeague(
  config: LeagueConfig,
  options: SyncOptions
): Promise<{
  results: ScrapedResult[];
  fixtures: ScrapedFixture[];
  frames: ScrapedMatchFrames[];
  players2526: Record<string, PlayerStats>;
  rosters: Record<string, string[]>;
  divisions: Record<string, { name: string; teams: string[] }>;
  requestCount: number;
  skippedFrames: number;
}> {
  // Reset request counter
  requestCount = 0;
  let skippedFrames = 0;

  const rackemappLeague = config.rackemappLeague;
  if (!rackemappLeague) {
    throw new Error(`League config missing rackemappLeague for ${config.leagueId}`);
  }

  // Build division lookup from config
  const divisionLookup = config.divisions
    .filter(d => d.rackemappId)
    .map(d => ({
      id: d.rackemappId!,
      code: d.code,
      name: d.siteGroup,
    }));

  if (divisionLookup.length === 0) {
    throw new Error(`No divisions with rackemappId found for ${config.leagueId}`);
  }

  log(`=== RackEmApp Sync ===`);
  log(`League: ${config.leagueName} (${rackemappLeague})`);
  log(`Divisions: ${divisionLookup.map(d => d.code).join(', ')}`);
  log('');

  // 1. Scrape standings per division → team names + divisions map
  log('Step 1: Scraping standings...');
  const divisionsMap: Record<string, { name: string; teams: string[] }> = {};

  for (const div of divisionLookup) {
    try {
      const url = `${RACKEMAPP_BASE_URL}/leagues/${rackemappLeague}/tables/${div.id}`;
      const html = await fetchPage(url);
      const teams = parseStandingsPage(html);
      divisionsMap[div.code] = { name: div.name, teams };
      log(`${div.code}: ${teams.length} teams`);
    } catch (err) {
      log(`Failed to scrape standings for ${div.code}: ${err instanceof Error ? err.message : err}`, 'WARN');
      divisionsMap[div.code] = { name: div.name, teams: [] };
    }
  }

  // 2. Scrape results pages → match list with dates, scores, and match IDs
  log('Step 2: Scraping results...');
  const allResults: ScrapedResult[] = [];
  const allMatchIds: Map<string, { division: string; date: string; home: string; away: string }> = new Map();

  for (const div of divisionLookup) {
    try {
      const url = `${RACKEMAPP_BASE_URL}/leagues/${rackemappLeague}/results/${div.id}`;
      const html = await fetchPage(url);

      // Parse results for scores and dates
      const results = parseResultsPage(html, div.code);
      allResults.push(...results);
      log(`${div.code}: ${results.length} results`);

      // Also extract match IDs from GetScorecard calls
      const matchesWithIds = extractMatchIds(html);
      for (const m of matchesWithIds) {
        m.division = div.code;
      }

      // Merge: prefer results page data for dates/teams, use extracted IDs
      for (const result of results) {
        if (result.matchId) {
          allMatchIds.set(result.matchId, {
            division: result.division,
            date: result.date,
            home: result.home,
            away: result.away,
          });
        }
      }
      // Also add any match IDs found via GetScorecard that weren't in results
      for (const m of matchesWithIds) {
        if (!allMatchIds.has(m.matchId)) {
          allMatchIds.set(m.matchId, {
            division: m.division,
            date: m.date,
            home: m.home,
            away: m.away,
          });
        }
      }
    } catch (err) {
      log(`Failed to scrape results for ${div.code}: ${err instanceof Error ? err.message : err}`, 'WARN');
    }
  }
  log(`Total results: ${allResults.length}, unique match IDs: ${allMatchIds.size}`);

  // 3. Determine which matches need scorecard fetching (incremental)
  const existingFramesMap = new Map<string, ScrapedMatchFrames>();
  if (options.existingData?.frames) {
    for (const f of options.existingData.frames) {
      existingFramesMap.set(f.matchId, f);
    }
    log(`Incremental: ${existingFramesMap.size} existing frame records`);
  }

  const newMatchIds: string[] = [];
  for (const matchId of allMatchIds.keys()) {
    if (!existingFramesMap.has(matchId)) {
      newMatchIds.push(matchId);
    }
  }
  log(`New matches to fetch scorecards: ${newMatchIds.length} (skipping ${allMatchIds.size - newMatchIds.length} existing)`);
  skippedFrames = allMatchIds.size - newMatchIds.length;

  // 4. Fetch scorecards for new matches only
  log('Step 3: Fetching scorecards...');
  const newFrames: ScrapedMatchFrames[] = [];
  let fetchErrors = 0;

  for (let i = 0; i < newMatchIds.length; i++) {
    const matchId = newMatchIds[i];
    const meta = allMatchIds.get(matchId)!;

    // Batch pause
    if (i > 0 && i % BATCH_SIZE === 0) {
      const batchPause = BATCH_PAUSE_MIN + Math.random() * (BATCH_PAUSE_MAX - BATCH_PAUSE_MIN);
      log(`Batch pause: ${Math.round(batchPause / 1000)}s before next batch...`);
      await sleep(batchPause);
    }

    try {
      const url = `${RACKEMAPP_BASE_URL}/leagues/${rackemappLeague}/scorecard/${matchId}`;
      const html = await fetchPage(url);
      const parsed = parseScorecard(html, matchId, divisionLookup);

      if (parsed) {
        const frameData: ScrapedMatchFrames = {
          matchId,
          date: meta.date || parsed.match.date,
          home: meta.home || parsed.match.home,
          away: meta.away || parsed.match.away,
          division: meta.division || parsed.match.division,
          frames: parsed.frames,
        };
        newFrames.push(frameData);

        // Also update the result entry if scorecard provided better data
        const resultIdx = allResults.findIndex(r => r.matchId === matchId);
        if (resultIdx >= 0) {
          if (!allResults[resultIdx].date && parsed.match.date) {
            allResults[resultIdx].date = parsed.match.date;
          }
        } else {
          // Add result from scorecard data if not in results page
          allResults.push({
            date: meta.date || parsed.match.date,
            home: meta.home || parsed.match.home,
            away: meta.away || parsed.match.away,
            home_score: parsed.match.homeScore,
            away_score: parsed.match.awayScore,
            division: meta.division || parsed.match.division,
            frames: parsed.frames.length,
            matchId,
          });
        }
      } else {
        log(`Could not parse scorecard for match ${matchId}`, 'WARN');
        fetchErrors++;
      }
    } catch (err) {
      log(`Error fetching scorecard ${matchId}: ${err instanceof Error ? err.message : err}`, 'WARN');
      fetchErrors++;
    }
  }

  if (fetchErrors > 0) {
    log(`Scorecard fetch errors: ${fetchErrors}`, 'WARN');
  }
  log(`New scorecards fetched: ${newFrames.length}`);

  // 5. Merge existing + new frames, then clean
  const allFrames: ScrapedMatchFrames[] = [];
  // Add existing frames first
  for (const [, frame] of existingFramesMap) {
    allFrames.push(frame);
  }
  // Add new frames
  allFrames.push(...newFrames);

  const cleanedFrames = cleanFrames(allFrames);
  log(`Total frames after cleaning: ${cleanedFrames.length}`);

  // 6. Scrape fixtures
  log('Step 4: Scraping fixtures...');
  const allFixtures: ScrapedFixture[] = [];
  for (const div of divisionLookup) {
    try {
      const url = `${RACKEMAPP_BASE_URL}/leagues/${rackemappLeague}/fixtures/${div.id}`;
      const html = await fetchPage(url);
      const fixtures = parseFixturesPage(html, div.code);
      allFixtures.push(...fixtures);
      log(`${div.code}: ${fixtures.length} fixtures`);
    } catch (err) {
      log(`Failed to scrape fixtures for ${div.code}: ${err instanceof Error ? err.message : err}`, 'WARN');
    }
  }
  log(`Total fixtures: ${allFixtures.length}`);

  // 7. Build player stats and rosters from all frame data
  log('Step 5: Building player stats...');
  const playerTeamStats: Record<string, Record<string, {
    div: string; p: number; w: number; bdF: number; bdA: number; forf: number;
  }>> = {};
  const rosterSets: Record<string, Set<string>> = {};

  for (const match of cleanedFrames) {
    const homeRosterKey = `${match.division}:${match.home}`;
    const awayRosterKey = `${match.division}:${match.away}`;
    if (!rosterSets[homeRosterKey]) rosterSets[homeRosterKey] = new Set();
    if (!rosterSets[awayRosterKey]) rosterSets[awayRosterKey] = new Set();

    for (const frame of match.frames) {
      // Process home players
      for (const rawName of splitPlayerNames(frame.homePlayer)) {
        const playerName = normalizePlayerName(rawName, match.home, config.dataDir);
        rosterSets[homeRosterKey].add(playerName);
        if (!playerTeamStats[playerName]) playerTeamStats[playerName] = {};
        if (!playerTeamStats[playerName][match.home]) {
          playerTeamStats[playerName][match.home] = { div: match.division, p: 0, w: 0, bdF: 0, bdA: 0, forf: 0 };
        }
        const stat = playerTeamStats[playerName][match.home];
        stat.p++;
        if (frame.winner === 'home') {
          stat.w++;
          if (frame.breakDish) stat.bdF++;
        } else {
          if (frame.breakDish) stat.bdA++;
        }
        if (frame.forfeit) stat.forf++;
      }

      // Process away players
      for (const rawName of splitPlayerNames(frame.awayPlayer)) {
        const playerName = normalizePlayerName(rawName, match.away, config.dataDir);
        rosterSets[awayRosterKey].add(playerName);
        if (!playerTeamStats[playerName]) playerTeamStats[playerName] = {};
        if (!playerTeamStats[playerName][match.away]) {
          playerTeamStats[playerName][match.away] = { div: match.division, p: 0, w: 0, bdF: 0, bdA: 0, forf: 0 };
        }
        const stat = playerTeamStats[playerName][match.away];
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

  // Build players2526
  const players2526: Record<string, PlayerStats> = {};
  for (const [name, teams] of Object.entries(playerTeamStats)) {
    const teamEntries = Object.entries(teams).map(([team, stat]) => ({
      team,
      div: stat.div,
      p: stat.p,
      w: stat.w,
      pct: stat.p > 0 ? Math.round((stat.w / stat.p) * 10000) / 100 : 0,
      lag: 0,
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

  // Build rosters
  const rosters: Record<string, string[]> = {};
  for (const [key, names] of Object.entries(rosterSets)) {
    rosters[key] = [...names].sort();
  }

  log(`Players: ${Object.keys(players2526).length}`);
  log(`Roster entries: ${Object.keys(rosters).length}`);

  return {
    results: allResults,
    fixtures: allFixtures,
    frames: cleanedFrames,
    players2526,
    rosters,
    divisions: divisionsMap,
    requestCount,
    skippedFrames,
  };
}
