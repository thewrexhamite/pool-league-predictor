import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAdminAuth } from '../../middleware';
import { PlayersMap, Players2526Map, RostersMap, PlayerData2526, PlayerStats2425, FrameData } from '@/lib/types';

// Check if Firebase Admin is configured with proper credentials
function hasFirebaseCredentials(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
}

// Initialize Firebase Admin SDK (singleton pattern)
function initializeFirebaseAdmin(): admin.app.App | null {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (error) {
    // Initialization failed
  }

  return null;
}

interface MergePlayersRequestBody {
  seasonId: string;
  sourcePlayerNames: string[];
  targetPlayerName: string;
}

/**
 * Merge player stats from multiple source entries into a single target entry.
 * Used for historical player stats (2024-25 season).
 */
function mergePlayerStats2425(
  sources: PlayerStats2425[],
  target: PlayerStats2425 | null
): PlayerStats2425 {
  const totalGames = sources.reduce((sum, s) => sum + s.p, target?.p || 0);
  const totalWins = sources.reduce(
    (sum, s) => sum + Math.round(s.w * s.p),
    target ? Math.round(target.w * target.p) : 0
  );
  const weightedRating = sources.reduce(
    (sum, s) => sum + s.r * s.p,
    (target?.r || 0) * (target?.p || 0)
  );

  return {
    r: totalGames > 0 ? weightedRating / totalGames : 0,
    w: totalGames > 0 ? totalWins / totalGames : 0,
    p: totalGames,
  };
}

/**
 * Merge player data from multiple source entries into a single target entry.
 * Used for current season player stats (2025-26 season).
 */
function mergePlayerData2526(
  sources: PlayerData2526[],
  target: PlayerData2526 | null
): PlayerData2526 {
  // Combine all team stats from sources and target
  const allTeamStats = [
    ...(target?.teams || []),
    ...sources.flatMap((s) => s.teams),
  ];

  // Group by team+division and merge stats
  const teamStatsMap = new Map<string, any>();

  for (const teamStat of allTeamStats) {
    const key = `${teamStat.team}|${teamStat.div}`;
    const existing = teamStatsMap.get(key);

    if (existing) {
      // Merge stats for the same team+division
      existing.p += teamStat.p;
      existing.w += teamStat.w;
      existing.lag += teamStat.lag;
      existing.bdF += teamStat.bdF;
      existing.bdA += teamStat.bdA;
      existing.forf += teamStat.forf;
      existing.cup = existing.cup || teamStat.cup;
      existing.pct = existing.p > 0 ? existing.w / existing.p : 0;
    } else {
      // Add new team entry
      teamStatsMap.set(key, { ...teamStat });
    }
  }

  const mergedTeams = Array.from(teamStatsMap.values());

  // Calculate totals
  const totalP = mergedTeams.reduce((sum, t) => sum + t.p, 0);
  const totalW = mergedTeams.reduce((sum, t) => sum + t.w, 0);

  return {
    teams: mergedTeams,
    total: {
      p: totalP,
      w: totalW,
      pct: totalP > 0 ? totalW / totalP : 0,
    },
  };
}

/**
 * POST /api/admin/players/merge
 * Merge duplicate player entries into a single canonical player
 */
