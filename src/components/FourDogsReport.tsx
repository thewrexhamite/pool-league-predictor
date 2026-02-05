'use client';

import type { StandingEntry } from '@/lib/types';

interface FourDogsReportProps {
  standings: StandingEntry[];
  onTeamClick: (team: string) => void;
}

export default function FourDogsReport({ standings, onTeamClick }: FourDogsReportProps) {
  return (
    <div className="mt-6 bg-gradient-to-r from-amber-900/30 to-amber-800/30 rounded-xl p-4 md:p-6 border border-amber-600/30">
      <h3 className="text-lg font-bold mb-3 text-amber-400">Four Dogs Report</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-800/70"
          onClick={() => onTeamClick('Four Dogs A')}
        >
          <h4 className="font-bold text-green-400">Four Dogs A</h4>
          <p className="text-sm text-gray-300">
            Currently: {standings.find(s => s.team === 'Four Dogs A')?.pts || 0} pts (#
            {standings.findIndex(s => s.team === 'Four Dogs A') + 1})
          </p>
          <p className="text-xs text-gray-400 mt-1">Promotion contenders</p>
        </div>
        <div
          className="bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-800/70"
          onClick={() => onTeamClick('Four Dogs B')}
        >
          <h4 className="font-bold text-red-400">Four Dogs B</h4>
          <p className="text-sm text-gray-300">
            Currently: {standings.find(s => s.team === 'Four Dogs B')?.pts || 0} pts (#
            {standings.findIndex(s => s.team === 'Four Dogs B') + 1})
          </p>
          <p className="text-xs text-gray-400 mt-1">Relegation battle</p>
        </div>
      </div>
      <p className="text-xs text-amber-300 mt-3">Derby Day: June 14, 2026</p>
    </div>
  );
}
