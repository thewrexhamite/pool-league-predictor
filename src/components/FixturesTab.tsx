'use client';

import { useState } from 'react';
import type { DivisionCode, WhatIfResult } from '@/lib/types';
import { DIVISIONS } from '@/lib/data';
import { getRemainingFixtures } from '@/lib/predictions';
import WhatIfRow from './WhatIfRow';

interface FixturesTabProps {
  selectedDiv: DivisionCode;
  whatIfResults: WhatIfResult[];
  onAddWhatIf: (home: string, away: string, homeScore: number, awayScore: number) => void;
  onRemoveWhatIf: (home: string, away: string) => void;
  onPredict: (home: string, away: string) => void;
  onTeamClick: (team: string) => void;
  onSimulate: () => void;
  onClearWhatIf: () => void;
}

export default function FixturesTab({
  selectedDiv,
  whatIfResults,
  onAddWhatIf,
  onRemoveWhatIf,
  onPredict,
  onTeamClick,
  onSimulate,
  onClearWhatIf,
}: FixturesTabProps) {
  const [showAllFixtures, setShowAllFixtures] = useState(false);

  const fixtures = getRemainingFixtures(selectedDiv);
  const lockedKeys = new Set(whatIfResults.map(wi => wi.home + ':' + wi.away));
  const unlockedFixtures = fixtures.filter(f => !lockedKeys.has(f.home + ':' + f.away));
  const displayedFixtures = showAllFixtures ? unlockedFixtures : unlockedFixtures.slice(0, 10);

  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <h2 className="text-xl font-bold mb-4">
        Upcoming Fixtures - {DIVISIONS[selectedDiv].name}{' '}
        <span className="text-gray-400 text-sm font-normal">({fixtures.length} remaining)</span>
      </h2>

      {whatIfResults.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">
            Locked Results ({whatIfResults.length})
          </h3>
          <div className="space-y-2">
            {whatIfResults.map(wi => (
              <div
                key={wi.home + ':' + wi.away}
                className="flex items-center justify-between bg-amber-900/30 border border-amber-600/30 rounded-lg p-3 text-sm"
              >
                <span className="text-gray-200">
                  {wi.home}{' '}
                  <span className="font-bold text-amber-300">
                    {wi.homeScore}-{wi.awayScore}
                  </span>{' '}
                  {wi.away}
                </span>
                <button
                  onClick={() => onRemoveWhatIf(wi.home, wi.away)}
                  className="text-red-400 hover:text-red-300 text-xs ml-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {displayedFixtures.map(fixture => (
          <WhatIfRow
            key={fixture.home + ':' + fixture.away}
            fixture={fixture}
            onAdd={onAddWhatIf}
            onPredict={onPredict}
            onTeamClick={onTeamClick}
          />
        ))}
      </div>

      {unlockedFixtures.length > 10 && (
        <button
          onClick={() => setShowAllFixtures(!showAllFixtures)}
          className="w-full mt-3 text-blue-400 hover:text-blue-300 text-sm py-2"
        >
          {showAllFixtures
            ? 'Show Less'
            : `Show All (${unlockedFixtures.length - 10} more)`}
        </button>
      )}

      {whatIfResults.length > 0 && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={onSimulate}
            className="flex-1 bg-green-600 hover:bg-green-700 font-bold py-3 px-6 rounded-lg transition"
          >
            Simulate with {whatIfResults.length} Locked Result{whatIfResults.length > 1 ? 's' : ''}
          </button>
          <button
            onClick={onClearWhatIf}
            className="bg-red-600 hover:bg-red-700 font-bold py-3 px-6 rounded-lg transition"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
