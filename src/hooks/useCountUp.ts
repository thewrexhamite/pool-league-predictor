'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to target when inView becomes true.
 * Uses requestAnimationFrame with easeOutCubic for smooth deceleration.
 * Respects prefers-reduced-motion.
 */
export function useCountUp(target: number, inView: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;

    // Respect reduced motion preference
    if (typeof window !== 'undefined') {
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        setValue(target);
        return;
      }
    }

    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, inView, duration]);

  return value;
}
