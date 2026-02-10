'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { DivisionCode } from '@/lib/types';

type SheetType = 'team' | 'player';

interface SheetEntry {
  type: SheetType;
  name: string;
  div?: DivisionCode;
}

interface DetailSheetContextValue {
  /** Current sheet stack (last = top) */
  stack: SheetEntry[];
  /** Is any sheet open? */
  isOpen: boolean;
  /** The top-most sheet entry */
  current: SheetEntry | null;
  /** Open a team detail sheet */
  openTeam: (name: string, div?: DivisionCode) => void;
  /** Open a player detail sheet */
  openPlayer: (name: string) => void;
  /** Close the top-most sheet (or all if no stack) */
  close: () => void;
  /** Close all sheets */
  closeAll: () => void;
}

const DetailSheetContext = createContext<DetailSheetContextValue | null>(null);

export function useDetailSheet() {
  const ctx = useContext(DetailSheetContext);
  if (!ctx) throw new Error('useDetailSheet must be used within DetailSheetProvider');
  return ctx;
}

interface DetailSheetProviderProps {
  children: React.ReactNode;
}

export default function DetailSheetProvider({ children }: DetailSheetProviderProps) {
  const [stack, setStack] = useState<SheetEntry[]>([]);
  // Track the hash route that was active before the sheet opened
  const preSheetHash = useRef<string | null>(null);

  const isOpen = stack.length > 0;
  const current = stack.length > 0 ? stack[stack.length - 1] : null;

  const openTeam = useCallback((name: string, div?: DivisionCode) => {
    setStack(prev => {
      // If no sheets open, save current hash for restoration
      if (prev.length === 0) {
        preSheetHash.current = window.location.hash;
      }
      return [...prev, { type: 'team', name, div }];
    });
  }, []);

  const openPlayer = useCallback((name: string) => {
    setStack(prev => {
      if (prev.length === 0) {
        preSheetHash.current = window.location.hash;
      }
      return [...prev, { type: 'player', name }];
    });
  }, []);

  const close = useCallback(() => {
    setStack(prev => {
      const next = prev.slice(0, -1);
      // If closing last sheet, restore the pre-sheet hash
      if (next.length === 0 && preSheetHash.current !== null) {
        window.history.replaceState(null, '', preSheetHash.current);
        preSheetHash.current = null;
      }
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    if (preSheetHash.current !== null) {
      window.history.replaceState(null, '', preSheetHash.current);
      preSheetHash.current = null;
    }
    setStack([]);
  }, []);

  // Close sheets on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  return (
    <DetailSheetContext.Provider value={{ stack, isOpen, current, openTeam, openPlayer, close, closeAll }}>
      {children}
    </DetailSheetContext.Provider>
  );
}
