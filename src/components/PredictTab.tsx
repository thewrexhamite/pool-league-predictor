'use client';

import { useMemo } from 'react';
import type { DivisionCode, PredictionResult, SquadOverrides, H2HRecord } from '@/lib/types';
import { DIVISIONS, PLAYERS, PLAYERS_2526 } from '@/lib/data';
import { getTeamPlayers, getSquadH2H, calcSetPerformance } from '@/lib/predictions';
import { useLeagueData } from '@/lib/data-provider';
import { AIInsightsPanel } from './AIInsightsPanel';

interface PredictTabProps {
  selectedDiv: DivisionCode;
  homeTeam: string;
  awayTeam: string;
  prediction: PredictionResult | null;
  squadOverrides: SquadOverrides;
  onHomeTeamChange: (team: string) => void;
  onAwayTeamChange: (team: string) => void;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function PredictTab({
  selectedDiv,
  homeTeam,
  awayTeam,
  prediction,
  squadOverrides,
  onHomeTeamChange,
  onAwayTeamChange,
  onTeamClick,
  onPlayerClick,
}: PredictTabProps) {
  const teams = DIVISIONS[selectedDiv].teams;
  const { data: leagueData } = useLeagueData();

  const h2hRecords = useMemo(() => {
    if (!homeTeam || !awayTeam || leagueData.frames.length === 0) return [];
    return getSquadH2H(homeTeam, awayTeam, leagueData.frames, leagueData.rosters);
  }, [homeTeam, awayTeam, leagueData.frames, leagueData.rosters]);

  const homeSetPerf = useMemo(
    () => homeTeam && leagueData.frames.length > 0 ? calcSetPerformance(homeTeam, leagueData.frames) : null,
    [homeTeam, leagueData.frames]
  );
  const awaySetPerf = useMemo(
    () => awayTeam && leagueData.frames.length > 0 ? calcSetPerformance(awayTeam, leagueData.frames) : null,
    [awayTeam, leagueData.frames]
  );

  // Build H2H lookup for the matrix
  const h2hMap = useMemo(() => {
    const map = new Map<string, H2HRecord>();
    for (const r of h2hRecords) {
      map.set(r.playerA + '|' + r.playerB, r);
    }
    return map;
  }, [h2hRecords]);

  // Get unique players from H2H data for matrix axes
  const { homePlayers, awayPlayers } = useMemo(() => {
    const hp = new Set<string>();
    const ap = new Set<string>();
    for (const r of h2hRecords) {
      hp.add(r.playerA);
      ap.add(r.playerB);
    }
    return { homePlayers: [...hp], awayPlayers: [...ap] };
  }, [h2hRecords]);

  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <h2 className="text-xl font-bold mb-4">Match Prediction</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Home Team</label>
          <select
            value={homeTeam}
            onChange={(e) => onHomeTeamChange(e.target.value)}
            className="w-full bg-gray-700 rounded-lg p-3 text-sm"
          >
            <option value="">Select home team...</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Away Team</label>
          <select
            value={awayTeam}
            onChange={(e) => onAwayTeamChange(e.target.value)}
            className="w-full bg-gray-700 rounded-lg p-3 text-sm"
          >
            <option value="">Select away team...</option>
            {teams
              .filter((t) => t !== homeTeam)
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>
        </div>
      </div>

      {prediction && (
        <div className="space-y-4">
          {/* Baseline comparison banner */}
          {prediction.baseline && (
            <div className="p-3 bg-purple-900/30 border border-purple-600/30 rounded-lg text-sm">
              <span className="text-purple-400 font-medium">Squad changes active — </span>
              <span className="text-gray-300">Original: </span>
              <span className="text-green-400">{prediction.baseline.pHomeWin}%W</span>
              <span className="text-gray-500"> / </span>
              <span className="text-gray-300">{prediction.baseline.pDraw}%D</span>
              <span className="text-gray-500"> / </span>
              <span className="text-red-400">{prediction.baseline.pAwayWin}%L</span>
              <span className="text-gray-500 mx-2">&rarr;</span>
              <span className="text-gray-300">Modified: </span>
              <span className="text-green-400">{prediction.pHomeWin}%W</span>
              <span className="text-gray-500"> / </span>
              <span className="text-gray-300">{prediction.pDraw}%D</span>
              <span className="text-gray-500"> / </span>
              <span className="text-red-400">{prediction.pAwayWin}%L</span>
            </div>
          )}

          {/* Win/Draw/Loss probability grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-green-900/50 rounded-lg p-4">
              <div className="text-2xl md:text-3xl font-bold text-green-400">
                {prediction.pHomeWin}%
              </div>
              <div className="text-xs text-gray-400">Home Win (+2pts)</div>
              {prediction.baseline && (
                <div className="text-xs text-gray-500 mt-1">
                  was {prediction.baseline.pHomeWin}%
                </div>
              )}
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-2xl md:text-3xl font-bold text-gray-300">
                {prediction.pDraw}%
              </div>
              <div className="text-xs text-gray-400">Draw (+1pt)</div>
              {prediction.baseline && (
                <div className="text-xs text-gray-500 mt-1">
                  was {prediction.baseline.pDraw}%
                </div>
              )}
            </div>
            <div className="bg-red-900/50 rounded-lg p-4">
              <div className="text-2xl md:text-3xl font-bold text-red-400">
                {prediction.pAwayWin}%
              </div>
              <div className="text-xs text-gray-400">Away Win (+3pts)</div>
              {prediction.baseline && (
                <div className="text-xs text-gray-500 mt-1">
                  was {prediction.baseline.pAwayWin}%
                </div>
              )}
            </div>
          </div>

          {/* Expected score */}
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <span className="text-2xl font-bold">
              {prediction.expectedHome} - {prediction.expectedAway}
            </span>
            <span className="text-gray-400 ml-2">Expected</span>
            {prediction.baseline && (
              <span className="text-gray-500 text-sm ml-2">
                (was {prediction.baseline.expectedHome} - {prediction.baseline.expectedAway})
              </span>
            )}
            <div className="text-sm text-gray-400 mt-2">
              Most likely:{' '}
              {prediction.topScores
                .map((s) => s.score + ' (' + s.pct + '%)')
                .join(', ')}
            </div>
          </div>

          {/* Set Performance Comparison */}
          {homeSetPerf && awaySetPerf && homeTeam && awayTeam && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-bold text-sm text-gray-300 mb-3">Set Performance Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-600">
                      <th className="text-left p-2">Team</th>
                      <th className="text-center p-2">Set 1</th>
                      <th className="text-center p-2">Set 2</th>
                      <th className="text-center p-2">Bias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { team: homeTeam, perf: homeSetPerf, color: 'text-green-400' },
                      { team: awayTeam, perf: awaySetPerf, color: 'text-red-400' },
                    ].map((side) => (
                      <tr key={side.team} className="border-b border-gray-600/50">
                        <td className={'p-2 font-medium ' + side.color}>{side.team}</td>
                        <td className="p-2 text-center">
                          {side.perf.set1.pct.toFixed(0)}%
                          <span className="text-gray-500 ml-1">({side.perf.set1.won}/{side.perf.set1.played})</span>
                        </td>
                        <td className="p-2 text-center">
                          {side.perf.set2.pct.toFixed(0)}%
                          <span className="text-gray-500 ml-1">({side.perf.set2.won}/{side.perf.set2.played})</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className={
                            Math.abs(side.perf.bias) < 3
                              ? 'text-gray-500'
                              : side.perf.bias > 0
                                ? 'text-blue-400'
                                : 'text-purple-400'
                          }>
                            {Math.abs(side.perf.bias) < 3
                              ? 'Even'
                              : side.perf.bias > 0
                                ? 'Early +' + side.perf.bias.toFixed(0) + 'pp'
                                : 'Late +' + Math.abs(side.perf.bias).toFixed(0) + 'pp'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* H2H Matrix */}
          {h2hRecords.length > 0 && homeTeam && awayTeam && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="font-bold text-sm text-gray-300 mb-3">Head-to-Head Record</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-600">
                      <th className="text-left p-1.5 text-green-400 font-medium">{homeTeam}</th>
                      {awayPlayers.map((ap) => (
                        <th
                          key={ap}
                          className="text-center p-1.5 cursor-pointer hover:text-blue-300 text-red-400 font-medium"
                          onClick={() => onPlayerClick(ap)}
                        >
                          {ap.split(' ').pop()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {homePlayers.map((hp) => (
                      <tr key={hp} className="border-b border-gray-600/50">
                        <td
                          className="p-1.5 text-blue-300 cursor-pointer hover:text-blue-200 font-medium whitespace-nowrap"
                          onClick={() => onPlayerClick(hp)}
                        >
                          {hp}
                        </td>
                        {awayPlayers.map((ap) => {
                          const record = h2hMap.get(hp + '|' + ap);
                          if (!record) return <td key={ap} className="p-1.5 text-center text-gray-600">-</td>;
                          const total = record.wins + record.losses;
                          const favorable = record.wins > record.losses;
                          const unfavorable = record.wins < record.losses;
                          return (
                            <td
                              key={ap}
                              className={
                                'p-1.5 text-center font-bold ' +
                                (favorable
                                  ? 'text-green-400 bg-green-900/20'
                                  : unfavorable
                                    ? 'text-red-400 bg-red-900/20'
                                    : 'text-gray-400')
                              }
                              title={`${hp} vs ${ap}: ${record.wins}W-${record.losses}L`}
                            >
                              {record.wins}-{record.losses}
                              {total >= 3 && (
                                <div className="text-[9px] font-normal text-gray-500">
                                  {((record.wins / total) * 100).toFixed(0)}%
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] text-gray-500 mt-2">
                Record shown from {homeTeam} player perspective (W-L). Green = favourable, Red = unfavourable.
              </div>
            </div>
          )}

          {/* Player squads under prediction - reflects squad overrides */}
          {(homeTeam || awayTeam) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                { team: homeTeam, color: 'green' },
                { team: awayTeam, color: 'red' },
              ].map((side) => {
                if (!side.team) return null;
                const basePlayers = getTeamPlayers(side.team);
                const override = squadOverrides[side.team];
                const removedSet = override
                  ? new Set(override.removed || [])
                  : new Set<string>();
                const addedNames = override ? override.added || [] : [];

                return (
                  <div key={side.team} className="bg-gray-700/50 rounded-lg p-4">
                    <h4
                      className={
                        'font-bold mb-2 text-sm text-' + side.color + '-400'
                      }
                    >
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => onTeamClick(side.team)}
                      >
                        {side.team}
                      </span>{' '}
                      - Squad
                      {override && (
                        <span className="text-purple-400 text-xs ml-2">
                          (modified)
                        </span>
                      )}
                    </h4>
                    <div className="space-y-1">
                      {basePlayers.map((pl) => (
                        <div
                          key={pl.name}
                          onClick={() => onPlayerClick(pl.name)}
                          className={
                            'flex justify-between text-xs cursor-pointer hover:bg-gray-700 rounded p-1' +
                            (removedSet.has(pl.name)
                              ? ' line-through opacity-40'
                              : '')
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
                          <span className="text-gray-400">
                            {pl.s2526 ? (
                              <span className="text-white font-medium">
                                {pl.s2526.pct.toFixed(0)}% ({pl.s2526.p}g)
                              </span>
                            ) : null}
                            {pl.s2526 && pl.rating !== null ? (
                              <span className="text-gray-600 mx-1">|</span>
                            ) : null}
                            {pl.rating !== null ? (
                              <span
                                className={
                                  pl.rating > 0
                                    ? 'text-green-400'
                                    : pl.rating < 0
                                      ? 'text-red-400'
                                      : 'text-gray-400'
                                }
                              >
                                {pl.rating > 0 ? '+' : ''}
                                {pl.rating.toFixed(2)}
                              </span>
                            ) : !pl.s2526 ? (
                              'No data'
                            ) : null}
                          </span>
                        </div>
                      ))}
                      {addedNames.map((name) => {
                        const s2526 = PLAYERS_2526[name];
                        const s2425 = PLAYERS[name];
                        return (
                          <div
                            key={name}
                            onClick={() => onPlayerClick(name)}
                            className="flex justify-between text-xs cursor-pointer hover:bg-gray-700 rounded p-1 border-l-2 border-green-500 pl-2"
                          >
                            <span className="text-green-300">+ {name}</span>
                            <span className="text-gray-400">
                              {s2526 ? (
                                <span className="text-white font-medium">
                                  {s2526.total.pct.toFixed(0)}% ({s2526.total.p}g)
                                </span>
                              ) : null}
                              {s2526 && s2425 ? (
                                <span className="text-gray-600 mx-1">|</span>
                              ) : null}
                              {s2425 ? (
                                <span
                                  className={
                                    s2425.r > 0
                                      ? 'text-green-400'
                                      : s2425.r < 0
                                        ? 'text-red-400'
                                        : 'text-gray-400'
                                  }
                                >
                                  {s2425.r > 0 ? '+' : ''}
                                  {s2425.r.toFixed(2)}
                                </span>
                              ) : !s2526 ? (
                                'No data'
                              ) : null}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {basePlayers.length === 0 && addedNames.length === 0 && (
                      <p className="text-xs text-gray-500">No roster data</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {homeTeam && awayTeam && (
        <AIInsightsPanel
          type="match"
          homeTeam={homeTeam}
          awayTeam={awayTeam}
        />
      )}
    </div>
  );
}
