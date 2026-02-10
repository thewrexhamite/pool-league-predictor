'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useDetailSheet } from './DetailSheetProvider';

interface DetailSheetProps {
  children: React.ReactNode;
}

/**
 * Renders the sheet overlay.
 * - Mobile: bottom sheet (slides up, swipe-to-dismiss)
 * - Desktop: side panel (slides in from right, 480px)
 */
export default function DetailSheet({ children }: DetailSheetProps) {
  const { isOpen, close } = useDetailSheet();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when sheet is open + haptic feedback
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Haptic feedback on open (mobile)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Reset scroll position when content changes
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [isOpen, children]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    // Close if dragged down more than 100px or with enough velocity
    if (info.offset.y > 100 || info.velocity.y > 500) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(5);
      }
      close();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm glass-subtle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          />

          {/* Mobile: Bottom Sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 md:hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
          >
            <div className="bg-surface rounded-t-2xl max-h-[90vh] flex flex-col shadow-elevated">
              {/* Drag handle */}
              <div className="flex justify-center py-2 shrink-0 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 rounded-full bg-gray-600" />
              </div>

              {/* Close button */}
              <div className="flex justify-end px-4 pb-1 shrink-0">
                <button
                  onClick={close}
                  className="p-1.5 rounded-lg hover:bg-surface-elevated text-gray-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-safe pb-6">
                {children}
              </div>
            </div>
          </motion.div>

          {/* Desktop: Side Panel */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-50 hidden md:flex"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="w-[480px] max-w-[90vw] bg-surface border-l border-surface-border shadow-elevated flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border/50 shrink-0">
                <span className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Detail</span>
                <button
                  onClick={close}
                  className="p-1.5 rounded-lg hover:bg-surface-elevated text-gray-400 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain p-4">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
