'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { X, MapPin, Calendar, Clock, Trophy, Info } from 'lucide-react';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import type { KnockoutMatch } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import {
  getDiv,
  calcTeamStrength,
  predictFrame,
  runPredSim,
  getSquadH2H,
  getTeamPlayers2526,
} from '@/lib/predictions';

interface KnockoutMatchDetailProps {
  match: KnockoutMatch;
  onClose: () => void;
  onTeamClick: (team: string) => void;
}

export default function KnockoutMatchDetail({ match, onClose, onTeamClick }: KnockoutMatchDetailProps) {
  const isPlayed = match.status === 'played';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-surface-card border border-surface-border rounded-xl shadow-elevated w-full max-w-md max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border/50">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <Trophy size={14} className="text-baize" />
              {match.round}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-white transition rounded-lg hover:bg-surface-elevated"
            >
              <X size={18} />
            </button>
          </div>

          {/* Match info bar */}
          {(match.date || match.time || match.venue) && (
            <div className="px-4 py-2 flex flex-wrap gap-3 text-xs text-gray-500 border-b border-surface-border/30">
              {match.date && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {match.date}
                </span>
              )}
              {match.time && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {match.time}
                </span>
              )}
              {match.venue && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {match.venue}
                </span>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-4">
            {isPlayed ? (
              <PlayedMatchContent match={match} onTeamClick={onTeamClick} />
            ) : (
              <UpcomingMatchContent match={match} onTeamClick={onTeamClick} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function PlayedMatchContent({ match, onTeamClick }: { match: KnockoutMatch; onTeamClick: (team: string) => void }) {
  const teamAWon = match.winner === match.teamA;
  const teamBWon = match.winner === match.teamB;

  return (
    <div className="space-y-4">
      {/* Score display */}
      <div className="flex items-center justify-between gap-4">
        {/* Team A */}
        <button
          onClick={() => match.teamA && onTeamClick(match.teamA)}
          className="flex-1 text-center group"
        >
          <div className={clsx(
            'text-sm font-medium truncate transition group-hover:text-info',
            teamAWon ? 'text-win' : 'text-gray-500',
          )}>
            {match.teamA}
          </div>
        </button>

        {/* Score */}
        <div className="flex items-center gap-3 shrink-0">
          <span className={clsx(
            'text-3xl font-bold tabular-nums',
            teamAWon ? 'text-win' : 'text-gray-500',
          )}>
            {match.scoreA}
          </span>
          <span className="text-gray-600 text-lg">-</span>
          <span className={clsx(
            'text-3xl font-bold tabular-nums',
            teamBWon ? 'text-win' : 'text-gray-500',
          )}>
            {match.scoreB}
          </span>
        </div>

        {/* Team B */}
        <button
          onClick={() => match.teamB && onTeamClick(match.teamB)}
          className="flex-1 text-center group"
        >
          <div className={clsx(
            'text-sm font-medium truncate transition group-hover:text-info',
            teamBWon ? 'text-win' : 'text-gray-500',
          )}>
            {match.teamB}
          </div>
        </button>
      </div>

      {/* Winner badge */}
      {match.winner && (
        <div className="flex justify-center">
          <div className="flex items-center gap-1.5 bg-win-muted/10 text-win text-xs font-medium px-3 py-1 rounded-full">
            <Trophy size={12} />
            {match.winner} wins
          </div>
        </div>
      )}

      {/* Frame data notice */}
      <div className="flex items-start gap-2 bg-surface-elevated/30 rounded-lg px-3 py-2.5 text-xs text-gray-500">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>Frame-by-frame details are not yet available for cup matches.</span>
      </div>
    </div>
  );
}

function UpcomingMatchContent({ match, onTeamClick }: { match: KnockoutMatch; onTeamClick: (team: string) => void }) {
  const { ds, frames } = useActiveData();

  // Calculate prediction
  const prediction = useMemo(() => {
    if (!match.teamA || !match.teamB) return null;
    const divA = getDiv(match.teamA, ds);
    if (!divA) return null;
    const strengths = calcTeamStrength(divA, ds);
    const hStr = strengths[match.teamA] ?? 0;
    const aStr = strengths[match.teamB] ?? 0;
    const p = predictFrame(hStr, aStr);
    return runPredSim(p);
  }, [match.teamA, match.teamB, ds]);

  // H2H records
  const h2hRecords = useMemo(() => {
    if (!match.teamA || !match.teamB || frames.length === 0) return [];
    return getSquadH2H(match.teamA, match.teamB, frames, ds.rosters);
  }, [match.teamA, match.teamB, frames, ds.rosters]);

  const h2hSummary = useMemo(() => {
    let aWins = 0, bWins = 0;
    for (const r of h2hRecords) {
      aWins += r.wins;
      bWins += r.losses;
    }
    return { aWins, bWins, total: aWins + bWins };
  }, [h2hRecords]);

  // Key players
  const teamAPlayers = useMemo(() => {
    if (!match.teamA) return [];
    return getTeamPlayers2526(match.teamA, ds)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
  }, [match.teamA, ds]);

  const teamBPlayers = useMemo(() => {
    if (!match.teamB) return [];
    return getTeamPlayers2526(match.teamB, ds)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 3);
  }, [match.teamB, ds]);

  if (!match.teamA || !match.teamB) {
    return (
      <div className="text-center text-gray-500 text-sm py-6">
        Teams not yet confirmed for this match.
      </div>
    );
  }

  const gauges = prediction ? [
    { label: match.teamA, pct: parseFloat(prediction.pHomeWin), color: '#22c55e', text: 'text-win' },
    { label: 'Draw', pct: parseFloat(prediction.pDraw), color: '#94a3b8', text: 'text-draw' },
    { label: match.teamB, pct: parseFloat(prediction.pAwayWin), color: '#ef4444', text: 'text-loss' },
  ] : [];

  return (
    <div className="space-y-4">
      {/* Team names */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onTeamClick(match.teamA)}
          className="text-sm font-medium text-info hover:underline truncate"
        >
          {match.teamA}
        </button>
        <span className="text-gray-600 text-xs font-medium">vs</span>
        <button
          onClick={() => match.teamB && onTeamClick(match.teamB)}
          className="text-sm font-medium text-info hover:underline truncate"
        >
          {match.teamB}
        </button>
      </div>

      {/* Win probability gauges */}
      {prediction && (
        <div className="grid grid-cols-3 gap-2">
          {gauges.map(g => (
            <div key={g.label} className="rounded-lg bg-surface-elevated/30 p-2 text-center">
              <div className="w-14 h-14 mx-auto mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{ value: g.pct }]}>
                    <RadialBar dataKey="value" fill={g.color} background={{ fill: '#161E2E' }} cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className={clsx('text-lg font-bold', g.text)}>{g.pct}%</div>
              <div className="text-[10px] text-gray-500 truncate">{g.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Expected score */}
      {prediction && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="text-gray-400">Expected score:</span>
          <span className="font-bold text-win tabular-nums">{prediction.expectedHome}</span>
          <span className="text-gray-600">-</span>
          <span className="font-bold text-loss tabular-nums">{prediction.expectedAway}</span>
        </div>
      )}

      {/* H2H record */}
      {h2hSummary.total > 0 && (
        <div className="bg-surface-elevated/30 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Head-to-Head Record</h4>
          <div className="flex items-center justify-between text-sm">
            <span className="text-win font-medium">{match.teamA}: {h2hSummary.aWins}W</span>
            <span className="text-gray-500 text-xs">{h2hSummary.total} frames played</span>
            <span className="text-loss font-medium">{match.teamB}: {h2hSummary.bWins}W</span>
          </div>
          {/* H2H bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden mt-2 bg-surface-border/30">
            {h2hSummary.aWins > 0 && (
              <div
                className="bg-win rounded-l-full"
                style={{ width: `${(h2hSummary.aWins / h2hSummary.total) * 100}%` }}
              />
            )}
            {h2hSummary.bWins > 0 && (
              <div
                className="bg-loss rounded-r-full"
                style={{ width: `${(h2hSummary.bWins / h2hSummary.total) * 100}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* Key players */}
      {(teamAPlayers.length > 0 || teamBPlayers.length > 0) && (
        <div className="bg-surface-elevated/30 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Players</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              {teamAPlayers.map(p => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 truncate">{p.name}</span>
                  <span className="text-win font-medium tabular-nums ml-1">{Math.round(p.pct * 100)}%</span>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {teamBPlayers.map(p => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300 truncate">{p.name}</span>
                  <span className="text-loss font-medium tabular-nums ml-1">{Math.round(p.pct * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!prediction && (
        <div className="flex items-start gap-2 bg-surface-elevated/30 rounded-lg px-3 py-2.5 text-xs text-gray-500">
          <Info size={14} className="shrink-0 mt-0.5" />
          <span>Prediction data not available for these teams.</span>
        </div>
      )}
    </div>
  );
}
