'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { TutorialStep } from '@/lib/tutorial';

interface TutorialTooltipProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  progress: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  userName?: string | null;
}

interface Position {
  top?: number;
  left?: number;
  maxWidth?: number;
}

/** Viewport margin — tooltip stays at least this far from edges */
const EDGE_MARGIN = 12;
/** Gap between tooltip and target element */
const GAP = 16;

/**
 * Calculate tooltip position that stays within viewport bounds.
 * Uses a two-pass approach: calculates ideal position, then clamps to viewport.
 */
function getTooltipPosition(
  target: string,
  placement: TutorialStep['placement'],
  tooltipEl: HTMLDivElement | null
): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const availableWidth = vw - EDGE_MARGIN * 2;
  const tooltipMaxWidth = Math.min(340, availableWidth);

  // Center fallback if target not found
  const el = document.querySelector(`[data-tutorial="${target}"]`);
  if (!el) {
    const tw = tooltipEl?.offsetWidth ?? tooltipMaxWidth;
    const th = tooltipEl?.offsetHeight ?? 200;
    return {
      top: Math.max(EDGE_MARGIN, (vh - th) / 2),
      left: Math.max(EDGE_MARGIN, (vw - tw) / 2),
      maxWidth: tooltipMaxWidth,
    };
  }

  const rect = el.getBoundingClientRect();
  const tw = tooltipEl?.offsetWidth ?? tooltipMaxWidth;
  const th = tooltipEl?.offsetHeight ?? 200;

  let top: number;
  let left: number;

  // Determine vertical position based on placement
  if (placement === 'center') {
    top = (vh - th) / 2;
    left = (vw - tw) / 2;
  } else if (placement === 'top' || placement === 'left' || placement === 'right') {
    // Try to place above the target
    const aboveTop = rect.top - GAP - th;
    const belowTop = rect.bottom + GAP;

    if (aboveTop >= EDGE_MARGIN) {
      // Fits above
      top = aboveTop;
    } else if (belowTop + th <= vh - EDGE_MARGIN) {
      // Doesn't fit above, try below
      top = belowTop;
    } else {
      // Neither fits perfectly — pick whichever has more space
      const spaceAbove = rect.top - GAP;
      const spaceBelow = vh - rect.bottom - GAP;
      top = spaceAbove > spaceBelow ? Math.max(EDGE_MARGIN, aboveTop) : belowTop;
    }

    // Horizontal: center on target
    left = rect.left + rect.width / 2 - tw / 2;
  } else {
    // placement === 'bottom'
    const belowTop = rect.bottom + GAP;
    const aboveTop = rect.top - GAP - th;

    if (belowTop + th <= vh - EDGE_MARGIN) {
      // Fits below
      top = belowTop;
    } else if (aboveTop >= EDGE_MARGIN) {
      // Doesn't fit below, try above
      top = aboveTop;
    } else {
      // Neither fits perfectly — pick whichever has more space
      const spaceAbove = rect.top - GAP;
      const spaceBelow = vh - rect.bottom - GAP;
      top = spaceBelow >= spaceAbove ? belowTop : Math.max(EDGE_MARGIN, aboveTop);
    }

    // Horizontal: center on target
    left = rect.left + rect.width / 2 - tw / 2;
  }

  // Clamp horizontal to viewport
  left = Math.max(EDGE_MARGIN, Math.min(left, vw - tw - EDGE_MARGIN));

  // Clamp vertical to viewport
  top = Math.max(EDGE_MARGIN, Math.min(top, vh - th - EDGE_MARGIN));

  return { top, left, maxWidth: tooltipMaxWidth };
}

export default function TutorialTooltip({
  step,
  stepIndex,
  totalSteps,
  progress,
  onNext,
  onBack,
  onSkip,
  userName,
}: TutorialTooltipProps) {
  const [position, setPosition] = useState<Position>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    setPosition(getTooltipPosition(step.target, step.placement, tooltipRef.current));
  }, [step.target, step.placement]);

  useEffect(() => {
    // Initial position (small delay for spotlight animation)
    const timer = setTimeout(updatePosition, 100);
    // Second pass after render to use actual tooltip dimensions
    const timer2 = setTimeout(updatePosition, 200);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  const content = typeof step.content === 'function'
    ? step.content(userName ? { name: userName } : undefined)
    : step.content;

  const isLastStep = stepIndex === totalSteps - 1;
  const isFirstStep = stepIndex === 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        ref={tooltipRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
        className="tutorial-tooltip"
        style={{
          position: 'fixed',
          zIndex: 10000,
          maxWidth: position.maxWidth ?? Math.min(340, window.innerWidth - EDGE_MARGIN * 2),
          top: position.top,
          left: position.left,
        }}
      >
        <div className="bg-white/[0.08] dark:bg-white/[0.08] light:bg-white/85 backdrop-blur-2xl border border-white/[0.12] dark:border-white/[0.12] light:border-black/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.1)] p-5">
          {/* Step counter */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium text-gray-400 bg-surface-elevated/50 px-2 py-0.5 rounded-full">
              {stepIndex + 1} of {totalSteps}
            </span>
            {step.milestone && (
              <span className="text-[10px] font-medium text-baize">
                {step.milestone}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-surface-elevated/30 rounded-full mb-4 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(135deg, var(--baize), var(--accent))' }}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-white mb-1" style={{ textWrap: 'balance' }}>
            {step.title}
          </h3>

          {/* Body */}
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">
            {content}
          </p>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              disabled={isFirstStep}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition"
            >
              <ChevronLeft size={14} />
              Back
            </button>

            <button
              onClick={onSkip}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition"
            >
              I&apos;ll explore on my own
            </button>

            <button
              onClick={onNext}
              className="flex items-center gap-1 text-xs font-medium text-white bg-baize hover:bg-baize-light px-3 py-1.5 rounded-lg transition"
            >
              {isLastStep ? 'Done' : 'Next'}
              {!isLastStep && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
