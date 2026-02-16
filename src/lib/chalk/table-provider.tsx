'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type {
  ChalkTable,
  ChalkTableContextValue,
  ConnectionStatus,
  AddToQueuePayload,
  ReportResultPayload,
  KillerEliminationPayload,
  ChalkSettings,
} from './types';
import {
  subscribeToTable,
  transactTable,
  updateTableSettings,
  resetTable as resetTableFn,
  addGameHistory,
  enableChalkPersistence,
} from './firestore';
import { addToQueue, removeFromQueue, reorderQueue, holdEntry, unholdEntry, expireHeldEntries } from './queue-engine';
import { startNextGame, processResult, processKillerResult, eliminateKillerPlayer, cancelCurrentGame } from './game-engine';
import { updateStatsAfterGame, updateStatsAfterKillerGame } from './stats-engine';

const ChalkTableContext = createContext<ChalkTableContextValue | null>(null);

export function ChalkTableProvider({
  tableId,
  children,
}: {
  tableId: string;
  children: ReactNode;
}) {
  const [table, setTable] = useState<ChalkTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const lastSnapshotRef = useRef<number>(0);

  // Enable offline persistence
  useEffect(() => {
    enableChalkPersistence();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToTable(
      tableId,
      (data) => {
        setTable(data);
        setLoading(false);
        setError(null);
        setConnectionStatus('connected');
        lastSnapshotRef.current = Date.now();
      },
      (err) => {
        setError(err.message);
        setLoading(false);
        if (lastSnapshotRef.current > 0) {
          setConnectionStatus('disconnected');
        }
      }
    );

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  // Connection health check — only flag reconnecting for active tables
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastSnapshotRef.current;
      if (lastSnapshotRef.current > 0 && elapsed > 30000) {
        // Only flag reconnecting if the table should be receiving updates
        // (has active game or non-empty queue). Idle tables get no updates naturally.
        const t = table;
        if (t && (t.currentGame || t.queue.length > 0)) {
          setConnectionStatus('reconnecting');
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [table]);

  // ===== Queue actions =====

  const handleAddToQueue = useCallback(async (payload: AddToQueuePayload) => {
    await transactTable(tableId, (t) => {
      const cleanQueue = expireHeldEntries(t.queue);
      const result = addToQueue(cleanQueue, payload, t.recentNames, t.session);
      return {
        queue: result.queue,
        recentNames: result.recentNames,
        status: t.session.isPrivate ? 'private' as const : 'active' as const,
        lastActiveAt: Date.now(),
        idleSince: null,
      };
    });
  }, [tableId]);

  const handleRemoveFromQueue = useCallback(async (entryId: string) => {
    await transactTable(tableId, (t) => ({
      queue: removeFromQueue(t.queue, entryId),
      lastActiveAt: Date.now(),
    }));
  }, [tableId]);

  const handleReorderQueue = useCallback(async (entryId: string, newIndex: number) => {
    await transactTable(tableId, (t) => ({
      queue: reorderQueue(t.queue, entryId, newIndex),
    }));
  }, [tableId]);

  const handleHoldPosition = useCallback(async (entryId: string) => {
    await transactTable(tableId, (t) => ({
      queue: holdEntry(t.queue, entryId, t.settings.holdMaxMinutes),
    }));
  }, [tableId]);

  const handleUnholdPosition = useCallback(async (entryId: string) => {
    await transactTable(tableId, (t) => ({
      queue: unholdEntry(t.queue, entryId),
    }));
  }, [tableId]);

  // ===== Game actions =====

  const handleStartNextGame = useCallback(async () => {
    await transactTable(tableId, (t) => {
      const cleanQueue = expireHeldEntries(t.queue);
      const result = startNextGame(cleanQueue, t.currentGame, t.settings, t.sessionStats);
      return {
        queue: result.queue,
        currentGame: result.currentGame,
        status: t.session.isPrivate ? 'private' as const : 'active' as const,
        lastActiveAt: Date.now(),
        idleSince: null,
      };
    });
  }, [tableId]);

  const handleReportResult = useCallback(async (payload: ReportResultPayload) => {
    let historyData: Parameters<typeof addGameHistory>[1] | null = null;

    await transactTable(tableId, (t) => {
      if (!t.currentGame) throw new Error('No active game');

      const result = processResult(t.currentGame, t.queue, payload, t.settings);
      const stats = updateStatsAfterGame(t.sessionStats, t.currentGame, payload);
      const now = Date.now();
      const newConsecutiveWins = payload.winningSide === 'holder'
        ? t.currentGame.consecutiveWins + 1
        : 1;

      // Capture history data to write after transaction (avoids duplicates on retry)
      historyData = {
        id: t.currentGame.id,
        tableId,
        mode: t.currentGame.mode,
        players: t.currentGame.players,
        winner: payload.winnerNames[0] ?? null,
        winnerSide: payload.winningSide,
        startedAt: t.currentGame.startedAt,
        endedAt: now,
        duration: now - t.currentGame.startedAt,
        consecutiveWins: newConsecutiveWins,
        killerState: t.currentGame.killerState,
      };

      return {
        queue: result.queue,
        currentGame: result.currentGame,
        sessionStats: stats,
        lastActiveAt: now,
        idleSince: result.currentGame ? null : now,
      };
    });

    if (historyData) {
      addGameHistory(tableId, historyData)
        .catch((err) => console.error('Failed to write game history:', err));
    }
  }, [tableId]);

  const handleEliminateKillerPlayer = useCallback(async (payload: KillerEliminationPayload) => {
    await transactTable(tableId, (t) => {
      if (!t.currentGame?.killerState) throw new Error('No active killer game');
      const result = eliminateKillerPlayer(t.currentGame, payload.eliminatedPlayerName);
      return {
        currentGame: result,
        lastActiveAt: Date.now(),
      };
    });
  }, [tableId]);

  const handleFinishKillerGame = useCallback(async (winnerName: string) => {
    let historyData: Parameters<typeof addGameHistory>[1] | null = null;

    await transactTable(tableId, (t) => {
      if (!t.currentGame?.killerState) throw new Error('No active killer game');

      const result = processKillerResult(t.currentGame, t.queue, winnerName);
      const stats = updateStatsAfterKillerGame(t.sessionStats, t.currentGame, winnerName);
      const now = Date.now();

      // Capture history data to write after transaction
      historyData = {
        id: t.currentGame.id,
        tableId,
        mode: 'killer' as const,
        players: t.currentGame.players,
        winner: winnerName,
        winnerSide: null,
        startedAt: t.currentGame.startedAt,
        endedAt: now,
        duration: now - t.currentGame.startedAt,
        consecutiveWins: 0,
        killerState: t.currentGame.killerState,
      };

      return {
        queue: result.queue,
        currentGame: null,
        sessionStats: stats,
        lastActiveAt: now,
        idleSince: now,
      };
    });

    if (historyData) {
      addGameHistory(tableId, historyData)
        .catch((err) => console.error('Failed to write game history:', err));
    }
  }, [tableId]);

  const handleCancelGame = useCallback(async () => {
    await transactTable(tableId, (t) => {
      if (!t.currentGame) return {};
      const result = cancelCurrentGame(t.currentGame, t.queue);
      return {
        queue: result.queue,
        currentGame: null,
        lastActiveAt: Date.now(),
      };
    });
  }, [tableId]);

  const handleDismissNoShow = useCallback(async () => {
    await transactTable(tableId, (t) => ({
      queue: t.queue.map((e) =>
        e.status === 'called' ? { ...e, noShowDeadline: null } : e
      ),
    }));
  }, [tableId]);

  // ===== Settings actions =====

  const handleUpdateSettings = useCallback(async (settings: Partial<ChalkSettings>) => {
    await updateTableSettings(tableId, settings);
  }, [tableId]);

  const handleResetTable = useCallback(async () => {
    await resetTableFn(tableId);
  }, [tableId]);

  // ===== Private mode =====

  const handleTogglePrivateMode = useCallback(async (playerNames?: string[]) => {
    await transactTable(tableId, (t) => {
      const isPrivate = !t.session.isPrivate;
      return {
        status: isPrivate ? 'private' as const : 'active' as const,
        session: {
          ...t.session,
          isPrivate,
          privatePlayerNames: isPrivate ? (playerNames ?? []) : [],
        },
      };
    });
  }, [tableId]);

  const value: ChalkTableContextValue = {
    table,
    loading,
    error,
    connectionStatus,
    addToQueue: handleAddToQueue,
    removeFromQueue: handleRemoveFromQueue,
    reorderQueue: handleReorderQueue,
    holdPosition: handleHoldPosition,
    unholdPosition: handleUnholdPosition,
    startNextGame: handleStartNextGame,
    reportResult: handleReportResult,
    eliminateKillerPlayer: handleEliminateKillerPlayer,
    finishKillerGame: handleFinishKillerGame,
    cancelGame: handleCancelGame,
    dismissNoShow: handleDismissNoShow,
    updateSettings: handleUpdateSettings,
    resetTable: handleResetTable,
    togglePrivateMode: handleTogglePrivateMode,
  };

  return (
    <ChalkTableContext.Provider value={value}>
      {children}
    </ChalkTableContext.Provider>
  );
}

export function useChalkTableContext(): ChalkTableContextValue {
  const ctx = useContext(ChalkTableContext);
  if (!ctx) {
    throw new Error('useChalkTableContext must be used within a ChalkTableProvider');
  }
  return ctx;
}
