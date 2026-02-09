#!/usr/bin/env npx tsx

/**
 * Grant admin role to a user by email address.
 *
 * Usage:
 *   npx tsx scripts/set-admin.ts user@example.com
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function setAdminRole(email: string): Promise<void> {
  const db = admin.firestore();

  // Find user by email
  const usersSnapshot = await db
    .collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.error(`❌ User with email "${email}" not found`);
    console.log('   The user must sign in once to create their profile.');
    process.exit(1);
  }

  const userDoc = usersSnapshot.docs[0];
  const userData = userDoc.data();

  // Update role to admin
  await userDoc.ref.update({ role: 'admin' });

  console.log(`✓ Admin role granted to ${userData.displayName} (${email})`);
  console.log('  User must sign out and sign in again to activate admin access.');
}

// Parse command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx scripts/set-admin.ts <email>');
  process.exit(1);
}

setAdminRole(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
