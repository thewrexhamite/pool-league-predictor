'use client';

import { useState, useCallback } from 'react';
import type { ChalkTable, TournamentMatch, TournamentState, TournamentGroup } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useGameTimer } from '@/hooks/chalk/use-game-timer';
import { getCurrentTournamentMatch, getMatchScore, getTournamentProgress } from '@/lib/chalk/tournament-engine';
import { TOURNAMENT_FORMAT_LABELS } from '@/lib/chalk/constants';
import { ChalkButton } from '../shared/ChalkButton';
import { CrownIcon } from '../shared/CrownIcon';
import clsx from 'clsx';

interface TournamentPanelProps {
  table: ChalkTable;
}

export function TournamentPanel({ table }: TournamentPanelProps) {
  const { reportTournamentFrame, finishTournament, cancelGame } = useChalkTable();
  const { display: gameTime } = useGameTimer(table.currentGame?.startedAt ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!table.currentGame?.tournamentState) {
    return (
      <div className="chalk-kiosk-game flex items-center justify-center p-[3vmin]">
        <p className="text-[1.5vmin]" style={{ color: 'rgba(255,255,255,0.65)' }}>No active tournament</p>
      </div>
    );
  }

  const ts = table.currentGame.tournamentState;
  const currentMatch = getCurrentTournamentMatch(ts);
  const progress = getTournamentProgress(ts);

  async function handleReportFrame(winnerName: string) {
    setActionError(null);
    try {
      await reportTournamentFrame({ winnerName });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to report frame');
    }
  }

  async function handleFinish() {
    if (!ts.winner) return;
    setFinishing(true);
    setActionError(null);
    try {
      await finishTournament(ts.winner);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to finish tournament');
    } finally {
      setFinishing(false);
    }
  }

  async function handleCancel() {
    setActionError(null);
    try {
      await cancelGame();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to cancel tournament');
    }
  }

  return (
    <div className="chalk-kiosk-game flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none text-center p-[2vmin] space-y-[0.37vmin]">
        <p className="text-[1.3vmin] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {TOURNAMENT_FORMAT_LABELS[ts.format]} — Match {progress.completed + (currentMatch ? 1 : 0)} of {progress.total}
        </p>
        <p className="text-[2.8vmin] font-mono font-bold text-baize">{gameTime}</p>
      </div>

      {/* Current match or winner */}
      <div className="flex-none px-[3vmin] pb-[2vmin]">
        {ts.winner ? (
          <TournamentCompleteView
            winner={ts.winner}
            onFinish={handleFinish}
            finishing={finishing}
          />
        ) : currentMatch ? (
          <TournamentMatchDisplay
            match={currentMatch}
            raceTo={ts.raceTo}
            onReportFrame={handleReportFrame}
          />
        ) : (
          <div className="text-center">
            <p className="text-[1.5vmin]" style={{ color: 'rgba(255,255,255,0.65)' }}>Advancing...</p>
          </div>
        )}
      </div>

      {/* Error */}
      {actionError && (
        <div className="flex-none px-[3vmin]">
          <p className="text-loss text-[1.3vmin] text-center" role="alert">{actionError}</p>
        </div>
      )}

      {/* Bracket / Standings view */}
      <div className="flex-1 overflow-y-auto border-t border-surface-border p-[1.5vmin] space-y-[1.5vmin]">
        {ts.format === 'round_robin' ? (
          <GroupStandingsView
            standings={getRoundRobinStandings(ts)}
            title="Standings"
            currentPlayers={currentMatch ? [currentMatch.player1, currentMatch.player2].filter(Boolean) as string[] : []}
          />
        ) : ts.format === 'group_knockout' ? (
          <>
            {ts.stage === 'group' && ts.groups.map((group, i) => (
              <GroupStandingsView
                key={i}
                standings={group.standings}
                title={group.name}
                currentPlayers={currentMatch ? [currentMatch.player1, currentMatch.player2].filter(Boolean) as string[] : []}
              />
            ))}
            {ts.stage === 'knockout' && (
              <KnockoutBracketView matches={ts.matches.filter((m) => m.stage === 'knockout')} currentMatchId={ts.currentMatchId} />
            )}
          </>
        ) : (
          <KnockoutBracketView matches={ts.matches} currentMatchId={ts.currentMatchId} />
        )}
      </div>

      {/* Cancel button */}
      {!ts.winner && (
        <div className="flex-none p-[1.5vmin] text-center">
          {showCancelConfirm ? (
            <div className="space-y-[1.1vmin]">
              <p className="text-[1.3vmin]" style={{ color: 'rgba(255,255,255,0.7)' }}>Cancel tournament? All progress will be lost.</p>
              <div className="flex gap-[0.75vmin] justify-center">
                <ChalkButton variant="ghost" size="sm" onClick={() => setShowCancelConfirm(false)}>
                  Keep playing
                </ChalkButton>
                <ChalkButton variant="ghost" size="sm" onClick={handleCancel}>
                  <span className="text-loss">Yes, cancel</span>
                </ChalkButton>
              </div>
            </div>
          ) : (
            <ChalkButton variant="ghost" size="sm" onClick={() => setShowCancelConfirm(true)}>
              Cancel tournament
            </ChalkButton>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Sub-components =====

function TournamentMatchDisplay({
  match,
  raceTo,
  onReportFrame,
}: {
  match: TournamentMatch;
  raceTo: number;
  onReportFrame: (winnerName: string) => void;
}) {
  const score = getMatchScore(match);

  return (
    <div className="space-y-[2vmin]">
      {/* Player names */}
      <div className="flex items-start gap-[3vmin] w-full max-w-[63vmin] mx-auto">
        <div className="flex-1 text-center space-y-[0.75vmin]">
          <p className="text-[2.8vmin] font-bold break-words">{match.player1}</p>
          <div className="flex justify-center gap-[0.5vmin]">
            {Array.from({ length: raceTo }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'w-[1.3vmin] h-[1.3vmin] rounded-full',
                  i < score.player1Frames ? 'bg-baize' : 'bg-surface-border'
                )}
              />
            ))}
          </div>
          <p className="text-[2.2vmin] font-mono font-bold text-baize">{score.player1Frames}</p>
        </div>

        <div className="flex-shrink-0 mt-[1.5vmin]">
          <span className="text-[3.7vmin] font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>vs</span>
        </div>

        <div className="flex-1 text-center space-y-[0.75vmin]">
          <p className="text-[2.8vmin] font-bold break-words">{match.player2}</p>
          <div className="flex justify-center gap-[0.5vmin]">
            {Array.from({ length: raceTo }).map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'w-[1.3vmin] h-[1.3vmin] rounded-full',
                  i < score.player2Frames ? 'bg-baize' : 'bg-surface-border'
                )}
              />
            ))}
          </div>
          <p className="text-[2.2vmin] font-mono font-bold text-baize">{score.player2Frames}</p>
        </div>
      </div>

      {/* Result buttons */}
      <div className="flex gap-[1.1vmin] max-w-[63vmin] mx-auto">
        <button
          onClick={() => match.player1 && onReportFrame(match.player1)}
          className="chalk-touch flex-1 py-[1.5vmin] rounded-[1.1vmin] bg-baize/15 border border-baize/30 text-baize text-[1.5vmin] font-bold hover:bg-baize/25 transition-colors"
        >
          {match.player1} wins frame
        </button>
        <button
          onClick={() => match.player2 && onReportFrame(match.player2)}
          className="chalk-touch flex-1 py-[1.5vmin] rounded-[1.1vmin] bg-baize/15 border border-baize/30 text-baize text-[1.5vmin] font-bold hover:bg-baize/25 transition-colors"
        >
          {match.player2} wins frame
        </button>
      </div>
    </div>
  );
}

