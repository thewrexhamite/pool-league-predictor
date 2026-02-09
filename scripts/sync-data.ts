import * as path from 'path';
import { syncLeagueData, loadLeagueConfigs } from '../src/lib/sync-pipeline';

/**
 * LeagueAppLive → Firestore + JSON sync script.
 *
 * Scrapes results, fixtures, and frame-level player data from
 * LeagueAppLive leagues, then writes to Firestore and static JSON backup files.
 *
 * Usage:
 *   npx tsx scripts/sync-data.ts
 *   npx tsx scripts/sync-data.ts --league nwpa
 *   npx tsx scripts/sync-data.ts --league nwpa --dry-run
 *   npx tsx scripts/sync-data.ts --league wrexham --full    # skip incremental, rescrape all frames
 */

// --- CLI argument parsing ---

function getArg(name: string, defaultValue: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return defaultValue;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

// --- Main ---

async function main() {
  const leagueKey = getArg('league', 'wrexham');
  const dryRun = hasFlag('dry-run');
  const full = hasFlag('full');
  const projectRoot = path.join(__dirname, '..');

  // Validate league key before running sync
  const configs = loadLeagueConfigs(projectRoot);
  if (!configs[leagueKey]) {
    console.error(`Unknown league: "${leagueKey}". Available: ${Object.keys(configs).join(', ')}`);
    process.exit(1);
  }

  // Run sync using library function (incremental by default, --full to override)
  const result = await syncLeagueData(leagueKey, {
    dryRun,
    projectRoot,
    incremental: !full,
  });

  // Exit with appropriate status code
  process.exit(result.success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
