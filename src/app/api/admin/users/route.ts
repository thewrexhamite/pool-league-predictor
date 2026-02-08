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

interface UserListItem {
  userId: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: number;
}

interface UpdateAdminRoleRequestBody {
  userId: string;
  isAdmin: boolean;
}

/**
 * GET /api/admin/users
 * List all users with pagination support
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
        users: [
          {
            userId: 'dev-user-1',
            email: 'admin@example.com',
            displayName: 'Admin User',
            isAdmin: true,
            createdAt: Date.now(),
          },
          {
            userId: 'dev-user-2',
            email: 'user@example.com',
            displayName: 'Regular User',
            isAdmin: false,
            createdAt: Date.now(),
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

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Query users from Firestore
    const db = admin.firestore();
    const usersRef = db.collection('users');

    // Get paginated results
    let query = usersRef.orderBy('createdAt', 'desc').limit(limit);

    if (offset > 0) {
      // For offset-based pagination, we need to get the last document from previous page
      // This is a simplified approach - in production, consider cursor-based pagination
      const previousDocs = await usersRef.orderBy('createdAt', 'desc').limit(offset).get();
      if (!previousDocs.empty) {
        const lastDoc = previousDocs.docs[previousDocs.docs.length - 1];
        query = usersRef.orderBy('createdAt', 'desc').startAfter(lastDoc).limit(limit);
      }
    }

    const snapshot = await query.get();

    const users: UserListItem[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        userId: doc.id,
        email: data.email || '',
        displayName: data.displayName || '',
        isAdmin: data.isAdmin ?? false,
        createdAt: data.createdAt || 0,
      });
    });

    // Get total count for pagination metadata
    const totalSnapshot = await usersRef.count().get();
    const total = totalSnapshot.data().count;

    return NextResponse.json({
      users,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + users.length < total,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 * Update user admin role
 */
export async function PATCH(request: Request) {
  // Verify admin authorization
  const authResult = await verifyAdminAuth(request);
  if (!authResult.authorized) {
    return authResult.error;
  }

  try {
    const body: UpdateAdminRoleRequestBody = await request.json();
    const { userId, isAdmin } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    if (typeof isAdmin !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid field: isAdmin must be a boolean' },
        { status: 400 }
      );
    }

    // Prevent self-demotion (admin removing their own admin status)
    if (authResult.userId === userId && !isAdmin) {
      return NextResponse.json(
        { error: 'Cannot remove your own admin privileges' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't persist
      return NextResponse.json({
        success: true,
        message: 'Admin role updated (development mode - not persisted)',
        dev_mode: true,
        userId,
        isAdmin,
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

    // Update user profile in Firestore
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);

    // Check if user exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update the admin status
    await userRef.update({
      isAdmin,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `User admin status ${isAdmin ? 'granted' : 'revoked'} successfully`,
      userId,
      isAdmin,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to update user admin status',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
