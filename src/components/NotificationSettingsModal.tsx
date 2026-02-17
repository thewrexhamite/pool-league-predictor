'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import NotificationSettings from './NotificationSettings';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationSettingsModal({
  isOpen,
  onClose,
}: NotificationSettingsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Notification settings"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 24 }}
            className="bg-surface-card border border-surface-border sm:rounded-card rounded-t-2xl shadow-elevated p-4 sm:p-6 w-full max-w-md max-h-[90dvh] sm:max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <NotificationSettings onUnsubscribe={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
