'use client';

import { useState } from 'react';
import type { ChalkTable } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useGameTimer } from '@/hooks/chalk/use-game-timer';
import { isKillerGameOver, getKillerWinner } from '@/lib/chalk/game-engine';
import { ChalkButton } from '../shared/ChalkButton';
import { CrownIcon } from '../shared/CrownIcon';
import clsx from 'clsx';

interface KillerGamePanelProps {
  table: ChalkTable;
}

export function KillerGamePanel({ table }: KillerGamePanelProps) {
  const { eliminateKillerPlayer, cancelGame, finishKillerGame } = useChalkTable();
  const { display: gameTime } = useGameTimer(table.currentGame?.startedAt ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  if (!table.currentGame?.killerState) {
    return (
      <div className="chalk-kiosk-game flex items-center justify-center p-[3vmin]">
        <p className="text-[1.5vmin] text-gray-400">No active killer game</p>
      </div>
    );
  }

  const game = table.currentGame;
  const killerState = game.killerState!;
  const gameOver = isKillerGameOver(killerState);
  const winner = getKillerWinner(killerState);

  async function handleEliminate(playerName: string) {
    setActionError(null);
    try {
      await eliminateKillerPlayer({ eliminatedPlayerName: playerName });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to eliminate player');
    }
  }

  async function handleFinishKiller() {
    if (!winner) return;
    setFinishing(true);
    setActionError(null);
    try {
      await finishKillerGame(winner);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to finish game');
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="chalk-kiosk-game flex flex-col items-center justify-center p-[3vmin] space-y-[3vmin]">
      <div className="text-center space-y-[0.37vmin]">
        <p className="text-[1.3vmin] text-gray-400 uppercase tracking-wider">
          Killer — Round {killerState.round}
        </p>
        <p className="text-[2.8vmin] font-mono font-bold text-baize">{gameTime}</p>
      </div>

      {gameOver && winner ? (
        <div className="text-center space-y-[1.5vmin] chalk-animate-in">
          <CrownIcon size={48} animated className="mx-auto" />
          <p className="text-[2.8vmin] font-bold text-accent">{winner} wins!</p>
          <ChalkButton size="lg" onClick={handleFinishKiller} disabled={finishing}>
            {finishing ? 'Finishing…' : 'Finish Game'}
          </ChalkButton>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-[1.5vmin] w-full max-w-[47vmin]">
            {killerState.players.map((player) => (
              <div
                key={player.name}
                className={clsx(
                  'rounded-[1.1vmin] border p-[1.5vmin] text-center space-y-[0.75vmin] transition-opacity',
                  player.isEliminated
                    ? 'opacity-30 border-surface-border'
                    : 'border-surface-border bg-surface-card'
                )}
              >
                <p className={clsx('font-bold text-[1.7vmin]', player.isEliminated && 'line-through')}>
                  {player.name}
                </p>
                <div className="flex justify-center gap-[0.37vmin]">
                  {Array.from({ length: killerState.maxLives ?? 3 }).map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        'w-[1.1vmin] h-[1.1vmin] rounded-full',
                        i < player.lives ? 'bg-loss' : 'bg-surface-border'
                      )}
                    />
                  ))}
                </div>
                {!player.isEliminated && (
                  <button
                    onClick={() => handleEliminate(player.name)}
                    className="chalk-touch px-[1.1vmin] py-[0.55vmin] rounded-[0.7vmin] bg-loss/20 text-loss text-[1.3vmin] hover:bg-loss/30 transition-colors"
                  >
                    -1 Life
                  </button>
                )}
              </div>
            ))}
          </div>

          <ChalkButton variant="ghost" size="sm" onClick={cancelGame}>
            Cancel game
          </ChalkButton>
        </>
      )}

      {actionError && (
        <p className="text-loss text-[1.3vmin]" role="alert">{actionError}</p>
      )}
    </div>
  );
}
