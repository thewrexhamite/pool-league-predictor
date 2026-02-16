'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useIdleDetector(timeoutMinutes: number) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimer = useCallback(() => {
    setIsIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, timeoutMinutes * 60 * 1000);
  }, [timeoutMinutes]);

  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'mousemove', 'keydown'];

    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  const wake = useCallback(() => {
    setIsIdle(false);
    resetTimer();
  }, [resetTimer]);

  return { isIdle, wake };
}
