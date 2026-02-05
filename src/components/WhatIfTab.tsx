'use client';

import type { DivisionCode, WhatIfResult, SquadOverrides } from '@/lib/types';
import { DIVISIONS, PLAYERS, PLAYERS_2526 } from '@/lib/data';
import {
  getRemainingFixtures,
  getTeamPlayers,
  getAllLeaguePlayers,
  calcSquadStrength,
  calcModifiedSquadStrength,
  calcStrengthAdjustments,
} from '@/lib/predictions';
import WhatIfRow from './WhatIfRow';

interface WhatIfTabProps {
  selectedDiv: DivisionCode;
  whatIfResults: WhatIfResult[];
  squadOverrides: SquadOverrides;
  squadBuilderTeam: string;
  squadPlayerSearch: string;
  squadTopN: number;
  onAddWhatIf: (home: string, away: string, homeScore: number, awayScore: number) => void;
  onRemoveWhatIf: (home: string, away: string) => void;
  onSquadBuilderTeamChange: (team: string) => void;
  onSquadPlayerSearchChange: (search: string) => void;
  onSquadTopNChange: (n: number) => void;
  onAddSquadPlayer: (team: string, playerName: string) => void;
  onRemoveSquadPlayer: (team: string, playerName: string) => void;
  onRestoreSquadPlayer: (team: string, playerName: string) => void;
  onUnaddSquadPlayer: (team: string, playerName: string) => void;
  onClearAll: () => void;
  onSimulate: () => void;
}

