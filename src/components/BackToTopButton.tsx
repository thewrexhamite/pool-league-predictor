'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import clsx from 'clsx';

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setVisible(window.scrollY > 300);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={clsx(
        'fixed bottom-20 md:bottom-8 right-4 md:right-6 z-30 h-10 w-10 rounded-full',
        'bg-surface-card border border-surface-border shadow-elevated',
        'text-gray-400 hover:text-white hover:scale-110 hover:shadow-lg',
        'transition-all duration-300 ease-in-out',
        'flex items-center justify-center',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-0 pointer-events-none'
      )}
    >
      <ArrowUp size={18} />
    </button>
  );
}
