/**
 * Player identity migration script: identifies and links players across leagues.
 *
 * Scans all leagues for player data, uses fuzzy matching to identify potential
 * duplicates, and creates PlayerLink documents in the playerIdentities collection.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npx tsx scripts/link-players.ts [--dry-run] [--min-confidence 0.8]
 */

import * as admin from 'firebase-admin';
import {
  LeaguePlayer,
  findAllPotentialMatches,
  createPlayerLink,
  generateCanonicalId,
  type PlayerMatch,
} from '../src/lib/player-identity';
import { Players2526Map, PlayerLink } from '../src/lib/types';

interface CliArgs {
  dryRun: boolean;
  minConfidence: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  let minConfidence = 0.7; // default
  const confidenceIndex = args.indexOf('--min-confidence');
  if (confidenceIndex !== -1 && args[confidenceIndex + 1]) {
    const parsed = parseFloat(args[confidenceIndex + 1]);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
      minConfidence = parsed;
    }
  }

  return { dryRun, minConfidence };
}

async function fetchAllLeagues(db: admin.firestore.Firestore): Promise<string[]> {
  const leaguesSnapshot = await db.collection('leagues').get();
  return leaguesSnapshot.docs.map(doc => doc.id);
}

async function fetchPlayersForLeague(
  db: admin.firestore.Firestore,
  leagueId: string
): Promise<LeaguePlayer[]> {
  const players: LeaguePlayer[] = [];

  // Fetch league metadata to get seasons
  const leagueDoc = await db.collection('leagues').doc(leagueId).get();
  if (!leagueDoc.exists) {
    console.warn(`League ${leagueId} metadata not found, skipping...`);
    return players;
  }

  const leagueData = leagueDoc.data();
  const seasons = leagueData?.seasons || [];

  // Fetch players from each season
  for (const season of seasons) {
    const seasonId = season.id;
    const seasonRef = db
      .collection('leagues')
      .doc(leagueId)
      .collection('seasons')
      .doc(seasonId);

    const seasonDoc = await seasonRef.get();
    if (!seasonDoc.exists) {
      console.warn(`Season ${seasonId} not found for league ${leagueId}, skipping...`);
      continue;
    }

    const seasonData = seasonDoc.data();
    const players2526: Players2526Map = seasonData?.players2526 || {};

    // Convert player names to LeaguePlayer objects
    for (const playerName of Object.keys(players2526)) {
      players.push({
        leagueId,
        playerId: playerName,
        displayName: playerName,
      });
    }
  }

  return players;
}

async function fetchAllPlayers(db: admin.firestore.Firestore): Promise<LeaguePlayer[]> {
  const allPlayers: LeaguePlayer[] = [];
  const leagues = await fetchAllLeagues(db);

  console.log(`Found ${leagues.length} league(s): ${leagues.join(', ')}`);

  for (const leagueId of leagues) {
    console.log(`\nFetching players for league: ${leagueId}...`);
    const players = await fetchPlayersForLeague(db, leagueId);
    console.log(`  Found ${players.length} players`);
    allPlayers.push(...players);
  }

  return allPlayers;
}

function groupMatchesByCanonicalPlayer(matches: PlayerMatch[]): Map<string, PlayerMatch[]> {
  const groups = new Map<string, PlayerMatch[]>();
  const processedPlayers = new Set<string>();

  for (const match of matches) {
    const key1 = `${match.player1.leagueId}:${match.player1.playerId}`;
    const key2 = `${match.player2.leagueId}:${match.player2.playerId}`;

    // Find existing group for either player
    let existingGroup: string | null = null;
    for (const [canonicalId, groupMatches] of groups.entries()) {
      const groupHasPlayer1 = groupMatches.some(
        m =>
          `${m.player1.leagueId}:${m.player1.playerId}` === key1 ||
          `${m.player2.leagueId}:${m.player2.playerId}` === key1
      );
      const groupHasPlayer2 = groupMatches.some(
        m =>
          `${m.player1.leagueId}:${m.player1.playerId}` === key2 ||
          `${m.player2.leagueId}:${m.player2.playerId}` === key2
      );

      if (groupHasPlayer1 || groupHasPlayer2) {
        existingGroup = canonicalId;
        break;
      }
    }

    if (existingGroup) {
      // Add to existing group
      groups.get(existingGroup)!.push(match);
    } else {
      // Create new group with canonical ID from first player
      const canonicalId = generateCanonicalId(match.player1.playerId);
      groups.set(canonicalId, [match]);
    }

    processedPlayers.add(key1);
    processedPlayers.add(key2);
  }

  return groups;
}

