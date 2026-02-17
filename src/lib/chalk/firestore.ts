import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  collectionGroup,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  runTransaction,
  onSnapshot,
  enableIndexedDbPersistence,
  arrayUnion,
  arrayRemove,
  type Unsubscribe,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  ChalkTable,
  ChalkTableIndex,
  ChalkVenue,
  GameHistoryRecord,
  CreateTablePayload,
  CreateVenuePayload,
  ChalkSettings,
} from './types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SESSION_STATS,
  DEFAULT_SESSION,
  VENUES_COLLECTION,
} from './constants';
import { hashPin, verifyPin } from './pin-utils';
import { generateShortCode } from './short-code';

// ===== Enable offline persistence =====

let persistenceEnabled = false;

export async function enableChalkPersistence(): Promise<void> {
  if (persistenceEnabled) return;
  try {
    await enableIndexedDbPersistence(db);
    persistenceEnabled = true;
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (error.code === 'failed-precondition') {
      // Multiple tabs open — persistence can only be enabled in one tab
      console.warn('Chalk: Firestore persistence failed (multiple tabs)');
    } else if (error.code === 'unimplemented') {
      // Browser doesn't support persistence
      console.warn('Chalk: Firestore persistence not supported');
    }
  }
}

// ===== Collection references =====

const TABLES_COLLECTION = 'chalkTables';
const INDEX_COLLECTION = 'chalkTableIndex';

function tableRef(tableId: string) {
  return doc(db, TABLES_COLLECTION, tableId);
}

function historyCollection(tableId: string) {
  return collection(db, TABLES_COLLECTION, tableId, 'history');
}

function indexRef(shortCode: string) {
  return doc(db, INDEX_COLLECTION, shortCode);
}

function venueRef(venueId: string) {
  return doc(db, VENUES_COLLECTION, venueId);
}

// ===== Create table =====

export async function createTable(payload: CreateTablePayload): Promise<ChalkTable> {
  const pinHash = await hashPin(payload.pin);
  const shortCode = generateShortCode();
  const now = Date.now();

  const tableDoc = doc(collection(db, TABLES_COLLECTION));
  const tableId = tableDoc.id;

  const table: ChalkTable = {
    id: tableId,
    shortCode,
    name: `${payload.venueName} - ${payload.tableName}`,
    venueName: payload.venueName,
    venueId: payload.venueId ?? null,
    status: 'idle',
    createdAt: now,
    lastActiveAt: now,
    idleSince: now,
    settings: {
      ...DEFAULT_SETTINGS,
      pinHash,
      tableName: payload.tableName,
    },
    queue: [],
    currentGame: null,
    sessionStats: { ...DEFAULT_SESSION_STATS },
    recentNames: [],
    session: { ...DEFAULT_SESSION, startedAt: now },
  };

  const indexEntry: ChalkTableIndex = {
    tableId,
    shortCode,
    createdAt: now,
  };

  await runTransaction(db, async (transaction) => {
    // Check short code uniqueness
    const existingIndex = await transaction.get(indexRef(shortCode));
    if (existingIndex.exists()) {
      throw new Error('Short code collision — please try again');
    }
    transaction.set(tableDoc, table);
    transaction.set(indexRef(shortCode), indexEntry);
    // If created within a venue, add to venue's tableIds
    if (payload.venueId) {
      transaction.update(venueRef(payload.venueId), {
        tableIds: arrayUnion(tableId),
      });
    }
  });

  return table;
}

// ===== Get table =====

export async function getTable(tableId: string): Promise<ChalkTable | null> {
  const snap = await getDoc(tableRef(tableId));
  return snap.exists() ? (snap.data() as ChalkTable) : null;
}

// ===== Get table by short code =====

export async function getTableByShortCode(shortCode: string): Promise<ChalkTable | null> {
  const indexSnap = await getDoc(indexRef(shortCode));
  if (!indexSnap.exists()) return null;
  const { tableId } = indexSnap.data() as ChalkTableIndex;
  return getTable(tableId);
}

// ===== Subscribe to table =====

export function subscribeToTable(
  tableId: string,
  onData: (table: ChalkTable) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    tableRef(tableId),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as ChalkTable);
      } else {
        onError(new Error('Table not found'));
      }
    },
    onError
  );
}

// ===== Update table =====

export async function updateTable(
  tableId: string,
  data: Partial<ChalkTable>
): Promise<void> {
  await updateDoc(tableRef(tableId), data);
}

// ===== Atomic table transaction =====

export async function transactTable(
  tableId: string,
  updateFn: (table: ChalkTable) => Partial<ChalkTable>
): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(tableRef(tableId));
    if (!snap.exists()) throw new Error('Table not found');
    const table = snap.data() as ChalkTable;
    const updates = updateFn(table);
    transaction.update(tableRef(tableId), updates);
  });
}

// ===== Update settings =====

export async function updateTableSettings(
  tableId: string,
  settings: Partial<ChalkSettings>
): Promise<void> {
  await transactTable(tableId, (table) => ({
    settings: {
      ...table.settings,
      ...settings,
      // Deep merge houseRules to avoid race conditions between concurrent changes
      houseRules: settings.houseRules
        ? { ...table.settings.houseRules, ...settings.houseRules }
        : table.settings.houseRules,
    },
  }));
}

// ===== Game history =====

export async function addGameHistory(
  tableId: string,
  record: GameHistoryRecord
): Promise<void> {
  await addDoc(historyCollection(tableId), record);
}

export async function getGameHistory(tableId: string): Promise<GameHistoryRecord[]> {
  const snap = await getDocs(historyCollection(tableId));
  return snap.docs.map((d) => d.data() as GameHistoryRecord);
}

