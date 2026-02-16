'use client';

import { useState, useEffect } from 'react';

export function useGameTimer(startedAt: number | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return;
    }

    function tick() {
      setElapsed(Math.floor((Date.now() - startedAt!) / 1000));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return { elapsed, minutes, seconds, display };
}
