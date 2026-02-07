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

type NotificationType = 'match_results' | 'upcoming_fixtures' | 'standings_updates' | 'prediction_updates';

interface NotificationData {
  teamId?: string;
  message: string;
  [key: string]: unknown;
}

interface SendNotificationRequestBody {
  userId: string;
  type: NotificationType;
  data: NotificationData;
}

// Generate deep-link URL based on notification type
function getDeepLinkUrl(type: NotificationType, data: NotificationData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  switch (type) {
    case 'match_results':
      return data.teamId ? `${baseUrl}/team/${data.teamId}` : `${baseUrl}/results`;
    case 'upcoming_fixtures':
      return data.teamId ? `${baseUrl}/team/${data.teamId}` : `${baseUrl}/fixtures`;
    case 'standings_updates':
      return `${baseUrl}/standings`;
    case 'prediction_updates':
      return data.teamId ? `${baseUrl}/team/${data.teamId}` : `${baseUrl}/predictions`;
    default:
      return baseUrl;
  }
}

// Get notification title based on type
function getNotificationTitle(type: NotificationType): string {
  switch (type) {
    case 'match_results':
      return 'Match Results';
    case 'upcoming_fixtures':
      return 'Upcoming Fixture';
    case 'standings_updates':
      return 'Standings Update';
    case 'prediction_updates':
      return 'Prediction Update';
    default:
      return 'Pool League Update';
  }
}

export async function POST(request: Request) {
  try {
    const body: SendNotificationRequestBody = await request.json();
    const { userId, type, data } = body;

    // Validate required fields
    if (!userId || !type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, type, or data' },
        { status: 400 }
      );
    }

    // Validate notification type
    const validTypes: NotificationType[] = ['match_results', 'upcoming_fixtures', 'standings_updates', 'prediction_updates'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid notification type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate data has message
    if (!data.message || typeof data.message !== 'string') {
      return NextResponse.json(
        { error: 'data.message is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't send
      return NextResponse.json({
        success: true,
        message: 'Notification send request received (development mode - not sent)',
        dev_mode: true,
        notification: {
          title: getNotificationTitle(type),
          body: data.message,
          url: getDeepLinkUrl(type, data),
        },
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

    // Get user's subscription from Firestore
    const db = admin.firestore();
    const subscriptionRef = db
      .collection('users')
      .doc(userId)
      .collection('notificationSubscription')
      .doc('active');

    const subscriptionDoc = await subscriptionRef.get();

    if (!subscriptionDoc.exists) {
      return NextResponse.json(
        { error: 'User is not subscribed to notifications' },
        { status: 404 }
      );
    }

    const subscriptionData = subscriptionDoc.data();
    const { token, preferences } = subscriptionData || {};

    if (!token) {
      return NextResponse.json(
        { error: 'No FCM token found for user' },
        { status: 404 }
      );
    }

    // Check if user has enabled this notification type
    if (preferences && preferences[type] === false) {
      return NextResponse.json({
        success: false,
        message: `User has disabled ${type} notifications`,
      });
    }

    // Build notification payload
    const deepLinkUrl = getDeepLinkUrl(type, data);
    const message: admin.messaging.Message = {
      token,
      notification: {
        title: getNotificationTitle(type),
        body: data.message,
      },
      data: {
        type,
        url: deepLinkUrl,
        ...Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : JSON.stringify(value),
          ])
        ),
      },
      webpush: {
        fcmOptions: {
          link: deepLinkUrl,
        },
      },
    };

    // Send notification via FCM
    const messaging = admin.messaging();
    const response = await messaging.send(message);

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      messageId: response,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to send notification',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
