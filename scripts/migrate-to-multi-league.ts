/**
 * One-time migration script: copies seasons/2526 to leagues/wrexham/seasons/2526
 * and creates the league metadata document at leagues/wrexham.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npx tsx scripts/migrate-to-multi-league.ts
 */

import * as admin from 'firebase-admin';

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  const db = admin.firestore();

  // 1. Read existing season document
  console.log('Reading seasons/2526...');
  const sourceRef = db.collection('seasons').doc('2526');
  const snap = await sourceRef.get();

  if (!snap.exists) {
    console.error('seasons/2526 does not exist. Nothing to migrate.');
    process.exit(1);
  }

  const seasonData = snap.data()!;
  const divisions = seasonData.divisions || {};
  const divisionCodes = Object.keys(divisions);

  // 2. Write league metadata document
  console.log('Writing leagues/wrexham metadata...');
  const leagueRef = db.collection('leagues').doc('wrexham');
  await leagueRef.set({
    name: 'Wrexham & District Pool League',
    shortName: 'Wrexham',
    seasons: [
      {
        id: '2526',
        label: '2025/26',
        current: true,
        divisions: divisionCodes,
      },
    ],
  });

  // 3. Copy season data to new path
  console.log('Writing leagues/wrexham/seasons/2526...');
  const destRef = db.collection('leagues').doc('wrexham').collection('seasons').doc('2526');
  await destRef.set(seasonData);

  console.log('\nMigration complete.');
  console.log(`  League metadata: leagues/wrexham`);
  console.log(`  Season data:     leagues/wrexham/seasons/2526`);
  console.log(`  Divisions:       ${divisionCodes.join(', ')}`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
