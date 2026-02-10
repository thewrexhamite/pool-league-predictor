'use client';

import clsx from 'clsx';
import { TABS } from '@/lib/tabs';
import type { TabId } from '@/lib/router';

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

/** Maps detail-view tabs to the parent tab that should highlight */
function resolveHighlight(tab: TabId): TabId {
  if (tab === 'team') return 'standings';
  if (tab === 'player') return 'stats';
  return tab;
}

export default function BottomTabBar({ activeTab, onTabChange }: BottomTabBarProps) {
  const highlighted = resolveHighlight(activeTab);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-t border-surface-border pb-safe glass glass-edge vt-tab-bar">
      <nav className="flex items-stretch justify-around max-w-lg mx-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = highlighted === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
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
      </nav>
    </div>
  );
}
