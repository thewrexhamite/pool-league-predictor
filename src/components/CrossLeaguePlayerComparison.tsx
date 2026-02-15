'use client';

import { useMemo } from 'react';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import type { AdjustedRating, LeagueStrength, LeagueMeta } from '@/lib/types';
import type { LeagueData } from '@/lib/data-provider';
import { calcBayesianPct } from '@/lib/predictions';
import { getAdjustedPlayerRating } from '@/lib/stats/adjusted-ratings';
import ConfidenceMeter from './ConfidenceMeter';

interface CrossLeaguePlayerOption {
  name: string;
  team: string;
  div: string;
  p: number;
  w: number;
  pct: number;
  adjPct: number;
  leagueId: string;
  leagueShortName: string;
  leagueColor: string;
}

interface CrossLeaguePlayerComparisonProps {
  player1: CrossLeaguePlayerOption;
  player2: CrossLeaguePlayerOption;
  multiLeagueData: Record<string, { meta: LeagueMeta; data: LeagueData }>;
  strengths: LeagueStrength[];
  onBack: () => void;
}

function LeagueBadge({ shortName, color }: { shortName: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-fixed-white"
      style={{ backgroundColor: color }}
    >
      {shortName}
    </span>
  );
}

function StatRow({ label, val1, val2, format = 'pct', highlight = false }: {
  label: string;
  val1: number | null;
  val2: number | null;
  format?: 'pct' | 'num' | 'signed';
  highlight?: boolean;
}) {
  const fmt = (v: number | null) => {
    if (v === null) return '-';
    if (format === 'pct') return `${v.toFixed(1)}%`;
    if (format === 'signed') return `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
    return v.toFixed(1);
  };

  const better1 = val1 !== null && val2 !== null && val1 > val2;
  const better2 = val1 !== null && val2 !== null && val2 > val1;

  return (
    <div className={clsx('grid grid-cols-3 py-2 border-b border-surface-border/30 last:border-0', highlight && 'bg-surface-elevated/50 rounded')}>
      <div className={clsx('text-right pr-3 font-mono text-sm', better1 ? 'text-win font-bold' : 'text-gray-300')}>
        {fmt(val1)}
      </div>
      <div className="text-center text-xs text-gray-500 self-center">{label}</div>
      <div className={clsx('text-left pl-3 font-mono text-sm', better2 ? 'text-win font-bold' : 'text-gray-300')}>
        {fmt(val2)}
      </div>
    </div>
  );
}

export default function CrossLeaguePlayerComparison({
  player1,
  player2,
  multiLeagueData,
  strengths,
  onBack,
}: CrossLeaguePlayerComparisonProps) {
  // Compute adjusted ratings
  const rating1 = useMemo(() => {
    const ld = multiLeagueData[player1.leagueId];
    if (!ld) return null;
    return getAdjustedPlayerRating(player1.name, player1.leagueId, player1.div, ld.data, strengths);
  }, [player1, multiLeagueData, strengths]);

  const rating2 = useMemo(() => {
    const ld = multiLeagueData[player2.leagueId];
    if (!ld) return null;
    return getAdjustedPlayerRating(player2.name, player2.leagueId, player2.div, ld.data, strengths);
  }, [player2, multiLeagueData, strengths]);

  // Verdict
  const verdict = useMemo(() => {
    if (!rating1 || !rating2) return null;

    let p1Score = 0;
    let p2Score = 0;

    // Adjusted % advantage (primary signal)
    if (rating1.adjustedPct > rating2.adjustedPct + 2) p1Score += 3;
    else if (rating2.adjustedPct > rating1.adjustedPct + 2) p2Score += 3;
    else { p1Score += 1; p2Score += 1; } // Too close

    // Z-score advantage
    if (rating1.zScore > rating2.zScore + 0.3) p1Score += 1;
    else if (rating2.zScore > rating1.zScore + 0.3) p2Score += 1;

    // Experience advantage
    if (player1.p > player2.p * 1.5) p1Score += 0.5;
    else if (player2.p > player1.p * 1.5) p2Score += 0.5;

    const total = p1Score + p2Score;
    if (total === 0) return { winner: null, confidence: 0, label: 'Too close to call' };

    const p1Pct = (p1Score / total) * 100;
    if (Math.abs(p1Pct - 50) < 10) return { winner: null, confidence: 0, label: 'Too close to call' };

    const winner = p1Score > p2Score ? player1.name : player2.name;
    const winnerLeague = p1Score > p2Score ? player1 : player2;
    const conf = Math.abs(p1Pct - 50);
    const label = conf > 30 ? 'Clear advantage' : conf > 15 ? 'Slight edge' : 'Marginal edge';
    return { winner, winnerLeague, confidence: conf, label };
  }, [rating1, rating2, player1, player2]);

  const minConfidence = Math.min(rating1?.confidence ?? 0, rating2?.confidence ?? 0);

  return (
    <div className="card-interactive bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-lg md:text-xl font-bold text-white mb-2">Cross-League Comparison</h2>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="text-center">
            <div className="font-bold text-info truncate max-w-[140px]" title={player1.name}>{player1.name}</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <LeagueBadge shortName={player1.leagueShortName} color={player1.leagueColor} />
              <span className="text-xs text-gray-500">{player1.div}</span>
            </div>
          </div>
          <span className="text-gray-500 font-bold">vs</span>
          <div className="text-center">
            <div className="font-bold text-success truncate max-w-[140px]" title={player2.name}>{player2.name}</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <LeagueBadge shortName={player2.leagueShortName} color={player2.leagueColor} />
              <span className="text-xs text-gray-500">{player2.div}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-6 px-4">
        <div className="text-xs text-gray-500 mb-1">Comparison Confidence</div>
        <ConfidenceMeter confidence={minConfidence} size="md" />
      </div>

      {/* Adjusted Ratings Panel */}
      {(rating1 || rating2) && (
        <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            Adjusted Ratings
          </h3>

          <StatRow label="Raw Win%" val1={rating1?.rawPct ?? null} val2={rating2?.rawPct ?? null} />
          <StatRow label="Bayesian %" val1={rating1?.bayesianPct ?? null} val2={rating2?.bayesianPct ?? null} />
          <StatRow label="Adjusted %" val1={rating1?.adjustedPct ?? null} val2={rating2?.adjustedPct ?? null} highlight />

          <div className="mt-3 pt-3 border-t border-surface-border/30">
            <StatRow label="Div Adj" val1={rating1?.adjustmentBreakdown.divisionOffset ?? null} val2={rating2?.adjustmentBreakdown.divisionOffset ?? null} format="signed" />
            <StatRow label="League Adj" val1={rating1?.adjustmentBreakdown.leagueOffset ?? null} val2={rating2?.adjustmentBreakdown.leagueOffset ?? null} format="signed" />
          </div>
        </div>
      )}

      {/* Normalized Stats Panel */}
      {(rating1 || rating2) && (
        <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            Percentile Rankings
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {rating1 ? `${rating1.zScore >= 0 ? '+' : ''}${rating1.zScore.toFixed(2)}` : '-'}
              </div>
              <div className="text-[10px] text-gray-500">Z-Score (Division)</div>
              {rating1 && (
                <div className="text-xs text-gray-400 mt-1">
                  Top {(100 - rating1.leaguePercentile).toFixed(0)}% in league
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {rating2 ? `${rating2.zScore >= 0 ? '+' : ''}${rating2.zScore.toFixed(2)}` : '-'}
              </div>
              <div className="text-[10px] text-gray-500">Z-Score (Division)</div>
              {rating2 && (
                <div className="text-xs text-gray-400 mt-1">
                  Top {(100 - rating2.leaguePercentile).toFixed(0)}% in league
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Raw Stats Panel */}
      <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
          Raw Stats
        </h3>
        <StatRow label="Played" val1={player1.p} val2={player2.p} format="num" />
        <StatRow label="Won" val1={player1.w} val2={player2.w} format="num" />
        <StatRow label="Win %" val1={player1.pct} val2={player2.pct} />
        <StatRow label="Adj %" val1={player1.adjPct} val2={player2.adjPct} />
      </div>

      {/* Verdict */}
      {verdict && (
        <div className="bg-surface rounded-lg p-4 md:p-6 shadow-card text-center">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            <Trophy size={14} className="inline mr-1 text-gold" />
            Verdict
          </h3>
          {verdict.winner ? (
            <>
              <div className="text-xl font-bold text-white mb-1">{verdict.winner}</div>
              <div className="text-sm text-accent">{verdict.label}</div>
              {minConfidence < 0.4 && (
                <div className="text-xs text-gray-500 mt-2">
                  Note: limited cross-league data available
                </div>
              )}
            </>
          ) : (
            <div className="text-lg font-bold text-gray-400">{verdict.label}</div>
          )}
        </div>
      )}
    </div>
  );
}
