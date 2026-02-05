'use client';

import { useState } from 'react';
import type { DivisionCode } from '@/lib/types';
import { DIVISIONS } from '@/lib/data';
import { getTeamPlayers } from '@/lib/predictions';

interface PlayersTabProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function PlayersTab({ selectedDiv, onTeamClick, onPlayerClick }: PlayersTabProps) {
  const [minGames, setMinGames] = useState(5);
  const teams = DIVISIONS[selectedDiv].teams;

  const divPlayers: Array<{
    name: string;
    rating: number | null;
    s2526: { p: number; w: number; pct: number } | null;
    team: string;
  }> = [];
  const seen = new Set<string>();
  teams.forEach(team => {
    const roster = getTeamPlayers(team);
    roster.forEach(pl => {
      if (pl.s2526 && !seen.has(pl.name + ':' + team)) {
        seen.add(pl.name + ':' + team);
        divPlayers.push({ ...pl, team });
      }
    });
  });
  divPlayers.sort((a, b) => (b.s2526 ? b.s2526.pct : -999) - (a.s2526 ? a.s2526.pct : -999));
  const filtered = divPlayers.filter(p => p.s2526 && p.s2526.p >= minGames);

  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <h2 className="text-xl font-bold mb-4">{DIVISIONS[selectedDiv].name} - Player Stats</h2>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm text-gray-400">Min games:</span>
        {[1, 3, 5, 10].map(n => (
          <button
            key={n}
            onClick={() => setMinGames(n)}
            className={
              'px-3 py-1 rounded text-xs font-medium transition ' +
              (minGames === n
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300')
            }
          >
            {n}+
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-2">{filtered.length} players</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs md:text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left p-2">#</th>
              <th className="text-left p-2">Player</th>
              <th className="text-left p-2">Team</th>
              <th className="text-center p-2">25/26 P</th>
              <th className="text-center p-2">25/26 W</th>
              <th className="text-center p-2">25/26 Win%</th>
              <th className="text-right p-2">24/25 Rtg</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr
                key={p.name + p.team}
                className="border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/50"
                onClick={() => onPlayerClick(p.name)}
              >
                <td className="p-2 text-gray-500">{i + 1}</td>
                <td className="p-2 font-medium text-blue-300">{p.name}</td>
                <td
                  className="p-2 text-gray-400 cursor-pointer hover:text-blue-300"
                  onClick={e => {
                    e.stopPropagation();
                    onTeamClick(p.team);
                  }}
                >
                  {p.team}
                </td>
                <td className="p-2 text-center">{p.s2526!.p}</td>
                <td className="p-2 text-center text-green-400">{p.s2526!.w}</td>
                <td className="p-2 text-center font-bold">{p.s2526!.pct.toFixed(1)}%</td>
                <td
                  className={
                    'p-2 text-right ' +
                    (p.rating !== null
                      ? p.rating > 0
                        ? 'text-green-400'
                        : p.rating < 0
                          ? 'text-red-400'
                          : 'text-gray-400'
                      : 'text-gray-600')
                  }
                >
                  {p.rating !== null
                    ? (p.rating > 0 ? '+' : '') + p.rating.toFixed(2)
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
