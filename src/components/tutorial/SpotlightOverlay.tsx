'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface SpotlightOverlayProps {
  target: string;
  spotlight: 'rect' | 'circle' | 'pill';
}

interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PADDING = 8;
const RADIUS = 12;

function getTargetRect(target: string): TargetRect | null {
  const el = document.querySelector(`[data-tutorial="${target}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left - PADDING,
    y: rect.top - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };
}

export default function SpotlightOverlay({ target, spotlight }: SpotlightOverlayProps) {
  const [rect, setRect] = useState<TargetRect | null>(null);

  const updateRect = useCallback(() => {
    const r = getTargetRect(target);
    if (r) {
      setRect(r);
      // Scroll into view
      const el = document.querySelector(`[data-tutorial="${target}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [target]);

  useEffect(() => {
    // Initial position
    updateRect();

    // Update on scroll/resize
    const onUpdate = () => updateRect();
    window.addEventListener('scroll', onUpdate, true);
    window.addEventListener('resize', onUpdate);

    // ResizeObserver for layout changes
    const el = document.querySelector(`[data-tutorial="${target}"]`);
    let observer: ResizeObserver | null = null;
    if (el) {
      observer = new ResizeObserver(onUpdate);
      observer.observe(el);
    }

    return () => {
      window.removeEventListener('scroll', onUpdate, true);
      window.removeEventListener('resize', onUpdate);
      observer?.disconnect();
    };
  }, [target, updateRect]);

  if (!rect) return null;

  const rx = spotlight === 'circle' ? Math.max(rect.width, rect.height) / 2 : RADIUS;
  const ry = spotlight === 'circle' ? Math.max(rect.width, rect.height) / 2 : RADIUS;

  return (
    <>
      {/* SVG mask overlay */}
      <svg
        style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}
        width="100%"
        height="100%"
      >
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <motion.rect
              fill="black"
              rx={rx}
              ry={ry}
              initial={false}
              animate={{
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Click blocker with pass-through for target */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9997 }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Breathing glow around target */}
      <motion.div
        className="spotlight-glow"
        initial={false}
        animate={{
          left: rect.x,
          top: rect.y,
          width: rect.width,
          height: rect.height,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          position: 'fixed',
          zIndex: 9999,
          borderRadius: spotlight === 'circle' ? '50%' : RADIUS,
          pointerEvents: 'none',
          boxShadow: '0 0 0 2px rgba(45, 138, 78, 0.5)',
          animation: 'pulseGlow 2s ease-in-out infinite',
        }}
      />

      <style jsx global>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 2px rgba(45, 138, 78, 0.3), 0 0 12px rgba(45, 138, 78, 0.15); }
          50% { box-shadow: 0 0 0 3px rgba(45, 138, 78, 0.5), 0 0 20px rgba(45, 138, 78, 0.3); }
        }
      `}</style>
    </>
  );
}
