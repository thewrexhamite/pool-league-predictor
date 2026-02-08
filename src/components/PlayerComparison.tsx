'use client';

import { useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Home, Plane } from 'lucide-react';
import clsx from 'clsx';
import { getPlayerStats, getPlayerStats2526, calcBayesianPct, calcPlayerForm, calcPlayerHomeAway } from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';
import { getH2HBetween } from '@/lib/stats/head-to-head';

interface PlayerComparisonProps {
  player1: string;
  player2: string;
  onBack: () => void;
}

export default function PlayerComparison({ player1, player2, onBack }: PlayerComparisonProps) {
  const { ds, frames } = useActiveData();
  const stats1 = getPlayerStats2526(player1, ds);
  const stats2 = getPlayerStats2526(player2, ds);
  const playerStats1 = getPlayerStats(player1, ds);
  const playerStats2 = getPlayerStats(player2, ds);

  const form1 = useMemo(() => frames.length > 0 ? calcPlayerForm(player1, frames) : null, [player1, frames]);
  const form2 = useMemo(() => frames.length > 0 ? calcPlayerForm(player2, frames) : null, [player2, frames]);

  const homeAway1 = useMemo(() => frames.length > 0 ? calcPlayerHomeAway(player1, frames) : null, [player1, frames]);
  const homeAway2 = useMemo(() => frames.length > 0 ? calcPlayerHomeAway(player2, frames) : null, [player2, frames]);

  const h2hRecord = useMemo(() => frames.length > 0 ? getH2HBetween(player1, player2, frames) : null, [player1, player2, frames]);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition">
        <ArrowLeft size={16} /> Back
      </button>

      <h2 className="text-xl font-bold mb-6 text-white text-center">Head-to-Head Comparison</h2>

      {/* Head-to-Head Record */}
      {h2hRecord && h2hRecord.played > 0 ? (
        <div className="mb-6 bg-surface rounded-lg p-6 shadow-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            Direct Record
          </h3>

          {/* Main H2H Stats */}
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-win">{h2hRecord.won}</div>
              <div className="text-xs text-gray-500 mt-1">{player1}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">-</div>
              <div className="text-xs text-gray-500 mt-1">{h2hRecord.played} Played</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-loss">{h2hRecord.lost}</div>
              <div className="text-xs text-gray-500 mt-1">{player2}</div>
            </div>
          </div>

          {/* Win Percentages */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-elevated rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{h2hRecord.winPct.toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500">{player1} Win Rate</div>
              <div className="w-full bg-surface rounded-full h-2 mt-2">
                <div className="h-2 rounded-full bg-win" style={{ width: `${h2hRecord.winPct}%` }} />
              </div>
            </div>
            <div className="bg-surface-elevated rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{(100 - h2hRecord.winPct).toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500">{player2} Win Rate</div>
              <div className="w-full bg-surface rounded-full h-2 mt-2">
                <div className="h-2 rounded-full bg-loss" style={{ width: `${100 - h2hRecord.winPct}%` }} />
              </div>
            </div>
          </div>

          {/* Streak Info */}
          {h2hRecord.streak.count > 0 && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-surface-elevated rounded-full px-4 py-2">
                <span className={clsx(
                  'text-sm font-medium',
                  h2hRecord.streak.type === 'win' ? 'text-win' : 'text-loss'
                )}>
                  {h2hRecord.streak.type === 'win' ? player1 : player2} on {h2hRecord.streak.count} game {h2hRecord.streak.type === 'win' ? 'winning' : 'losing'} streak
                </span>
              </div>
            </div>
          )}

          {/* Recent Matches */}
          {h2hRecord.matches.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
                Recent Matches
              </h4>
              <div className="space-y-2">
                {h2hRecord.matches.slice(0, 5).map((match, idx) => (
                  <div key={`${match.matchId}-${idx}`} className="bg-surface-elevated rounded-lg p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'font-bold',
                        match.won ? 'text-win' : 'text-loss'
                      )}>
                        {match.won ? 'W' : 'L'}
                      </span>
                      <span className="text-gray-400">{match.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {match.wasHome ? (
                          <span className="flex items-center gap-1">
                            <Home size={12} />
                            {match.homeTeam} vs {match.awayTeam}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Plane size={12} />
                            {match.homeTeam} vs {match.awayTeam}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 bg-surface rounded-lg p-6 shadow-card text-center">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Direct Record
          </h3>
          <p className="text-gray-500 text-sm">No head-to-head matches found</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Player 1 */}
        <div className="bg-surface rounded-lg p-4 shadow-card">
          <h3 className="text-lg font-bold text-white text-center mb-4">{player1}</h3>
          {stats1 ? (
            <div className="space-y-3">
              {playerStats1?.rating && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{playerStats1.rating}</div>
                  <div className="text-[10px] text-gray-500">Rating</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats1.total.p}</div>
                <div className="text-[10px] text-gray-500">Played</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-win">{stats1.total.w}</div>
                <div className="text-[10px] text-gray-500">Won</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-info">{calcBayesianPct(stats1.total.w, stats1.total.p).toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">Adj%</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-400">{stats1.total.pct.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">Raw Win%</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center">No stats available</p>
          )}
        </div>

        {/* Player 2 */}
        <div className="bg-surface rounded-lg p-4 shadow-card">
          <h3 className="text-lg font-bold text-white text-center mb-4">{player2}</h3>
          {stats2 ? (
            <div className="space-y-3">
              {playerStats2?.rating && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{playerStats2.rating}</div>
                  <div className="text-[10px] text-gray-500">Rating</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats2.total.p}</div>
                <div className="text-[10px] text-gray-500">Played</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-win">{stats2.total.w}</div>
                <div className="text-[10px] text-gray-500">Won</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-info">{calcBayesianPct(stats2.total.w, stats2.total.p).toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">Adj%</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-400">{stats2.total.pct.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500">Raw Win%</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center">No stats available</p>
          )}
        </div>
      </div>

      {/* Form Comparison */}
      {(form1 || form2) && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            Form Comparison
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 Form */}
            <div className="bg-surface rounded-lg p-4 shadow-card">
              {form1 ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className={clsx(
                      'text-xs font-medium flex items-center gap-1',
                      form1.trend === 'hot' ? 'text-win' : form1.trend === 'cold' ? 'text-loss' : 'text-gray-500'
                    )}>
                      {form1.trend === 'hot' && <TrendingUp size={14} />}
                      {form1.trend === 'cold' && <TrendingDown size={14} />}
                      {form1.trend === 'hot' ? 'Hot' : form1.trend === 'cold' ? 'Cold' : 'Steady'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-surface-elevated rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{form1.last5.pct.toFixed(0)}%</div>
                      <div className="text-[10px] text-gray-500">Last 5 ({form1.last5.w}/{form1.last5.p})</div>
                      <div className="w-full bg-surface rounded-full h-1.5 mt-1.5">
                        <div className="h-1.5 rounded-full bg-info" style={{ width: `${form1.last5.pct}%` }} />
                      </div>
                    </div>
                    <div className="bg-surface-elevated rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{form1.last10.pct.toFixed(0)}%</div>
                      <div className="text-[10px] text-gray-500">Last 10 ({form1.last10.w}/{form1.last10.p})</div>
                      <div className="w-full bg-surface rounded-full h-1.5 mt-1.5">
                        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${form1.last10.pct}%` }} />
                      </div>
                    </div>
                    <div className="bg-surface-elevated rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{form1.seasonPct.toFixed(0)}%</div>
                      <div className="text-[10px] text-gray-500">Season</div>
                      <div className="w-full bg-surface rounded-full h-1.5 mt-1.5">
                        <div className="h-1.5 rounded-full bg-gray-400" style={{ width: `${form1.seasonPct}%` }} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm text-center">No form data</p>
              )}
            </div>

            {/* Player 2 Form */}
            <div className="bg-surface rounded-lg p-4 shadow-card">
              {form2 ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className={clsx(
                      'text-xs font-medium flex items-center gap-1',
                      form2.trend === 'hot' ? 'text-win' : form2.trend === 'cold' ? 'text-loss' : 'text-gray-500'
                    )}>
                      {form2.trend === 'hot' && <TrendingUp size={14} />}
                      {form2.trend === 'cold' && <TrendingDown size={14} />}
                      {form2.trend === 'hot' ? 'Hot' : form2.trend === 'cold' ? 'Cold' : 'Steady'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-surface-elevated rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{form2.last5.pct.toFixed(0)}%</div>
                      <div className="text-[10px] text-gray-500">Last 5 ({form2.last5.w}/{form2.last5.p})</div>
                      <div className="w-full bg-surface rounded-full h-1.5 mt-1.5">
                        <div className="h-1.5 rounded-full bg-info" style={{ width: `${form2.last5.pct}%` }} />
                      </div>
                    </div>
                    <div className="bg-surface-elevated rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{form2.last10.pct.toFixed(0)}%</div>
                      <div className="text-[10px] text-gray-500">Last 10 ({form2.last10.w}/{form2.last10.p})</div>
                      <div className="w-full bg-surface rounded-full h-1.5 mt-1.5">
                        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${form2.last10.pct}%` }} />
                      </div>
                    </div>
                    <div className="bg-surface-elevated rounded-lg p-3 text-center">
                      <div className="text-lg font-bold text-white">{form2.seasonPct.toFixed(0)}%</div>
                      <div className="text-[10px] text-gray-500">Season</div>
                      <div className="w-full bg-surface rounded-full h-1.5 mt-1.5">
                        <div className="h-1.5 rounded-full bg-gray-400" style={{ width: `${form2.seasonPct}%` }} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm text-center">No form data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Home/Away Split Comparison */}
      {(homeAway1 || homeAway2) && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            Home / Away Comparison
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Player 1 Home/Away */}
            <div className="bg-surface rounded-lg p-4 shadow-card">
              {homeAway1 && (homeAway1.home.p > 0 || homeAway1.away.p > 0) ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-elevated rounded-lg p-3 text-center">
                    <span title="Home win %"><Home size={14} className="mx-auto text-win mb-1" /></span>
                    <div className="text-lg font-bold text-win">{homeAway1.home.pct.toFixed(0)}%</div>
                    <div className="text-[10px] text-gray-500">Home ({homeAway1.home.w}/{homeAway1.home.p})</div>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-3 text-center">
                    <span title="Away win %"><Plane size={14} className="mx-auto text-loss mb-1" /></span>
                    <div className="text-lg font-bold text-loss">{homeAway1.away.pct.toFixed(0)}%</div>
                    <div className="text-[10px] text-gray-500">Away ({homeAway1.away.w}/{homeAway1.away.p})</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center">No home/away data</p>
              )}
            </div>

            {/* Player 2 Home/Away */}
            <div className="bg-surface rounded-lg p-4 shadow-card">
              {homeAway2 && (homeAway2.home.p > 0 || homeAway2.away.p > 0) ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-elevated rounded-lg p-3 text-center">
                    <span title="Home win %"><Home size={14} className="mx-auto text-win mb-1" /></span>
                    <div className="text-lg font-bold text-win">{homeAway2.home.pct.toFixed(0)}%</div>
                    <div className="text-[10px] text-gray-500">Home ({homeAway2.home.w}/{homeAway2.home.p})</div>
                  </div>
                  <div className="bg-surface-elevated rounded-lg p-3 text-center">
                    <span title="Away win %"><Plane size={14} className="mx-auto text-loss mb-1" /></span>
                    <div className="text-lg font-bold text-loss">{homeAway2.away.pct.toFixed(0)}%</div>
                    <div className="text-[10px] text-gray-500">Away ({homeAway2.away.w}/{homeAway2.away.p})</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center">No home/away data</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
