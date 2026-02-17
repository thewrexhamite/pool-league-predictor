import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { GameMode, ChalkLifetimeStats } from './types';

export interface UserGameResult {
  uid: string;
  playerName: string;
  won: boolean;
  mode: GameMode;
}

export const DEFAULT_CHALK_STATS: ChalkLifetimeStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastGameAt: 0,
  byMode: {},
};

export async function updateUserLifetimeStats(results: UserGameResult[]): Promise<void> {
  if (results.length === 0) return;

  // Dedupe by uid (a player can only appear once per game)
  const uniqueResults = new Map<string, UserGameResult>();
  for (const r of results) {
    uniqueResults.set(r.uid, r);
  }

  // Read current stats for each user
  const entries: { result: UserGameResult; current: ChalkLifetimeStats }[] = [];
  for (const r of uniqueResults.values()) {
    const userRef = doc(db, 'users', r.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) continue; // Skip users with no profile
    const data = snap.data();
    entries.push({
      result: r,
      current: (data.chalkStats as ChalkLifetimeStats) ?? { ...DEFAULT_CHALK_STATS },
    });
  }

  if (entries.length === 0) return;

  const batch = writeBatch(db);

  for (const { result, current } of entries) {
    const modeKey = result.mode;
    const modeStats = current.byMode[modeKey] ?? { wins: 0, losses: 0, gamesPlayed: 0 };

    const newStreak = result.won ? current.currentStreak + 1 : 0;

    const updated: ChalkLifetimeStats = {
      gamesPlayed: current.gamesPlayed + 1,
      wins: current.wins + (result.won ? 1 : 0),
      losses: current.losses + (result.won ? 0 : 1),
      currentStreak: newStreak,
      bestStreak: Math.max(current.bestStreak, newStreak),
      lastGameAt: Date.now(),
      byMode: {
        ...current.byMode,
        [modeKey]: {
          wins: modeStats.wins + (result.won ? 1 : 0),
          losses: modeStats.losses + (result.won ? 0 : 1),
          gamesPlayed: modeStats.gamesPlayed + 1,
        },
      },
    };

    batch.update(doc(db, 'users', result.uid), { chalkStats: updated });
  }

  await batch.commit();
}
