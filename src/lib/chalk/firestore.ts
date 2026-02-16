import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  runTransaction,
  onSnapshot,
  enableIndexedDbPersistence,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  ChalkTable,
  ChalkTableIndex,
  GameHistoryRecord,
  CreateTablePayload,
  ChalkSettings,
} from './types';
import {
  DEFAULT_SETTINGS,
  DEFAULT_SESSION_STATS,
  DEFAULT_SESSION,
} from './constants';
import { hashPin } from './pin-utils';
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
  });
}
