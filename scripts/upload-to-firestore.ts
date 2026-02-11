#!/usr/bin/env npx tsx

/**
 * Upload scraped league data to Firestore
 *
 * Usage:
 *   npx tsx scripts/upload-to-firestore.ts --data ./data-wrexham-tuesday
 *
 * Options:
 *   --data <dir>        Directory containing scraped JSON files (required)
 *   --league-id <id>    League ID in Firestore (default: wrexham-tuesday)
 *   --league-name <n>   Full league name (default: Wrexham Tuesday Pool League)
 *   --short-name <n>    Short name (default: Wrexham Tues)
 *   --season-id <id>    Season ID (default: 2425)
 *   --season-label <l>  Season label (default: 2024/25)
 *   --lat <number>      Latitude (optional, auto-geocoded from league name if omitted)
 *   --lng <number>      Longitude (optional, auto-geocoded from league name if omitted)
 *   --dry-run           Show what would be uploaded without actually uploading
 *
 * Authentication:
 *   Uses Firebase CLI credentials (Application Default Credentials).
 *   Make sure you're logged in: firebase login
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, applicationDefault, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { geocodeLeagueName } from '../src/lib/geocode';

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const getArg = (name: string, defaultVal: string): string => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
};

const DATA_DIR = getArg('data', '');
const LEAGUE_ID = getArg('league-id', 'wrexham-tuesday');
const LEAGUE_NAME = getArg('league-name', 'Wrexham Tuesday Pool League');
const SHORT_NAME = getArg('short-name', 'Wrexham Tues');
const SEASON_ID = getArg('season-id', '2425');
const SEASON_LABEL = getArg('season-label', '2024/25');
const CLI_LAT = getArg('lat', '');
const CLI_LNG = getArg('lng', '');
const DRY_RUN = args.includes('--dry-run');

// ============================================================================
// Utilities
// ============================================================================

function log(message: string): void {
  const timestamp = new Date().toISOString().substring(11, 19);
  console.log(`[${timestamp}] ${message}`);
}

function loadJson<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  if (!DATA_DIR) {
    console.error('Error: --data <directory> is required');
    console.error('Usage: npx tsx scripts/upload-to-firestore.ts --data ./data-wrexham-tuesday');
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Error: Data directory not found: ${DATA_DIR}`);
    process.exit(1);
  }

  log(`Uploading league data to Firestore`);
  log(`  Data directory: ${DATA_DIR}`);
  log(`  League: ${LEAGUE_NAME} (${LEAGUE_ID})`);
  log(`  Season: ${SEASON_LABEL} (${SEASON_ID})`);
  if (DRY_RUN) log('  DRY RUN - no data will be uploaded');

  // Resolve coordinates
  let coordFields: { lat: number; lng: number } | {} = {};
  if (CLI_LAT && CLI_LNG) {
    coordFields = { lat: parseFloat(CLI_LAT), lng: parseFloat(CLI_LNG) };
    log(`  Coordinates: ${CLI_LAT}, ${CLI_LNG} (from CLI args)`);
  } else {
    log(`  Geocoding "${LEAGUE_NAME}"...`);
    const result = await geocodeLeagueName(LEAGUE_NAME);
    if (result) {
      coordFields = { lat: result.lat, lng: result.lng };
      log(`  Coordinates: ${result.lat}, ${result.lng} (${result.displayName})`);
    } else {
      log(`  Geocoding failed, no coordinates will be set`);
    }
  }

  // Load all JSON files
  log('\nLoading data files...');

  const results = loadJson<unknown[]>(path.join(DATA_DIR, 'results.json'));
  log(`  results.json: ${results.length} matches`);

  const fixtures = loadJson<unknown[]>(path.join(DATA_DIR, 'fixtures.json'));
  log(`  fixtures.json: ${fixtures.length} fixtures`);

  const frames = loadJson<unknown[]>(path.join(DATA_DIR, 'frames.json'));
  log(`  frames.json: ${frames.length} match frames`);

  const players = loadJson<Record<string, unknown>>(path.join(DATA_DIR, 'players.json'));
  log(`  players.json: ${Object.keys(players).length} players (24/25 data)`);

  const players2526 = loadJson<Record<string, unknown>>(path.join(DATA_DIR, 'players2526.json'));
  log(`  players2526.json: ${Object.keys(players2526).length} players`);

  const rosters = loadJson<Record<string, unknown>>(path.join(DATA_DIR, 'rosters.json'));
  log(`  rosters.json: ${Object.keys(rosters).length} team rosters`);

  const divisions = loadJson<Record<string, unknown>>(path.join(DATA_DIR, 'divisions.json'));
  log(`  divisions.json: ${Object.keys(divisions).length} divisions`);

  if (DRY_RUN) {
    log('\n=== DRY RUN - Would upload: ===');
    log(`League document: leagues/${LEAGUE_ID}`);
    log(`  name: ${LEAGUE_NAME}`);
    log(`  shortName: ${SHORT_NAME}`);
    log(`  seasons: [{ id: ${SEASON_ID}, label: ${SEASON_LABEL}, current: true, divisions: [${Object.keys(divisions).join(', ')}] }]`);
    log(`\nSeason document: leagues/${LEAGUE_ID}/seasons/${SEASON_ID}`);
    log(`  results: ${results.length} items`);
    log(`  fixtures: ${fixtures.length} items`);
    log(`  frames: ${frames.length} items`);
    log(`  players: ${Object.keys(players).length} items`);
    log(`  players2526: ${Object.keys(players2526).length} items`);
    log(`  rosters: ${Object.keys(rosters).length} items`);
    log(`  divisions: ${Object.keys(divisions).length} items`);
    log(`  lastUpdated: ${Date.now()}`);
    log('\nRun without --dry-run to upload.');
    return;
  }

  // Initialize Firebase Admin
  log('\nInitializing Firebase...');

  // Try service account key first, then Application Default Credentials
  const possibleKeyPaths = [
    './service-account.json',
    './serviceAccountKey.json',
    './firebase-admin-key.json',
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean) as string[];

  let keyPath: string | null = null;
  for (const p of possibleKeyPaths) {
    if (fs.existsSync(p)) {
      keyPath = p;
      break;
    }
  }

  const projectId = 'pool-league-predictor';

  if (keyPath) {
    log(`  Using service account key: ${keyPath}`);
    const serviceAccount = loadJson<ServiceAccount>(keyPath);
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  } else {
    // Use Application Default Credentials (from Firebase CLI login)
    log('  Using Application Default Credentials (Firebase CLI)');
    try {
      initializeApp({
        credential: applicationDefault(),
        projectId,
      });
    } catch (error) {
      console.error('Error: Could not initialize Firebase.');
      console.error('Make sure you are logged in: firebase login');
      console.error('Or provide a service account key file.');
      process.exit(1);
    }
  }

  const db = getFirestore();

  // Upload league metadata
  log('\nUploading league metadata...');
  const leagueRef = db.collection('leagues').doc(LEAGUE_ID);

  await leagueRef.set({
    name: LEAGUE_NAME,
    shortName: SHORT_NAME,
    ...coordFields,
    seasons: [
      {
        id: SEASON_ID,
        label: SEASON_LABEL,
        current: true,
        divisions: Object.keys(divisions),
      },
    ],
  });
  log(`  Created leagues/${LEAGUE_ID}`);

  // Upload season data (without frames — those go to subcollection)
  log('\nUploading season data...');
  const seasonRef = leagueRef.collection('seasons').doc(SEASON_ID);

  await seasonRef.set({
    results,
    fixtures,
    players,
    playerStats: players2526,
    rosters,
    divisions,
    lastUpdated: Date.now(),
    lastSyncedFrom: 'rackemapp-scraper',
  });
  log(`  Created leagues/${LEAGUE_ID}/seasons/${SEASON_ID}`);

  // Upload frames to subcollection (one doc per match)
  log('\nUploading frames to subcollection...');
  const framesArray = frames as Array<{ matchId: string; [key: string]: unknown }>;
  const BATCH_LIMIT = 500;
  for (let i = 0; i < framesArray.length; i += BATCH_LIMIT) {
    const batch = db.batch();
    const chunk = framesArray.slice(i, i + BATCH_LIMIT);
    for (const frame of chunk) {
      const matchId = frame.matchId || `match_${i}`;
      const frameDocRef = seasonRef.collection('frames').doc(String(matchId));
      batch.set(frameDocRef, frame);
    }
    await batch.commit();
    log(`  Wrote batch ${Math.floor(i / BATCH_LIMIT) + 1} (${chunk.length} frame docs)`);
  }
  log(`  Total: ${framesArray.length} frame docs written to subcollection`);

  // Write player search index
  log('\nWriting player search index...');
  const indexId = `${LEAGUE_ID}_${SEASON_ID}`;
  const playersSummary: Record<string, { p: number; w: number; pct: number; teams: string[] }> = {};
  for (const [name, data] of Object.entries(players2526 as Record<string, { total: { p: number; w: number; pct: number }; teams: { team: string }[] }>)) {
    playersSummary[name] = {
      p: data.total.p,
      w: data.total.w,
      pct: data.total.pct,
      teams: data.teams.map((t: { team: string }) => t.team),
    };
  }
  await db.collection('players_index').doc(indexId).set({
    leagueId: LEAGUE_ID,
    seasonId: SEASON_ID,
    leagueName: LEAGUE_NAME,
    leagueShortName: SHORT_NAME,
    players: playersSummary,
    lastUpdated: Date.now(),
  });
  log(`  Created players_index/${indexId} (${Object.keys(playersSummary).length} players)`);

  log('\nDone! The league should now appear in the app.');
  log(`Select "${LEAGUE_NAME}" from the league picker to view the data.`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
