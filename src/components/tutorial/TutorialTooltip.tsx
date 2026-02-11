'use client';

import { useState, useEffect, useCallback } from 'react';
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
  bottom?: number;
  left?: number;
  right?: number;
  transform?: string;
}

function getTooltipPosition(target: string, placement: TutorialStep['placement']): Position {
  const el = document.querySelector(`[data-tutorial="${target}"]`);
  if (!el) return { top: window.innerHeight / 2, left: window.innerWidth / 2, transform: 'translate(-50%, -50%)' };

  const rect = el.getBoundingClientRect();
  const gap = 16;

  switch (placement) {
    case 'bottom':
      return {
        top: rect.bottom + gap,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      };
    case 'top':
      return {
        bottom: window.innerHeight - rect.top + gap,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      };
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        right: window.innerWidth - rect.left + gap,
        transform: 'translateY(-50%)',
      };
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + gap,
        transform: 'translateY(-50%)',
      };
    case 'center':
    default:
      return {
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
        transform: 'translate(-50%, -50%)',
      };
  }
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

  const updatePosition = useCallback(() => {
    setPosition(getTooltipPosition(step.target, step.placement));
  }, [step.target, step.placement]);

  useEffect(() => {
    // Small delay to let the spotlight animate first
    const timer = setTimeout(updatePosition, 100);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      clearTimeout(timer);
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
        className="tutorial-tooltip"
        style={{
          position: 'fixed',
          zIndex: 10000,
          maxWidth: 340,
          ...position,
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
