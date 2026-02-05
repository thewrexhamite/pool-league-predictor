'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import clsx from 'clsx';

interface ThemeToggleProps {
  variant: 'icon' | 'segmented';
}

export default function ThemeToggle({ variant }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    if (variant === 'icon') {
      return <div className="w-9 h-9" />;
    }
    return <div className="h-8" />;
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className="p-2 rounded transition text-gray-400 hover:text-white"
        aria-label="Toggle theme"
        title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    );
  }

  return (
    <div className="flex bg-surface rounded-lg p-0.5 border border-surface-border/30">
      {[
        { key: 'light', icon: Sun, label: 'Light' },
        { key: 'system', icon: Monitor, label: 'System' },
        { key: 'dark', icon: Moon, label: 'Dark' },
      ].map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          onClick={() => setTheme(key)}
          className={clsx(
            'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition',
            theme === key
              ? 'bg-surface-elevated text-white shadow-sm'
              : 'text-gray-400 hover:text-white'
          )}
          aria-label={label}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
