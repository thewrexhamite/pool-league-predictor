'use client';

import { useState, useEffect } from 'react';

/** Returns the current vmin value in pixels, updating on resize. */
export function useVmin() {
  const [vmin, setVmin] = useState(() =>
    typeof window !== 'undefined'
      ? Math.min(window.innerWidth, window.innerHeight) / 100
      : 10.8
  );

  useEffect(() => {
    function update() {
      setVmin(Math.min(window.innerWidth, window.innerHeight) / 100);
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return vmin;
}
