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

interface EmailNotificationPreferences {
  match_results: boolean;
  upcoming_fixtures: boolean;
  standings_updates: boolean;
  weekly_digest: boolean;
}

interface SubscribeRequestBody {
  userId: string;
  email: string;
  preferences: EmailNotificationPreferences;
  frequency: 'instant' | 'daily' | 'weekly';
}

// Basic email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: Request) {
  try {
    const body: SubscribeRequestBody = await request.json();
    const { userId, email, preferences, frequency } = body;

    // Validate required fields
    if (!userId || !email || !preferences || !frequency) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, preferences, or frequency' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate frequency
    const validFrequencies = ['instant', 'daily', 'weekly'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be one of: instant, daily, weekly' },
        { status: 400 }
      );
    }

    // Validate preferences structure
    const requiredPrefs = ['match_results', 'upcoming_fixtures', 'standings_updates', 'weekly_digest'];
    for (const pref of requiredPrefs) {
      if (typeof preferences[pref as keyof EmailNotificationPreferences] !== 'boolean') {
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
        message: 'Email subscription received (development mode - not persisted)',
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

    // Store email subscription in Firestore
    const db = admin.firestore();
    const subscriptionRef = db
      .collection('users')
      .doc(userId)
      .collection('emailSubscription')
      .doc('active');

    const subscriptionData = {
      email,
      preferences,
      frequency,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await subscriptionRef.set(subscriptionData, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to email notifications',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to subscribe to email notifications',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
