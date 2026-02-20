'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChalkTable } from '@/lib/chalk/types';
import { findCompatibleChallenger } from '@/lib/chalk/game-engine';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useGameTimer } from '@/hooks/chalk/use-game-timer';
import { useChalkSound } from '@/hooks/chalk/use-chalk-sound';
import { useTablePeriodStats } from '@/hooks/chalk/use-table-period-stats';
import { useVmin } from '@/hooks/chalk/use-vmin';
import { ChalkButton } from '../shared/ChalkButton';
import { ResultReporter } from './ResultReporter';
import { NoShowOverlay } from './NoShowOverlay';
import { KillerGamePanel } from './KillerGamePanel';
import { KingCrownAnimation } from './KingCrownAnimation';
import { Leaderboard } from './Leaderboard';
import { WinLimitNotice } from './WinLimitNotice';
import { QRCodeDisplay } from './QRCodeDisplay';
import { CoinTossOverlay } from './CoinTossOverlay';
import { CrownIcon } from '../shared/CrownIcon';

interface GamePanelProps {
  table: ChalkTable;
}

export function GamePanel({ table }: GamePanelProps) {
  const { startNextGame, cancelGame, setBreakingPlayer } = useChalkTable();
  const { play } = useChalkSound(table.settings.soundEnabled, table.settings.soundVolume);
  const { display: gameTime } = useGameTimer(table.currentGame?.startedAt ?? null);
  const vmin = useVmin();
  const qrSize = Math.round(Math.max(120, Math.min(280, vmin * 18)));
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [newKing, setNewKing] = useState<{ name: string; wins: number } | null>(null);
  const [showCoinToss, setShowCoinToss] = useState(false);
  const prevKingRef = useRef(table.sessionStats.kingOfTable?.crownedAt ?? null);
  const { daily, refresh: refreshPeriodStats } = useTablePeriodStats(table.id);
  const prevGamesPlayedRef = useRef(table.sessionStats.gamesPlayed);

  // Refresh daily stats when a game ends (gamesPlayed changes)
  useEffect(() => {
    if (table.sessionStats.gamesPlayed > prevGamesPlayedRef.current) {
      refreshPeriodStats();
    }
    prevGamesPlayedRef.current = table.sessionStats.gamesPlayed;
  }, [table.sessionStats.gamesPlayed, refreshPeriodStats]);

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

  // Compute the actual next matchup (mirroring game-engine logic)
  let nextHolder = waitingPlayers[0];
  let nextChallenger: typeof nextHolder | null = waitingPlayers[1] ?? null;
  if (!currentGame && waitingPlayers.length >= 2) {
    const challengeEntry = waitingPlayers.find((e) => e.gameMode === 'challenge');
    if (challengeEntry) {
      const holderEntry = waitingPlayers.find((e) => e.id !== challengeEntry.id);
      nextHolder = holderEntry ?? waitingPlayers[0];
      nextChallenger = challengeEntry;
    } else {
      // Skip incompatible game modes (e.g. singles vs doubles)
      nextChallenger = findCompatibleChallenger(waitingPlayers, nextHolder);
    }
  }
  const canStartGame = !currentGame && !!nextHolder && !!nextChallenger;

  // Check for called entries with active no-show deadlines
  const calledEntries = table.queue.filter((e) => e.status === 'called' && e.noShowDeadline);

  const handleCoinTossResult = useCallback(async (winnerName: string) => {
    try {
      await setBreakingPlayer(winnerName);
    } catch {
      // Non-critical — overlay already shows the result visually
    }
  }, [setBreakingPlayer]);

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
        <NoShowOverlay entries={calledEntries} settings={table.settings} currentGame={table.currentGame} />
      )}

      {/* Coin toss overlay */}
      {showCoinToss && currentGame && currentGame.mode !== 'killer' && (
        <CoinTossOverlay
          holderName={currentGame.players.filter((p) => p.side === 'holder').map((p) => p.name).join(' & ')}
          challengerName={currentGame.players.filter((p) => p.side === 'challenger').map((p) => p.name).join(' & ')}
          onResult={handleCoinTossResult}
          onDismiss={() => setShowCoinToss(false)}
        />
      )}

      {currentGame ? (
        /* Active game */
        <div className="flex-none flex flex-col items-center justify-center p-[3vmin] space-y-[2vmin]">
          {/* Game mode + timer */}
          <div className="text-center space-y-[0.37vmin]">
            <p className="text-[1.3vmin] text-gray-400 uppercase tracking-wider">
              {currentGame.mode} — Game {table.sessionStats.gamesPlayed + 1}
            </p>
            <p className="text-[2.8vmin] font-mono font-bold text-baize" aria-live="off">{gameTime}</p>
          </div>

          {/* Players */}
          <div className="flex items-center gap-[3vmin] w-full max-w-[63vmin]">
            {/* Holder */}
            <div className="flex-1 text-center space-y-[0.75vmin]">
              <p className="text-[1.3vmin] text-gray-400 uppercase tracking-wider">Holder</p>
              <p className="text-[2.2vmin] font-bold">
                {currentGame.players
                  .filter((p) => p.side === 'holder')
                  .map((p) => p.name)
                  .join(' & ')}
              </p>
              {currentGame.consecutiveWins > 0 && (
                <p className="text-[1.3vmin] text-accent">
                  {currentGame.consecutiveWins} win{currentGame.consecutiveWins !== 1 ? 's' : ''} in a row
                </p>
              )}
            </div>

            {/* VS */}
            <div className="flex-shrink-0">
              <span className="text-[3.7vmin] font-bold text-gray-600">vs</span>
            </div>

            {/* Challenger */}
            <div className="flex-1 text-center space-y-[0.75vmin]">
              <p className="text-[1.3vmin] text-gray-400 uppercase tracking-wider">Challenger</p>
              <p className="text-[2.2vmin] font-bold">
                {currentGame.players
                  .filter((p) => p.side === 'challenger')
                  .map((p) => p.name)
                  .join(' & ')}
              </p>
            </div>
          </div>

          {/* Break indicator + coin toss */}
          <div className="flex items-center gap-[1.5vmin]">
            {currentGame.breakingPlayer && (
              <p className="text-[1.3vmin] text-gray-400">
                <span className="text-baize font-medium">{currentGame.breakingPlayer}</span> breaks
              </p>
            )}
            {currentGame.mode !== 'killer' && (
              <button
                className="text-[1.1vmin] text-accent hover:text-accent-light transition-colors underline underline-offset-2"
                onClick={() => setShowCoinToss(true)}
              >
                Flip for it?
              </button>
            )}
          </div>

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

          {/* Up Next */}
          {waitingPlayers.length >= 1 && (
            <div className="w-full max-w-[63vmin] rounded-[1.1vmin] bg-surface-elevated/50 border border-surface-border px-[2vmin] py-[1.1vmin] text-center">
              <p className="text-[1.1vmin] text-gray-500 uppercase tracking-wider">Up Next</p>
              <p className="text-[1.5vmin] font-semibold text-gray-300 mt-[0.3vmin]">
                {waitingPlayers[0].playerNames.join(' & ')}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* No active game */
        <div className="flex-none flex flex-col items-center justify-center p-[3vmin] space-y-[2.2vmin]">
          {canStartGame && nextChallenger ? (
            <>
              <div className="text-center space-y-[0.75vmin]">
                <p className="text-[1.7vmin] text-gray-400">Next up:</p>
                <p className="text-[2.2vmin] font-bold">
                  {nextHolder.playerNames.join(' & ')}
                  {' vs '}
                  {nextChallenger.playerNames.join(' & ')}
                </p>
                {nextChallenger.gameMode === 'challenge' && (
                  <p className="text-[1.3vmin] text-accent">Challenge match</p>
                )}
              </div>
              <ChalkButton
                size="lg"
                onClick={handleStartGame}
                disabled={starting}
              >
                {starting ? 'Starting…' : 'Start Game'}
              </ChalkButton>
              {startError && (
                <p className="text-loss text-[1.3vmin]" role="alert">{startError}</p>
              )}
            </>
          ) : (
            <div className="text-center space-y-[2vmin] text-gray-500">
              <QRCodeDisplay tableId={table.id} shortCode={table.shortCode} size={qrSize} />
              <p className="text-[1.9vmin] text-gray-400">Waiting for players</p>
              <p className="text-[1.3vmin]">
                Scan to join or tap <span className="text-baize font-medium">+ Add</span> to add players
              </p>
            </div>
          )}
        </div>
      )}

      {/* Today's stats, leaderboard + recent games (always visible) */}
      {(daily.gamesPlayed > 0 || table.sessionStats.gamesPlayed > 0) && (() => {
        const stats = daily.gamesPlayed > 0 ? daily.stats : table.sessionStats;
        const playerCount = Object.keys(stats.playerStats).length;
        const gamesCount = daily.gamesPlayed > 0 ? daily.gamesPlayed : table.sessionStats.gamesPlayed;
        // Average game duration from daily games
        const avgDuration = daily.games.length > 0
          ? Math.round(daily.games.reduce((sum, g) => sum + g.duration, 0) / daily.games.length / 1000 / 60)
          : null;

        return (
          <div className="flex-1 border-t border-surface-border p-[1.5vmin] space-y-[1.5vmin] overflow-y-auto">
            {/* Session stats summary */}
            <div className="flex gap-[1.1vmin]">
              <div className="flex-1 rounded-[0.7vmin] bg-surface-elevated/50 px-[1.1vmin] py-[0.75vmin] text-center">
                <p className="text-[1.7vmin] font-bold text-baize">{gamesCount}</p>
                <p className="text-[1vmin] text-gray-500 uppercase">Games</p>
              </div>
              <div className="flex-1 rounded-[0.7vmin] bg-surface-elevated/50 px-[1.1vmin] py-[0.75vmin] text-center">
                <p className="text-[1.7vmin] font-bold text-accent">{playerCount}</p>
                <p className="text-[1vmin] text-gray-500 uppercase">Players</p>
              </div>
              {avgDuration !== null && (
                <div className="flex-1 rounded-[0.7vmin] bg-surface-elevated/50 px-[1.1vmin] py-[0.75vmin] text-center">
                  <p className="text-[1.7vmin] font-bold text-gray-300">{avgDuration}m</p>
                  <p className="text-[1vmin] text-gray-500 uppercase">Avg Game</p>
                </div>
              )}
            </div>

            <Leaderboard
              stats={stats}
              title="Today's Leaderboard"
              compact
            />

            {/* Recent games */}
            {daily.games.length > 0 && (
              <div className="space-y-[0.75vmin]">
                <h3 className="text-[1.3vmin] font-bold">Recent Games</h3>
                {daily.games.slice(0, 5).map((game) => {
                  const isKiller = game.mode === 'killer';
                  const holders = game.players.filter((p) => p.side === 'holder').map((p) => p.name);
                  const challengers = game.players.filter((p) => p.side === 'challenger').map((p) => p.name);

                  return (
                    <div key={game.id} className="flex items-center gap-[0.55vmin] text-[1.3vmin]">
                      <span className="text-gray-400 truncate flex-1">
                        {isKiller
                          ? game.players.map((p) => p.name).join(', ')
                          : `${holders.join(' & ')} vs ${challengers.join(' & ')}`}
                      </span>
                      {game.winner && (
                        <span className="text-baize font-medium flex items-center gap-[0.3vmin]">
                          → {game.winner}
                          {game.consecutiveWins >= 3 && <CrownIcon size={10} />}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
