'use client';

import { useState, useCallback } from 'react';
import type { DivisionCode, WhatIfResult, FixtureImportance } from '@/lib/types';
import { DIVISIONS } from '@/lib/data';
import { getRemainingFixtures, calcFixtureImportance } from '@/lib/predictions';
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
  const [importanceTeam, setImportanceTeam] = useState('');
  const [fixtureImportance, setFixtureImportance] = useState<FixtureImportance[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const fixtures = getRemainingFixtures(selectedDiv);
  const teams = DIVISIONS[selectedDiv].teams;
  const lockedKeys = new Set(whatIfResults.map(wi => wi.home + ':' + wi.away));
  const unlockedFixtures = fixtures.filter(f => !lockedKeys.has(f.home + ':' + f.away));
  const displayedFixtures = showAllFixtures ? unlockedFixtures : unlockedFixtures.slice(0, 10);

  // Build importance lookup
  const importanceLookup = new Map<string, FixtureImportance>();
  if (fixtureImportance) {
    for (const fi of fixtureImportance) {
      importanceLookup.set(fi.home + ':' + fi.away, fi);
    }
  }

  const runImportanceCalc = useCallback(() => {
    if (!importanceTeam) return;
    setIsCalculating(true);
    setFixtureImportance(null);
    setTimeout(() => {
      const result = calcFixtureImportance(selectedDiv, importanceTeam, {}, 5, whatIfResults);
      setFixtureImportance(result);
      setIsCalculating(false);
    }, 50);
  }, [selectedDiv, importanceTeam, whatIfResults]);

  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <h2 className="text-xl font-bold mb-4">
        Upcoming Fixtures - {DIVISIONS[selectedDiv].name}{' '}
        <span className="text-gray-400 text-sm font-normal">({fixtures.length} remaining)</span>
      </h2>

      {/* Must-Win Calculator */}
      <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
        <h3 className="text-sm font-semibold text-amber-400 mb-2">Must-Win Fixture Analysis</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={importanceTeam}
            onChange={(e) => {
              setImportanceTeam(e.target.value);
              setFixtureImportance(null);
            }}
            className="bg-gray-700 rounded-lg p-2 text-xs flex-1 min-w-[150px]"
          >
            <option value="">Select team...</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={runImportanceCalc}
            disabled={!importanceTeam || isCalculating}
            className={
              'px-4 py-2 rounded-lg text-xs font-medium transition ' +
              (!importanceTeam || isCalculating
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 text-white')
            }
          >
            {isCalculating ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
        {fixtureImportance && fixtureImportance.length > 0 && (
          <div className="mt-3 space-y-1">
            {fixtureImportance.map((fi) => {
              const opponent = fi.home === importanceTeam ? fi.away : fi.home;
              const venue = fi.home === importanceTeam ? '(H)' : '(A)';
              return (
                <div key={fi.home + ':' + fi.away} className="flex items-center text-xs gap-2">
                  <span className="text-gray-400 w-20 shrink-0">{fi.date}</span>
                  <span
                    className={
                      'w-16 font-bold text-center rounded px-1 ' +
                      (fi.importance >= 20
                        ? 'bg-red-900/50 text-red-400'
                        : fi.importance >= 10
                          ? 'bg-amber-900/50 text-amber-400'
                          : 'bg-gray-600/50 text-gray-400')
                    }
                  >
                    {fi.importance.toFixed(0)}pp
                  </span>
                  <span className="text-gray-500">{venue}</span>
                  <span
                    className="text-gray-300 cursor-pointer hover:text-blue-300"
                    onClick={() => onTeamClick(opponent)}
                  >
                    vs {opponent}
                  </span>
                  <span className="text-gray-600 text-[10px] ml-auto">
                    Win: {fi.pTop2IfWin.toFixed(0)}% | Loss: {fi.pTop2IfLoss.toFixed(0)}%
                  </span>
                </div>
              );
            })}
            <div className="text-[10px] text-gray-500 mt-1">
              Importance = swing in Top 2 probability between winning and losing this fixture
            </div>
          </div>
        )}
        {fixtureImportance && fixtureImportance.length === 0 && (
          <p className="text-xs text-gray-500 mt-2">No remaining fixtures found for this team.</p>
        )}
      </div>

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
        {displayedFixtures.map(fixture => {
          const fi = importanceLookup.get(fixture.home + ':' + fixture.away);
          return (
            <div key={fixture.home + ':' + fixture.away} className="relative">
              {fi && (
                <span
                  className={
                    'absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full ' +
                    (fi.importance >= 20
                      ? 'bg-red-500'
                      : fi.importance >= 10
                        ? 'bg-amber-500'
                        : 'bg-gray-600')
                  }
                  title={`Importance: ${fi.importance.toFixed(0)}pp swing`}
                />
              )}
              <WhatIfRow
                fixture={fixture}
                onAdd={onAddWhatIf}
                onPredict={onPredict}
                onTeamClick={onTeamClick}
              />
            </div>
          );
        })}
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
