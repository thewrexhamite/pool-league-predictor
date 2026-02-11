import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { MiniLeague, LeaderboardEntry } from './types';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 for clarity
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Create a new mini-league.
 */
export async function createMiniLeague(
  name: string,
  userId: string,
  seasonId: string,
): Promise<MiniLeague> {
  const { db } = await import('../firebase');
  const leagueId = `ml_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const inviteCode = generateInviteCode();

  const miniLeague: MiniLeague = {
    id: leagueId,
    name,
    createdBy: userId,
    inviteCode,
    members: [userId],
    maxMembers: 50,
    seasonId,
    createdAt: Date.now(),
  };

  await setDoc(doc(db, 'miniLeagues', leagueId), miniLeague);

  // Add to user's gamification miniLeagues array
  const gamRef = doc(db, 'gamification', userId);
  const gamSnap = await getDoc(gamRef);
  if (gamSnap.exists()) {
    await updateDoc(gamRef, { miniLeagues: arrayUnion(leagueId) });
  }

  return miniLeague;
}

/**
 * Join a mini-league by invite code.
 */
export async function joinMiniLeague(
  inviteCode: string,
  userId: string,
): Promise<MiniLeague | null> {
  const { db } = await import('../firebase');
  const q = query(
    collection(db, 'miniLeagues'),
    where('inviteCode', '==', inviteCode.toUpperCase()),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const leagueDoc = snapshot.docs[0];
  const league = leagueDoc.data() as MiniLeague;

  if (league.members.includes(userId)) return league; // already a member
  if (league.members.length >= league.maxMembers) return null; // full

  await updateDoc(doc(db, 'miniLeagues', league.id), {
    members: arrayUnion(userId),
  });

  // Add to user's gamification miniLeagues array
  const gamRef = doc(db, 'gamification', userId);
  const gamSnap = await getDoc(gamRef);
  if (gamSnap.exists()) {
    await updateDoc(gamRef, { miniLeagues: arrayUnion(league.id) });
  }

  return { ...league, members: [...league.members, userId] };
}

/**
 * Leave a mini-league.
 */
export async function leaveMiniLeague(
  leagueId: string,
  userId: string,
): Promise<void> {
  const { db } = await import('../firebase');
  await updateDoc(doc(db, 'miniLeagues', leagueId), {
    members: arrayRemove(userId),
  });

  const gamRef = doc(db, 'gamification', userId);
  const gamSnap = await getDoc(gamRef);
  if (gamSnap.exists()) {
    await updateDoc(gamRef, { miniLeagues: arrayRemove(leagueId) });
  }
}

/**
 * Get mini-league standings (ranked by season XP).
 */
export async function getMiniLeagueStandings(
  leagueId: string,
): Promise<{ league: MiniLeague; standings: LeaderboardEntry[] } | null> {
  const { db } = await import('../firebase');
  const leagueRef = doc(db, 'miniLeagues', leagueId);
  const leagueSnap = await getDoc(leagueRef);
  if (!leagueSnap.exists()) return null;

  const league = leagueSnap.data() as MiniLeague;
  const standings: LeaderboardEntry[] = [];

  // Fetch gamification data for each member
  for (const memberId of league.members) {
    const gamRef = doc(db, 'gamification', memberId);
    const gamSnap = await getDoc(gamRef);
    if (!gamSnap.exists()) continue;

    const gam = gamSnap.data();
    // Also try to get display name from users collection
    const userRef = doc(db, 'users', memberId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : null;

    standings.push({
      userId: memberId,
      displayName: userData?.displayName || 'Unknown',
      photoURL: userData?.photoURL || undefined,
      xp: gam.xp || 0,
      weeklyXP: gam.weeklyXP || 0,
      level: gam.level || 1,
      tier: gam.leagueTier || 0,
      rank: 0,
      movement: 0,
    });
  }

  // Sort by XP and assign ranks
  standings.sort((a, b) => b.xp - a.xp);
  standings.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return { league, standings };
}

/**
 * Get a mini-league by ID.
 */
export async function getMiniLeague(leagueId: string): Promise<MiniLeague | null> {
  const { db } = await import('../firebase');
  const ref = doc(db, 'miniLeagues', leagueId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as MiniLeague;
}

/**
 * Get all mini-leagues for a user.
 */
export async function getUserMiniLeagues(userId: string): Promise<MiniLeague[]> {
  const { db } = await import('../firebase');
  const q = query(
    collection(db, 'miniLeagues'),
    where('members', 'array-contains', userId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as MiniLeague);
}
