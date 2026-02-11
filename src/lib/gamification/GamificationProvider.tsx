'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { PlayerInsights, MiniLeague } from './types';
import { DEFAULT_INSIGHTS } from './types';
import { getUserMiniLeagues } from './mini-leagues';

interface InsightsContextValue {
  insights: PlayerInsights;
  miniLeagues: MiniLeague[];
  loading: boolean;
  refreshMiniLeagues: () => Promise<void>;
}

const InsightsContext = createContext<InsightsContextValue | null>(null);

interface GamificationProviderProps {
  userId: string | null;
  children: ReactNode;
}

export function GamificationProvider({ userId, children }: GamificationProviderProps) {
  const [insights, setInsights] = useState<PlayerInsights>(DEFAULT_INSIGHTS);
  const [miniLeagues, setMiniLeagues] = useState<MiniLeague[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener on gamification/{userId}
  useEffect(() => {
    if (!userId) {
      setInsights(DEFAULT_INSIGHTS);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    async function subscribe() {
      try {
        const { db } = await import('../firebase');
        const gamRef = doc(db, 'gamification', userId!);

        unsubscribe = onSnapshot(gamRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as PlayerInsights;
            setInsights({
              ...DEFAULT_INSIGHTS,
              ...data,
              usage: { ...DEFAULT_INSIGHTS.usage, ...data.usage },
            });
          } else {
            setInsights(DEFAULT_INSIGHTS);
          }
          setLoading(false);
        });
      } catch {
        setLoading(false);
      }
    }

    subscribe();
    return () => unsubscribe?.();
  }, [userId]);

  // Load mini-leagues
  const refreshMiniLeagues = useCallback(async () => {
    if (!userId) return;
    try {
      const leagues = await getUserMiniLeagues(userId);
      setMiniLeagues(leagues);
    } catch {
      // ignore
    }
  }, [userId]);

  useEffect(() => {
    refreshMiniLeagues();
  }, [refreshMiniLeagues]);

  const value: InsightsContextValue = useMemo(() => ({
    insights,
    miniLeagues,
    loading,
    refreshMiniLeagues,
  }), [insights, miniLeagues, loading, refreshMiniLeagues]);

  return (
    <InsightsContext.Provider value={value}>
      {children}
    </InsightsContext.Provider>
  );
}

export function useInsightsContext(): InsightsContextValue | null {
  return useContext(InsightsContext);
}
