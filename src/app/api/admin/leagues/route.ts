import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import type { LeagueConfig } from '@/lib/types';
import { verifyAdminAccess } from '@/lib/auth/server-auth';

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

interface CreateLeagueRequestBody {
  name: string;
  shortName: string;
  primaryColor: string;
  logo?: string;
  lat?: number;
  lng?: number;
  seasons?: string[];
}

// GET /api/admin/leagues - List all leagues
export async function GET(request: Request) {
  // Verify admin access
  const userId = await verifyAdminAccess(request as any);
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin access required' },
      { status: 401 }
    );
  }

  try {
    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, return empty list
      return NextResponse.json({
        success: true,
        leagues: [],
        dev_mode: true,
        message: 'Development mode - no Firebase credentials configured',
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

    // Fetch all leagues from Firestore
    const db = admin.firestore();
    const leaguesSnapshot = await db.collection('leagues').get();

    const leagues: LeagueConfig[] = leaguesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        shortName: data.shortName || '',
        primaryColor: data.primaryColor || '#000000',
        logo: data.logo,
        ...(data.lat != null && { lat: data.lat }),
        ...(data.lng != null && { lng: data.lng }),
        seasons: data.seasons || [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
      };
    });

    return NextResponse.json({
      success: true,
      leagues,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch leagues',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/leagues - Create a new league
export async function POST(request: Request) {
  // Verify admin access
  const userId = await verifyAdminAccess(request as any);
  if (!userId) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin access required' },
      { status: 401 }
    );
  }

  try {
    const body: CreateLeagueRequestBody = await request.json();
    const { name, shortName, primaryColor, logo, lat, lng, seasons } = body;

    // Validate required fields
    if (!name || !shortName || !primaryColor) {
      return NextResponse.json(
        { error: 'Missing required fields: name, shortName, or primaryColor' },
        { status: 400 }
      );
    }

    // Validate primaryColor format (hex color)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primaryColor format. Must be a hex color (e.g., #FF0000)' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't store
      return NextResponse.json({
        success: true,
        message: 'League creation received (development mode - not persisted)',
        dev_mode: true,
        league: {
          id: 'dev-' + name.toLowerCase().replace(/\s+/g, '-'),
          name,
          shortName,
          primaryColor,
          logo,
          ...(lat != null && { lat }),
          ...(lng != null && { lng }),
          seasons: seasons || [],
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

    // Create league in Firestore
    const db = admin.firestore();

    // Generate league ID from name (lowercase, spaces to hyphens)
    const leagueId = name.toLowerCase().replace(/\s+/g, '-');

    const leagueRef = db.collection('leagues').doc(leagueId);

    // Check if league already exists
    const existingLeague = await leagueRef.get();
    if (existingLeague.exists) {
      return NextResponse.json(
        { error: 'League with this ID already exists' },
        { status: 409 }
      );
    }

    const now = Date.now();
    const leagueData: Omit<LeagueConfig, 'id'> = {
      name,
      shortName,
      primaryColor,
      logo,
      ...(lat != null && { lat }),
      ...(lng != null && { lng }),
      seasons: seasons || [],
      createdAt: now,
      updatedAt: now,
    };

    await leagueRef.set(leagueData);

    return NextResponse.json({
      success: true,
      message: 'League created successfully',
      league: {
        id: leagueId,
        ...leagueData,
      },
    }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to create league',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
