'use client';

import { Calendar } from 'lucide-react';
import clsx from 'clsx';
import type { StandingEntry } from '@/lib/types';

interface FourDogsReportProps {
  standings: StandingEntry[];
  onTeamClick: (team: string) => void;
}

export default function FourDogsReport({ standings, onTeamClick }: FourDogsReportProps) {
  const aStanding = standings.find(s => s.team === 'Four Dogs A');
  const bStanding = standings.find(s => s.team === 'Four Dogs B');
  const aPos = standings.findIndex(s => s.team === 'Four Dogs A') + 1;
  const bPos = standings.findIndex(s => s.team === 'Four Dogs B') + 1;

  return (
    <div className="mt-6 bg-gradient-to-r from-amber-900/20 to-amber-800/20 rounded-card shadow-card p-4 md:p-6 border border-amber-600/20">
      <h3 className="text-lg font-bold mb-3 text-gold">Four Dogs Report</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          className="bg-surface/50 rounded-lg p-4 text-left hover:bg-surface/70 transition"
          onClick={() => onTeamClick('Four Dogs A')}
        >
          <h4 className="font-bold text-win">Four Dogs A</h4>
          <p className="text-sm text-gray-300">
            {aStanding ? `${aStanding.pts} pts` : '0 pts'} (#{aPos})
          </p>
          <p className="text-xs text-gray-500 mt-1">Promotion contenders</p>
        </button>
        <button
          className="bg-surface/50 rounded-lg p-4 text-left hover:bg-surface/70 transition"
          onClick={() => onTeamClick('Four Dogs B')}
        >
          <h4 className="font-bold text-loss">Four Dogs B</h4>
          <p className="text-sm text-gray-300">
            {bStanding ? `${bStanding.pts} pts` : '0 pts'} (#{bPos})
          </p>
          <p className="text-xs text-gray-500 mt-1">Relegation battle</p>
        </button>
      </div>
      <p className="text-xs text-gold/80 mt-3 flex items-center gap-1">
        <Calendar size={12} />
        Derby Day: June 14, 2026
      </p>
    </div>
  );
}
