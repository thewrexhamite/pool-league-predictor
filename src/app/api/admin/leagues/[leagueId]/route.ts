import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import type { LeagueConfig } from '@/lib/types';

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

interface UpdateLeagueRequestBody {
  name?: string;
  shortName?: string;
  primaryColor?: string;
  logo?: string;
  seasons?: string[];
}

// GET /api/admin/leagues/[leagueId] - Get a specific league
export async function GET(
  request: Request,
  { params }: { params: { leagueId: string } }
) {
  try {
    const { leagueId } = params;

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID is required' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, return mock data
      return NextResponse.json({
        success: true,
        league: {
          id: leagueId,
          name: 'Development League',
          shortName: 'Dev',
          primaryColor: '#000000',
          seasons: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        dev_mode: true,
        message: 'Development mode - returning mock data',
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

    // Fetch league from Firestore
    const db = admin.firestore();
    const leagueRef = db.collection('leagues').doc(leagueId);
    const leagueDoc = await leagueRef.get();

    if (!leagueDoc.exists) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }

    const data = leagueDoc.data();
    const league: LeagueConfig = {
      id: leagueDoc.id,
      name: data?.name || '',
      shortName: data?.shortName || '',
      primaryColor: data?.primaryColor || '#000000',
      logo: data?.logo,
      seasons: data?.seasons || [],
      createdAt: data?.createdAt || Date.now(),
      updatedAt: data?.updatedAt || Date.now(),
    };

    return NextResponse.json({
      success: true,
      league,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch league',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/leagues/[leagueId] - Update a league
export async function PUT(
  request: Request,
  { params }: { params: { leagueId: string } }
) {
  try {
    const { leagueId } = params;
    const body: UpdateLeagueRequestBody = await request.json();

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID is required' },
        { status: 400 }
      );
    }

    // Validate primaryColor format if provided
    if (body.primaryColor) {
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(body.primaryColor)) {
        return NextResponse.json(
          { error: 'Invalid primaryColor format. Must be a hex color (e.g., #FF0000)' },
          { status: 400 }
        );
      }
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't store
      return NextResponse.json({
        success: true,
        message: 'League update received (development mode - not persisted)',
        dev_mode: true,
        league: {
          id: leagueId,
          ...body,
          updatedAt: Date.now(),
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

    // Update league in Firestore
    const db = admin.firestore();
    const leagueRef = db.collection('leagues').doc(leagueId);

    // Check if league exists
    const leagueDoc = await leagueRef.get();
    if (!leagueDoc.exists) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      ...body,
      updatedAt: Date.now(),
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await leagueRef.update(updateData);

    // Fetch updated league
    const updatedDoc = await leagueRef.get();
    const data = updatedDoc.data();

    const league: LeagueConfig = {
      id: updatedDoc.id,
      name: data?.name || '',
      shortName: data?.shortName || '',
      primaryColor: data?.primaryColor || '#000000',
      logo: data?.logo,
      seasons: data?.seasons || [],
      createdAt: data?.createdAt || Date.now(),
      updatedAt: data?.updatedAt || Date.now(),
    };

    return NextResponse.json({
      success: true,
      message: 'League updated successfully',
      league,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to update league',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/leagues/[leagueId] - Delete a league
export async function DELETE(
  request: Request,
  { params }: { params: { leagueId: string } }
) {
  try {
    const { leagueId } = params;

    if (!leagueId) {
      return NextResponse.json(
        { error: 'League ID is required' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't delete
      return NextResponse.json({
        success: true,
        message: 'League deletion received (development mode - not persisted)',
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

    // Delete league from Firestore
    const db = admin.firestore();
    const leagueRef = db.collection('leagues').doc(leagueId);

    // Check if league exists
    const leagueDoc = await leagueRef.get();
    if (!leagueDoc.exists) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      );
    }

    // Delete the league document
    await leagueRef.delete();

    // Note: This does not delete subcollections (seasons).
    // In a production system, you might want to delete all seasons as well
    // or prevent deletion if seasons exist.

    return NextResponse.json({
      success: true,
      message: 'League deleted successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to delete league',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
