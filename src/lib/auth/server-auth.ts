/**
 * Server-Side Auth Middleware
 *
 * Authentication and authorization for admin API routes.
 */

import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that the request is from an authenticated admin user.
 * Returns userId if authorized, null otherwise.
 */
export async function verifyAdminAccess(request: NextRequest): Promise<string | null> {
  try {
    // Get Firebase Auth token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);

    // Initialize Firebase Admin if needed
    if (admin.apps.length === 0) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else {
        // Try application default credentials (for local development)
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }
    }

    // Verify Firebase Auth token
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Check if user has admin role in Firestore
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(decodedToken.uid)
      .get();

    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      return null;
    }

    return decodedToken.uid;
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}
