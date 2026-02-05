'use client';

import clsx from 'clsx';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';

interface StandingsTabProps {
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  myTeam: { team: string; div: DivisionCode } | null;
  onTeamClick: (team: string) => void;
}

export default function StandingsTab({ selectedDiv, standings, myTeam, onTeamClick }: StandingsTabProps) {
  const { ds } = useActiveData();
  const divName = ds.divisions[selectedDiv]?.name || selectedDiv;

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6 overflow-x-auto">
      <h2 className="text-lg font-bold mb-4 text-white">{divName} — Standings</h2>
      <table className="w-full text-xs md:text-sm" role="table">
        <thead>
          <tr className="text-gray-500 uppercase tracking-wider text-[10px] md:text-xs border-b border-surface-border">
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
          {standings.map((s, i) => {
            const isPromo = i < 2;
            const isReleg = i >= standings.length - 2;
            const isMyTeam = myTeam?.team === s.team && myTeam?.div === selectedDiv;
            return (
              <tr
                key={s.team}
                onClick={() => onTeamClick(s.team)}
                className={clsx(
                  'border-b border-surface-border/30 cursor-pointer transition hover:bg-surface-elevated/50',
                  isPromo && 'border-l-[3px] border-l-win bg-win-muted/10',
                  isReleg && 'border-l-[3px] border-l-loss bg-loss-muted/10',
                  isMyTeam && 'bg-baize-muted/20',
                  !isPromo && !isReleg && !isMyTeam && 'border-l-[3px] border-l-transparent'
                )}
              >
                <td className="p-2 text-gray-500">{i + 1}</td>
                <td className="p-2 font-medium text-info hover:text-info-light transition-colors">{s.team}</td>
                <td className="p-2 text-center text-gray-300">{s.p}</td>
                <td className="p-2 text-center text-win">{s.w}</td>
                <td className="p-2 text-center text-gray-400 hidden md:table-cell">{s.d}</td>
                <td className="p-2 text-center text-loss hidden md:table-cell">{s.l}</td>
                <td className="p-2 text-center hidden md:table-cell">{s.f}</td>
                <td className="p-2 text-center hidden md:table-cell">{s.a}</td>
                <td className={clsx('p-2 text-center', s.diff > 0 ? 'text-win' : s.diff < 0 ? 'text-loss' : 'text-gray-400')}>
                  {s.diff > 0 ? '+' : ''}{s.diff}
                </td>
                <td className="p-2 text-center font-bold text-white">{s.pts}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center gap-4 text-[10px] text-gray-500 mt-4">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-win" /> Promotion</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-loss" /> Relegation</span>
        <span className="ml-auto">Click team for details</span>
      </div>
    </div>
  );
}
