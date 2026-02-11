import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAdminAuth } from '../middleware';

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

interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  usersWithNotifications: number;
}

interface LeagueDataMetrics {
  totalPlayers: number;
  totalTeams: number;
  totalDivisions: number;
  totalMatches: number;
  totalFixtures: number;
}

interface EngagementMetrics {
  notificationSubscriptions: number;
  recentLogins: number;
  activeInLast7Days: number;
  activeInLast30Days: number;
}

interface GrowthMetrics {
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  growthRate: number;
}

interface AnalyticsResponse {
  users: UserMetrics;
  leagueData: LeagueDataMetrics;
  engagement: EngagementMetrics;
  growth: GrowthMetrics;
  timestamp: number;
}

/**
 * GET /api/admin/analytics
 * Get league health metrics and analytics
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
      const mockAnalytics: AnalyticsResponse = {
        users: {
          totalUsers: 150,
          activeUsers: 89,
          adminUsers: 3,
          usersWithNotifications: 45,
        },
        leagueData: {
          totalPlayers: 320,
          totalTeams: 24,
          totalDivisions: 4,
          totalMatches: 156,
          totalFixtures: 48,
        },
        engagement: {
          notificationSubscriptions: 45,
          recentLogins: 67,
          activeInLast7Days: 52,
          activeInLast30Days: 89,
        },
        growth: {
          newUsersLast7Days: 8,
          newUsersLast30Days: 23,
          growthRate: 15.3,
        },
        timestamp: Date.now(),
      };

      return NextResponse.json({
        ...mockAnalytics,
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
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Fetch user metrics
    const usersRef = db.collection('users');
    const allUsersSnapshot = await usersRef.get();

    let totalUsers = 0;
    let adminUsers = 0;
    let activeInLast7Days = 0;
    let activeInLast30Days = 0;
    let newUsersLast7Days = 0;
    let newUsersLast30Days = 0;
    let usersWithNotifications = 0;

    allUsersSnapshot.forEach((doc) => {
      const userData = doc.data();
      totalUsers++;

      if (userData.isAdmin) {
        adminUsers++;
      }

      const lastActive = userData.lastActive || 0;
      if (lastActive >= sevenDaysAgo) {
        activeInLast7Days++;
      }
      if (lastActive >= thirtyDaysAgo) {
        activeInLast30Days++;
      }

      const createdAt = userData.createdAt || 0;
      if (createdAt >= sevenDaysAgo) {
        newUsersLast7Days++;
      }
      if (createdAt >= thirtyDaysAgo) {
        newUsersLast30Days++;
      }

      // Check if user has notification subscription
      if (userData.hasNotifications || userData.notificationToken) {
        usersWithNotifications++;
      }
    });

    // Count notification subscriptions from subcollection
    let notificationSubscriptions = 0;
    try {
      const subscriptionsQuery = await db.collectionGroup('notificationSubscription').get();
      notificationSubscriptions = subscriptionsQuery.size;
    } catch (error) {
      // If subcollection query fails, use usersWithNotifications as fallback
      notificationSubscriptions = usersWithNotifications;
    }

    // Fetch league data metrics from current season
    const currentSeasonRef = db.collection('seasons').doc('2025-26');
    const currentSeasonDoc = await currentSeasonRef.get();

    let totalPlayers = 0;
    let totalTeams = 0;
    let totalDivisions = 0;
    let totalMatches = 0;
    let totalFixtures = 0;

    if (currentSeasonDoc.exists) {
      const seasonData = currentSeasonDoc.data();

      // Count players (check both new and legacy field names)
      const playerStats = seasonData?.playerStats || seasonData?.players2526;
      if (playerStats) {
        totalPlayers = Object.keys(playerStats).length;
      }

      // Count teams and divisions
      if (seasonData?.divisions) {
        totalDivisions = Object.keys(seasonData.divisions).length;
        const teamsSet = new Set<string>();
        Object.values(seasonData.divisions).forEach((division: any) => {
          if (division.teams && Array.isArray(division.teams)) {
            division.teams.forEach((team: string) => teamsSet.add(team));
          }
        });
        totalTeams = teamsSet.size;
      }

      // Count matches
      if (seasonData?.results && Array.isArray(seasonData.results)) {
        totalMatches = seasonData.results.length;
      }

      // Count fixtures
      if (seasonData?.fixtures && Array.isArray(seasonData.fixtures)) {
        totalFixtures = seasonData.fixtures.length;
      }
    }

    // Calculate growth rate (percentage increase over last 30 days)
    const oldUserCount = totalUsers - newUsersLast30Days;
    const growthRate = oldUserCount > 0
      ? ((newUsersLast30Days / oldUserCount) * 100)
      : 0;

    // Construct analytics response
    const analytics: AnalyticsResponse = {
      users: {
        totalUsers,
        activeUsers: activeInLast30Days,
        adminUsers,
        usersWithNotifications,
      },
      leagueData: {
        totalPlayers,
        totalTeams,
        totalDivisions,
        totalMatches,
        totalFixtures,
      },
      engagement: {
        notificationSubscriptions,
        recentLogins: activeInLast7Days,
        activeInLast7Days,
        activeInLast30Days,
      },
      growth: {
        newUsersLast7Days,
        newUsersLast30Days,
        growthRate: Math.round(growthRate * 10) / 10, // Round to 1 decimal
      },
      timestamp: now,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
