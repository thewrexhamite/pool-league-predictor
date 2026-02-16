'use client';

import { useState, useEffect, useRef } from 'react';
import type { ChalkTable } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useGameTimer } from '@/hooks/chalk/use-game-timer';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import { ChalkButton } from '../shared/ChalkButton';
import { ResultReporter } from './ResultReporter';
import { NoShowOverlay } from './NoShowOverlay';
import { KillerGamePanel } from './KillerGamePanel';
import { KingCrownAnimation } from './KingCrownAnimation';
import { Leaderboard } from './Leaderboard';
import { WinLimitNotice } from './WinLimitNotice';

interface GamePanelProps {
  table: ChalkTable;
}

export function GamePanel({ table }: GamePanelProps) {
  const { startNextGame, cancelGame } = useChalkTable();
  const { play } = useChalkSound(table.settings.soundEnabled, table.settings.soundVolume);
  const { display: gameTime } = useGameTimer(table.currentGame?.startedAt ?? null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [newKing, setNewKing] = useState<{ name: string; wins: number } | null>(null);
  const prevKingRef = useRef(table.sessionStats.kingOfTable?.crownedAt ?? null);

  // Detect when a new king is crowned
  useEffect(() => {
    const king = table.sessionStats.kingOfTable;
    if (king && king.crownedAt !== prevKingRef.current) {
      setNewKing({ name: king.playerName, wins: king.consecutiveWins });
      play('crown');
    }
    prevKingRef.current = king?.crownedAt ?? null;
  }, [table.sessionStats.kingOfTable, play]);

  const currentGame = table.currentGame;
  const waitingPlayers = table.queue.filter((e) => e.status === 'waiting');
  const canStartGame = !currentGame && waitingPlayers.length >= 2;

  // Check for called entries with active no-show deadlines
  const calledEntries = table.queue.filter((e) => e.status === 'called' && e.noShowDeadline);

  // Killer mode has its own panel
  if (currentGame?.mode === 'killer' && currentGame.killerState) {
    return <KillerGamePanel table={table} />;
  }

  async function handleStartGame() {
    setStarting(true);
    setStartError(null);
    try {
      await startNextGame();
      play('game_start');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      setStartError(message);
      play('error');
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="chalk-kiosk-game flex flex-col">
      {/* King crown ceremony */}
      {newKing && (
        <KingCrownAnimation
          playerName={newKing.name}
          consecutiveWins={newKing.wins}
          onComplete={() => setNewKing(null)}
        />
      )}

      {/* No-show overlay */}
      {calledEntries.length > 0 && (
        <NoShowOverlay entries={calledEntries} settings={table.settings} />
      )}

      {currentGame ? (
        <>
          {/* Active game */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
            {/* Game mode + timer */}
            <div className="text-center space-y-1">
              <p className="text-sm text-gray-400 uppercase tracking-wider">
                {currentGame.mode} — Game {table.sessionStats.gamesPlayed + 1}
              </p>
              <p className="text-3xl font-mono font-bold text-baize" aria-live="off">{gameTime}</p>
            </div>

            {/* Players */}
            <div className="flex items-center gap-8 w-full max-w-2xl">
              {/* Holder */}
              <div className="flex-1 text-center space-y-2">
                <p className="text-sm text-gray-400 uppercase tracking-wider">Holder</p>
                <p className="text-2xl font-bold">
                  {currentGame.players
                    .filter((p) => p.side === 'holder')
                    .map((p) => p.name)
                    .join(' & ')}
                </p>
                {currentGame.consecutiveWins > 0 && (
                  <p className="text-sm text-accent">
                    {currentGame.consecutiveWins} win{currentGame.consecutiveWins !== 1 ? 's' : ''} in a row
                  </p>
                )}
              </div>

              {/* VS */}
              <div className="flex-shrink-0">
                <span className="text-4xl font-bold text-gray-600">vs</span>
              </div>

              {/* Challenger */}
              <div className="flex-1 text-center space-y-2">
                <p className="text-sm text-gray-400 uppercase tracking-wider">Challenger</p>
                <p className="text-2xl font-bold">
                  {currentGame.players
                    .filter((p) => p.side === 'challenger')
                    .map((p) => p.name)
                    .join(' & ')}
                </p>
              </div>
            </div>

            {/* Break indicator */}
            {currentGame.breakingPlayer && (
              <p className="text-sm text-gray-400">
                <span className="text-baize font-medium">{currentGame.breakingPlayer}</span> breaks
              </p>
            )}

            {/* Win limit warning */}
            {table.settings.winLimitEnabled && currentGame.consecutiveWins >= table.settings.winLimitCount - 1 && (
              <WinLimitNotice
                winsNeeded={table.settings.winLimitCount}
                currentWins={currentGame.consecutiveWins}
              />
            )}

            {/* Result buttons */}
            <ResultReporter game={currentGame} settings={table.settings} />

            {/* Cancel */}
            <ChalkButton variant="ghost" size="sm" onClick={cancelGame}>
              Cancel game
            </ChalkButton>
          </div>
        </>
      ) : (
        <>
          {/* No active game */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
            {canStartGame ? (
              <>
                <div className="text-center space-y-2">
                  <p className="text-lg text-gray-400">Next up:</p>
                  <p className="text-2xl font-bold">
                    {waitingPlayers[0].playerNames.join(' & ')}
                    {' vs '}
                    {waitingPlayers[1].playerNames.join(' & ')}
                  </p>
                </div>
                <ChalkButton
                  size="lg"
                  onClick={handleStartGame}
                  disabled={starting}
                >
                  {starting ? 'Starting…' : 'Start Game'}
                </ChalkButton>
                {startError && (
                  <p className="text-loss text-sm" role="alert">{startError}</p>
                )}
              </>
            ) : (
              <div className="text-center space-y-3 text-gray-500">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto opacity-30" aria-hidden="true">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" />
                  <circle cx="32" cy="32" r="4" fill="currentColor" />
                </svg>
                <p className="text-xl">Waiting for players</p>
                <p className="text-sm">
                  Need at least 2 in the queue to start
                </p>
              </div>
            )}
          </div>

          {/* Session leaderboard */}
          {table.sessionStats.gamesPlayed > 0 && (
            <div className="border-t border-surface-border p-4">
              <Leaderboard stats={table.sessionStats} compact />
            </div>
          )}
        </>
      )}
    </div>
  );
}
