'use client';

import { useState, useEffect } from 'react';

export function useHoldTimer(holdUntil: number | null) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!holdUntil) {
      setMinutesLeft(null);
      setIsExpired(false);
      return;
    }

    function tick() {
      const remaining = Math.max(0, Math.ceil((holdUntil! - Date.now()) / 60000));
      setMinutesLeft(remaining);
      if (remaining <= 0) {
        setIsExpired(true);
      }
    }

    tick();
    const interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, [holdUntil]);

  return { minutesLeft, isExpired };
}
