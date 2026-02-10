'use client';

import { useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Home, Plane, Trophy } from 'lucide-react';
import clsx from 'clsx';
import { LineChart, Line, ResponsiveContainer, YAxis, BarChart, Bar, XAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getPlayerStats, getPlayerStats2526, calcBayesianPct, calcPlayerForm, calcPlayerHomeAway, getPlayerFrameHistory } from '@/lib/predictions';
import { calcBDStats as calcAdvBDStats } from '@/lib/predictions/analytics';
import { useActiveData } from '@/lib/active-data-provider';
import { getH2HBetween } from '@/lib/stats/head-to-head';
import { calcClutchIndex } from '@/lib/stats';
import ShareButton from './ShareButton';
import { getBaseUrl } from '@/lib/share-utils';
import PlayerRadarChart from './PlayerRadarChart';

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

  // Clutch profiles
  const clutch1 = useMemo(() => frames.length > 0 ? calcClutchIndex(player1, frames, ds.results) : null, [player1, frames, ds.results]);
  const clutch2 = useMemo(() => frames.length > 0 ? calcClutchIndex(player2, frames, ds.results) : null, [player2, frames, ds.results]);

  // B&D stats for comparison
  const bd1 = useMemo(() => calcAdvBDStats(player1, null, ds.players2526), [player1, ds.players2526]);
  const bd2 = useMemo(() => calcAdvBDStats(player2, null, ds.players2526), [player2, ds.players2526]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (!stats1 || !stats2) return null;

    const winPct1 = stats1.total.pct;
    const winPct2 = stats2.total.pct;
    const formPct1 = form1?.last5.pct ?? 50;
    const formPct2 = form2?.last5.pct ?? 50;
    const clutchScore1 = clutch1 ? (clutch1.clutchRating + 1) * 50 : 50;
    const clutchScore2 = clutch2 ? (clutch2.clutchRating + 1) * 50 : 50;
    const h2hPct = h2hRecord && h2hRecord.played > 0 ? h2hRecord.winPct : 50;
    const homePct1 = homeAway1?.home.pct ?? 50;
    const homePct2 = homeAway2?.home.pct ?? 50;
    const awayPct1 = homeAway1?.away.pct ?? 50;
    const awayPct2 = homeAway2?.away.pct ?? 50;

    return {
      player1: { winPct: winPct1, formPct: formPct1, clutch: clutchScore1, h2hPct: h2hPct, homePct: homePct1, awayPct: awayPct1 },
      player2: { winPct: winPct2, formPct: formPct2, clutch: clutchScore2, h2hPct: 100 - h2hPct, homePct: homePct2, awayPct: awayPct2 },
    };
  }, [stats1, stats2, form1, form2, clutch1, clutch2, h2hRecord, homeAway1, homeAway2]);

  // Who wins verdict
  const verdict = useMemo(() => {
    if (!stats1 || !stats2) return null;

    let p1Score = 0;
    let p2Score = 0;

    // Win % advantage
    const adj1 = calcBayesianPct(stats1.total.w, stats1.total.p);
    const adj2 = calcBayesianPct(stats2.total.w, stats2.total.p);
    if (adj1 > adj2) p1Score += 2;
    else if (adj2 > adj1) p2Score += 2;

    // Form advantage
    const f1 = form1?.last5.pct ?? 0;
    const f2 = form2?.last5.pct ?? 0;
    if (f1 > f2 + 5) p1Score += 1.5;
    else if (f2 > f1 + 5) p2Score += 1.5;

    // H2H advantage
    if (h2hRecord && h2hRecord.played >= 2) {
      if (h2hRecord.winPct > 55) p1Score += 1.5;
      else if (h2hRecord.winPct < 45) p2Score += 1.5;
    }

    // Clutch advantage
    const c1 = clutch1?.clutchRating ?? 0;
    const c2 = clutch2?.clutchRating ?? 0;
    if (c1 > c2 + 0.1) p1Score += 0.5;
    else if (c2 > c1 + 0.1) p2Score += 0.5;

    const total = p1Score + p2Score;
    if (total === 0) return { winner: null, confidence: 0, label: 'Too close to call' };

    const p1Pct = (p1Score / total) * 100;
    if (Math.abs(p1Pct - 50) < 10) return { winner: null, confidence: 0, label: 'Too close to call' };

    const winner = p1Score > p2Score ? player1 : player2;
    const confidence = Math.abs(p1Pct - 50);
    const label = confidence > 30 ? 'Clear advantage' : confidence > 15 ? 'Slight edge' : 'Marginal edge';
    return { winner, confidence, label };
  }, [stats1, stats2, form1, form2, h2hRecord, clutch1, clutch2, player1, player2]);

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

  // Generate share data for this comparison
  const shareData = useMemo(() => {
    const encodedPlayer1 = encodeURIComponent(player1);
    const encodedPlayer2 = encodeURIComponent(player2);
    const url = `${getBaseUrl()}/share/comparison/${encodedPlayer1}/vs/${encodedPlayer2}`;

    let title = `${player1} vs ${player2} - Pool League Pro`;
    let text = `Check out the head-to-head comparison between ${player1} and ${player2}`;

    // Enhance title/text with H2H record if available
    if (h2hRecord && h2hRecord.played > 0) {
      title = `${player1} vs ${player2} (${h2hRecord.won}-${h2hRecord.lost}) - Pool League Pro`;
      text = `${player1} leads ${h2hRecord.won}-${h2hRecord.lost} in their head-to-head matchup`;
    }

    return { title, text, url };
  }, [player1, player2, h2hRecord]);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
        <h2 className="text-lg md:text-xl font-bold text-white text-center">Head-to-Head Comparison</h2>
        <ShareButton data={shareData} title="Share this comparison" size={18} />
      </div>

      {/* Head-to-Head Record */}
      {h2hRecord && h2hRecord.played > 0 ? (
        <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            Direct Record
          </h3>

          {/* Main H2H Stats */}
          <div className="flex items-center justify-center gap-4 md:gap-8 mb-6">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-win">{h2hRecord.won}</div>
              <div className="text-xs text-gray-500 mt-1 truncate max-w-[80px] md:max-w-none">{player1}</div>
            </div>
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-gray-400">-</div>
              <div className="text-xs text-gray-500 mt-1 whitespace-nowrap">{h2hRecord.played} Played</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-loss">{h2hRecord.lost}</div>
              <div className="text-xs text-gray-500 mt-1 truncate max-w-[80px] md:max-w-none">{player2}</div>
            </div>
          </div>

          {/* Win Percentages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-elevated rounded-lg p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold text-white">{h2hRecord.winPct.toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500 truncate">{player1} Win Rate</div>
              <div className="w-full bg-surface rounded-full h-2 mt-2">
                <div className="h-2 rounded-full bg-win" style={{ width: `${h2hRecord.winPct}%` }} />
              </div>
            </div>
            <div className="bg-surface-elevated rounded-lg p-3 md:p-4 text-center">
              <div className="text-xl md:text-2xl font-bold text-white">{(100 - h2hRecord.winPct).toFixed(1)}%</div>
              <div className="text-[10px] text-gray-500 truncate">{player2} Win Rate</div>
              <div className="w-full bg-surface rounded-full h-2 mt-2">
                <div className="h-2 rounded-full bg-loss" style={{ width: `${100 - h2hRecord.winPct}%` }} />
              </div>
            </div>
          </div>

          {/* Streak Info */}
          {h2hRecord.streak.count > 0 && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 bg-surface-elevated rounded-full px-3 md:px-4 py-2">
                <span className={clsx(
                  'text-xs md:text-sm font-medium text-center',
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
                  <div key={`${match.matchId}-${idx}`} className="bg-surface-elevated rounded-lg p-2 md:p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'font-bold',
                        match.won ? 'text-win' : 'text-loss'
                      )}>
                        {match.won ? 'W' : 'L'}
                      </span>
                      <span className="text-gray-400">{match.date}</span>
                    </div>
                    <div className="flex items-center gap-2 md:justify-end">
                      <span className="text-gray-500 truncate">
                        {match.wasHome ? (
                          <span className="flex items-center gap-1">
                            <Home size={12} className="shrink-0" />
                            <span className="truncate">{match.homeTeam} vs {match.awayTeam}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Plane size={12} className="shrink-0" />
                            <span className="truncate">{match.homeTeam} vs {match.awayTeam}</span>
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
        <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card text-center">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Direct Record
          </h3>
          <p className="text-gray-500 text-sm">No head-to-head matches found</p>
        </div>
      )}

      {/* Who Wins Verdict */}
      {verdict && (
        <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card text-center">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            <Trophy size={14} className="inline mr-1 text-gold" />
            Verdict
          </h3>
          {verdict.winner ? (
            <>
              <div className="text-xl font-bold text-white mb-1">{verdict.winner}</div>
              <div className="text-sm text-accent">{verdict.label}</div>
            </>
          ) : (
            <div className="text-lg font-bold text-gray-400">{verdict.label}</div>
          )}
        </div>
      )}

      {/* Radar Chart */}
      {radarData && (
        <div className="mb-6">
          <PlayerRadarChart
            player1Name={player1}
            player2Name={player2}
            player1Data={radarData.player1}
            player2Data={radarData.player2}
          />
        </div>
      )}

      {/* B&D Comparison */}
      <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 text-center">
          Break & Dish Comparison
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-win font-bold">{bd1.bdFPerGame.toFixed(2)}</div>
            <div className="text-gray-500">BD+ /g</div>
          </div>
          <div className="text-gray-500 self-center text-[10px]">vs</div>
          <div>
            <div className="text-win font-bold">{bd2.bdFPerGame.toFixed(2)}</div>
            <div className="text-gray-500">BD+ /g</div>
          </div>
          <div>
            <div className="text-loss font-bold">{bd1.bdAPerGame.toFixed(2)}</div>
            <div className="text-gray-500">BD- /g</div>
          </div>
          <div />
          <div>
            <div className="text-loss font-bold">{bd2.bdAPerGame.toFixed(2)}</div>
            <div className="text-gray-500">BD- /g</div>
          </div>
          <div>
            <div className={clsx('font-bold', bd1.bdDiff > 0 ? 'text-win' : bd1.bdDiff < 0 ? 'text-loss' : 'text-gray-400')}>
              {bd1.bdDiff > 0 ? '+' : ''}{bd1.bdDiff}
            </div>
            <div className="text-gray-500">Net</div>
          </div>
          <div />
          <div>
            <div className={clsx('font-bold', bd2.bdDiff > 0 ? 'text-win' : bd2.bdDiff < 0 ? 'text-loss' : 'text-gray-400')}>
              {bd2.bdDiff > 0 ? '+' : ''}{bd2.bdDiff}
            </div>
            <div className="text-gray-500">Net</div>
          </div>
        </div>
      </div>

      {/* Comparative Bar Chart */}
      {comparisonBarData.length > 0 && (
        <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            Key Metrics Comparison
          </h3>
          <div className="h-48 md:h-64 overflow-x-auto">
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
                  formatter={(value: number | undefined) => value != null ? `${value.toFixed(1)}%` : 'N/A'}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player 1 */}
        <div className="bg-surface rounded-lg p-4 shadow-card">
          <h3 className="text-base md:text-lg font-bold text-white text-center mb-4 truncate" title={player1}>{player1}</h3>
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
          <h3 className="text-base md:text-lg font-bold text-white text-center mb-4 truncate" title={player2}>{player2}</h3>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="flex items-center justify-center gap-4 md:gap-6 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 md:w-8 h-0.5 bg-win rounded" />
                  <span className="text-xs text-gray-400 truncate max-w-[120px]" title={player1}>{player1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 md:w-8 h-0.5 bg-loss rounded" />
                  <span className="text-xs text-gray-400 truncate max-w-[120px]" title={player2}>{player2}</span>
                </div>
              </div>
              <div className="h-32 md:h-40 overflow-x-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
