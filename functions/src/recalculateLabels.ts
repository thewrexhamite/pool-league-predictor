/**
 * Recalculate Labels — weekly scheduled cloud function.
 *
 * Runs Monday 00:00 UTC. For each user with a claimed player profile,
 * fetches match data, computes labels, and updates gamification/{userId}.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';

interface PlayerLabel {
  id: string;
  name: string;
  description: string;
  earnedAt: number;
  expiresAt: number;
  category: string;
}

const FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;

// Simple label evaluation for server-side (no imports from src/)
// This mirrors the logic in src/lib/gamification/labels.ts but standalone

interface LabelDef {
  id: string;
  name: string;
  description: string;
  category: string;
  check: (ctx: ServerLabelContext) => boolean;
}

interface ServerLabelContext {
  recentWinPct: number; // last 5
  consecutiveWins: number;
  awayWinPct: number;
  divAvgAwayPct: number;
  awayGames: number;
  homeWinPct: number;
  homeGames: number;
  winRateChange: number; // vs season start
  clutchRating: number;
  closeMatchPct: number;
  closeMatches: number;
  bdPercentile: number;
  framesWonPct: number;
  divAvgFramesPct: number;
  isCaptain: boolean;
  scoutingReports: number;
}

const LABEL_DEFS: LabelDef[] = [
  { id: 'in_form', name: 'In Form', description: 'Last 5 matches above 65% win rate', category: 'performance',
    check: (ctx) => ctx.recentWinPct >= 0.65 },
  { id: 'hot_streak', name: 'Hot Streak', description: '4+ consecutive wins', category: 'performance',
    check: (ctx) => ctx.consecutiveWins >= 4 },
  { id: 'strong_away', name: 'Strong Away', description: 'Away win% more than 10% above division average', category: 'performance',
    check: (ctx) => ctx.awayGames >= 3 && ctx.awayWinPct > ctx.divAvgAwayPct + 0.10 },
  { id: 'home_fortress', name: 'Home Fortress', description: 'Home win rate above 75%', category: 'performance',
    check: (ctx) => ctx.homeGames >= 3 && ctx.homeWinPct >= 0.75 },
  { id: 'reliable_closer', name: 'Reliable Closer', description: 'Close match win% above 60%', category: 'clutch',
    check: (ctx) => ctx.closeMatches >= 3 && ctx.closeMatchPct >= 0.60 },
  { id: 'pressure_player', name: 'Pressure Player', description: 'Clutch rating above 0.3', category: 'clutch',
    check: (ctx) => ctx.clutchRating >= 0.3 },
  { id: 'season_improver', name: 'Season Improver', description: 'Win rate up 10%+ compared to season start', category: 'consistency',
    check: (ctx) => ctx.winRateChange >= 0.10 },
  { id: 'bd_specialist', name: 'BD Specialist', description: 'Top 25% for break & dish efficiency', category: 'tactical',
    check: (ctx) => ctx.bdPercentile >= 75 },
  { id: 'frame_winner', name: 'Frame Winner', description: 'Above average frames won', category: 'tactical',
    check: (ctx) => ctx.framesWonPct > ctx.divAvgFramesPct },
  { id: 'scout', name: 'Scout', description: 'Viewed 20+ scouting reports', category: 'social',
    check: (ctx) => ctx.scoutingReports >= 20 },
];

function evaluateLabelsServer(
  ctx: ServerLabelContext,
  existing: PlayerLabel[],
): PlayerLabel[] {
  const now = Date.now();
  const qualifiedIds = new Set<string>();

  for (const def of LABEL_DEFS) {
    if (def.check(ctx)) qualifiedIds.add(def.id);
  }

  const updated: PlayerLabel[] = [];

  for (const label of existing) {
    if (qualifiedIds.has(label.id)) {
      updated.push({ ...label, expiresAt: now + FOUR_WEEKS_MS });
      qualifiedIds.delete(label.id);
    } else if (label.expiresAt > now) {
      updated.push(label);
    }
  }

  for (const id of qualifiedIds) {
    const def = LABEL_DEFS.find(d => d.id === id);
    if (!def) continue;
    updated.push({
      id: def.id,
      name: def.name,
      description: def.description,
      category: def.category,
      earnedAt: now,
      expiresAt: now + FOUR_WEEKS_MS,
    });
  }

  updated.sort((a, b) => b.earnedAt - a.earnedAt);
  return updated.slice(0, 5);
}

export const recalculateLabels = onSchedule(
  {
    schedule: '0 0 * * 1', // Monday 00:00 UTC
    timeZone: 'UTC',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async () => {
    const db = getFirestore();

    // Get all users with gamification docs
    const gamSnap = await db.collection('gamification').get();
    let processed = 0;
    let skipped = 0;

    for (const gamDoc of gamSnap.docs) {
      const userId = gamDoc.id;
      const gamData = gamDoc.data();

      // Find claimed player profile
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) { skipped++; continue; }

      const userData = userDoc.data();
      const claimedProfiles = userData?.claimedProfiles || [];
      if (claimedProfiles.length === 0) { skipped++; continue; }

      const claimedName = claimedProfiles[0].name;
      const leagueId = claimedProfiles[0].league;
      const seasonId = claimedProfiles[0].season;

      // Fetch season data for this player
      const seasonDoc = await db
        .collection('leagues').doc(leagueId)
        .collection('seasons').doc(seasonId)
        .get();

      if (!seasonDoc.exists) { skipped++; continue; }

      const seasonData = seasonDoc.data()!;
      const players2526 = seasonData.players2526 || {};
      const playerData = players2526[claimedName];

      if (!playerData) { skipped++; continue; }

      // Build a simplified context for server-side evaluation
      const pct = playerData.total?.pct ?? 0;
      const usage = gamData.usage || {};

      const ctx: ServerLabelContext = {
        recentWinPct: pct, // Simplified — ideally would compute from frame data
        consecutiveWins: 0, // Would need frame data to compute
        awayWinPct: 0,
        divAvgAwayPct: 0.4,
        awayGames: 0,
        homeWinPct: 0,
        homeGames: 0,
        winRateChange: 0,
        clutchRating: 0,
        closeMatchPct: 0,
        closeMatches: 0,
        bdPercentile: 50,
        framesWonPct: pct,
        divAvgFramesPct: 0.5,
        isCaptain: (userData?.captainClaims || []).some((c: { verified: boolean }) => c.verified),
        scoutingReports: usage.scoutingReportsViewed || 0,
      };

      const existingLabels = (gamData.labels || []) as PlayerLabel[];
      const newLabels = evaluateLabelsServer(ctx, existingLabels);

      await gamDoc.ref.update({
        labels: newLabels,
        lastUpdated: Date.now(),
      });

      processed++;
    }

    console.log(`recalculateLabels: processed=${processed}, skipped=${skipped}`);
  }
);
