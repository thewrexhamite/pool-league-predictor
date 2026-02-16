'use client';

import { useState, useEffect, useCallback } from 'react';

export function useNoShowTimer(deadline: number | null) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!deadline) {
      setSecondsLeft(null);
      setIsExpired(false);
      return;
    }

    function tick() {
      const remaining = Math.max(0, Math.ceil((deadline! - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        setIsExpired(true);
      }
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return { secondsLeft, isExpired };
}
