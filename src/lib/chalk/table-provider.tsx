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
  RegisterGamePayload,
  ReportResultPayload,
  KillerEliminationPayload,
  StartKillerPayload,
  ChalkSettings,
  GamePlayer,
  QueueEntry,
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
import { startNextGame, processResult, processKillerResult, eliminateKillerPlayer, startKillerDirect, cancelCurrentGame, resolveNoShows } from './game-engine';
import { updateStatsAfterGame, updateStatsAfterKillerGame } from './stats-engine';
import { updateUserLifetimeStats, type UserGameResult } from './user-stats';

function extractPlayerUids(players: GamePlayer[], queue: QueueEntry[]): Record<string, string> {
  const uidMap: Record<string, string> = {};
  for (const player of players) {
    const entry = queue.find((e) => e.id === player.queueEntryId);
    if (entry?.userIds?.[player.name]) {
      uidMap[player.name] = entry.userIds[player.name];
    }
  }
  return uidMap;
}

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

  // Connection status is driven by the Firestore snapshot listener above:
  // successful snapshots → 'connected', error callback → 'disconnected'.
  // No polling health check — Firestore doesn't send snapshots when the
  // document hasn't changed, so silence is normal during an active game.

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

  const handleRegisterCurrentGame = useCallback(async (payload: RegisterGamePayload) => {
    await transactTable(tableId, (t) => {
      if (t.currentGame) throw new Error('A game is already in progress');

      const holderEntry: QueueEntry = {
        id: crypto.randomUUID(),
        playerNames: payload.holderNames,
        joinedAt: Date.now(),
        status: 'waiting',
        holdUntil: null,
        noShowDeadline: null,
        gameMode: payload.gameMode,
      };

      const challengerEntry: QueueEntry = {
        id: crypto.randomUUID(),
        playerNames: payload.challengerNames,
        joinedAt: Date.now(),
        status: 'waiting',
        holdUntil: null,
        noShowDeadline: null,
        gameMode: payload.gameMode,
      };

      // Insert at front of queue, then start game from those entries
      const cleanQueue = expireHeldEntries(t.queue);
      const queueWithEntries = [holderEntry, challengerEntry, ...cleanQueue];
      const result = startNextGame(queueWithEntries, null, t.settings, t.sessionStats);

      // Update recent names
      const allNames = [...payload.holderNames, ...payload.challengerNames];
      const updatedRecent = [...new Set([...allNames, ...t.recentNames])].slice(0, 50);

      return {
        queue: result.queue,
        currentGame: result.currentGame,
        recentNames: updatedRecent,
        status: t.session.isPrivate ? 'private' as const : 'active' as const,
        lastActiveAt: Date.now(),
        idleSince: null,
      };
    });
  }, [tableId]);

  const handleStartKillerDirect = useCallback(async (payload: StartKillerPayload) => {
    await transactTable(tableId, (t) => {
      if (t.currentGame) throw new Error('A game is already in progress');

      const game = startKillerDirect(payload);

      // Update recent names with killer participants
      const updatedRecent = [...new Set([...payload.playerNames, ...t.recentNames])].slice(0, 50);

      return {
        currentGame: game,
        recentNames: updatedRecent,
        status: t.session.isPrivate ? 'private' as const : 'active' as const,
        lastActiveAt: Date.now(),
        idleSince: null,
      };
    });
  }, [tableId]);

  const handleReportResult = useCallback(async (payload: ReportResultPayload) => {
    let historyData: Parameters<typeof addGameHistory>[1] | null = null;
    let statsResults: UserGameResult[] = [];

    await transactTable(tableId, (t) => {
      if (!t.currentGame) throw new Error('No active game');

      const result = processResult(t.currentGame, t.queue, payload, t.settings);
      const stats = updateStatsAfterGame(t.sessionStats, t.currentGame, payload);
      const now = Date.now();
      const newConsecutiveWins = payload.winningSide === 'holder'
        ? t.currentGame.consecutiveWins + 1
        : 1;

      // Extract UIDs before queue state changes
      const playerUidMap = extractPlayerUids(t.currentGame.players, t.queue);

      // Capture history data to write after transaction (avoids duplicates on retry)
      const playerUidList = Object.values(playerUidMap);
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
        playerUids: Object.keys(playerUidMap).length > 0 ? playerUidMap : undefined,
        playerUidList: playerUidList.length > 0 ? playerUidList : undefined,
        venueName: t.venueName,
      };

      // Build lifetime stats results for players with UIDs
      statsResults = t.currentGame.players
        .filter((p) => playerUidMap[p.name])
        .map((p) => ({
          uid: playerUidMap[p.name],
          playerName: p.name,
          won: p.side === payload.winningSide,
          mode: t.currentGame!.mode,
        }));

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

    if (statsResults.length > 0) {
      updateUserLifetimeStats(statsResults)
        .catch((err) => console.error('Failed to update user lifetime stats:', err));
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
    let statsResults: UserGameResult[] = [];

    await transactTable(tableId, (t) => {
      if (!t.currentGame?.killerState) throw new Error('No active killer game');

      processKillerResult(t.currentGame, winnerName);
      const stats = updateStatsAfterKillerGame(t.sessionStats, t.currentGame, winnerName);
      const now = Date.now();

      // Look up UIDs from queue entries that share player names
      const playerUidMap = extractPlayerUids(t.currentGame.players, t.queue);

      // Capture history data to write after transaction
      const playerUidList = Object.values(playerUidMap);
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
        playerUids: Object.keys(playerUidMap).length > 0 ? playerUidMap : undefined,
        playerUidList: playerUidList.length > 0 ? playerUidList : undefined,
        venueName: t.venueName,
      };

      // Build lifetime stats results for players with UIDs
      statsResults = t.currentGame.players
        .filter((p) => playerUidMap[p.name])
        .map((p) => ({
          uid: playerUidMap[p.name],
          playerName: p.name,
          won: p.name === winnerName,
          mode: 'killer' as const,
        }));

      return {
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

    if (statsResults.length > 0) {
      updateUserLifetimeStats(statsResults)
        .catch((err) => console.error('Failed to update user lifetime stats:', err));
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

  const handleResolveNoShows = useCallback(async (noShowEntryIds: string[]) => {
    await transactTable(tableId, (t) => {
      if (!t.currentGame) return {};
      const result = resolveNoShows(t.currentGame, t.queue, new Set(noShowEntryIds));
      return {
        queue: result.queue,
        currentGame: null,
        lastActiveAt: Date.now(),
      };
    });
  }, [tableId]);

  // ===== Claim queue spot =====

  const handleClaimQueueSpot = useCallback(async (entryId: string, playerName: string, userId: string) => {
    await transactTable(tableId, (t) => {
      const queue = t.queue.map((e) => {
        if (e.id !== entryId) return e;
        if (!e.playerNames.includes(playerName)) return e;
        const existing = e.userIds ?? {};
        if (existing[playerName]) return e; // Already claimed
        return { ...e, userIds: { ...existing, [playerName]: userId } };
      });
      return { queue };
    });
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
    startKillerDirect: handleStartKillerDirect,
    eliminateKillerPlayer: handleEliminateKillerPlayer,
    finishKillerGame: handleFinishKillerGame,
    cancelGame: handleCancelGame,
    dismissNoShow: handleDismissNoShow,
    resolveNoShows: handleResolveNoShows,
    updateSettings: handleUpdateSettings,
    resetTable: handleResetTable,
    togglePrivateMode: handleTogglePrivateMode,
    claimQueueSpot: handleClaimQueueSpot,
    registerCurrentGame: handleRegisterCurrentGame,
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
