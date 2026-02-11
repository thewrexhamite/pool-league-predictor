import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyAdminAuth } from '../middleware';

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) return auth.error!;

  try {
    const db = admin.firestore();
    const usersSnap = await db.collection('users').get();
    const claims: Array<{
      userId: string;
      displayName: string;
      email: string;
      claim: Record<string, unknown>;
    }> = [];

    usersSnap.forEach(doc => {
      const data = doc.data();
      const captainClaims = data.captainClaims || [];
      for (const claim of captainClaims) {
        if (!claim.verified) {
          claims.push({
            userId: doc.id,
            displayName: data.displayName || data.email || 'Unknown',
            email: data.email || '',
            claim,
          });
        }
      }
    });

    return NextResponse.json({ claims });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch captain claims' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authorized) return auth.error!;

  try {
    const body = await request.json();
    const { action, userId, league, season, team } = body;

    if (!userId || !league || !season || !team || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data()!;
    const captainClaims = userData.captainClaims || [];

    if (action === 'verify') {
      const updated = captainClaims.map((c: Record<string, unknown>) => {
        if (c.league === league && c.season === season && c.team === team) {
          return { ...c, verified: true, verifiedAt: Date.now(), verifiedBy: auth.userId };
        }
        return c;
      });
      await userRef.update({ captainClaims: updated });
      return NextResponse.json({ success: true });
    }

    if (action === 'reject') {
      const updated = captainClaims.filter(
        (c: Record<string, unknown>) =>
          !(c.league === league && c.season === season && c.team === team)
      );
      const updates: Record<string, unknown> = { captainClaims: updated };
      if (updated.length === 0 && userData.role === 'captain') {
        updates.role = 'user';
      }
      await userRef.update(updates);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "verify" or "reject"' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process captain claim action' },
      { status: 500 }
    );
  }
}
