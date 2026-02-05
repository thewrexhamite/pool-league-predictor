'use client';

import type { DivisionCode, StandingEntry } from '@/lib/types';
import { DIVISIONS } from '@/lib/data';
import { getTeamResults, getTeamPlayers } from '@/lib/predictions';

interface TeamDetailProps {
  team: string;
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  onBack: () => void;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function TeamDetail({
  team,
  selectedDiv,
  standings,
  onBack,
  onTeamClick,
  onPlayerClick,
}: TeamDetailProps) {
  const teamResults = getTeamResults(team);
  const teamPlayers = getTeamPlayers(team);
  const teamStanding = standings.find(s => s.team === team);
  const teamPos = standings.findIndex(s => s.team === team) + 1;
  const form = teamResults.slice(0, 5).map(r => r.result);

  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-4 block">
        &larr; Back to standings
      </button>
      <h2 className="text-xl font-bold mb-1">{team}</h2>
      <p className="text-gray-400 text-sm mb-4">
        {DIVISIONS[selectedDiv].name} &bull; Position: #{teamPos}
      </p>

      {teamStanding && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{teamStanding.pts}</div>
            <div className="text-xs text-gray-400">Points</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">
              {teamStanding.w}-{teamStanding.d}-{teamStanding.l}
            </div>
            <div className="text-xs text-gray-400">W-D-L</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">
              {teamStanding.f}-{teamStanding.a}
            </div>
            <div className="text-xs text-gray-400">Frames F-A</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="flex justify-center gap-1">
              {form.map((r, i) => (
                <span
                  key={i}
                  className={
                    'inline-flex w-6 h-6 rounded text-xs font-bold items-center justify-center ' +
                    (r === 'W' ? 'bg-green-600' : r === 'L' ? 'bg-red-600' : 'bg-gray-500')
                  }
                >
                  {r}
                </span>
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-1">Form (last 5)</div>
          </div>
        </div>
      )}

      {teamPlayers.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-sm mb-2 text-gray-300">Squad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {teamPlayers.map(pl => (
              <div
                key={pl.name}
                onClick={() => onPlayerClick(pl.name)}
                className="flex justify-between text-xs bg-gray-700/50 rounded p-2 cursor-pointer hover:bg-gray-700"
              >
                <span className="text-blue-300 hover:text-blue-200">
                  {pl.name}
                  {pl.s2526 && pl.s2526.cup && (
                    <span className="ml-1 text-amber-400 text-[10px] font-medium">Cup</span>
                  )}
                </span>
                <span className="text-gray-400">
                  {pl.s2526 ? (
                    <span>
                      <span className="text-white font-medium">{pl.s2526.pct.toFixed(0)}%</span>
                      <span className="text-gray-500 ml-1">
                        ({pl.s2526.p}P {pl.s2526.w}W)
                      </span>
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
          </div>
        </div>
      )}

      <h3 className="font-bold text-sm mb-2 text-gray-300">Match History</h3>
      <div className="space-y-1">
        {teamResults.map((r, i) => (
          <div key={i} className="flex items-center text-xs bg-gray-700/50 rounded p-2">
            <span className="text-gray-400 w-20 shrink-0">{r.date}</span>
            <span
              className={
                'w-5 font-bold ' +
                (r.result === 'W'
                  ? 'text-green-400'
                  : r.result === 'L'
                    ? 'text-red-400'
                    : 'text-gray-400')
              }
            >
              {r.result}
            </span>
            <span className="text-gray-400 text-xs w-8">{r.isHome ? '(H)' : '(A)'}</span>
            <span className="font-bold w-12 text-center">
              {r.teamScore}-{r.oppScore}
            </span>
            <span
              className="text-gray-300 ml-2 cursor-pointer hover:text-blue-300"
              onClick={() => onTeamClick(r.opponent)}
            >
              vs {r.opponent}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
