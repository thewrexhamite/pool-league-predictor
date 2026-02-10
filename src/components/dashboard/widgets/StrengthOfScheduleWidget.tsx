'use client';

import { useMemo } from 'react';
import { BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { calcAllTeamsSOS } from '@/lib/stats';

interface StrengthOfScheduleWidgetProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
}

export default function StrengthOfScheduleWidget({ selectedDiv, onTeamClick }: StrengthOfScheduleWidgetProps) {
  const { ds } = useActiveData();

  const sosData = useMemo(
    () => calcAllTeamsSOS(selectedDiv, ds),
    [selectedDiv, ds]
  );

  if (sosData.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No schedule data available</p>
      </div>
    );
  }

  // Show hardest and easiest remaining schedules
  const hardest = sosData.slice(0, 3);
  const easiest = [...sosData].sort((a, b) => a.remainingSOS - b.remainingSOS).slice(0, 3);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <BarChart3 size={14} className="text-accent" />
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Remaining Schedule</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1 mb-2">
            <ArrowUp size={12} className="text-loss" />
            <span className="text-[10px] uppercase text-gray-500 font-semibold">Toughest</span>
          </div>
          <div className="space-y-1.5">
            {hardest.map((e) => (
              <button
                key={e.team}
                onClick={() => onTeamClick(e.team)}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-elevated/50 transition text-left"
              >
                <span className="text-xs text-white truncate">{e.team}</span>
                <span className="text-xs text-loss font-medium">{e.remainingSOS > 0 ? '+' : ''}{e.remainingSOS.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-2">
            <ArrowDown size={12} className="text-win" />
            <span className="text-[10px] uppercase text-gray-500 font-semibold">Easiest</span>
          </div>
          <div className="space-y-1.5">
            {easiest.map((e) => (
              <button
                key={e.team}
                onClick={() => onTeamClick(e.team)}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-surface-elevated/50 transition text-left"
              >
                <span className="text-xs text-white truncate">{e.team}</span>
                <span className="text-xs text-win font-medium">{e.remainingSOS > 0 ? '+' : ''}{e.remainingSOS.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
