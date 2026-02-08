'use client';

import { useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Home, Plane } from 'lucide-react';
import clsx from 'clsx';
import { LineChart, Line, ResponsiveContainer, YAxis, BarChart, Bar, XAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getPlayerStats, getPlayerStats2526, calcBayesianPct, calcPlayerForm, calcPlayerHomeAway, getPlayerFrameHistory } from '@/lib/predictions';
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

  const frameHistory1 = useMemo(() => frames.length > 0 ? getPlayerFrameHistory(player1, frames) : [], [player1, frames]);
  const frameHistory2 = useMemo(() => frames.length > 0 ? getPlayerFrameHistory(player2, frames) : [], [player2, frames]);

  // Create chart data combining both players' form trends
  const formChartData = useMemo(() => {
    const maxLength = Math.max(
      Math.min(frameHistory1.length, 10),
      Math.min(frameHistory2.length, 10)
    );

    if (maxLength < 3) return [];

    return Array.from({ length: maxLength }, (_, i) => {
      const p1Frame = frameHistory1[i];
      const p2Frame = frameHistory2[i];

      return {
        idx: maxLength - i - 1,
        player1: p1Frame ? (p1Frame.won ? 1 : 0) : null,
        player2: p2Frame ? (p2Frame.won ? 1 : 0) : null,
      };
    }).reverse();
  }, [frameHistory1, frameHistory2]);

  // Create comparative bar chart data for key metrics
  const comparisonBarData = useMemo(() => {
    if (!stats1 || !stats2) return [];

    const winPct1 = stats1.total.pct;
    const winPct2 = stats2.total.pct;
    const adjPct1 = calcBayesianPct(stats1.total.w, stats1.total.p);
    const adjPct2 = calcBayesianPct(stats2.total.w, stats2.total.p);
    const formPct1 = form1?.last5.pct ?? 0;
    const formPct2 = form2?.last5.pct ?? 0;

    return [
      {
        metric: 'Win %',
        [player1]: winPct1,
        [player2]: winPct2,
      },
      {
        metric: 'Adj %',
        [player1]: adjPct1,
        [player2]: adjPct2,
      },
      {
        metric: 'Form',
        [player1]: formPct1,
        [player2]: formPct2,
      },
    ];
  }, [stats1, stats2, form1, form2, player1, player2]);

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

      {/* Comparative Bar Chart */}
      {comparisonBarData.length > 0 && (
        <div className="mb-6 bg-surface rounded-lg p-6 shadow-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            Key Metrics Comparison
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparisonBarData}
                margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="metric"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickLine={{ stroke: '#4B5563' }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickLine={{ stroke: '#4B5563' }}
                  label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft', fill: '#9CA3AF', fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6',
                  }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                  formatter={(value) => <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{value}</span>}
                />
                <Bar dataKey={player1} fill="#0EA572" radius={[4, 4, 0, 0]} />
                <Bar dataKey={player2} fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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

          {/* Form Trend Chart */}
          {formChartData.length >= 3 && (
            <div className="mt-6 bg-surface rounded-lg p-4 shadow-card">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
                Form Trends (Last {formChartData.length} Frames)
              </h4>
              <div className="flex items-center justify-center gap-6 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-win rounded" />
                  <span className="text-xs text-gray-400">{player1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-loss rounded" />
                  <span className="text-xs text-gray-400">{player2}</span>
                </div>
              </div>
              <div className="h-32 md:h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formChartData}>
                    <YAxis domain={[0, 1]} hide />
                    <Line
                      type="monotone"
                      dataKey="player1"
                      stroke="#0EA572"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#0EA572' }}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="player2"
                      stroke="#EF4444"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#EF4444' }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-3">
                <div className="text-[10px] text-gray-500">
                  Most Recent → Oldest | 1 = Win, 0 = Loss
                </div>
              </div>
            </div>
          )}
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
