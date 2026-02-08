'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { Calendar, Target } from 'lucide-react';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getRemainingFixtures, parseDate } from '@/lib/predictions';

interface NextMatchdayWidgetProps {
  selectedDiv: DivisionCode;
  myTeam: { team: string; div: DivisionCode } | null;
  onPredict: (home: string, away: string) => void;
}

export default function NextMatchdayWidget({
  selectedDiv,
  myTeam,
  onPredict,
}: NextMatchdayWidgetProps) {
  const { ds } = useActiveData();

  const remaining = useMemo(() => getRemainingFixtures(selectedDiv, ds), [selectedDiv, ds]);

  const nextFixtures = useMemo(() => {
    if (remaining.length === 0) return [];
    const sorted = [...remaining].sort((a, b) => parseDate(a.date).localeCompare(parseDate(b.date)));
    const nextDate = sorted[0].date;
    return sorted.filter(f => f.date === nextDate);
  }, [remaining]);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4">
      <h3 className="text-sm font-semibold text-info mb-3 flex items-center gap-1.5">
        <Calendar size={16} />
        Next Matchday
        {nextFixtures.length > 0 && <span className="text-gray-500 font-normal text-xs ml-1">{nextFixtures[0].date}</span>}
      </h3>
      {nextFixtures.length === 0 ? (
        <p className="text-xs text-gray-500">All fixtures completed</p>
      ) : (
        <div className="space-y-1.5">
          {nextFixtures.map(f => {
            const isMyFixture = myTeam && (f.home === myTeam.team || f.away === myTeam.team) && myTeam.div === selectedDiv;
            return (
              <div
                key={f.home + f.away}
                className={clsx(
                  'flex items-center text-sm p-2 rounded-lg',
                  isMyFixture ? 'bg-accent-muted/20 border border-accent/30' : 'bg-surface/50'
                )}
              >
                <span className="flex-1 text-right text-gray-300 truncate">{f.home}</span>
                <span className="mx-2 text-gray-600 text-xs">vs</span>
                <span className="flex-1 text-gray-300 truncate">{f.away}</span>
                <button
                  onClick={() => onPredict(f.home, f.away)}
                  className="ml-2 text-baize hover:text-baize-light transition text-xs shrink-0"
                  aria-label={`Predict ${f.home} vs ${f.away}`}
                  title="Predict match"
                >
                  <Target size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
