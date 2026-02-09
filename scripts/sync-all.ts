import * as fs from 'fs';
import * as path from 'path';
import { syncLeagueData, loadLeagueConfigs, SyncResult } from '../src/lib/sync-pipeline';

/**
 * Multi-league sync orchestrator.
 *
 * Runs sync for multiple leagues sequentially with pauses between them.
 * Isolates failures so one league failing doesn't block others.
 * Writes a sync report and GitHub Actions job summary.
 *
 * Usage:
 *   npx tsx scripts/sync-all.ts
 *   npx tsx scripts/sync-all.ts --league wrexham
 *   npx tsx scripts/sync-all.ts --league all --dry-run
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

// --- Constants ---

const LEAGUE_PAUSE_MS = 30000; // 30s pause between leagues

// --- Main ---

interface LeagueReport {
  league: string;
  result: SyncResult;
  startedAt: string;
  finishedAt: string;
}

async function main() {
  const leagueArg = getArg('league', 'all');
  const dryRun = hasFlag('dry-run');
  const full = hasFlag('full');
  const projectRoot = path.join(__dirname, '..');

  const configs = loadLeagueConfigs(projectRoot);
  const allLeagueKeys = Object.keys(configs);

  // Determine which leagues to sync
  const leagueKeys = leagueArg === 'all'
    ? allLeagueKeys
    : [leagueArg];

  // Validate
  for (const key of leagueKeys) {
    if (!configs[key]) {
      console.error(`Unknown league: "${key}". Available: ${allLeagueKeys.join(', ')}`);
      process.exit(1);
    }
  }

  console.log(`\n=== Multi-League Sync ===`);
  console.log(`Leagues: ${leagueKeys.join(', ')}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}${full ? '' : ' (incremental)'}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const reports: LeagueReport[] = [];
  let hasFailure = false;

  for (let i = 0; i < leagueKeys.length; i++) {
    const leagueKey = leagueKeys[i];

    // Pause between leagues (not before the first one)
    if (i > 0) {
      console.log(`\nPausing ${LEAGUE_PAUSE_MS / 1000}s before next league...\n`);
      await new Promise(resolve => setTimeout(resolve, LEAGUE_PAUSE_MS));
    }

    const startedAt = new Date().toISOString();
    console.log(`--- Syncing ${configs[leagueKey].leagueName} (${leagueKey}) ---`);

    let result: SyncResult;
    try {
      result = await syncLeagueData(leagueKey, {
        dryRun,
        projectRoot,
        incremental: !full,
      });
    } catch (err) {
      // Isolate failures — catch unexpected errors that escape syncLeagueData
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`FATAL: ${leagueKey} sync threw: ${errorMessage}`);
      result = {
        success: false,
        results: 0,
        fixtures: 0,
        frames: 0,
        players: 0,
        requestCount: 0,
        skippedFrames: 0,
        durationMs: 0,
        error: errorMessage,
      };
    }

    const finishedAt = new Date().toISOString();
    reports.push({ league: leagueKey, result, startedAt, finishedAt });

    if (!result.success) {
      hasFailure = true;
      console.error(`${leagueKey}: FAILED — ${result.error}`);
    } else {
      console.log(`${leagueKey}: OK — ${result.results} results, ${result.frames} frames, ${result.requestCount} requests, ${result.skippedFrames} skipped`);
    }
  }

  // Write sync report
  const reportPath = path.join(projectRoot, 'sync-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    leagues: reports,
    allSucceeded: !hasFailure,
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nSync report written to ${reportPath}`);

  // Write GitHub Actions job summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      '## Sync Report',
      '',
      `| League | Status | Results | Fixtures | Frames | Requests | Skipped | Duration |`,
      `|--------|--------|---------|----------|--------|----------|---------|----------|`,
    ];

    for (const r of reports) {
      const status = r.result.success ? '✅' : '❌';
      const duration = `${Math.round(r.result.durationMs / 1000)}s`;
      summary.push(
        `| ${r.league} | ${status} | ${r.result.results} | ${r.result.fixtures} | ${r.result.frames} | ${r.result.requestCount} | ${r.result.skippedFrames} | ${duration} |`
      );
    }

    if (hasFailure) {
      summary.push('', '### Errors', '');
      for (const r of reports) {
        if (r.result.error) {
          summary.push(`- **${r.league}**: ${r.result.error}`);
        }
      }
    }

    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n'));
  }

  console.log(`\n=== All done. ${hasFailure ? 'Some leagues failed.' : 'All leagues succeeded.'} ===`);
  process.exit(hasFailure ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
