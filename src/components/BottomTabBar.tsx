'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { TABS } from '@/lib/tabs';
import type { TabId } from '@/lib/router';

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isKnockout?: boolean;
}

/** Maps detail-view tabs to the parent tab that should highlight */
function resolveHighlight(tab: TabId): TabId {
  if (tab === 'team') return 'standings';
  if (tab === 'player') return 'stats';
  return tab;
}

export default function BottomTabBar({ activeTab, onTabChange, isKnockout = false }: BottomTabBarProps) {
  const highlighted = resolveHighlight(activeTab);
  const visibleTabs = useMemo(
    () => isKnockout ? TABS.filter(t => t.id === 'home' || t.id === 'standings') : TABS,
    [isKnockout]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-t border-surface-border pb-safe glass glass-edge vt-tab-bar">
      <nav className="flex items-stretch justify-around max-w-lg mx-auto">
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = highlighted === tab.id;
          return (
            <button
              key={tab.id}
              data-tutorial={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'relative flex flex-col items-center justify-center gap-0.5 py-3 px-3 min-w-0 flex-1 rounded-xl mx-1 my-1.5 btn-press',
                isActive ? 'text-baize bg-baize/10' : 'text-gray-500 hover:text-gray-300'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-baize" />}
              <Icon size={20} className={clsx('transition-transform duration-200', isActive && 'scale-105')} />
              <span className="text-[10px] font-medium leading-tight">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
