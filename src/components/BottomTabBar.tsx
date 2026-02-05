'use client';

import { useState, useEffect, useRef } from 'react';
import { MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { PRIMARY_TABS, SECONDARY_TABS } from '@/lib/tabs';
import type { TabId } from '@/lib/router';

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

/** Maps detail-view tabs to the parent tab that should highlight */
function resolveHighlight(tab: TabId): TabId {
  if (tab === 'team') return 'standings';
  if (tab === 'player') return 'players';
  return tab;
}

export default function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const highlighted = resolveHighlight(activeTab);
  const isSecondaryActive = SECONDARY_TABS.some(t => t.id === highlighted);

  // Close popover on outside click
  useEffect(() => {
    if (!moreOpen) return;
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [moreOpen]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-t border-surface-border pb-safe">
      <nav className="flex items-stretch justify-around max-w-lg mx-auto">
        {PRIMARY_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = highlighted === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); setMoreOpen(false); }}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-0 flex-1 transition-colors',
                isActive ? 'text-baize' : 'text-gray-500'
              )}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium leading-tight">{tab.shortLabel}</span>
            </button>
          );
        })}

        {/* More button */}
        <div className="relative flex-1" ref={moreRef}>
          <button
            onClick={() => setMoreOpen(prev => !prev)}
            className={clsx(
              'flex flex-col items-center justify-center gap-0.5 py-2 px-3 w-full transition-colors',
              isSecondaryActive ? 'text-baize' : 'text-gray-500'
            )}
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>

          {/* Popover */}
          {moreOpen && (
            <div className="absolute bottom-full mb-2 right-0 w-44 bg-surface-card border border-surface-border rounded-lg shadow-elevated overflow-hidden">
              {SECONDARY_TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = highlighted === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { onTabChange(tab.id); setMoreOpen(false); }}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition hover:bg-surface-elevated',
                      isActive ? 'text-baize font-medium' : 'text-gray-400'
                    )}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
