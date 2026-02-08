import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAdminAuth } from '../middleware';
import { MatchResult } from '@/lib/types';

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

interface CreateResultRequestBody {
  seasonId: string;
  result: Omit<MatchResult, 'frames'> & { frames?: number };
}

interface UpdateResultRequestBody {
  seasonId: string;
  resultIndex: number;
  result: Partial<MatchResult>;
}

interface DeleteResultRequestBody {
  seasonId: string;
  resultIndex: number;
}

/**
 * Validate a match result object
 */
function validateMatchResult(result: any): string | null {
  if (!result.date || typeof result.date !== 'string') {
    return 'Invalid or missing date field';
  }

  if (!result.home || typeof result.home !== 'string') {
    return 'Invalid or missing home team field';
  }

  if (!result.away || typeof result.away !== 'string') {
    return 'Invalid or missing away team field';
  }

  if (typeof result.home_score !== 'number' || result.home_score < 0) {
    return 'Invalid home_score: must be a non-negative number';
  }

  if (typeof result.away_score !== 'number' || result.away_score < 0) {
    return 'Invalid away_score: must be a non-negative number';
  }

  if (!result.division || typeof result.division !== 'string') {
    return 'Invalid or missing division field';
  }

  return null;
}

/**
 * GET /api/admin/results
 * List results for a season with optional filtering
 */
export async function GET(request: Request) {
  // Verify admin authorization
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const division = searchParams.get('division');
    const team = searchParams.get('team');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (!seasonId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: seasonId' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, return mock data
      return NextResponse.json({
        results: [
          {
            date: '2025-01-15',
            home: 'Team A',
            away: 'Team B',
            home_score: 9,
            away_score: 7,
            division: 'Premier',
            frames: 16,
          },
        ],
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

    // Get season data from Firestore
    const db = admin.firestore();
    const seasonRef = db.collection('seasons').doc(seasonId);
    const seasonDoc = await seasonRef.get();

    if (!seasonDoc.exists) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    const seasonData = seasonDoc.data();
    let results: MatchResult[] = seasonData?.results || [];

    // Apply filters
    if (division) {
      results = results.filter((r) => r.division === division);
    }

    if (team) {
      results = results.filter((r) => r.home === team || r.away === team);
    }

    // Apply limit
    if (limit > 0 && limit < results.length) {
      results = results.slice(0, limit);
    }

    return NextResponse.json({
      results,
      total: results.length,
      seasonId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch results',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/results
 * Create a new manual result entry
 */
export async function POST(request: Request) {
  // Verify admin authorization
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    const body: CreateResultRequestBody = await request.json();
    const { seasonId, result } = body;

    // Validate required fields
    if (!seasonId) {
      return NextResponse.json(
        { error: 'Missing required field: seasonId' },
        { status: 400 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Missing required field: result' },
        { status: 400 }
      );
    }

    // Validate match result
    const validationError = validateMatchResult(result);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Default frames to total score if not provided
    const completeResult: MatchResult = {
      ...result,
      frames: result.frames ?? result.home_score + result.away_score,
    };

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't persist
      return NextResponse.json({
        success: true,
        message: 'Result created (development mode - not persisted)',
        dev_mode: true,
        result: completeResult,
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

    // Add result to season in Firestore
    const db = admin.firestore();
    const seasonRef = db.collection('seasons').doc(seasonId);

    // Check if season exists
    const seasonDoc = await seasonRef.get();
    if (!seasonDoc.exists) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    // Add the result to the results array
    await seasonRef.update({
      results: admin.firestore.FieldValue.arrayUnion(completeResult),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Result created successfully',
      result: completeResult,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to create result',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/results
 * Update an existing result
 */
export async function PATCH(request: Request) {
  // Verify admin authorization
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    const body: UpdateResultRequestBody = await request.json();
    const { seasonId, resultIndex, result } = body;

    // Validate required fields
    if (!seasonId) {
      return NextResponse.json(
        { error: 'Missing required field: seasonId' },
        { status: 400 }
      );
    }

    if (typeof resultIndex !== 'number' || resultIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid or missing resultIndex field' },
        { status: 400 }
      );
    }

    if (!result) {
      return NextResponse.json(
        { error: 'Missing required field: result' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't persist
      return NextResponse.json({
        success: true,
        message: 'Result updated (development mode - not persisted)',
        dev_mode: true,
        result,
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

    // Update result in season in Firestore
    const db = admin.firestore();
    const seasonRef = db.collection('seasons').doc(seasonId);

    // Get current season data
    const seasonDoc = await seasonRef.get();
    if (!seasonDoc.exists) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    const seasonData = seasonDoc.data();
    const results: MatchResult[] = seasonData?.results || [];

    if (resultIndex >= results.length) {
      return NextResponse.json(
        { error: 'Result index out of bounds' },
        { status: 400 }
      );
    }

    // Merge the update with existing result
    const updatedResult = {
      ...results[resultIndex],
      ...result,
    };

    // Validate the updated result
    const validationError = validateMatchResult(updatedResult);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      );
    }

    // Update the results array
    results[resultIndex] = updatedResult;

    await seasonRef.update({
      results,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Result updated successfully',
      result: updatedResult,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to update result',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/results
 * Delete a result
 */
export async function DELETE(request: Request) {
  // Verify admin authorization
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    const body: DeleteResultRequestBody = await request.json();
    const { seasonId, resultIndex } = body;

    // Validate required fields
    if (!seasonId) {
      return NextResponse.json(
        { error: 'Missing required field: seasonId' },
        { status: 400 }
      );
    }

    if (typeof resultIndex !== 'number' || resultIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid or missing resultIndex field' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't persist
      return NextResponse.json({
        success: true,
        message: 'Result deleted (development mode - not persisted)',
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

    // Delete result from season in Firestore
    const db = admin.firestore();
    const seasonRef = db.collection('seasons').doc(seasonId);

    // Get current season data
    const seasonDoc = await seasonRef.get();
    if (!seasonDoc.exists) {
      return NextResponse.json(
        { error: 'Season not found' },
        { status: 404 }
      );
    }

    const seasonData = seasonDoc.data();
    const results: MatchResult[] = seasonData?.results || [];

    if (resultIndex >= results.length) {
      return NextResponse.json(
        { error: 'Result index out of bounds' },
        { status: 400 }
      );
    }

    // Remove the result from the array
    const deletedResult = results[resultIndex];
    results.splice(resultIndex, 1);

    await seasonRef.update({
      results,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Result deleted successfully',
      deletedResult,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to delete result',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
