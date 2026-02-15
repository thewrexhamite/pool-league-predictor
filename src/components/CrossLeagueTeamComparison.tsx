'use client';

import { useMemo } from 'react';
import { ArrowLeft, Trophy, Users, Swords } from 'lucide-react';
import clsx from 'clsx';
import type { LeagueStrength, LeagueMeta } from '@/lib/types';
import type { LeagueData } from '@/lib/data-provider';
import { calcBayesianPct, calcStandings } from '@/lib/predictions/core';
import { getAdjustedTeamRating, getAdjustedPlayerRating } from '@/lib/stats/adjusted-ratings';
import { predictFrame } from '@/lib/predictions/matchup';
import ConfidenceMeter from './ConfidenceMeter';

interface TeamOption {
  name: string;
  div: string;
  leagueId: string;
  leagueShortName: string;
  leagueColor: string;
}

interface CrossLeagueTeamComparisonProps {
  team1: TeamOption;
  team2: TeamOption;
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

interface RosterPlayer {
  name: string;
  played: number;
  winPct: number;
  adjPct: number;
  adjustedRating: number | null;
}

function getRoster(
  teamName: string,
  leagueId: string,
  divisionCode: string,
  leagueData: LeagueData,
  strengths: LeagueStrength[]
): RosterPlayer[] {
  const players: RosterPlayer[] = [];

  for (const [name, data] of Object.entries(leagueData.players2526)) {
    const teamStats = data.teams.find(t => t.team === teamName && !t.cup);
    if (!teamStats || teamStats.p === 0) continue;

    const adjusted = getAdjustedPlayerRating(name, leagueId, divisionCode, leagueData, strengths);

    players.push({
      name,
      played: teamStats.p,
      winPct: teamStats.pct,
      adjPct: calcBayesianPct(teamStats.w, teamStats.p),
      adjustedRating: adjusted?.adjustedPct ?? null,
    });
  }

  players.sort((a, b) => (b.adjustedRating ?? b.adjPct) - (a.adjustedRating ?? a.adjPct));
  return players;
}

export default function CrossLeagueTeamComparison({
  team1,
  team2,
  multiLeagueData,
  strengths,
  onBack,
}: CrossLeagueTeamComparisonProps) {
  const ld1 = multiLeagueData[team1.leagueId];
  const ld2 = multiLeagueData[team2.leagueId];

  const teamRating1 = useMemo(() => {
    if (!ld1) return null;
    return getAdjustedTeamRating(team1.name, team1.leagueId, team1.div, ld1.data, strengths);
  }, [team1, ld1, strengths]);

  const teamRating2 = useMemo(() => {
    if (!ld2) return null;
    return getAdjustedTeamRating(team2.name, team2.leagueId, team2.div, ld2.data, strengths);
  }, [team2, ld2, strengths]);

  const roster1 = useMemo(() => {
    if (!ld1) return [];
    return getRoster(team1.name, team1.leagueId, team1.div, ld1.data, strengths);
  }, [team1, ld1, strengths]);

  const roster2 = useMemo(() => {
    if (!ld2) return [];
    return getRoster(team2.name, team2.leagueId, team2.div, ld2.data, strengths);
  }, [team2, ld2, strengths]);

  // Standings
  const standing1 = useMemo(() => {
    if (!ld1) return null;
    const ds = { divisions: ld1.data.divisions, results: ld1.data.results, fixtures: ld1.data.fixtures, players: ld1.data.players, rosters: ld1.data.rosters, players2526: ld1.data.players2526 };
    const standings = calcStandings(team1.div, ds);
    const idx = standings.findIndex(s => s.team === team1.name);
    return idx >= 0 ? { ...standings[idx], position: idx + 1, total: standings.length } : null;
  }, [ld1, team1]);

  const standing2 = useMemo(() => {
    if (!ld2) return null;
    const ds = { divisions: ld2.data.divisions, results: ld2.data.results, fixtures: ld2.data.fixtures, players: ld2.data.players, rosters: ld2.data.rosters, players2526: ld2.data.players2526 };
    const standings = calcStandings(team2.div, ds);
    const idx = standings.findIndex(s => s.team === team2.name);
    return idx >= 0 ? { ...standings[idx], position: idx + 1, total: standings.length } : null;
  }, [ld2, team2]);

  // Predicted matchup (neutral venue - no home advantage)
  const prediction = useMemo(() => {
    if (!teamRating1 || !teamRating2) return null;

    // Convert adjusted pct to strength scale for logistic model
    const str1 = (teamRating1.adjustedPct - 50) / 25;
    const str2 = (teamRating2.adjustedPct - 50) / 25;

    // Use predictFrame without home advantage (neutral venue)
    const pFrame = 1 / (1 + Math.exp(-(str1 - str2)));
    const framesPerMatch = 10;

    // Simulate expected scoreline
    const expectedScore1 = pFrame * framesPerMatch;
    const expectedScore2 = (1 - pFrame) * framesPerMatch;

    // Win probability via binomial-ish approximation
    let pWin1 = 0;
    let pDraw = 0;
    for (let w1 = 0; w1 <= framesPerMatch; w1++) {
      const w2 = framesPerMatch - w1;
      // Simple binomial probability
      const prob = binomialProb(framesPerMatch, w1, pFrame);
      if (w1 > w2) pWin1 += prob;
      else if (w1 === w2) pDraw += prob;
    }
    const pWin2 = 1 - pWin1 - pDraw;

    return {
      pWin1: Math.max(0, pWin1),
      pDraw: Math.max(0, pDraw),
      pWin2: Math.max(0, pWin2),
      expectedScore1: expectedScore1.toFixed(1),
      expectedScore2: expectedScore2.toFixed(1),
    };
  }, [teamRating1, teamRating2]);

  const minConfidence = Math.min(teamRating1?.confidence ?? 0, teamRating2?.confidence ?? 0);

  return (
    <div className="card-interactive bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-lg md:text-xl font-bold text-white mb-2">
          <Users size={18} className="inline mr-1 text-accent" />
          Cross-League Team Comparison
        </h2>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="text-center">
            <div className="font-bold text-info truncate max-w-[160px]" title={team1.name}>{team1.name}</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <LeagueBadge shortName={team1.leagueShortName} color={team1.leagueColor} />
              <span className="text-xs text-gray-500">{team1.div}</span>
            </div>
          </div>
          <span className="text-gray-500 font-bold">vs</span>
          <div className="text-center">
            <div className="font-bold text-success truncate max-w-[160px]" title={team2.name}>{team2.name}</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <LeagueBadge shortName={team2.leagueShortName} color={team2.leagueColor} />
              <span className="text-xs text-gray-500">{team2.div}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-6 px-4">
        <div className="text-xs text-gray-500 mb-1">Comparison Confidence</div>
        <ConfidenceMeter confidence={minConfidence} size="md" />
      </div>

      {/* Adjusted Team Strength */}
      {(teamRating1 || teamRating2) && (
        <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            Adjusted Team Strength
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{teamRating1?.adjustedPct.toFixed(1) ?? '-'}%</div>
              <div className="text-[10px] text-gray-500">Adjusted</div>
            </div>
            <div className="self-center text-gray-500 text-xs">vs</div>
            <div>
              <div className="text-2xl font-bold text-white">{teamRating2?.adjustedPct.toFixed(1) ?? '-'}%</div>
              <div className="text-[10px] text-gray-500">Adjusted</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-400">{teamRating1?.bayesianPct.toFixed(1) ?? '-'}%</div>
              <div className="text-[10px] text-gray-500">Raw (Bayesian)</div>
            </div>
            <div />
            <div>
              <div className="text-lg font-bold text-gray-400">{teamRating2?.bayesianPct.toFixed(1) ?? '-'}%</div>
              <div className="text-[10px] text-gray-500">Raw (Bayesian)</div>
            </div>
          </div>
        </div>
      )}

      {/* Standings Context */}
      {(standing1 || standing2) && (
        <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            League Position
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {standing1 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{standing1.position}<span className="text-sm text-gray-500">/{standing1.total}</span></div>
                <div className="text-xs text-gray-500 mt-1">P{standing1.p} W{standing1.w} D{standing1.d} L{standing1.l}</div>
                <div className="text-xs text-gray-400">Pts: {standing1.pts} | Diff: {standing1.diff > 0 ? '+' : ''}{standing1.diff}</div>
              </div>
            )}
            {standing2 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{standing2.position}<span className="text-sm text-gray-500">/{standing2.total}</span></div>
                <div className="text-xs text-gray-500 mt-1">P{standing2.p} W{standing2.w} D{standing2.d} L{standing2.l}</div>
                <div className="text-xs text-gray-400">Pts: {standing2.pts} | Diff: {standing2.diff > 0 ? '+' : ''}{standing2.diff}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Predicted Matchup */}
      {prediction && (
        <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
            <Swords size={14} className="inline mr-1" />
            Predicted Matchup (Neutral Venue)
          </h3>

          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-info">{prediction.expectedScore1}</div>
              <div className="text-[10px] text-gray-500 truncate max-w-[100px]">{team1.name}</div>
            </div>
            <span className="text-gray-500 text-lg">-</span>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{prediction.expectedScore2}</div>
              <div className="text-[10px] text-gray-500 truncate max-w-[100px]">{team2.name}</div>
            </div>
          </div>

          {/* Win probability bar */}
          <div className="w-full h-6 rounded-full overflow-hidden flex bg-surface-elevated">
            <div
              className="bg-info/70 flex items-center justify-center text-[10px] text-fixed-white font-bold"
              style={{ width: `${prediction.pWin1 * 100}%` }}
            >
              {(prediction.pWin1 * 100).toFixed(0)}%
            </div>
            <div
              className="bg-gray-600 flex items-center justify-center text-[10px] text-fixed-white font-bold"
              style={{ width: `${prediction.pDraw * 100}%` }}
            >
              {prediction.pDraw * 100 >= 5 ? `${(prediction.pDraw * 100).toFixed(0)}%` : ''}
            </div>
            <div
              className="bg-success/70 flex items-center justify-center text-[10px] text-fixed-white font-bold"
              style={{ width: `${prediction.pWin2 * 100}%` }}
            >
              {(prediction.pWin2 * 100).toFixed(0)}%
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>{team1.name} win</span>
            <span>Draw</span>
            <span>{team2.name} win</span>
          </div>

          <div className="text-center text-[10px] text-gray-500 mt-3">
            No home advantage applied (cup/neutral venue)
          </div>
        </div>
      )}

      {/* Squad Comparison */}
      <div className="mb-6 bg-surface rounded-lg p-4 md:p-6 shadow-card">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">
          Squad Comparison
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Team 1 Roster */}
          <div>
            <h4 className="text-xs font-semibold text-info mb-2 text-center truncate" title={team1.name}>{team1.name}</h4>
            <div className="space-y-1">
              {roster1.slice(0, 10).map(p => (
                <div key={p.name} className="flex items-center justify-between text-xs bg-surface-elevated rounded px-2 py-1.5">
                  <span className="text-white truncate mr-2" title={p.name}>{p.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500">{p.played}g</span>
                    <span className="text-gray-300 font-mono">{p.adjPct.toFixed(0)}%</span>
                    {p.adjustedRating !== null && (
                      <span className="text-accent font-mono font-bold">{p.adjustedRating.toFixed(0)}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team 2 Roster */}
          <div>
            <h4 className="text-xs font-semibold text-success mb-2 text-center truncate" title={team2.name}>{team2.name}</h4>
            <div className="space-y-1">
              {roster2.slice(0, 10).map(p => (
                <div key={p.name} className="flex items-center justify-between text-xs bg-surface-elevated rounded px-2 py-1.5">
                  <span className="text-white truncate mr-2" title={p.name}>{p.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-gray-500">{p.played}g</span>
                    <span className="text-gray-300 font-mono">{p.adjPct.toFixed(0)}%</span>
                    {p.adjustedRating !== null && (
                      <span className="text-accent font-mono font-bold">{p.adjustedRating.toFixed(0)}%</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Verdict */}
      {prediction && (
        <div className="bg-surface rounded-lg p-4 md:p-6 shadow-card text-center">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            <Trophy size={14} className="inline mr-1 text-gold" />
            Verdict
          </h3>
          {prediction.pWin1 > prediction.pWin2 + 0.05 ? (
            <>
              <div className="text-xl font-bold text-white mb-1">{team1.name}</div>
              <div className="text-sm text-accent">
                {prediction.pWin1 > 0.6 ? 'Clear favorites' : 'Slight favorites'}
              </div>
            </>
          ) : prediction.pWin2 > prediction.pWin1 + 0.05 ? (
            <>
              <div className="text-xl font-bold text-white mb-1">{team2.name}</div>
              <div className="text-sm text-accent">
                {prediction.pWin2 > 0.6 ? 'Clear favorites' : 'Slight favorites'}
              </div>
            </>
          ) : (
            <div className="text-lg font-bold text-gray-400">Too close to call</div>
          )}
          {minConfidence < 0.4 && (
            <div className="text-xs text-gray-500 mt-2">
              Note: limited cross-league data available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function binomialProb(n: number, k: number, p: number): number {
  return binomialCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function binomialCoeff(n: number, k: number): number {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return result;
}
