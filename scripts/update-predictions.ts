/**
 * Update Predictions with Results Script
 *
 * This script fetches the latest results from Firestore and updates
 * any predictions that don't have results yet.
 *
 * Usage:
 *   npx tsx scripts/update-predictions.ts
 *   npx tsx scripts/update-predictions.ts --league nwpa --season 2526
 *   npx tsx scripts/update-predictions.ts --dry-run
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// --- CLI argument parsing ---

function getArg(name: string, defaultValue: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return defaultValue;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const leagueId = getArg('league', 'wrexham');
const seasonId = getArg('season', '2526');
const DRY_RUN = hasFlag('dry-run');

console.log('🎯 Prediction Update Script');
console.log(`   League: ${leagueId}`);
console.log(`   Season: ${seasonId}`);
console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log('');

// --- Firebase Admin Setup ---

const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

try {
  const serviceAccount = require(serviceAccountPath);
  initializeApp({
    credential: cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Failed to load Firebase service account key');
  console.error('   Expected path:', serviceAccountPath);
  console.error('   Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const db = getFirestore();

// --- Main Logic ---

interface PredictionSnapshot {
  id: string;
  seasonId: string;
  date: string;
  home: string;
  away: string;
  division: string;
  predictedAt: number;
  pHomeWin: number;
  pDraw: number;
  pAwayWin: number;
  expectedHome: number;
  expectedAway: number;
  confidence: number;
  predictedWinner: 'home' | 'away' | 'draw';
  actualHomeScore?: number;
  actualAwayScore?: number;
  actualWinner?: 'home' | 'away' | 'draw';
  correct?: boolean;
}

interface MatchResult {
  date: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

async function main() {
  try {
    console.log('📊 Fetching predictions without results...');

    // Fetch predictions for this season that don't have results yet
    const predictionsRef = db.collection('predictions');
    const predictionsQuery = predictionsRef
      .where('seasonId', '==', seasonId)
      .orderBy('predictedAt', 'desc');

    const predictionsSnapshot = await predictionsQuery.get();
    const predictions = predictionsSnapshot.docs
      .map(doc => ({ docId: doc.id, ...doc.data() } as PredictionSnapshot & { docId: string }))
      .filter(p => p.actualWinner === undefined);

    console.log(`   Found ${predictions.length} prediction(s) without results`);

    if (predictions.length === 0) {
      console.log('✅ All predictions are up to date!');
      return;
    }

    console.log('');
    console.log('📥 Fetching results from season data...');

    // Fetch results from the season document
    const seasonRef = db.collection('leagues').doc(leagueId).collection('seasons').doc(seasonId);
    const seasonDoc = await seasonRef.get();

    if (!seasonDoc.exists) {
      console.error(`❌ Season document not found: leagues/${leagueId}/seasons/${seasonId}`);
      process.exit(1);
    }

    const seasonData = seasonDoc.data();
    if (!seasonData || !seasonData.results) {
      console.error('❌ No results found in season document');
      process.exit(1);
    }

    const results = seasonData.results as MatchResult[];
    console.log(`   Found ${results.length} result(s)`);
    console.log('');

    // Match predictions to results
    let updatedCount = 0;
    let matchedCount = 0;

    for (const prediction of predictions) {
      // Find matching result
      const matchingResult = results.find(
        r =>
          r.home === prediction.home &&
          r.away === prediction.away &&
          r.date === prediction.date
      );

      if (!matchingResult) {
        console.log(`   ⏳ No result yet: ${prediction.home} vs ${prediction.away} (${prediction.date})`);
        continue;
      }

      matchedCount++;

      // Determine actual winner
      let actualWinner: 'home' | 'away' | 'draw';
      if (matchingResult.homeScore > matchingResult.awayScore) {
        actualWinner = 'home';
      } else if (matchingResult.awayScore > matchingResult.homeScore) {
        actualWinner = 'away';
      } else {
        actualWinner = 'draw';
      }

      // Check if prediction was correct
      const correct = prediction.predictedWinner === actualWinner;

      // Update the prediction
      if (!DRY_RUN) {
        const docRef = db.collection('predictions').doc(prediction.docId);
        await docRef.update({
          actualHomeScore: matchingResult.homeScore,
          actualAwayScore: matchingResult.awayScore,
          actualWinner,
          correct,
        });
        updatedCount++;
      }

      const icon = correct ? '✅' : '❌';
      console.log(
        `   ${icon} ${prediction.home} ${matchingResult.homeScore}-${matchingResult.awayScore} ${prediction.away} ` +
        `(predicted: ${prediction.predictedWinner}, actual: ${actualWinner})`
      );
    }

    console.log('');
    if (DRY_RUN) {
      console.log(`🔍 DRY RUN: Would have updated ${matchedCount} prediction(s)`);
    } else {
      console.log(`✅ Updated ${updatedCount} prediction(s) with results`);
    }

    const pendingCount = predictions.length - matchedCount;
    if (pendingCount > 0) {
      console.log(`   ${pendingCount} prediction(s) still pending results`);
    }

  } catch (error) {
    console.error('❌ Error updating predictions:', error);
    process.exit(1);
  }
}

main();
