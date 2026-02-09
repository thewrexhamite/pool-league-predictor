import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAdminAuth } from '../../middleware';

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

interface LeagueSettings {
  leagueName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  seasonStartDate?: string;
  seasonEndDate?: string;
  enableNotifications?: boolean;
  enablePredictions?: boolean;
  customMessage?: string;
}

interface UpdateSettingsRequestBody extends LeagueSettings {
  // All fields from LeagueSettings are optional
}

/**
 * GET /api/admin/leagues/settings
 * Retrieve current league settings
 */
export async function GET(request: Request) {
  // Verify admin authorization
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, return mock data
      return NextResponse.json({
        settings: {
          leagueName: 'Development League',
          primaryColor: '#1976d2',
          secondaryColor: '#dc004e',
          logoUrl: '',
          contactEmail: 'admin@example.com',
          contactPhone: '',
          seasonStartDate: '2024-09-01',
          seasonEndDate: '2025-05-31',
          enableNotifications: true,
          enablePredictions: true,
          customMessage: '',
        },
        dev_mode: true,
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

    // Retrieve league settings from Firestore
    const db = admin.firestore();
    const settingsRef = db.collection('settings').doc('league');
    const settingsDoc = await settingsRef.get();

    if (!settingsDoc.exists) {
      // Return default settings if none exist
      return NextResponse.json({
        settings: {
          leagueName: 'Pool League',
          primaryColor: '#1976d2',
          secondaryColor: '#dc004e',
          logoUrl: '',
          contactEmail: '',
          contactPhone: '',
          seasonStartDate: '',
          seasonEndDate: '',
          enableNotifications: true,
          enablePredictions: true,
          customMessage: '',
        },
      });
    }

    const settings = settingsDoc.data();

    return NextResponse.json({
      settings,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch league settings',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/leagues/settings
 * Update league settings
 */
export async function PATCH(request: Request) {
  // Verify admin authorization
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    const body: UpdateSettingsRequestBody = await request.json();

    // Validate settings fields (optional validation for specific fields)
    if (body.primaryColor && !/^#[0-9A-F]{6}$/i.test(body.primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primaryColor: must be a valid hex color (e.g., #1976d2)' },
        { status: 400 }
      );
    }

    if (body.secondaryColor && !/^#[0-9A-F]{6}$/i.test(body.secondaryColor)) {
      return NextResponse.json(
        { error: 'Invalid secondaryColor: must be a valid hex color (e.g., #dc004e)' },
        { status: 400 }
      );
    }

    if (body.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contactEmail)) {
      return NextResponse.json(
        { error: 'Invalid contactEmail: must be a valid email address' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't persist
      return NextResponse.json({
        success: true,
        message: 'League settings updated (development mode - not persisted)',
        dev_mode: true,
        settings: body,
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

    // Update league settings in Firestore
    const db = admin.firestore();
    const settingsRef = db.collection('settings').doc('league');

    // Merge with existing settings
    await settingsRef.set(
      {
        ...body,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: authResult.userId,
      },
      { merge: true }
    );

    // Fetch updated settings to return
    const updatedDoc = await settingsRef.get();
    const updatedSettings = updatedDoc.data();

    return NextResponse.json({
      success: true,
      message: 'League settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to update league settings',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
