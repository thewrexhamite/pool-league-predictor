'use client';

import type { DivisionCode, SimulationResult, WhatIfResult, SquadOverrides } from '@/lib/types';
import { DIVISIONS } from '@/lib/data';
import { calcStrengthAdjustments } from '@/lib/predictions';

interface SimulateTabProps {
  selectedDiv: DivisionCode;
  simResults: SimulationResult[] | null;
  isSimulating: boolean;
  whatIfResults: WhatIfResult[];
  whatIfSimResults: WhatIfResult[] | null;
  squadOverrides: SquadOverrides;
  squadTopN: number;
  onRunSimulation: () => void;
  onTeamClick: (team: string) => void;
}

export default function SimulateTab({
  selectedDiv,
  simResults,
  isSimulating,
  whatIfResults,
  whatIfSimResults,
  squadOverrides,
  squadTopN,
  onRunSimulation,
  onTeamClick,
}: SimulateTabProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <h2 className="text-xl font-bold mb-4">
        Season Simulation - {DIVISIONS[selectedDiv].name}
      </h2>
      <p className="text-gray-400 mb-4 text-sm">
        1,000 Monte Carlo simulations based on current form
        {whatIfResults.length > 0
          ? ' (with ' +
            whatIfResults.length +
            ' locked result' +
            (whatIfResults.length > 1 ? 's' : '') +
            ')'
          : ''}
        {Object.keys(squadOverrides).length > 0
          ? ' (with ' +
            Object.keys(squadOverrides).length +
            ' squad change' +
            (Object.keys(squadOverrides).length > 1 ? 's' : '') +
            ')'
          : ''}
      </p>

      <button
        onClick={onRunSimulation}
        disabled={isSimulating}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 font-bold py-3 px-6 rounded-lg mb-6 transition"
      >
        {isSimulating ? 'Simulating...' : 'Run Season Simulation'}
      </button>

      {simResults && (
        <div className="overflow-x-auto">
          {whatIfSimResults && whatIfSimResults.length > 0 && (
            <div className="mb-4 p-3 bg-amber-900/30 border border-amber-600/30 rounded-lg text-sm">
              <span className="text-amber-400 font-medium">What-If applied: </span>
              {whatIfSimResults.map((wi, i) => (
                <span key={i} className="text-gray-300">
                  {wi.home} {wi.homeScore}-{wi.awayScore} {wi.away}
                  {i < whatIfSimResults.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}
          {Object.keys(squadOverrides).length > 0 && (
            <div className="mb-4 p-3 bg-purple-900/30 border border-purple-600/30 rounded-lg text-sm">
              <span className="text-purple-400 font-medium">Squad changes applied: </span>
              {Object.entries(squadOverrides).map(([team, ov], i) => {
                const adj = calcStrengthAdjustments(selectedDiv, squadOverrides, squadTopN);
                const d = adj[team];
                return (
                  <span key={team} className="text-gray-300">
                    {team} ({d !== undefined ? (d > 0 ? '+' : '') + d.toFixed(3) : 'n/a'})
                    {i < Object.keys(squadOverrides).length - 1 ? ', ' : ''}
                  </span>
                );
              })}
            </div>
          )}
          <table className="w-full text-xs md:text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Team</th>
                <th className="text-right p-2">Now</th>
                <th className="text-right p-2">Pred</th>
                <th className="text-right p-2">Title%</th>
                <th className="text-right p-2">Top2%</th>
                <th className="text-right p-2">Bot2%</th>
              </tr>
            </thead>
            <tbody>
              {simResults.map((r, i) => (
                <tr
                  key={r.team}
                  className={
                    'border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/50 ' +
                    (i < 2 ? 'bg-green-900/20 ' : '') +
                    (i >= simResults.length - 2 ? 'bg-red-900/20' : '')
                  }
                  onClick={() => onTeamClick(r.team)}
                >
                  <td className="p-2 text-gray-500">{i + 1}</td>
                  <td className="p-2 font-medium text-blue-300">{r.team}</td>
                  <td className="p-2 text-right">{r.currentPts}</td>
                  <td className="p-2 text-right font-bold">{r.avgPts}</td>
                  <td className="p-2 text-right text-yellow-400">{r.pTitle}%</td>
                  <td className="p-2 text-right text-green-400">{r.pTop2}%</td>
                  <td className="p-2 text-right text-red-400">{r.pBot2}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
