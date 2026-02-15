'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useTutorial } from './TutorialProvider';

const LS_KEY = 'plp-first-visit-dismissed';

export default function TutorialWelcomeToast() {
  const { startTutorial, isTutorialCompleted } = useTutorial();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show on first visit if tutorial hasn't been completed
    try {
      const dismissed = localStorage.getItem(LS_KEY);
      if (dismissed) return;
      if (isTutorialCompleted('command-centre')) return;
    } catch {
      return;
    }

    // Delay to let the page load
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [isTutorialCompleted]);

  const handleDismiss = () => {
    setShow(false);
    try { localStorage.setItem(LS_KEY, '1'); } catch { /* noop */ }
  };

  const handleStart = () => {
    setShow(false);
    try { localStorage.setItem(LS_KEY, '1'); } catch { /* noop */ }
    startTutorial('command-centre');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-[5.5rem] md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
        >
          <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.24)] p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-muted/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white mb-0.5">
                  Welcome to Pool League Pro!
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  Want a quick tour? It takes about 2 minutes.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleStart}
                    className="text-xs font-medium text-white bg-baize hover:bg-baize-light px-3 py-1.5 rounded-lg transition"
                  >
                    Show me around
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 transition"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-600 hover:text-gray-400 transition p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
