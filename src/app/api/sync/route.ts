import { NextResponse } from 'next/server';
import { syncLeagueData, loadLeagueConfigs } from '@/lib/sync-pipeline';

interface SyncRequestBody {
  league?: string;
  dryRun?: boolean;
}

interface SyncResult {
  league: string;
  success: boolean;
  results: number;
  fixtures: number;
  frames: number;
  players: number;
  error?: string;
}

// Validate authorization token against CRON_SECRET
function validateAuthToken(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // In development without CRON_SECRET, skip auth validation
  if (!cronSecret) {
    return true;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace('Bearer ', '');
  return token === cronSecret;
}

export async function POST(request: Request) {
  try {
    // Validate authorization
    if (!validateAuthToken(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Valid Authorization header required.' },
        { status: 401 }
      );
    }

    const body: SyncRequestBody = await request.json();
    const { league, dryRun = false } = body;

    // Load available leagues
    const projectRoot = process.cwd();
    const leagueConfigs = loadLeagueConfigs(projectRoot);
    const availableLeagues = Object.keys(leagueConfigs);

    // Determine which leagues to sync
    let leaguesToSync: string[];
    if (league) {
      // Validate the specified league exists
      if (!availableLeagues.includes(league)) {
        return NextResponse.json(
          {
            error: `Invalid league: "${league}". Available leagues: ${availableLeagues.join(', ')}`,
          },
          { status: 400 }
        );
      }
      leaguesToSync = [league];
    } else {
      // If no league specified, sync all leagues
      leaguesToSync = availableLeagues;
    }

    // Sync each league
    const results: SyncResult[] = [];
    for (const leagueKey of leaguesToSync) {
      const syncResult = await syncLeagueData(leagueKey, {
        dryRun,
        projectRoot,
      });

      results.push({
        league: leagueKey,
        ...syncResult,
      });
    }

    // Determine overall success
    const allSuccessful = results.every((r) => r.success);
    const totalResults = results.reduce((sum, r) => sum + r.results, 0);
    const totalFixtures = results.reduce((sum, r) => sum + r.fixtures, 0);
    const totalFrames = results.reduce((sum, r) => sum + r.frames, 0);
    const totalPlayers = results.reduce((sum, r) => sum + r.players, 0);

    return NextResponse.json({
      success: allSuccessful,
      message: allSuccessful
        ? 'Sync completed successfully'
        : 'Sync completed with errors',
      dryRun,
      leagues: results.length,
      totals: {
        results: totalResults,
        fixtures: totalFixtures,
        frames: totalFrames,
        players: totalPlayers,
      },
      details: results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to sync data',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
