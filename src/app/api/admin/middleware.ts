import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

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

export interface AdminAuthResult {
  authorized: boolean;
  userId?: string;
  error?: NextResponse;
}

/**
 * Verify admin authorization for API routes.
 * Checks for valid Firebase Auth token and admin role in user profile.
 *
 * @param request - The incoming request object
 * @returns AdminAuthResult with authorization status and user ID or error response
 */
export async function verifyAdminAuth(request: Request): Promise<AdminAuthResult> {
  try {
    // Extract authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        ),
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, allow requests but warn
      return {
        authorized: true,
        userId: 'dev-user',
        error: undefined,
      };
    }

    // Initialize Firebase Admin
    const app = initializeFirebaseAdmin();
    if (!app) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Firebase Admin initialization failed' },
          { status: 503 }
        ),
      };
    }

    // Verify the Firebase ID token
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Invalid or expired token', details: errorMessage },
          { status: 401 }
        ),
      };
    }

    const userId = decodedToken.uid;

    // Get user profile from Firestore
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        ),
      };
    }

    const userData = userDoc.data();
    const isAdmin = userData?.isAdmin ?? false;

    if (!isAdmin) {
      return {
        authorized: false,
        error: NextResponse.json(
          { error: 'Unauthorized: Admin access required' },
          { status: 403 }
        ),
      };
    }

    // User is authenticated and has admin privileges
    return {
      authorized: true,
      userId,
      error: undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Authorization check failed', details: errorMessage },
        { status: 500 }
      ),
    };
  }
}