function KnockoutBracketView({
  matches,
  currentMatchId,
}: {
  matches: TournamentMatch[];
  currentMatchId: string | null;
}) {
  // Group by round
  const rounds = new Map<number, TournamentMatch[]>();
  for (const m of matches) {
    const existing = rounds.get(m.roundIndex) ?? [];
    existing.push(m);
    rounds.set(m.roundIndex, existing);
  }

  const sortedRounds = Array.from(rounds.entries()).sort((a, b) => a[0] - b[0]);
  const maxRound = sortedRounds.length - 1;

  return (
    <div className="space-y-[1.5vmin]">
      <h3 className="text-[1.3vmin] font-bold">Bracket</h3>
      {sortedRounds.map(([roundIdx, roundMatches]) => {
        const roundLabel = roundIdx === maxRound
          ? 'Final'
          : roundIdx === maxRound - 1 && roundMatches.length === 2
          ? 'Semi-Finals'
          : roundIdx === maxRound - 2 && roundMatches.length === 4
          ? 'Quarter-Finals'
          : `Round ${roundIdx + 1}`;

        return (
          <div key={roundIdx} className="space-y-[0.55vmin]">
            <p className="text-[1.1vmin] font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {roundLabel}
            </p>
            {roundMatches
              .sort((a, b) => a.matchIndex - b.matchIndex)
              .map((match) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  isCurrent={match.id === currentMatchId}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

function BracketMatchCard({
  match,
  isCurrent,
}: {
  match: TournamentMatch;
  isCurrent: boolean;
}) {
  const score = getMatchScore(match);

  return (
    <div
      className={clsx(
        'flex items-center gap-[0.75vmin] rounded-[0.7vmin] border px-[1.1vmin] py-[0.55vmin] text-[1.3vmin]',
        isCurrent
          ? 'border-baize bg-baize/10'
          : match.winner
          ? 'border-surface-border bg-surface-elevated/30'
          : 'border-surface-border/50'
      )}
    >
      {match.isBye ? (
        <>
          <span className="flex-1 font-medium">{match.player1 ?? match.player2 ?? 'TBD'}</span>
          <span className="px-[0.75vmin] py-[0.15vmin] rounded-full bg-accent/20 text-accent text-[1vmin] font-bold">BYE</span>
        </>
      ) : (
        <>
          <span
            className={clsx(
              'flex-1 font-medium',
              match.winner === match.player1 ? 'text-baize' : match.winner ? 'opacity-40' : ''
            )}
          >
            {match.player1 ?? 'TBD'}
          </span>
          {match.winner && (
            <span className="text-[1.1vmin] font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {score.player1Frames} - {score.player2Frames}
            </span>
          )}
          <span
            className={clsx(
              'flex-1 text-right font-medium',
              match.winner === match.player2 ? 'text-baize' : match.winner ? 'opacity-40' : ''
            )}
          >
            {match.player2 ?? 'TBD'}
          </span>
        </>
      )}
    </div>
  );
}

function GroupStandingsView({
  standings,
  title,
  currentPlayers,
}: {
  standings: Array<{ playerName: string; played: number; won: number; lost: number; framesWon: number; framesLost: number; points: number }>;
  title: string;
  currentPlayers: string[];
}) {
  return (
    <div className="space-y-[0.55vmin]">
      <h3 className="text-[1.3vmin] font-bold">{title}</h3>
      <table className="w-full text-[1.1vmin]">
        <thead>
          <tr style={{ color: 'rgba(255,255,255,0.5)' }}>
            <th className="text-left py-[0.3vmin] w-[2vmin]">#</th>
            <th className="text-left py-[0.3vmin]">Player</th>
            <th className="text-center py-[0.3vmin] w-[3vmin]">P</th>
            <th className="text-center py-[0.3vmin] w-[3vmin]">W</th>
            <th className="text-center py-[0.3vmin] w-[3vmin]">L</th>
            <th className="text-center py-[0.3vmin] w-[4vmin]">+/-</th>
            <th className="text-center py-[0.3vmin] w-[3vmin]">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s, i) => (
            <tr
              key={s.playerName}
              className={clsx(
                currentPlayers.includes(s.playerName) && 'text-baize font-semibold'
              )}
            >
              <td className="py-[0.3vmin]" style={{ color: 'rgba(255,255,255,0.5)' }}>{i + 1}</td>
              <td className="py-[0.3vmin] font-medium">{s.playerName}</td>
              <td className="text-center py-[0.3vmin]">{s.played}</td>
              <td className="text-center py-[0.3vmin]">{s.won}</td>
              <td className="text-center py-[0.3vmin]">{s.lost}</td>
              <td className="text-center py-[0.3vmin]">{s.framesWon - s.framesLost > 0 ? '+' : ''}{s.framesWon - s.framesLost}</td>
              <td className="text-center py-[0.3vmin] font-bold">{s.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TournamentCompleteView({
  winner,
  onFinish,
  finishing,
}: {
  winner: string;
  onFinish: () => void;
  finishing: boolean;
}) {
  return (
    <div className="text-center space-y-[1.5vmin] chalk-animate-in">
      <CrownIcon size={48} animated className="mx-auto" />
      <p className="text-[2.8vmin] font-bold text-accent">{winner} wins!</p>
      <p className="text-[1.3vmin]" style={{ color: 'rgba(255,255,255,0.65)' }}>Tournament complete</p>
      <ChalkButton size="lg" onClick={onFinish} disabled={finishing}>
        {finishing ? 'Finishing...' : 'Finish Tournament'}
      </ChalkButton>
    </div>
  );
}

// Helper to build round-robin standings from tournament state
function getRoundRobinStandings(ts: TournamentState) {
  const playerMap = new Map<string, { playerName: string; played: number; won: number; lost: number; framesWon: number; framesLost: number; points: number }>();
  for (const name of ts.playerNames) {
    playerMap.set(name, { playerName: name, played: 0, won: 0, lost: 0, framesWon: 0, framesLost: 0, points: 0 });
  }
  for (const match of ts.matches) {
    if (!match.winner || !match.player1 || !match.player2 || match.isBye) continue;
    const score = getMatchScore(match);
    const p1 = playerMap.get(match.player1)!;
    const p2 = playerMap.get(match.player2)!;
    p1.played++;
    p2.played++;
    p1.framesWon += score.player1Frames;
    p1.framesLost += score.player2Frames;
    p2.framesWon += score.player2Frames;
    p2.framesLost += score.player1Frames;
    if (match.winner === match.player1) {
      p1.won++; p1.points += 2; p2.lost++;
    } else {
      p2.won++; p2.points += 2; p1.lost++;
    }
  }
  return Array.from(playerMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aDiff = a.framesWon - a.framesLost;
    const bDiff = b.framesWon - b.framesLost;
    if (bDiff !== aDiff) return bDiff - aDiff;
    return b.framesWon - a.framesWon;
  });
}
