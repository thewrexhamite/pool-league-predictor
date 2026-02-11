'use client';

import { useState } from 'react';
import { X, Lock, Unlock } from 'lucide-react';
import clsx from 'clsx';
import type { ToolStatus } from '@/lib/gamification/tool-unlocks';

interface ToolUnlockHintProps {
  tools: ToolStatus[];
}

export default function ToolUnlockHint({ tools }: ToolUnlockHintProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const unlockedTools = tools.filter(t => t.unlocked);
  const nextToUnlock = tools
    .filter(t => !t.unlocked && !dismissed.has(t.id))
    .sort((a, b) => {
      // Sort by closest to unlocking
      const aProgress = a.progress.current / a.progress.target;
      const bProgress = b.progress.current / b.progress.target;
      return bProgress - aProgress;
    });

  return (
    <div className="space-y-2">
      {/* Unlocked tools */}
      {unlockedTools.length > 0 && (
        <div className="space-y-1">
          {unlockedTools.map(tool => (
            <div
              key={tool.id}
              className="flex items-center gap-2 px-3 py-2 bg-green-900/10 border border-green-800/20 rounded-lg"
            >
              <Unlock size={12} className="text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-green-300">{tool.name}</span>
                <span className="text-[10px] text-gray-500 ml-2">{tool.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next tool hint */}
      {nextToUnlock.length > 0 && (() => {
        const tool = nextToUnlock[0];
        const progress = tool.progress.current / tool.progress.target;
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-elevated/50 border border-surface-border/50 rounded-lg">
            <Lock size={12} className="text-gray-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-gray-400">
                {tool.hint}
              </span>
              {/* Progress bar */}
              <div className="mt-1 w-full h-1 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-600 rounded-full transition-all"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => setDismissed(prev => new Set([...prev, tool.id]))}
              className="text-gray-600 hover:text-gray-400 transition shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        );
      })()}
    </div>
  );
}