export default function WhatIfTab({
  selectedDiv,
  whatIfResults,
  squadOverrides,
  squadBuilderTeam,
  squadPlayerSearch,
  squadTopN,
  onAddWhatIf,
  onRemoveWhatIf,
  onSquadBuilderTeamChange,
  onSquadPlayerSearchChange,
  onSquadTopNChange,
  onAddSquadPlayer,
  onRemoveSquadPlayer,
  onRestoreSquadPlayer,
  onUnaddSquadPlayer,
  onClearAll,
  onSimulate,
}: WhatIfTabProps) {
  const teams = DIVISIONS[selectedDiv].teams;
  const divFixtures = getRemainingFixtures(selectedDiv);

  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <h2 className="text-xl font-bold mb-2">
        What If - {DIVISIONS[selectedDiv].name}
      </h2>
      <p className="text-gray-400 text-sm mb-4">
        Set specific match results or modify team squads, then run a simulation
        to see how they affect the final standings.
      </p>

      {/* SQUAD BUILDER SECTION */}
      <div className="mb-6 border border-gray-700 rounded-lg p-4">
        <h3 className="font-bold text-sm mb-3 text-purple-400">
          Squad Builder
        </h3>
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Select team to modify
          </label>
          <select
            value={squadBuilderTeam}
            onChange={e => {
              onSquadBuilderTeamChange(e.target.value);
              onSquadPlayerSearchChange('');
            }}
            className="w-full bg-gray-700 rounded-lg p-3 text-sm"
          >
            <option value="">Choose a team...</option>
            {teams.map(t => (
              <option key={t} value={t}>
                {t}
                {squadOverrides[t] ? ' (modified)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">Lineup size:</span>
          {[5, 6, 7, 8, 9, 10].map(n => (
            <button
              key={n}
              onClick={() => onSquadTopNChange(n)}
              className={
                'px-3 py-1 rounded text-xs font-medium transition ' +
                (squadTopN === n
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300')
              }
            >
              {n}
            </button>
          ))}
          <span className="text-xs text-gray-500 ml-1">best players used</span>
        </div>

        {squadBuilderTeam &&
          (() => {
            const basePlayers = getTeamPlayers(squadBuilderTeam);
            const override = squadOverrides[squadBuilderTeam] || {
              added: [],
              removed: [],
            };
            const removedSet = new Set(override.removed);

            return (
              <div className="mt-3">
                <h4 className="text-xs font-medium text-gray-400 mb-2">
                  {squadBuilderTeam} - Squad
                </h4>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {basePlayers.map(pl => (
                    <div
                      key={pl.name}
                      className={
                        'flex items-center justify-between text-xs rounded p-2 ' +
                        (removedSet.has(pl.name)
                          ? 'bg-red-900/30 line-through text-gray-500'
                          : 'bg-gray-700/50')
                      }
                    >
                      <span
                        className={
                          removedSet.has(pl.name)
                            ? 'text-gray-500'
                            : 'text-blue-300'
                        }
                      >
                        {pl.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">
                          {pl.s2526
                            ? pl.s2526.pct.toFixed(0) +
                              '% (' +
                              pl.s2526.p +
                              'g)'
                            : ''}
                          {pl.rating !== null
                            ? (pl.s2526 ? ' | ' : '') +
                              (pl.rating > 0 ? '+' : '') +
                              pl.rating.toFixed(2)
                            : ''}
                        </span>
                        {removedSet.has(pl.name) ? (
                          <button
                            onClick={() =>
                              onRestoreSquadPlayer(squadBuilderTeam, pl.name)
                            }
                            className="text-green-400 hover:text-green-300 text-xs font-medium"
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              onRemoveSquadPlayer(squadBuilderTeam, pl.name)
                            }
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(override.added || []).map(name => {
                    const s2526 = PLAYERS_2526[name];
                    const s2425 = PLAYERS[name];
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between text-xs bg-green-900/30 rounded p-2 border border-green-600/30"
                      >
                        <span className="text-green-300">+ {name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">
                            {s2526
                              ? s2526.total.pct.toFixed(0) +
                                '% (' +
                                s2526.total.p +
                                'g)'
                              : ''}
                            {s2425
                              ? (s2526 ? ' | ' : '') +
                                (s2425.r > 0 ? '+' : '') +
                                s2425.r.toFixed(2)
                              : ''}
                          </span>
                          <button
                            onClick={() =>
                              onUnaddSquadPlayer(squadBuilderTeam, name)
                            }
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Undo
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Player search */}
                <div className="mt-3 relative">
                  <input
                    type="text"
                    placeholder="Search players to add..."
                    value={squadPlayerSearch}
                    onChange={e => onSquadPlayerSearchChange(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg p-2 text-sm"
                  />
                  {squadPlayerSearch.length >= 2 &&
                    (() => {
                      const currentNames = new Set([
                        ...basePlayers
                          .filter(p => !removedSet.has(p.name))
                          .map(p => p.name),
                        ...override.added,
                      ]);
                      const results = getAllLeaguePlayers()
                        .filter(p =>
                          p.name
                            .toLowerCase()
                            .includes(squadPlayerSearch.toLowerCase())
                        )
                        .filter(p => !currentNames.has(p.name))
                        .slice(0, 8);
                      return results.length > 0 ? (
                        <div className="mt-1 bg-gray-700 rounded-lg overflow-hidden border border-gray-600 absolute w-full z-10">
                          {results.map(p => (
                            <div
                              key={p.name}
                              onClick={() => {
                                onAddSquadPlayer(squadBuilderTeam, p.name);
                                onSquadPlayerSearchChange('');
                              }}
                              className="flex items-center justify-between p-2 text-xs cursor-pointer hover:bg-gray-600 border-b border-gray-600/50 last:border-0"
                            >
                              <span className="text-blue-300">{p.name}</span>
                              <span className="text-gray-400 text-right">
                                {p.teams2526.length > 0
                                  ? p.teams2526.slice(0, 2).join(', ')
                                  : ''}
                                {p.totalPct2526 !== null
                                  ? ' ' + p.totalPct2526.toFixed(0) + '%'
                                  : ''}
                                {p.rating !== null
                                  ? ' | ' +
                                    (p.rating > 0 ? '+' : '') +
                                    p.rating.toFixed(2)
                                  : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 bg-gray-700 rounded-lg p-2 text-xs text-gray-500 absolute w-full z-10">
                          No matching players
                        </div>
                      );
                    })()}
                </div>

                {/* Strength impact panel */}
                {squadOverrides[squadBuilderTeam] &&
                  (() => {
                    const origStr = calcSquadStrength(
                      squadBuilderTeam,
                      squadTopN
                    );
                    const modStr = calcModifiedSquadStrength(
                      squadBuilderTeam,
                      squadOverrides,
                      squadTopN
                    );
                    const adj = calcStrengthAdjustments(
                      selectedDiv,
                      squadOverrides,
                      squadTopN
                    );
                    const delta = adj[squadBuilderTeam] || 0;
                    return (
                      origStr !== null &&
                      modStr !== null && (
                        <div className="mt-3 bg-gray-700 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-gray-400 mb-2">
                            Squad Strength Impact
                          </h4>
                          <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div>
                              <div className="text-gray-400">
                                {(origStr * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500">
                                Best {squadTopN} Avg
                              </div>
                            </div>
                            <div>
                              <div className="text-white font-bold">
                                {(modStr * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500">
                                Modified Best {squadTopN}
                              </div>
                            </div>
                            <div>
                              <div
                                className={
                                  'font-bold ' +
                                  (delta > 0
                                    ? 'text-green-400'
                                    : delta < 0
                                      ? 'text-red-400'
                                      : 'text-gray-400')
                                }
                              >
                                {delta > 0 ? '+' : ''}
                                {delta.toFixed(3)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Sim Adjust
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    );
                  })()}
              </div>
            );
          })()}

        {/* Active modifications summary */}
        {Object.keys(squadOverrides).length > 0 && (
          <div className="mt-3 p-3 bg-purple-900/30 border border-purple-600/30 rounded-lg text-sm">
            <span className="text-purple-400 font-medium">
              Squad changes:{' '}
            </span>
            {Object.entries(squadOverrides).map(([team, ov], i) => (
              <span key={team} className="text-gray-300">
                {team} (
                {(ov.added || []).length > 0
                  ? '+' + ov.added.length
                  : ''}
                {(ov.removed || []).length > 0
                  ? ' -' + ov.removed.length
                  : ''}
                )
                {i < Object.keys(squadOverrides).length - 1 ? ', ' : ''}
              </span>
            ))}
            <button
              onClick={onClearAll}
              className="text-red-400 hover:text-red-300 text-xs ml-2"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Locked results */}
      {whatIfResults.length > 0 && (
        <div className="mb-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-300">
            Locked results:
          </h3>
          {whatIfResults.map((wi, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-gray-700 rounded-lg p-3 text-sm"
            >
              <span>
                {wi.home}{' '}
                <span className="font-bold text-green-400">
                  {wi.homeScore}
                </span>{' '}
                -{' '}
                <span className="font-bold text-red-400">{wi.awayScore}</span>{' '}
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
      )}

      {/* Upcoming fixtures */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">
          Upcoming fixtures (click to set result):
        </h3>
        {divFixtures
          .filter(
            f =>
              !whatIfResults.some(
                wi => wi.home === f.home && wi.away === f.away
              )
          )
          .slice(0, 20)
          .map(f => (
            <WhatIfRow
              key={f.home + f.away}
              fixture={f}
              onAdd={onAddWhatIf}
            />
          ))}
      </div>

      {/* Action buttons */}
      {(whatIfResults.length > 0 ||
        Object.keys(squadOverrides).length > 0) && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onSimulate}
            className="flex-1 bg-green-600 hover:bg-green-700 font-bold py-3 px-6 rounded-lg transition"
          >
            Simulate with What-If Changes
          </button>
          <button
            onClick={onClearAll}
            className="bg-red-600 hover:bg-red-700 py-3 px-4 rounded-lg text-sm transition"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
