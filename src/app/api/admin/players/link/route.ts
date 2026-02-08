import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import type { PlayerLink } from '@/lib/types';

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

interface LinkPlayersRequestBody {
  playerId: string;
  linkedPlayers: string[];
}

export async function POST(request: Request) {
  try {
    const body: LinkPlayersRequestBody = await request.json();
    const { playerId, linkedPlayers } = body;

    // Validate required fields
    if (!playerId || !linkedPlayers) {
      return NextResponse.json(
        { error: 'Missing required fields: playerId or linkedPlayers' },
        { status: 400 }
      );
    }

    // Validate linkedPlayers is an array
    if (!Array.isArray(linkedPlayers)) {
      return NextResponse.json(
        { error: 'linkedPlayers must be an array' },
        { status: 400 }
      );
    }

    // Validate linkedPlayers is not empty
    if (linkedPlayers.length === 0) {
      return NextResponse.json(
        { error: 'linkedPlayers array cannot be empty' },
        { status: 400 }
      );
    }

    // Check if Firebase Admin credentials are configured
    if (!hasFirebaseCredentials()) {
      // In development without credentials, accept the request but don't store
      return NextResponse.json({
        success: true,
        message: 'Player linking received (development mode - not persisted)',
        dev_mode: true,
        playerLink: {
          id: playerId,
          linkedPlayers: linkedPlayers.map(pid => ({
            leagueId: 'unknown',
            playerId: pid,
            confidence: 1.0,
          })),
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

    // Store player link in Firestore
    const db = admin.firestore();
    const playerLinkRef = db.collection('playerIdentities').doc(playerId);

    // Check if player identity already exists
    const existingLink = await playerLinkRef.get();
    const now = Date.now();

    let playerLinkData: Omit<PlayerLink, 'id'>;

    if (existingLink.exists) {
      // Update existing player link
      const existingData = existingLink.data() as Omit<PlayerLink, 'id'>;

      // Merge with existing linked players, avoiding duplicates
      const existingPlayerIds = new Set(
        existingData.linkedPlayers.map(lp => lp.playerId)
      );

      const newLinkedPlayers = linkedPlayers
        .filter(pid => !existingPlayerIds.has(pid))
        .map(pid => ({
          leagueId: 'unknown', // To be enhanced with actual league context
          playerId: pid,
          confidence: 1.0, // Manual links have full confidence
        }));

      playerLinkData = {
        linkedPlayers: [...existingData.linkedPlayers, ...newLinkedPlayers],
        createdAt: existingData.createdAt,
        updatedAt: now,
      };
    } else {
      // Create new player link
      playerLinkData = {
        linkedPlayers: linkedPlayers.map(pid => ({
          leagueId: 'unknown', // To be enhanced with actual league context
          playerId: pid,
          confidence: 1.0, // Manual links have full confidence
        })),
        createdAt: now,
        updatedAt: now,
      };
    }

    await playerLinkRef.set(playerLinkData, { merge: true });

    return NextResponse.json({
      success: true,
      message: existingLink.exists
        ? 'Player link updated successfully'
        : 'Player link created successfully',
      playerLink: {
        id: playerId,
        ...playerLinkData,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to link players',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
