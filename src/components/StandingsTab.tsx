'use client';

import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { useLeague } from '@/lib/league-context';
import ShareButton from './ShareButton';
import HistoricalStandingsView from './HistoricalStandingsView';
import { generateStandingsShareData } from '@/lib/share-utils';

interface StandingsTabProps {
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  myTeam: { team: string; div: DivisionCode } | null;
  onTeamClick: (team: string) => void;
}

export default function StandingsTab({ selectedDiv, standings, myTeam, onTeamClick }: StandingsTabProps) {
  const { ds, data } = useActiveData();
  const { selected } = useLeague();
  const divName = ds.divisions[selectedDiv]?.name || selectedDiv;

  // Format cache age for display
  const getCacheAgeText = (ageMs: number): string => {
    const minutes = Math.floor(ageMs / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  const showCacheBadge = data.source === 'cache' || data.isOffline;

  // Get current season metadata
  const season = selected?.league.seasons.find(s => s.id === selected.seasonId);
  const isHistorical = season?.current === false;

  // Get final outcomes for historical seasons
  const champion = season?.champion;
  const promoted = season?.promoted || [];
  const relegated = season?.relegated || [];

  // Generate share data with top team
  const topTeam = standings[0]?.team;
  const shareData = generateStandingsShareData({
    div: selectedDiv,
    topTeam,
  });

  return (
    <>
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">{divName} — Standings</h2>
          {showCacheBadge && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-surface-elevated border border-surface-border rounded text-gray-400">
              {data.isOffline ? '🔌 Offline' : '💾 Cached'}
              {data.cacheAge > 0 && ` • ${getCacheAgeText(data.cacheAge)}`}
            </span>
          )}
        </div>
        <ShareButton data={shareData} title="Share standings" />
      </div>
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
            // For historical seasons, use actual final outcomes
            // For current seasons, use positional indicators
            const isChampion = isHistorical && i === 0 && champion === s.team;
            const isPromoted = isHistorical ? promoted.includes(s.team) : i < 2;
            const isRelegated = isHistorical ? relegated.includes(s.team) : i >= standings.length - 2;
            const isMyTeam = myTeam?.team === s.team && myTeam?.div === selectedDiv;

            return (
              <tr
                key={s.team}
                onClick={() => onTeamClick(s.team)}
                className={clsx(
                  'border-b border-surface-border/30 cursor-pointer transition hover:bg-surface-elevated/50',
                  isPromoted && 'border-l-[3px] border-l-win bg-win-muted/10',
                  isRelegated && 'border-l-[3px] border-l-loss bg-loss-muted/10',
                  isMyTeam && 'bg-baize-muted/20',
                  !isPromoted && !isRelegated && !isMyTeam && 'border-l-[3px] border-l-transparent'
                )}
              >
                <td className="p-2 text-gray-500">{i + 1}</td>
                <td className="p-2 font-medium text-info hover:text-info-light transition-colors">
                  <div className="flex items-center gap-2">
                    {s.team}
                    {isChampion && <span title="Champion"><Trophy className="w-4 h-4 text-yellow-400" /></span>}
                    {isHistorical && isPromoted && !isChampion && <span className="text-[10px] text-win font-semibold">↑</span>}
                    {isHistorical && isRelegated && <span className="text-[10px] text-loss font-semibold">↓</span>}
                  </div>
                </td>
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
        {isHistorical ? (
          <>
            <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-yellow-400" /> Champion</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-win" /> Promoted</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-loss" /> Relegated</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-win" /> Promotion</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-loss" /> Relegation</span>
          </>
        )}
        <span className="ml-auto">Click team for details</span>
      </div>
    </div>
    {isHistorical && (
      <div className="mt-6">
        <HistoricalStandingsView onTeamClick={onTeamClick} />
      </div>
    )}
    </>
  );
}
