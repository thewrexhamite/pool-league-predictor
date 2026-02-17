'use client';

import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface Segment<T extends string = string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string = string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export default function SegmentedControl<T extends string = string>({
  segments,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  const activeIndex = segments.findIndex(s => s.value === value);

  // Measure and position the pill indicator
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || activeIndex < 0) return;

    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-segment]');
    const activeBtn = buttons[activeIndex];
    if (!activeBtn) return;

    setPillStyle({
      left: activeBtn.offsetLeft,
      width: activeBtn.offsetWidth,
    });
  }, [activeIndex, segments]);

  // Re-measure on resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container || activeIndex < 0) return;
      const buttons = container.querySelectorAll<HTMLButtonElement>('[data-segment]');
      const activeBtn = buttons[activeIndex];
      if (!activeBtn) return;
      setPillStyle({ left: activeBtn.offsetLeft, width: activeBtn.offsetWidth });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative inline-flex items-center bg-surface-card rounded-lg p-0.5 overflow-x-auto max-w-full',
        className,
      )}
    >
      {/* Animated pill background */}
      {pillStyle.width > 0 && (
        <motion.div
          className="absolute top-0.5 bottom-0.5 rounded-md shadow-sm"
          style={{ backgroundColor: 'var(--league-primary, #0EA572)' }}
          initial={false}
          animate={{ left: pillStyle.left, width: pillStyle.width }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      {segments.map(seg => {
        const isActive = seg.value === value;
        return (
          <button
            key={seg.value}
            data-segment
            onClick={() => onChange(seg.value)}
            className={clsx(
              'relative z-10 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap',
              isActive ? 'text-fixed-white' : 'text-gray-400 hover:text-gray-200',
            )}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
