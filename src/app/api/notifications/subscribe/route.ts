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

interface NotificationPreferences {
  match_results: boolean;
  upcoming_fixtures: boolean;
  standings_updates: boolean;
  prediction_updates: boolean;
}

interface MyTeam {
  team: string;
  div: string;
}

interface SubscribeRequestBody {
  token: string;
  userId: string;
  preferences: NotificationPreferences;
  myTeam?: MyTeam;
}

export async function POST(request: Request) {
  try {
    const body: SubscribeRequestBody = await request.json();
    const { token, userId, preferences, myTeam } = body;

    // Validate required fields
    if (!token || !userId || !preferences) {
      return NextResponse.json(
        { error: 'Missing required fields: token, userId, or preferences' },
        { status: 400 }
      );
    }

    // Validate preferences structure
    const requiredPrefs = ['match_results', 'upcoming_fixtures', 'standings_updates', 'prediction_updates'];
    for (const pref of requiredPrefs) {
      if (typeof preferences[pref as keyof NotificationPreferences] !== 'boolean') {
        return NextResponse.json(
          { error: `Invalid preference: ${pref} must be a boolean` },
          { status: 400 }
        );
      }
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't store
      return NextResponse.json({
        success: true,
        message: 'Subscription received (development mode - not persisted)',
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

    // Store subscription in Firestore
    const db = admin.firestore();
    const subscriptionRef = db
      .collection('users')
      .doc(userId)
      .collection('notificationSubscription')
      .doc('active');

    const subscriptionData: any = {
      token,
      preferences,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Store My Team if provided for notification scoping
    if (myTeam && myTeam.team && myTeam.div) {
      subscriptionData.myTeam = myTeam;
    }

    await subscriptionRef.set(subscriptionData, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to notifications',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to subscribe to notifications',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
