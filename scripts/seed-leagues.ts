#!/usr/bin/env npx tsx

/**
 * Seed league metadata from league-config.json to Firestore
 *
 * Usage:
 *   npx tsx scripts/seed-leagues.ts
 *   npx tsx scripts/seed-leagues.ts --dry-run
 *   npx tsx scripts/seed-leagues.ts --league wrexham
 *
 * Options:
 *   --league <id>       Seed only a specific league (default: all leagues)
 *   --dry-run           Show what would be seeded without actually seeding
 *
 * Authentication:
 *   Uses Firebase CLI credentials (Application Default Credentials).
 *   Make sure you're logged in: firebase login
 */

import * as fs from 'fs';
import * as path from 'path';
import { initializeApp, applicationDefault, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ============================================================================
// Types
// ============================================================================

interface LeagueConfig {
  site: string;
  leagueId: string;
  seasonId: string;
  leagueName: string;
  shortName: string;
  dataDir: string;
  divisions: Array<{ code: string; siteGroup: string }>;
  teamNameMap: Record<string, string>;
  primaryColor?: string;
  logo?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const getArg = (name: string, defaultVal: string): string => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
};

const LEAGUE_FILTER = getArg('league', '');
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
  log('Seeding league metadata to Firestore');
  if (DRY_RUN) log('  DRY RUN - no data will be seeded');
  if (LEAGUE_FILTER) log(`  League filter: ${LEAGUE_FILTER}`);

  // Load league configurations
  log('\nLoading league configurations...');
  const configPath = './league-config.json';

  if (!fs.existsSync(configPath)) {
    console.error(`Error: League config file not found: ${configPath}`);
    process.exit(1);
  }

  const allConfigs = loadJson<Record<string, LeagueConfig>>(configPath);

  // Filter leagues if specified
  const configsToSeed = LEAGUE_FILTER
    ? { [LEAGUE_FILTER]: allConfigs[LEAGUE_FILTER] }
    : allConfigs;

  if (LEAGUE_FILTER && !configsToSeed[LEAGUE_FILTER]) {
    console.error(`Error: League '${LEAGUE_FILTER}' not found in league-config.json`);
    process.exit(1);
  }

  log(`  Found ${Object.keys(configsToSeed).length} league(s) to seed`);
  for (const [key, config] of Object.entries(configsToSeed)) {
    log(`    - ${key}: ${config.leagueName} (${config.shortName})`);
  }

  if (DRY_RUN) {
    log('\n=== DRY RUN - Would seed: ===');
    for (const [key, config] of Object.entries(configsToSeed)) {
      log(`\nLeague document: leagues/${config.leagueId}`);
      log(`  name: ${config.leagueName}`);
      log(`  shortName: ${config.shortName}`);
      log(`  primaryColor: ${config.primaryColor || '(not set)'}`);
      log(`  logo: ${config.logo || '(not set)'}`);
      log(`  seasons: []`);
      log(`  Note: Season data should be uploaded separately using upload-to-firestore.ts`);
      log(``);
      log(`  Example historical season metadata structure (to be added to seasons array):`);
      log(`  {`);
      log(`    id: "2023-24",`);
      log(`    label: "2023/24",`);
      log(`    current: false,`);
      log(`    divisions: ["prem", "div1", "div2"],`);
      log(`    champion: "The Kings Arms",  // Premier division champion`);
      log(`    promoted: ["Rising Stars", "Challengers FC"],  // Teams promoted to higher divisions`);
      log(`    relegated: ["Bottom Team A", "Bottom Team B"],  // Teams relegated to lower divisions`);
      log(`    finalStandings: {`);
      log(`      prem: [`);
      log(`        { team: "The Kings Arms", p: 22, w: 18, d: 2, l: 2, f: 108, a: 56, pts: 56, diff: 52 },`);
      log(`        { team: "Runner Up FC", p: 22, w: 16, d: 3, l: 3, f: 98, a: 66, pts: 51, diff: 32 },`);
      log(`        ...`);
      log(`      ],`);
      log(`      div1: [ ... ],`);
      log(`      div2: [ ... ]`);
      log(`    }`);
      log(`  }`);
    }
    log('\nSeed complete');
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

  // Seed league metadata
  log('\nSeeding league metadata...');
  for (const [key, config] of Object.entries(configsToSeed)) {
    const leagueRef = db.collection('leagues').doc(config.leagueId);

    // Check if league already exists
    const existingDoc = await leagueRef.get();

    if (existingDoc.exists) {
      log(`  Updating leagues/${config.leagueId}`);
      // Update metadata but preserve existing seasons array
      const existingData = existingDoc.data();
      await leagueRef.update({
        name: config.leagueName,
        shortName: config.shortName,
        ...(config.primaryColor && { primaryColor: config.primaryColor }),
        ...(config.logo && { logo: config.logo }),
        // Preserve existing seasons if they exist
        seasons: existingData?.seasons || [],
      });
    } else {
      log(`  Creating leagues/${config.leagueId}`);
      // Create new league document
      await leagueRef.set({
        name: config.leagueName,
        shortName: config.shortName,
        ...(config.primaryColor && { primaryColor: config.primaryColor }),
        ...(config.logo && { logo: config.logo }),
        seasons: [],
      });
    }
  }

  log('\nSeed complete');
  log('Next steps:');
  log('  1. Upload season data using: npx tsx scripts/upload-to-firestore.ts --data ./data --league-id <league>');
  log('  2. The league will appear in the app league selector once season data is uploaded');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
