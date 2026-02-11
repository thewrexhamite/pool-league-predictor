import * as path from 'path';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  syncLeagueData,
  loadLeagueConfigs,
  ExistingData,
  ScrapedMatchFrames,
  PlayerStats,
} from '../../src/lib/sync-pipeline';

initializeApp();

// Cloud Functions
export { resolvePredictions } from './resolvePredictions';
export { recalculateLabels } from './recalculateLabels';

// league-config.json is copied to lib/ at build time, so __dirname resolves it
const PROJECT_ROOT = path.resolve(__dirname);
const LEAGUE_CONFIGS = loadLeagueConfigs(PROJECT_ROOT);

const ALL_LEAGUES = Object.keys(LEAGUE_CONFIGS);
const LEAGUE_PAUSE_MS = 30_000;

// --- Helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadExistingDataFromFirestore(leagueId: string, seasonId: string): Promise<ExistingData> {
  const db = getFirestore();
  const seasonDoc = await db
    .collection('leagues').doc(leagueId)
    .collection('seasons').doc(seasonId)
    .get();

  if (!seasonDoc.exists) {
    console.log(`No existing season data for ${leagueId}/${seasonId}`);
    return {};
  }

  const data = seasonDoc.data()!;
  return {
    results: data.results as ExistingData['results'],
    fixtures: data.fixtures as ExistingData['fixtures'],
    frames: data.frames as ScrapedMatchFrames[],
    players: data.players as Record<string, unknown>,
    players2526: data.players2526 as Record<string, PlayerStats>,
    rosters: data.rosters as Record<string, string[]>,
  };
}

interface LeagueReport {
  league: string;
  success: boolean;
  results: number;
  fixtures: number;
  frames: number;
  requestCount: number;
  skippedFrames: number;
  durationMs: number;
  error?: string;
}

async function runSync(leagueKeys: string[]): Promise<{ reports: LeagueReport[]; allSucceeded: boolean }> {
  const reports: LeagueReport[] = [];
  let allSucceeded = true;

  for (let i = 0; i < leagueKeys.length; i++) {
    const leagueKey = leagueKeys[i];
    const cfg = LEAGUE_CONFIGS[leagueKey];

    if (!cfg) {
      console.error(`Unknown league: ${leagueKey}`);
      reports.push({
        league: leagueKey,
        success: false,
        results: 0, fixtures: 0, frames: 0,
        requestCount: 0, skippedFrames: 0, durationMs: 0,
        error: `Unknown league: ${leagueKey}`,
      });
      allSucceeded = false;
      continue;
    }

    // Pause between leagues
    if (i > 0) {
      console.log(`Pausing ${LEAGUE_PAUSE_MS / 1000}s before next league...`);
      await sleep(LEAGUE_PAUSE_MS);
    }

    console.log(`--- Syncing ${leagueKey} ---`);

    // Load existing data from Firestore for incremental sync
    let existingData: ExistingData = {};
    try {
      existingData = await loadExistingDataFromFirestore(cfg.leagueId, cfg.seasonId);
    } catch (err) {
      console.warn(`Failed to load existing data for ${leagueKey}:`, err);
    }

    try {
      const result = await syncLeagueData(leagueKey, {
        dryRun: false,
        projectRoot: PROJECT_ROOT,
        incremental: true,
        writeJsonFiles: false,
        existingData,
      });

      reports.push({
        league: leagueKey,
        success: result.success,
        results: result.results,
        fixtures: result.fixtures,
        frames: result.frames,
        requestCount: result.requestCount,
        skippedFrames: result.skippedFrames,
        durationMs: result.durationMs,
        error: result.error,
      });

      if (!result.success) allSucceeded = false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`FATAL: ${leagueKey} sync threw: ${errorMessage}`);
      reports.push({
        league: leagueKey,
        success: false,
        results: 0, fixtures: 0, frames: 0,
        requestCount: 0, skippedFrames: 0, durationMs: 0,
        error: errorMessage,
      });
      allSucceeded = false;
    }
  }

  return { reports, allSucceeded };
}

// --- Scheduled Functions ---
// After match nights (Sun & Wed) + morning catch-up (Mon & Thu)

const SCHEDULE_OPTS = {
  timeZone: 'UTC' as const,
  timeoutSeconds: 1800,
  memory: '1GiB' as const,
};

const syncAll = async () => {
  const { allSucceeded } = await runSync(ALL_LEAGUES);
  if (!allSucceeded) throw new Error('One or more league syncs failed');
};

export const syncSunNight = onSchedule({ ...SCHEDULE_OPTS, schedule: '0 23 * * 0' }, syncAll);
export const syncMonMorning = onSchedule({ ...SCHEDULE_OPTS, schedule: '0 8 * * 1' }, syncAll);
export const syncWedNight = onSchedule({ ...SCHEDULE_OPTS, schedule: '0 23 * * 3' }, syncAll);
export const syncThuMorning = onSchedule({ ...SCHEDULE_OPTS, schedule: '0 8 * * 4' }, syncAll);

// --- HTTP trigger for manual runs ---

export const syncLeaguesHttp = onRequest(
  {
    timeoutSeconds: 1800,
    memory: '1GiB',
  },
  async (req, res) => {
    // Simple auth: require a secret header to prevent public access
    const authHeader = req.headers['x-sync-key'];
    const expectedKey = process.env.SYNC_AUTH_KEY;
    if (expectedKey && authHeader !== expectedKey) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    const league = (req.query.league as string) || 'all';
    const leagueKeys = league === 'all' ? ALL_LEAGUES : [league];

    // Validate
    for (const key of leagueKeys) {
      if (!LEAGUE_CONFIGS[key]) {
        res.status(400).json({ error: `Unknown league: ${key}. Available: ${ALL_LEAGUES.join(', ')}` });
        return;
      }
    }

    console.log(`Manual sync triggered for: ${leagueKeys.join(', ')}`);
    const { reports, allSucceeded } = await runSync(leagueKeys);

    res.status(allSucceeded ? 200 : 207).json({
      timestamp: new Date().toISOString(),
      allSucceeded,
      reports,
    });
  }
);