export async function POST(request: Request) {
  // Verify admin authorization
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    const body: MergePlayersRequestBody = await request.json();
    const { seasonId, sourcePlayerNames, targetPlayerName } = body;

    // Validate required fields
    if (!seasonId) {
      return NextResponse.json(
        { error: 'Missing required field: seasonId' },
        { status: 400 }
      );
    }

    if (!sourcePlayerNames || !Array.isArray(sourcePlayerNames) || sourcePlayerNames.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or missing sourcePlayerNames: must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!targetPlayerName || typeof targetPlayerName !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing targetPlayerName: must be a string' },
        { status: 400 }
      );
    }

    // Validate that source names don't include target name
    if (sourcePlayerNames.includes(targetPlayerName)) {
      return NextResponse.json(
        { error: 'targetPlayerName cannot be in sourcePlayerNames' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't persist
      return NextResponse.json({
        success: true,
        message: 'Players merged (development mode - not persisted)',
        dev_mode: true,
        sourcePlayerNames,
        targetPlayerName,
        mergedCount: sourcePlayerNames.length,
      });
    }

    // Initialize Firebase Admin
    const app = initializeFirebaseAdmin();
    if (!app) {
      return NextResponse.json(
        { error: 'Firebase Admin initialization failed' },
        { status: 503 }
      );
    }

    // Get season data from Firestore (try multi-league path first, fall back to legacy)
    const db = admin.firestore();

    // Extract leagueId from request body if provided, default to wrexham
    const leagueId = (body as any).leagueId || 'wrexham';

    // Try multi-league path first
    let seasonRef = db.collection('leagues').doc(leagueId).collection('seasons').doc(seasonId);
    let seasonDoc = await seasonRef.get();

    // Fall back to legacy path
    if (!seasonDoc.exists) {
      seasonRef = db.collection('seasons').doc(seasonId);
      seasonDoc = await seasonRef.get();
    }

    if (!seasonDoc.exists) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    const seasonData = seasonDoc.data();
    const rosters: RostersMap = seasonData?.rosters || {};
    const players: PlayersMap = seasonData?.players || {};
    const players2526: Players2526Map = seasonData?.playerStats || seasonData?.players2526 || {};

    // Load frames from subcollection if not inline
    let frames: FrameData[] = seasonData?.frames || [];
    if (frames.length === 0) {
      try {
        const framesSnap = await seasonRef.collection('frames').get();
        frames = framesSnap.docs.map(d => d.data() as FrameData);
      } catch {
        // Frames subcollection may not exist
      }
    }

    // Track changes for response
    const changes = {
      rostersUpdated: 0,
      playersRemoved: 0,
      players2526Removed: 0,
      framesUpdated: 0,
    };

    // 1. Update rosters: replace source player names with target
    const updatedRosters: RostersMap = {};
    for (const [teamName, roster] of Object.entries(rosters)) {
      const updatedRoster = roster.map((playerName) =>
        sourcePlayerNames.includes(playerName) ? targetPlayerName : playerName
      );

      // Remove duplicates (in case target name already exists in roster)
      updatedRosters[teamName] = Array.from(new Set(updatedRoster));

      if (JSON.stringify(roster) !== JSON.stringify(updatedRosters[teamName])) {
        changes.rostersUpdated++;
      }
    }

    // 2. Merge and update players (2024-25 historical stats)
    const updatedPlayers: PlayersMap = { ...players };
    const sourceStats2425: PlayerStats2425[] = [];

    for (const sourceName of sourcePlayerNames) {
      if (updatedPlayers[sourceName]) {
        sourceStats2425.push(updatedPlayers[sourceName]);
        delete updatedPlayers[sourceName];
        changes.playersRemoved++;
      }
    }

    if (sourceStats2425.length > 0) {
      const targetStats = updatedPlayers[targetPlayerName] || null;
      updatedPlayers[targetPlayerName] = mergePlayerStats2425(sourceStats2425, targetStats);
    }

    // 3. Merge and update players2526 (current season stats)
    const updatedPlayers2526: Players2526Map = { ...players2526 };
    const sourceData2526: PlayerData2526[] = [];

    for (const sourceName of sourcePlayerNames) {
      if (updatedPlayers2526[sourceName]) {
        sourceData2526.push(updatedPlayers2526[sourceName]);
        delete updatedPlayers2526[sourceName];
        changes.players2526Removed++;
      }
    }

    if (sourceData2526.length > 0) {
      const targetData = updatedPlayers2526[targetPlayerName] || null;
      updatedPlayers2526[targetPlayerName] = mergePlayerData2526(sourceData2526, targetData);
    }

    // 4. Update frame data: replace source player names with target in all frames
    const updatedFrames: FrameData[] = frames.map((frameData) => {
      const updatedFrameData = { ...frameData };
      let frameModified = false;

      updatedFrameData.frames = frameData.frames.map((frame) => {
        const updatedFrame = { ...frame };

        if (sourcePlayerNames.includes(frame.homePlayer)) {
          updatedFrame.homePlayer = targetPlayerName;
          frameModified = true;
        }

        if (sourcePlayerNames.includes(frame.awayPlayer)) {
          updatedFrame.awayPlayer = targetPlayerName;
          frameModified = true;
        }

        return updatedFrame;
      });

      if (frameModified) {
        changes.framesUpdated++;
      }

      return updatedFrameData;
    });

    // Update season document with merged data
    // Check if frames are in subcollection or inline
    const hasFramesSubcollection = !seasonData?.frames || seasonData.frames.length === 0;

    if (hasFramesSubcollection && changes.framesUpdated > 0) {
      // Update frames in subcollection using batched writes
      const BATCH_LIMIT = 500;
      for (let i = 0; i < updatedFrames.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        const chunk = updatedFrames.slice(i, i + BATCH_LIMIT);
        for (const frame of chunk) {
          const frameDocRef = seasonRef.collection('frames').doc(frame.matchId);
          batch.set(frameDocRef, frame);
        }
        await batch.commit();
      }

      // Update season doc without frames field
      await seasonRef.update({
        rosters: updatedRosters,
        players: updatedPlayers,
        playerStats: updatedPlayers2526,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Legacy: frames inline on season doc
      await seasonRef.update({
        rosters: updatedRosters,
        players: updatedPlayers,
        playerStats: updatedPlayers2526,
        frames: updatedFrames,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully merged ${sourcePlayerNames.length} player(s) into ${targetPlayerName}`,
      sourcePlayerNames,
      targetPlayerName,
      changes,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to merge players',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
