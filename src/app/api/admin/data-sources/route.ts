import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import type { DataSourceConfig, DataSourceType } from '@/lib/types';
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

interface CreateDataSourceRequestBody {
  leagueId: string;
  sourceType: DataSourceType;
  config: Record<string, any>;
  enabled?: boolean;
}

// GET /api/admin/data-sources - List all data sources (optionally filtered by leagueId)
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
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, return empty list
      return NextResponse.json({
        success: true,
        dataSources: [],
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

    // Fetch data sources from Firestore
    const db = admin.firestore();
    let query = db.collection('dataSources');

    // Filter by leagueId if provided
    if (leagueId) {
      query = query.where('leagueId', '==', leagueId) as any;
    }

    const dataSourcesSnapshot = await query.get();

    const dataSources: DataSourceConfig[] = dataSourcesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        leagueId: data.leagueId || '',
        sourceType: data.sourceType || 'leagueapplive',
        config: data.config || {},
        enabled: data.enabled !== undefined ? data.enabled : true,
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now(),
      };
    });

    return NextResponse.json({
      success: true,
      dataSources,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch data sources',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/data-sources - Create a new data source configuration
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
    const body: CreateDataSourceRequestBody = await request.json();
    const { leagueId, sourceType, config, enabled } = body;

    // Validate required fields
    if (!leagueId || !sourceType) {
      return NextResponse.json(
        { error: 'Missing required fields: leagueId or sourceType' },
        { status: 400 }
      );
    }

    // Validate sourceType
    const validSourceTypes: DataSourceType[] = ['leagueapplive', 'manual', 'api'];
    if (!validSourceTypes.includes(sourceType)) {
      return NextResponse.json(
        { error: `Invalid sourceType. Must be one of: ${validSourceTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate config is an object
    if (config !== undefined && (typeof config !== 'object' || Array.isArray(config))) {
      return NextResponse.json(
        { error: 'config must be an object' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't store
      return NextResponse.json({
        success: true,
        message: 'Data source configuration received (development mode - not persisted)',
        dev_mode: true,
        dataSource: {
          id: 'dev-' + leagueId + '-' + sourceType,
          leagueId,
          sourceType,
          config: config || {},
          enabled: enabled !== undefined ? enabled : true,
        },
      }, { status: 201 });
    }

    // Initialize Firebase Admin
    const app = initializeFirebaseAdmin();
    if (!app) {
      return NextResponse.json(
        { error: 'Firebase Admin initialization failed' },
        { status: 503 }
      );
    }

    // Create data source in Firestore
    const db = admin.firestore();

    // Generate data source ID from leagueId and sourceType
    const dataSourceId = `${leagueId}-${sourceType}`;

    const dataSourceRef = db.collection('dataSources').doc(dataSourceId);

    // Check if data source already exists
    const existingDataSource = await dataSourceRef.get();
    if (existingDataSource.exists) {
      return NextResponse.json(
        { error: 'Data source configuration already exists for this league and type' },
        { status: 409 }
      );
    }

    const now = Date.now();
    const dataSourceData: Omit<DataSourceConfig, 'id'> = {
      leagueId,
      sourceType,
      config: config || {},
      enabled: enabled !== undefined ? enabled : true,
      createdAt: now,
      updatedAt: now,
    };

    await dataSourceRef.set(dataSourceData);

    return NextResponse.json({
      success: true,
      message: 'Data source configuration created successfully',
      dataSource: {
        id: dataSourceId,
        ...dataSourceData,
      },
    }, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to create data source configuration',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
