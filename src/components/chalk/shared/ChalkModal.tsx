'use client';

import { type ReactNode, useEffect } from 'react';
import clsx from 'clsx';

interface ChalkModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full mx-4',
};

export function ChalkModal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: ChalkModalProps) {
  // Prevent body scroll + handle escape key
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';

      function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') onClose();
      }
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-fixed-black/70 backdrop-blur-sm chalk-animate-fade"
        onClick={onClose}
        role="presentation"
      />

      {/* Content */}
      <div
        className={clsx(
          'relative w-full rounded-2xl bg-surface-card border border-surface-border p-6 shadow-elevated chalk-animate-in',
          sizeClasses[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="chalk-touch rounded-lg p-2 text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
