'use client';

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getRemainingFixtures } from '@/lib/predictions';
import { calcPowerRankings } from '@/lib/stats';
import { parseDate } from '@/lib/predictions/core';

interface MatchImportanceWidgetProps {
  selectedDiv: DivisionCode;
  onPredict: (home: string, away: string) => void;
}

export default function MatchImportanceWidget({ selectedDiv, onPredict }: MatchImportanceWidgetProps) {
  const { ds, frames } = useActiveData();

  // Use power rankings to approximate match importance
  // (avoids expensive Monte Carlo simulation in a widget)
  const biggestMatch = useMemo(() => {
    const remaining = getRemainingFixtures(selectedDiv, ds);
    if (remaining.length === 0) return null;

    const rankings = calcPowerRankings(selectedDiv, ds, frames);
    const rankMap = new Map(rankings.map(r => [r.team, r]));

    // Find the next matchday (earliest date)
    const dates = [...new Set(remaining.map(f => f.date))].sort(
      (a, b) => parseDate(a).localeCompare(parseDate(b))
    );
    const nextDate = dates[0];
    const nextFixtures = remaining.filter(f => f.date === nextDate);

    if (nextFixtures.length === 0) return null;

    // Score each fixture by combined rankings closeness and rank
    let best = nextFixtures[0];
    let bestScore = 0;

    for (const f of nextFixtures) {
      const homeRank = rankMap.get(f.home);
      const awayRank = rankMap.get(f.away);
      if (!homeRank || !awayRank) continue;

      // Higher importance = both teams high ranked + close in ranking
      const avgRank = (homeRank.rank + awayRank.rank) / 2;
      const closeness = 1 / (1 + Math.abs(homeRank.rank - awayRank.rank));
      const rankBoost = 1 / avgRank; // higher ranked teams = more important
      const score = closeness * 0.5 + rankBoost * 0.5;

      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }

    const homeRank = rankMap.get(best.home);
    const awayRank = rankMap.get(best.away);

    return {
      fixture: best,
      homeRank: homeRank?.rank ?? null,
      awayRank: awayRank?.rank ?? null,
      date: best.date,
    };
  }, [selectedDiv, ds, frames]);

  if (!biggestMatch) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">No upcoming fixtures</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <AlertTriangle size={14} className="text-warning" />
        <span className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Match of the Week</span>
      </div>
      <button
        onClick={() => onPredict(biggestMatch.fixture.home, biggestMatch.fixture.away)}
        className="w-full p-3 rounded-lg bg-surface-elevated/50 hover:bg-surface-elevated transition text-left"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-white">{biggestMatch.fixture.home}</span>
          <span className="text-[10px] text-gray-500">vs</span>
          <span className="text-sm font-medium text-white">{biggestMatch.fixture.away}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500">
            {biggestMatch.homeRank ? `#${biggestMatch.homeRank}` : ''}
          </span>
          <span className="text-[10px] text-gray-500">{biggestMatch.date}</span>
          <span className="text-[10px] text-gray-500">
            {biggestMatch.awayRank ? `#${biggestMatch.awayRank}` : ''}
          </span>
        </div>
      </button>
    </div>
  );
}
