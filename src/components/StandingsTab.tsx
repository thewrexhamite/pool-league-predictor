'use client';

import type { DivisionCode, StandingEntry } from '@/lib/types';
import { DIVISIONS } from '@/lib/data';

interface StandingsTabProps {
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  onTeamClick: (team: string) => void;
}

export default function StandingsTab({ selectedDiv, standings, onTeamClick }: StandingsTabProps) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6 overflow-x-auto">
      <h2 className="text-xl font-bold mb-4">{DIVISIONS[selectedDiv].name} - Current Standings</h2>
      <table className="w-full text-xs md:text-sm">
        <thead>
          <tr className="text-gray-400 border-b border-gray-700">
            <th className="text-left p-2">#</th>
            <th className="text-left p-2">Team</th>
            <th className="text-center p-2">P</th>
            <th className="text-center p-2">W</th>
            <th className="text-center p-2 hidden md:table-cell">D</th>
            <th className="text-center p-2 hidden md:table-cell">L</th>
            <th className="text-center p-2 hidden md:table-cell">F</th>
            <th className="text-center p-2 hidden md:table-cell">A</th>
            <th className="text-center p-2">+/-</th>
            <th className="text-center p-2 font-bold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.team}
              onClick={() => onTeamClick(s.team)}
              className={
                'border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/50 ' +
                (i < 2 ? 'bg-green-900/30 ' : '') +
                (i >= standings.length - 2 ? 'bg-red-900/30' : '')
              }
            >
              <td className="p-2 text-gray-500">{i + 1}</td>
              <td className="p-2 font-medium text-blue-300 hover:text-blue-200">{s.team}</td>
              <td className="p-2 text-center">{s.p}</td>
              <td className="p-2 text-center text-green-400">{s.w}</td>
              <td className="p-2 text-center text-gray-400 hidden md:table-cell">{s.d}</td>
              <td className="p-2 text-center text-red-400 hidden md:table-cell">{s.l}</td>
              <td className="p-2 text-center hidden md:table-cell">{s.f}</td>
              <td className="p-2 text-center hidden md:table-cell">{s.a}</td>
              <td className="p-2 text-center">
                {s.diff > 0 ? '+' : ''}
                {s.diff}
              </td>
              <td className="p-2 text-center font-bold text-yellow-400">{s.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-4">
        Green = Promotion zone (top 2) &bull; Red = Relegation zone (bottom 2) &bull; Click a team
        for details
      </p>
    </div>
  );
}
