'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameHistoryRecord } from '@/lib/chalk/types';
import { getTableHistory, getUserGameHistory } from '@/lib/chalk/firestore';
import type { QueryDocumentSnapshot } from 'firebase/firestore';

export function useTableHistory(tableId: string) {
  const [games, setGames] = useState<GameHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getTableHistory(tableId, 10)
      .then((result) => {
        if (!cancelled) {
          setGames(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [tableId]);

  return { games, loading, error };
}

export function useUserGameHistory(uid: string | undefined) {
  const [games, setGames] = useState<GameHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);

  useEffect(() => {
    if (!uid) {
      setGames([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    lastDocRef.current = null;

    getUserGameHistory(uid, 20)
      .then((result) => {
        if (!cancelled) {
          setGames(result.games);
          lastDocRef.current = result.lastDoc;
          setHasMore(result.hasMore);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [uid]);

  const loadMore = useCallback(async () => {
    if (!uid || !lastDocRef.current || loadingMore) return;

    setLoadingMore(true);
    try {
      const result = await getUserGameHistory(uid, 20, lastDocRef.current);
      setGames((prev) => [...prev, ...result.games]);
      lastDocRef.current = result.lastDoc;
      setHasMore(result.hasMore);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setLoadingMore(false);
    }
  }, [uid, loadingMore]);

  return { games, loading, loadingMore, hasMore, loadMore, error };
}
