'use client';

import { getPlayerStats, getPlayerStats2526, getPlayerTeams } from '@/lib/predictions';
import { AIInsightsPanel } from './AIInsightsPanel';

interface PlayerDetailProps {
  player: string;
  selectedTeam: string | null;
  onBack: () => void;
  onTeamClick: (team: string, div: string) => void;
}

export default function PlayerDetail({
  player,
  selectedTeam,
  onBack,
  onTeamClick,
}: PlayerDetailProps) {
  const stats = getPlayerStats(player);
  const stats2526 = getPlayerStats2526(player);
  const playerTeams = getPlayerTeams(player);

  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <button
        onClick={onBack}
        className="text-gray-400 hover:text-white text-sm mb-4 block"
      >
        &larr; Back
      </button>
      <h2 className="text-xl font-bold mb-1">{player}</h2>

      {playerTeams.length > 0 && (
        <p className="text-gray-400 text-sm mb-4">
          {playerTeams.map((pt, i) => (
            <span key={i}>
              <span
                className="cursor-pointer text-blue-300 hover:text-blue-200"
                onClick={() => onTeamClick(pt.team, pt.div)}
              >
                {pt.team}
              </span>{' '}
              ({pt.div})
              {i < playerTeams.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}

      {stats2526 && (
        <div className="mb-6">
          <h3 className="font-bold text-sm mb-3 text-gray-300">25/26 Season</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{stats2526.total.p}</div>
              <div className="text-xs text-gray-400">Played</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats2526.total.w}</div>
              <div className="text-xs text-gray-400">Won</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {stats2526.total.pct.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">Win%</div>
            </div>
          </div>
          {stats2526.teams.length > 1 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left p-2">Team</th>
                    <th className="text-center p-2">P</th>
                    <th className="text-center p-2">W</th>
                    <th className="text-center p-2">Win%</th>
                    <th className="text-center p-2">Lag</th>
                    <th className="text-center p-2">BD+</th>
                    <th className="text-center p-2">BD-</th>
                    <th className="text-center p-2">Forf</th>
                  </tr>
                </thead>
                <tbody>
                  {stats2526.teams.map((t, i) => (
                    <tr key={i} className="border-b border-gray-700/50">
                      <td
                        className="p-2 text-blue-300 cursor-pointer hover:text-blue-200"
                        onClick={() => onTeamClick(t.team, t.div)}
                      >
                        {t.team}
                        {t.cup && (
                          <span className="ml-1 text-amber-400 text-[10px] font-medium">Cup</span>
                        )}
                      </td>
                      <td className="p-2 text-center">{t.p}</td>
                      <td className="p-2 text-center text-green-400">{t.w}</td>
                      <td className="p-2 text-center font-bold">{t.pct.toFixed(1)}%</td>
                      <td className="p-2 text-center">{t.lag}</td>
                      <td className="p-2 text-center">{t.bdF}</td>
                      <td className="p-2 text-center">{t.bdA}</td>
                      <td className="p-2 text-center">{t.forf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {stats ? (
        <div className="mb-6">
          <h3 className="font-bold text-sm mb-3 text-gray-300">24/25 Season</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div
                className={
                  'text-2xl font-bold ' +
                  (stats.rating > 0
                    ? 'text-green-400'
                    : stats.rating < 0
                      ? 'text-red-400'
                      : 'text-gray-400')
                }
              >
                {stats.rating > 0 ? '+' : ''}
                {stats.rating.toFixed(2)}
              </div>
              <div className="text-xs text-gray-400">Rating</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">
                {(stats.winPct * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-400">Win Rate</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-gray-300">{stats.played}</div>
              <div className="text-xs text-gray-400">Games (24/25)</div>
            </div>
          </div>
        </div>
      ) : (
        !stats2526 && (
          <p className="text-gray-400 text-sm">No individual stats available for this player.</p>
        )
      )}

      <AIInsightsPanel type="player" playerName={player} />
    </div>
  );
}
