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

// Get date range for the past 24 hours
function getDailyDateRange() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    start: yesterday,
    end: now,
    weekRange: `${yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
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
        message: 'Daily digest cron job executed (development mode - no emails sent)',
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
    const dateRange = getDailyDateRange();

    // Query all users with daily email subscriptions
    const usersSnapshot = await db.collection('users').get();
    const dailySubscribers: Array<{ userId: string; subscription: EmailSubscription }> = [];

    for (const userDoc of usersSnapshot.docs) {
      const subscriptionDoc = await userDoc.ref
        .collection('emailSubscription')
        .doc('active')
        .get();

      if (subscriptionDoc.exists) {
        const subscription = subscriptionDoc.data() as EmailSubscription;

        // Only process users with daily frequency
        if (subscription.frequency === 'daily') {
          dailySubscribers.push({
            userId: userDoc.id,
            subscription,
          });
        }
      }
    }

    if (dailySubscribers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No daily digest subscribers found',
        processedCount: 0,
      });
    }

    // Process each daily subscriber
    const results = await Promise.allSettled(
      dailySubscribers.map(async ({ userId, subscription }) => {
        try {
          // TODO: Query actual match results from the past 24 hours
          // This would typically query a matches collection filtered by date
          const matchResults: any[] = [];

          // TODO: Query upcoming fixtures for the next few days
          // This would typically query a fixtures collection
          const upcomingFixtures: any[] = [];

          // TODO: Query standings changes from the past 24 hours
          // This would typically compare current standings with yesterday's standings
          const standingsChanges: any[] = [];

          // Get user's team preference for highlighting
          const notificationSubscriptionDoc = await db
            .collection('users')
            .doc(userId)
            .collection('notificationSubscription')
            .doc('active')
            .get();

          let userTeamName: string | undefined;
          if (notificationSubscriptionDoc.exists) {
            const notificationData = notificationSubscriptionDoc.data();
            userTeamName = notificationData?.myTeam?.team;
          }

          // Filter data based on user preferences
          const filteredResults = subscription.preferences.match_results ? matchResults : [];
          const filteredFixtures = subscription.preferences.upcoming_fixtures ? upcomingFixtures : [];
          const filteredStandings = subscription.preferences.standings_updates ? standingsChanges : [];

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

          // Send daily digest email using the weekly digest template
          // (it works for daily digests too - just with a shorter date range)
          await sendWeeklyDigestEmail(subscription.email, {
            weekRange: dateRange.weekRange,
            matchResults: filteredResults,
            upcomingFixtures: filteredFixtures,
            standingsChanges: filteredStandings,
            userTeamName,
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
      total: dailySubscribers.length,
      sent: results.filter(r => r.status === 'fulfilled' && r.value.status === 'sent').length,
      skipped: results.filter(r => r.status === 'fulfilled' && r.value.status === 'skipped').length,
      failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed')).length,
    };

    return NextResponse.json({
      success: true,
      message: 'Daily digest emails processed',
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
        error: 'Failed to process daily digest',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
