'use client';

import type { DivisionCode, MatchResult } from '@/lib/types';
import { DIVISIONS, RESULTS } from '@/lib/data';
import { getDiv, parseDate } from '@/lib/predictions';

interface ResultsTabProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
}

export default function ResultsTab({ selectedDiv, onTeamClick }: ResultsTabProps) {
  const divResults = RESULTS.filter(r => getDiv(r.home) === selectedDiv)
    .sort((a, b) => parseDate(b.date).localeCompare(parseDate(a.date)));

  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <h2 className="text-xl font-bold mb-4">{DIVISIONS[selectedDiv].name} - Match Results</h2>
      <div className="space-y-2">
        {divResults.map((r, i) => (
          <div key={i} className="flex items-center bg-gray-700 rounded-lg p-3 text-sm">
            <span className="text-gray-400 text-xs w-24 shrink-0">{r.date}</span>
            <span
              className={
                'flex-1 text-right cursor-pointer hover:text-blue-300 ' +
                (r.home_score > r.away_score ? 'font-bold text-green-400' : '')
              }
              onClick={() => onTeamClick(r.home)}
            >
              {r.home}
            </span>
            <span className="mx-3 font-bold text-center w-16">
              {r.home_score} - {r.away_score}
            </span>
            <span
              className={
                'flex-1 cursor-pointer hover:text-blue-300 ' +
                (r.away_score > r.home_score ? 'font-bold text-green-400' : '')
              }
              onClick={() => onTeamClick(r.away)}
            >
              {r.away}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
