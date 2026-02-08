'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { Clock } from 'lucide-react';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getDiv, parseDate } from '@/lib/predictions';

interface RecentResultsWidgetProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
}

export default function RecentResultsWidget({
  selectedDiv,
  onTeamClick,
}: RecentResultsWidgetProps) {
  const { ds } = useActiveData();

  const divResults = useMemo(() =>
    ds.results.filter(r => getDiv(r.home, ds) === selectedDiv),
    [ds, selectedDiv]
  );

  const recentResults = useMemo(() => {
    const sorted = [...divResults].sort((a, b) => parseDate(b.date).localeCompare(parseDate(a.date)));
    if (sorted.length === 0) return [];
    const lastDate = sorted[0].date;
    return sorted.filter(r => r.date === lastDate);
  }, [divResults]);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
        <Clock size={16} />
        Recent Results
        {recentResults.length > 0 && <span className="text-gray-500 font-normal text-xs ml-1">{recentResults[0].date}</span>}
      </h3>
      {recentResults.length === 0 ? (
        <p className="text-xs text-gray-500">No results yet</p>
      ) : (
        <div className="space-y-1.5">
          {recentResults.map((r, i) => {
            const homeWin = r.home_score > r.away_score;
            const awayWin = r.away_score > r.home_score;
            return (
              <div key={i} className="flex items-center text-sm p-2 rounded-lg bg-surface/50">
                <span
                  className={clsx('flex-1 text-right truncate cursor-pointer hover:text-info', homeWin && 'font-semibold text-white')}
                  onClick={() => onTeamClick(r.home)}
                >
                  {r.home}
                </span>
                <span className="mx-3 font-bold text-center w-12">
                  {r.home_score} - {r.away_score}
                </span>
                <span
                  className={clsx('flex-1 truncate cursor-pointer hover:text-info', awayWin && 'font-semibold text-white')}
                  onClick={() => onTeamClick(r.away)}
                >
                  {r.away}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
