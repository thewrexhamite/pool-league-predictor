'use client';

import { useMemo } from 'react';
import clsx from 'clsx';
import { Trophy, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { useLeague } from '@/lib/league-context';
import { calcStandings } from '@/lib/predictions';

interface HistoricalStandingsViewProps {
  onTeamClick: (team: string) => void;
}

export default function HistoricalStandingsView({ onTeamClick }: HistoricalStandingsViewProps) {
  const { ds } = useActiveData();
  const { selected } = useLeague();

  // Get season metadata
  const season = selected?.league.seasons.find(s => s.id === selected.seasonId);
  const isHistorical = season?.current === false;

  // Get final outcomes for historical seasons
  const champion = season?.champion;
  const promoted = season?.promoted || [];
  const relegated = season?.relegated || [];

  // Calculate standings for all divisions
  const allStandings = useMemo(() => {
    const divisionCodes = Object.keys(ds.divisions) as DivisionCode[];
    return divisionCodes.map(div => ({
      div,
      name: ds.divisions[div]?.name || div,
      standings: calcStandings(div, ds),
    }));
  }, [ds]);

  if (!isHistorical) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-6 text-center">
        <p className="text-gray-400">
          This view is only available for historical seasons.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Season Summary Header */}
      <div className="bg-gradient-to-r from-surface-card to-surface-elevated rounded-card shadow-card p-6">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-5 h-5 text-accent" />
          <h2 className="text-xl font-bold text-white">{season?.label} — Final Standings</h2>
        </div>
        <p className="text-sm text-gray-400">
          Complete results from the {season?.label} season
        </p>

        {champion && (
          <div className="mt-4 flex items-center gap-2 text-yellow-400">
            <Trophy className="w-5 h-5" />
            <span className="font-semibold">Champion: {champion}</span>
          </div>
        )}
      </div>

      {/* All Divisions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {allStandings.map(({ div, name, standings }) => {
          const divChampion = standings[0]?.team;
          const isChampionDiv = divChampion === champion;

          return (
            <div
              key={div}
              className={clsx(
                'bg-surface-card rounded-card shadow-card p-4 md:p-5 overflow-x-auto transition',
                isChampionDiv && 'ring-2 ring-yellow-400/30'
              )}
            >
              {/* Division Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {name}
                  {isChampionDiv && (
                    <Trophy className="w-4 h-4 text-yellow-400" title="Division Champion" />
                  )}
                </h3>
              </div>

              {/* Compact Standings Table */}
              <table className="w-full text-xs" role="table">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-wider text-[10px] border-b border-surface-border">
                    <th className="text-left p-2">#</th>
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">P</th>
                    <th className="text-center p-2">W</th>
                    <th className="text-center p-2 hidden md:table-cell">D</th>
                    <th className="text-center p-2 hidden md:table-cell">L</th>
                    <th className="text-center p-2">+/-</th>
                    <th className="text-center p-2 font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((s, i) => {
                    const isTeamChampion = s.team === champion;
                    const isPromoted = promoted.includes(s.team);
                    const isRelegated = relegated.includes(s.team);

                    return (
                      <tr
                        key={s.team}
                        onClick={() => onTeamClick(s.team)}
                        className={clsx(
                          'border-b border-surface-border/20 cursor-pointer transition hover:bg-surface-elevated/50',
                          isPromoted && !isTeamChampion && 'border-l-[3px] border-l-win bg-win-muted/10',
                          isRelegated && 'border-l-[3px] border-l-loss bg-loss-muted/10',
                          isTeamChampion && 'border-l-[3px] border-l-yellow-400 bg-yellow-400/5',
                          !isPromoted && !isRelegated && !isTeamChampion && 'border-l-[3px] border-l-transparent'
                        )}
                      >
                        <td className="p-2 text-gray-500">{i + 1}</td>
                        <td className="p-2 font-medium text-info hover:text-info-light transition-colors">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{s.team}</span>
                            {isTeamChampion && (
                              <Trophy className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" title="Champion" />
                            )}
                            {isPromoted && !isTeamChampion && (
                              <TrendingUp className="w-3.5 h-3.5 text-win flex-shrink-0" title="Promoted" />
                            )}
                            {isRelegated && (
                              <TrendingDown className="w-3.5 h-3.5 text-loss flex-shrink-0" title="Relegated" />
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-center text-gray-300">{s.p}</td>
                        <td className="p-2 text-center text-win">{s.w}</td>
                        <td className="p-2 text-center text-gray-400 hidden md:table-cell">{s.d}</td>
                        <td className="p-2 text-center text-loss hidden md:table-cell">{s.l}</td>
                        <td className={clsx('p-2 text-center', s.diff > 0 ? 'text-win' : s.diff < 0 ? 'text-loss' : 'text-gray-400')}>
                          {s.diff > 0 ? '+' : ''}{s.diff}
                        </td>
                        <td className="p-2 text-center font-bold text-white">{s.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Division Legend */}
              <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-3 pt-3 border-t border-surface-border/30">
                {isChampionDiv && champion && (
                  <span className="flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-yellow-400" />
                    Champion
                  </span>
                )}
                {promoted.some(t => standings.find(st => st.team === t)) && (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-win" />
                    Promoted
                  </span>
                )}
                {relegated.some(t => standings.find(st => st.team === t)) && (
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-loss" />
                    Relegated
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="bg-surface-card/50 rounded-card p-4 text-center">
        <p className="text-xs text-gray-500">
          Historical data from {season?.label} season
          {champion && <span> • Champion: <span className="text-yellow-400 font-semibold">{champion}</span></span>}
          {promoted.length > 0 && <span> • {promoted.length} teams promoted</span>}
          {relegated.length > 0 && <span> • {relegated.length} teams relegated</span>}
        </p>
      </div>
    </div>
  );
}
