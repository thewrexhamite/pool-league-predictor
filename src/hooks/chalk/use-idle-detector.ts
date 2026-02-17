'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export function useIdleDetector(timeoutMinutes: number) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastActivityRef = useRef<number>(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const timeoutMsRef = useRef(timeoutMinutes * 60 * 1000);
  timeoutMsRef.current = timeoutMinutes * 60 * 1000;

  const checkIdle = useCallback(() => {
    if (Date.now() - lastActivityRef.current >= timeoutMsRef.current) {
      setIsIdle(true);
    }
  }, []);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, timeoutMsRef.current);
  }, []);

  useEffect(() => {
    const events = ['touchstart', 'mousedown', 'mousemove', 'keydown'];

    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // Safari on iPad suspends setTimeout when the page is backgrounded or the
    // screen dims. Use a polling interval as a fallback to catch elapsed idle
    // time, and re-check when the page regains visibility.
    intervalRef.current = setInterval(checkIdle, 15_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkIdle();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    resetTimer();

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resetTimer, checkIdle]);

  const wake = useCallback(() => {
    setIsIdle(false);
    resetTimer();
  }, [resetTimer]);

  return { isIdle, wake };
}
