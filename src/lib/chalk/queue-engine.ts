import type { QueueEntry, AddToQueuePayload, GameMode, ChalkSession } from './types';
import { CHALK_DEFAULTS } from './constants';

export function addToQueue(
  queue: QueueEntry[],
  payload: AddToQueuePayload,
  recentNames: string[],
  session?: ChalkSession
): { queue: QueueEntry[]; recentNames: string[] } {
  if (queue.length >= CHALK_DEFAULTS.MAX_QUEUE_SIZE) {
    throw new Error('Queue is full');
  }

  // Validate player names
  if (payload.playerNames.length === 0) {
    throw new Error('At least one player name is required');
  }

  // Validate name length
  for (const name of payload.playerNames) {
    if (name.length > 30) {
      throw new Error('Player name must be 30 characters or less');
    }
  }

  // Validate doubles has 2 players
  if (payload.gameMode === 'doubles' && payload.playerNames.length !== 2) {
    throw new Error('Doubles requires exactly 2 players');
  }

  // Check for duplicate names already in queue
  const existingNames = new Set(queue.flatMap((e) => e.playerNames));
  const duplicates = payload.playerNames.filter((name) => existingNames.has(name));
  if (duplicates.length > 0) {
    throw new Error(`Already in queue: ${duplicates.join(', ')}`);
  }

  // Validate private mode
  if (session?.isPrivate && session.privatePlayerNames.length > 0) {
    const unauthorised = payload.playerNames.filter(
      (name) => !session.privatePlayerNames.includes(name)
    );
    if (unauthorised.length > 0) {
      throw new Error(`Private session: ${unauthorised.join(', ')} not on the list`);
    }
  }

  const entry: QueueEntry = {
    id: crypto.randomUUID(),
    playerNames: payload.playerNames,
    joinedAt: Date.now(),
    status: 'waiting',
    holdUntil: null,
    noShowDeadline: null,
    gameMode: payload.gameMode,
    ...(payload.userId && { userId: payload.userId }),
    ...(payload.userId && {
      userIds: { [payload.playerNames[0]]: payload.userId },
    }),
  };

  const newQueue = [...queue, entry];

  // Update recent names
  const updatedRecent = [...new Set([...payload.playerNames, ...recentNames])].slice(
    0,
    CHALK_DEFAULTS.MAX_RECENT_NAMES
  );

  return { queue: newQueue, recentNames: updatedRecent };
}

export function removeFromQueue(queue: QueueEntry[], entryId: string): QueueEntry[] {
  return queue.filter((e) => e.id !== entryId);
}

export function reorderQueue(
  queue: QueueEntry[],
  entryId: string,
  newIndex: number
): QueueEntry[] {
  const oldIndex = queue.findIndex((e) => e.id === entryId);
  if (oldIndex === -1) return queue;

  const clampedIndex = Math.max(0, Math.min(newIndex, queue.length - 1));
  const newQueue = [...queue];
  const [moved] = newQueue.splice(oldIndex, 1);
  newQueue.splice(clampedIndex, 0, moved);
  return newQueue;
}

export function holdEntry(
  queue: QueueEntry[],
  entryId: string,
  holdMaxMinutes: number
): QueueEntry[] {
  return queue.map((e) =>
    e.id === entryId
      ? {
          ...e,
          status: 'on_hold' as const,
          holdUntil: Date.now() + holdMaxMinutes * 60 * 1000,
        }
      : e
  );
}

export function unholdEntry(queue: QueueEntry[], entryId: string): QueueEntry[] {
  return queue.map((e) =>
    e.id === entryId
      ? { ...e, status: 'waiting' as const, holdUntil: null }
      : e
  );
}

export function getNextChallenger(queue: QueueEntry[]): QueueEntry | null {
  return queue.find((e) => e.status === 'waiting') ?? null;
}

export function getActiveQueueEntries(queue: QueueEntry[]): QueueEntry[] {
  return queue.filter((e) => e.status !== 'on_hold');
}

export function expireHeldEntries(queue: QueueEntry[]): QueueEntry[] {
  const now = Date.now();
  return queue.filter((e) => {
    if (e.status === 'on_hold' && e.holdUntil && e.holdUntil < now) {
      return false; // Remove expired holds
    }
    return true;
  });
}

export function moveToBack(queue: QueueEntry[], entryId: string): QueueEntry[] {
  const index = queue.findIndex((e) => e.id === entryId);
  if (index === -1) return queue;

  const newQueue = [...queue];
  const [entry] = newQueue.splice(index, 1);
  newQueue.push({ ...entry, status: 'waiting' as const, noShowDeadline: null });
  return newQueue;
}
