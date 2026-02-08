import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { sendWeeklyDigestEmail, generateUnsubscribeUrl } from '@/lib/email';

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

interface EmailSubscription {
  email: string;
  preferences: {
    match_results: boolean;
    upcoming_fixtures: boolean;
    standings_updates: boolean;
    weekly_digest: boolean;
  };
  frequency: 'instant' | 'daily' | 'weekly';
}

// Get date range for the past week
function getWeeklyDateRange() {
  const now = new Date();
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);

  return {
    start: lastWeek,
    end: now,
    weekRange: `${lastWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
  };
}

export async function GET(request: Request) {
  try {
    // Verify cron secret for security (Vercel Cron Jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, return success without processing
      return NextResponse.json({
        success: true,
        message: 'Weekly digest cron job executed (development mode - no emails sent)',
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

    const db = admin.firestore();
    const dateRange = getWeeklyDateRange();

    // Query all users with weekly email subscriptions
    const usersSnapshot = await db.collection('users').get();
    const weeklySubscribers: Array<{ userId: string; subscription: EmailSubscription }> = [];

    for (const userDoc of usersSnapshot.docs) {
      const subscriptionDoc = await userDoc.ref
        .collection('emailSubscription')
        .doc('active')
        .get();

      if (subscriptionDoc.exists) {
        const subscription = subscriptionDoc.data() as EmailSubscription;

        // Only process users with weekly frequency
        if (subscription.frequency === 'weekly') {
          weeklySubscribers.push({
            userId: userDoc.id,
            subscription,
          });
        }
      }
    }

    if (weeklySubscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No weekly digest subscribers found',
        processedCount: 0,
      });
    }

    // Process each weekly subscriber
    const results = await Promise.allSettled(
      weeklySubscribers.map(async ({ userId, subscription }) => {
        try {
          // TODO: Query actual match results from the past week
          // This would typically query a matches collection filtered by date
          const recentResults = [];

          // TODO: Query upcoming fixtures for the next week
          // This would typically query a fixtures collection
          const upcomingFixtures = [];

          // TODO: Query standings changes from the past week
          // This would typically compare current standings with last week's standings
          const standingsHighlights = [];

          // Get user's team preference for highlighting
          const notificationSubscriptionDoc = await db
            .collection('users')
            .doc(userId)
            .collection('notificationSubscription')
            .doc('active')
            .get();

          let userTeam: string | undefined;
          if (notificationSubscriptionDoc.exists) {
            const notificationData = notificationSubscriptionDoc.data();
            userTeam = notificationData?.myTeam?.team;
          }

          // Filter data based on user preferences
          const filteredResults = subscription.preferences.match_results ? recentResults : [];
          const filteredFixtures = subscription.preferences.upcoming_fixtures ? upcomingFixtures : [];
          const filteredStandings = subscription.preferences.standings_updates ? standingsHighlights : [];

          // Only send email if there's content to share
          const hasContent =
            filteredResults.length > 0 ||
            filteredFixtures.length > 0 ||
            filteredStandings.length > 0;

          if (!hasContent) {
            return {
              userId,
              status: 'skipped',
              reason: 'No relevant content for this user',
            };
          }

          // Generate unsubscribe URL
          const unsubscribeUrl = generateUnsubscribeUrl(userId);

          // Send weekly digest email
          await sendWeeklyDigestEmail(subscription.email, {
            weekRange: dateRange.weekRange,
            recentResults: filteredResults,
            upcomingFixtures: filteredFixtures,
            standingsHighlights: filteredStandings,
            userTeam,
            unsubscribeUrl,
          });

          return {
            userId,
            status: 'sent',
            email: subscription.email,
          };
        } catch (error) {
          return {
            userId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Summarize results
    const summary = {
      total: weeklySubscribers.length,
      sent: results.filter(r => r.status === 'fulfilled' && r.value.status === 'sent').length,
      skipped: results.filter(r => r.status === 'fulfilled' && r.value.status === 'skipped').length,
      failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed')).length,
    };

    return NextResponse.json({
      success: true,
      message: 'Weekly digest emails processed',
      summary,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to process weekly digest',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
