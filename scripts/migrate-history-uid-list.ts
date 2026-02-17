#!/usr/bin/env npx tsx

/**
 * Backfill playerUidList on existing game history records.
 *
 * For records that have playerUids (a map) but no playerUidList (an array),
 * adds playerUidList = Object.values(playerUids). This enables collection
 * group queries with array-contains for personal match history.
 *
 * Uses Firebase Admin SDK to bypass security rules.
 *
 * Usage:
 *   npx tsx scripts/migrate-history-uid-list.ts
 */

import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const BATCH_SIZE = 500;

async function migrate(): Promise<void> {
  const tablesSnap = await db.collection('chalkTables').get();
  console.log(`Found ${tablesSnap.size} tables`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const tableDoc of tablesSnap.docs) {
    const tableId = tableDoc.id;
    const historySnap = await db
      .collection('chalkTables')
      .doc(tableId)
      .collection('history')
      .get();

    if (historySnap.empty) continue;

    const docsToUpdate = historySnap.docs.filter((d) => {
      const data = d.data();
      return data.playerUids && !data.playerUidList;
    });

    if (docsToUpdate.length === 0) {
      totalSkipped += historySnap.size;
      continue;
    }

    // Process in batches
    for (let i = 0; i < docsToUpdate.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = docsToUpdate.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        const playerUids = doc.data().playerUids as Record<string, string>;
        const playerUidList = Object.values(playerUids);
        batch.update(doc.ref, { playerUidList });
      }

      await batch.commit();
      totalUpdated += chunk.length;
      console.log(`  Table ${tableId}: updated ${chunk.length} records (batch ${Math.floor(i / BATCH_SIZE) + 1})`);
    }

    totalSkipped += historySnap.size - docsToUpdate.length;
  }

  console.log(`\nDone. Updated: ${totalUpdated}, Skipped: ${totalSkipped}`);
}

migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