export async function getTableHistory(
  tableId: string,
  pageSize: number = 20
): Promise<GameHistoryRecord[]> {
  const q = query(
    historyCollection(tableId),
    orderBy('endedAt', 'desc'),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as GameHistoryRecord);
}

export async function getUserGameHistory(
  uid: string,
  pageSize: number = 20,
  afterDoc?: QueryDocumentSnapshot
): Promise<{ games: GameHistoryRecord[]; lastDoc: QueryDocumentSnapshot | null; hasMore: boolean }> {
  const cg = collectionGroup(db, 'history');
  const q = afterDoc
    ? query(
        cg,
        where('playerUidList', 'array-contains', uid),
        orderBy('endedAt', 'desc'),
        startAfter(afterDoc),
        limit(pageSize + 1)
      )
    : query(
        cg,
        where('playerUidList', 'array-contains', uid),
        orderBy('endedAt', 'desc'),
        limit(pageSize + 1)
      );
  const snap = await getDocs(q);
  const hasMore = snap.docs.length > pageSize;
  const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
  return {
    games: docs.map((d) => d.data() as GameHistoryRecord),
    lastDoc: docs.length > 0 ? docs[docs.length - 1] : null,
    hasMore,
  };
}

// ===== Reset table =====

export async function resetTable(tableId: string): Promise<void> {
  const now = Date.now();
  await updateDoc(tableRef(tableId), {
    status: 'idle',
    queue: [],
    currentGame: null,
    sessionStats: { ...DEFAULT_SESSION_STATS },
    lastActiveAt: now,
    idleSince: now,
    session: { ...DEFAULT_SESSION, startedAt: now },
  });
}

// ===== Delete table =====

export async function deleteTable(tableId: string): Promise<void> {
  const table = await getTable(tableId);
  if (!table) return;

  await runTransaction(db, async (transaction) => {
    transaction.delete(tableRef(tableId));
    transaction.delete(indexRef(table.shortCode));
    // Remove from venue if linked
    if (table.venueId) {
      transaction.update(venueRef(table.venueId), {
        tableIds: arrayRemove(tableId),
      });
    }
  });
}

// ===== Venue CRUD =====

export async function createVenue(
  payload: CreateVenuePayload,
  userId: string,
  userName: string
): Promise<ChalkVenue> {
  const venueDoc = doc(collection(db, VENUES_COLLECTION));
  const venue: ChalkVenue = {
    id: venueDoc.id,
    name: payload.name,
    ownerId: userId,
    ownerName: userName,
    createdAt: Date.now(),
    tableIds: [],
    logoUrl: null,
  };
  await setDoc(venueDoc, venue);
  return venue;
}

export async function getVenue(venueId: string): Promise<ChalkVenue | null> {
  const snap = await getDoc(venueRef(venueId));
  return snap.exists() ? (snap.data() as ChalkVenue) : null;
}

export async function getVenuesByOwner(userId: string): Promise<ChalkVenue[]> {
  const q = query(
    collection(db, VENUES_COLLECTION),
    where('ownerId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ChalkVenue);
}

export async function updateVenue(
  venueId: string,
  data: Partial<Pick<ChalkVenue, 'name' | 'logoUrl'>>
): Promise<void> {
  await updateDoc(venueRef(venueId), data);
}

export async function deleteVenue(venueId: string): Promise<void> {
  const venue = await getVenue(venueId);
  if (!venue) return;
  if (venue.tableIds.length > 0) {
    throw new Error('Cannot delete venue with tables. Remove all tables first.');
  }
  await deleteDoc(venueRef(venueId));
}

export async function addTableToVenue(
  venueId: string,
  tableId: string
): Promise<void> {
  await updateDoc(venueRef(venueId), {
    tableIds: arrayUnion(tableId),
  });
}

export async function removeTableFromVenue(
  venueId: string,
  tableId: string
): Promise<void> {
  await updateDoc(venueRef(venueId), {
    tableIds: arrayRemove(tableId),
  });
  await updateDoc(tableRef(tableId), { venueId: null });
}

export async function claimTable(
  venueId: string,
  shortCode: string,
  pin: string
): Promise<ChalkTable> {
  const indexSnap = await getDoc(indexRef(shortCode));
  if (!indexSnap.exists()) {
    throw new Error('Table not found. Check the code and try again.');
  }
  const { tableId } = indexSnap.data() as ChalkTableIndex;

  return await runTransaction(db, async (transaction) => {
    const tableSnap = await transaction.get(tableRef(tableId));
    if (!tableSnap.exists()) {
      throw new Error('Table not found');
    }
    const table = tableSnap.data() as ChalkTable;

    // Verify PIN
    const pinValid = await verifyPin(pin, table.settings.pinHash);
    if (!pinValid) {
      throw new Error('Incorrect PIN');
    }

    if (table.venueId && table.venueId !== venueId) {
      throw new Error('This table is already claimed by another venue');
    }

    // Set venueId on table and add to venue's tableIds
    transaction.update(tableRef(tableId), { venueId });
    transaction.update(venueRef(venueId), {
      tableIds: arrayUnion(tableId),
    });

    return { ...table, venueId };
  });
}

export async function getTablesForVenue(venueId: string): Promise<ChalkTable[]> {
  const q = query(
    collection(db, TABLES_COLLECTION),
    where('venueId', '==', venueId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ChalkTable);
}

export function subscribeToVenueTables(
  venueId: string,
  onData: (tables: ChalkTable[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, TABLES_COLLECTION),
    where('venueId', '==', venueId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const tables = snap.docs.map((d) => d.data() as ChalkTable);
      onData(tables);
    },
    onError
  );
}