function printMatchSummary(
  groups: Map<string, PlayerMatch[]>,
  dryRun: boolean
): void {
  console.log('\n' + '='.repeat(80));
  console.log('SUGGESTED PLAYER LINKS');
  console.log('='.repeat(80));

  if (groups.size === 0) {
    console.log('\nNo potential matches found.');
    return;
  }

  let groupNumber = 1;
  for (const [canonicalId, matches] of groups.entries()) {
    console.log(`\nGroup ${groupNumber} (Canonical ID: ${canonicalId}):`);
    console.log('-'.repeat(80));

    // Collect all unique players in this group
    const playersInGroup = new Map<string, LeaguePlayer>();
    for (const match of matches) {
      const key1 = `${match.player1.leagueId}:${match.player1.playerId}`;
      const key2 = `${match.player2.leagueId}:${match.player2.playerId}`;
      playersInGroup.set(key1, match.player1);
      playersInGroup.set(key2, match.player2);
    }

    // Print players in group
    for (const player of playersInGroup.values()) {
      console.log(`  • ${player.playerId} (${player.leagueId})`);
    }

    // Print individual matches with confidence
    console.log('\n  Matches:');
    for (const match of matches) {
      const confidencePercent = Math.round(match.confidence * 100);
      console.log(
        `    ${match.player1.playerId} (${match.player1.leagueId}) ↔ ` +
        `${match.player2.playerId} (${match.player2.leagueId}) - ` +
        `${confidencePercent}% (${match.reason})`
      );
    }

    groupNumber++;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`Total groups: ${groups.size}`);
  console.log(`Total unique player identities: ${groupNumber - 1}`);

  if (dryRun) {
    console.log('\n[DRY RUN] No changes will be made to the database.');
    console.log('Run without --dry-run to create player links.');
  }
  console.log('='.repeat(80) + '\n');
}

async function createPlayerLinks(
  db: admin.firestore.Firestore,
  groups: Map<string, PlayerMatch[]>
): Promise<void> {
  console.log('\nCreating player links in Firestore...');

  const batch = db.batch();
  let linkCount = 0;

  for (const [canonicalId, matches] of groups.entries()) {
    // Collect all unique players in this group with their confidence scores
    const playersMap = new Map<
      string,
      { leagueId: string; playerId: string; confidence: number }
    >();

    for (const match of matches) {
      const key1 = `${match.player1.leagueId}:${match.player1.playerId}`;
      const key2 = `${match.player2.leagueId}:${match.player2.playerId}`;

      // Add player1 if not already present
      if (!playersMap.has(key1)) {
        playersMap.set(key1, {
          leagueId: match.player1.leagueId,
          playerId: match.player1.playerId,
          confidence: match.confidence,
        });
      } else {
        // Update confidence to the maximum
        const existing = playersMap.get(key1)!;
        if (match.confidence > existing.confidence) {
          existing.confidence = match.confidence;
        }
      }

      // Add player2 if not already present
      if (!playersMap.has(key2)) {
        playersMap.set(key2, {
          leagueId: match.player2.leagueId,
          playerId: match.player2.playerId,
          confidence: match.confidence,
        });
      } else {
        // Update confidence to the maximum
        const existing = playersMap.get(key2)!;
        if (match.confidence > existing.confidence) {
          existing.confidence = match.confidence;
        }
      }
    }

    // Create PlayerLink
    const playerLink: PlayerLink = createPlayerLink(
      canonicalId,
      Array.from(playersMap.values())
    );

    // Add to batch
    const linkRef = db.collection('playerIdentities').doc(canonicalId);
    batch.set(linkRef, playerLink);
    linkCount++;
  }

  // Commit batch
  await batch.commit();
  console.log(`✓ Created ${linkCount} player link(s) in playerIdentities collection`);
}

async function main() {
  const args = parseArgs();

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  const db = admin.firestore();

  console.log('Player Identity Migration Script');
  console.log('='.repeat(80));
  console.log(`Min confidence threshold: ${args.minConfidence}`);
  console.log(`Dry run: ${args.dryRun ? 'Yes' : 'No'}`);
  console.log('='.repeat(80));

  // Step 1: Fetch all players from all leagues
  console.log('\n[1/3] Fetching players from all leagues...');
  const allPlayers = await fetchAllPlayers(db);
  console.log(`\nTotal players across all leagues: ${allPlayers.length}`);

  if (allPlayers.length === 0) {
    console.log('No players found. Nothing to link.');
    return;
  }

  // Step 2: Find potential matches
  console.log('\n[2/3] Finding potential matches...');
  const matches = findAllPotentialMatches(allPlayers, {
    minConfidence: args.minConfidence,
    caseSensitive: false,
    ignoreWhitespace: true,
  });

  console.log(`Found ${matches.length} potential match(es)`);

  if (matches.length === 0) {
    console.log('No matches found above the confidence threshold.');
    return;
  }

  // Group matches by canonical player
  const groups = groupMatchesByCanonicalPlayer(matches);

  // Step 3: Print summary and optionally create links
  console.log('\n[3/3] Processing matches...');
  printMatchSummary(groups, args.dryRun);

  if (!args.dryRun) {
    await createPlayerLinks(db, groups);
    console.log('\n✓ Migration complete!');
  } else {
    console.log('\n✓ Dry run complete. No changes made.');
  }
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
