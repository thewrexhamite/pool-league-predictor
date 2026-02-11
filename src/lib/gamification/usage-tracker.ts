/**
 * Usage Tracker — lightweight tracker with debounced Firestore writes.
 *
 * Batches usage updates every 30 seconds to minimize Firestore writes.
 * Single-line integration at: player profile mount, H2H compare,
 * scouting report view, simulation run.
 */

import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';

interface PendingUpdate {
  playersViewed?: number;
  comparisonsRun?: number;
  scoutingReportsViewed?: number;
  simulationsRun?: number;
  featuresUsed?: string[];
}

let pendingUpdate: PendingUpdate = {};
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;

const FLUSH_INTERVAL_MS = 30_000; // 30 seconds

async function flush() {
  if (!currentUserId || Object.keys(pendingUpdate).length === 0) return;

  const updates: Record<string, unknown> = {};
  if (pendingUpdate.playersViewed) {
    updates['usage.playersViewed'] = increment(pendingUpdate.playersViewed);
  }
  if (pendingUpdate.comparisonsRun) {
    updates['usage.comparisonsRun'] = increment(pendingUpdate.comparisonsRun);
  }
  if (pendingUpdate.scoutingReportsViewed) {
    updates['usage.scoutingReportsViewed'] = increment(pendingUpdate.scoutingReportsViewed);
  }
  if (pendingUpdate.simulationsRun) {
    updates['usage.simulationsRun'] = increment(pendingUpdate.simulationsRun);
  }
  if (pendingUpdate.featuresUsed?.length) {
    updates['usage.featuresUsed'] = arrayUnion(...pendingUpdate.featuresUsed);
  }

  if (Object.keys(updates).length === 0) return;

  try {
    const { db } = await import('../firebase');
    const gamRef = doc(db, 'gamification', currentUserId);
    await updateDoc(gamRef, updates);
  } catch {
    // Silently fail — usage tracking is best-effort
  }

  pendingUpdate = {};
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Set the current user for tracking. Call on auth change.
 */
export function setTrackingUser(userId: string | null) {
  if (currentUserId && currentUserId !== userId) {
    // Flush pending for previous user
    flush();
  }
  currentUserId = userId;
}

/**
 * Track a player profile view.
 */
export function trackPlayerView(_userId: string, _playerName: string) {
  pendingUpdate.playersViewed = (pendingUpdate.playersViewed || 0) + 1;
  scheduleFlush();
}

/**
 * Track a comparison run (H2H).
 */
export function trackComparisonRun(_userId: string) {
  pendingUpdate.comparisonsRun = (pendingUpdate.comparisonsRun || 0) + 1;
  scheduleFlush();
}

/**
 * Track a scouting report view.
 */
export function trackScoutingReport(_userId: string) {
  pendingUpdate.scoutingReportsViewed = (pendingUpdate.scoutingReportsViewed || 0) + 1;
  scheduleFlush();
}

/**
 * Track a simulation run.
 */
export function trackSimulation(_userId: string) {
  pendingUpdate.simulationsRun = (pendingUpdate.simulationsRun || 0) + 1;
  scheduleFlush();
}

/**
 * Track a feature usage.
 */
export function trackFeatureUsed(_userId: string, featureId: string) {
  if (!pendingUpdate.featuresUsed) pendingUpdate.featuresUsed = [];
  if (!pendingUpdate.featuresUsed.includes(featureId)) {
    pendingUpdate.featuresUsed.push(featureId);
  }
  scheduleFlush();
}

/**
 * Flush any pending updates immediately (e.g., on page unload).
 */
export function flushUsageUpdates() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flush();
}
