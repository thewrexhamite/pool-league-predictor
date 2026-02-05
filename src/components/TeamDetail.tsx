'use client';

import { useMemo } from 'react';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import { DIVISIONS } from '@/lib/data';
import { getTeamResults, getTeamPlayers, calcTeamHomeAway, calcPlayerForm, calcSetPerformance, calcTeamBDStats } from '@/lib/predictions';
import { useLeagueData } from '@/lib/data-provider';

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
  const { data: leagueData } = useLeagueData();
  const teamResults = getTeamResults(team);
  const teamPlayers = getTeamPlayers(team);
  const teamStanding = standings.find(s => s.team === team);
  const teamPos = standings.findIndex(s => s.team === team) + 1;
  const form = teamResults.slice(0, 5).map(r => r.result);

  const homeAway = useMemo(
    () => calcTeamHomeAway(team, leagueData.results),
    [team, leagueData.results]
  );

  const setPerf = useMemo(
    () => leagueData.frames.length > 0 ? calcSetPerformance(team, leagueData.frames) : null,
    [team, leagueData.frames]
  );

  const teamBD = useMemo(
    () => calcTeamBDStats(team, leagueData.players2526),
    [team, leagueData.players2526]
  );

  const playerForms = useMemo(() => {
    if (leagueData.frames.length === 0) return new Map<string, ReturnType<typeof calcPlayerForm>>();
    const map = new Map<string, ReturnType<typeof calcPlayerForm>>();
    teamPlayers.forEach(pl => {
      map.set(pl.name, calcPlayerForm(pl.name, leagueData.frames));
    });
    return map;
  }, [teamPlayers, leagueData.frames]);

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

      {/* Home/Away Split */}
      {(homeAway.home.p > 0 || homeAway.away.p > 0) && (
        <div className="mb-6">
          <h3 className="font-bold text-sm mb-2 text-gray-300">Home / Away</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{homeAway.home.winPct.toFixed(0)}%</div>
                <div className="text-xs text-gray-400">Home Win%</div>
              </div>
              <div className="text-xs text-gray-500 text-center mt-1">
                {homeAway.home.w}-{homeAway.home.d}-{homeAway.home.l} ({homeAway.home.f}F-{homeAway.home.a}A)
              </div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="text-center">
                <div className="text-lg font-bold text-red-400">{homeAway.away.winPct.toFixed(0)}%</div>
                <div className="text-xs text-gray-400">Away Win%</div>
              </div>
              <div className="text-xs text-gray-500 text-center mt-1">
                {homeAway.away.w}-{homeAway.away.d}-{homeAway.away.l} ({homeAway.away.f}F-{homeAway.away.a}A)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Set Performance */}
      {setPerf && (setPerf.set1.played > 0 || setPerf.set2.played > 0) && (
        <div className="mb-6">
          <h3 className="font-bold text-sm mb-2 text-gray-300">Set Performance</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{setPerf.set1.pct.toFixed(0)}%</div>
              <div className="text-xs text-gray-400">Set 1 ({setPerf.set1.won}/{setPerf.set1.played})</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-400">{setPerf.set2.pct.toFixed(0)}%</div>
              <div className="text-xs text-gray-400">Set 2 ({setPerf.set2.won}/{setPerf.set2.played})</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center mt-1">
            {Math.abs(setPerf.bias) < 3
              ? 'Balanced across sets'
              : setPerf.bias > 0
                ? `Stronger in Set 1 (+${setPerf.bias.toFixed(0)}pp)`
                : `Stronger in Set 2 (${setPerf.bias.toFixed(0)}pp)`}
          </div>
        </div>
      )}

      {/* Team B&D Stats */}
      <div className="mb-6">
        <h3 className="font-bold text-sm mb-2 text-gray-300">Break & Dish</h3>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gray-700 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-green-400">{teamBD.bdFRate.toFixed(2)}</div>
            <div className="text-[10px] text-gray-400">BD+ /game</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-red-400">{teamBD.bdARate.toFixed(2)}</div>
            <div className="text-[10px] text-gray-400">BD- /game</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-2 text-center">
            <div className={
              'text-sm font-bold ' +
              (teamBD.netBD > 0 ? 'text-green-400' : teamBD.netBD < 0 ? 'text-red-400' : 'text-gray-400')
            }>
              {teamBD.netBD > 0 ? '+' : ''}{teamBD.netBD}
            </div>
            <div className="text-[10px] text-gray-400">Net BD</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-amber-400">{teamBD.forfRate.toFixed(2)}</div>
            <div className="text-[10px] text-gray-400">Forf /game</div>
          </div>
        </div>
      </div>

      {teamPlayers.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-sm mb-2 text-gray-300">Squad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {teamPlayers.map(pl => {
              const pf = playerForms.get(pl.name);
              return (
                <div
                  key={pl.name}
                  onClick={() => onPlayerClick(pl.name)}
                  className="flex justify-between text-xs bg-gray-700/50 rounded p-2 cursor-pointer hover:bg-gray-700"
                >
                  <span className="text-blue-300 hover:text-blue-200 flex items-center gap-1">
                    {pl.name}
                    {pl.s2526 && pl.s2526.cup && (
                      <span className="text-amber-400 text-[10px] font-medium">Cup</span>
                    )}
                    {pf && (
                      <span
                        className={
                          pf.trend === 'hot'
                            ? 'text-green-400'
                            : pf.trend === 'cold'
                              ? 'text-red-400'
                              : 'text-gray-600'
                        }
                        title={`Form: ${pf.last5.pct.toFixed(0)}% last 5 | ${pf.seasonPct.toFixed(0)}% season`}
                      >
                        {pf.trend === 'hot' ? '\u25B2' : pf.trend === 'cold' ? '\u25BC' : ''}
                      </span>
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
              );
            })}
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
