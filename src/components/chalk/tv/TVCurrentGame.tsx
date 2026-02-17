'use client';

import type { ChalkTable } from '@/lib/chalk/types';
import { useGameTimer } from '@/hooks/chalk/use-game-timer';
import { CHALK_DEFAULTS } from '@/lib/chalk/constants';
import { CrownIcon } from '../shared/CrownIcon';

interface TVCurrentGameProps {
  table: ChalkTable;
}

export function TVCurrentGame({ table }: TVCurrentGameProps) {
  const game = table.currentGame;
  const { display: gameTime } = useGameTimer(game?.startedAt ?? null);

  if (!game) return null;

  const holders = game.players.filter((p) => p.side === 'holder');
  const challengers = game.players.filter((p) => p.side === 'challenger');

  // For killer mode
  if (game.mode === 'killer' && game.killerState) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-[3vmin] chalk-animate-fade">
        <div className="text-center space-y-[0.75vmin]">
          <p className="text-[1.9vmin] text-gray-400 uppercase tracking-wider">
            Killer — Round {game.killerState.round}
          </p>
          <p className="text-[4.4vmin] font-mono font-bold text-baize">{gameTime}</p>
        </div>
        <div className="grid grid-cols-3 gap-[2.2vmin] max-w-[71vmin]">
          {game.killerState.players.map((player) => (
            <div
              key={player.name}
              className={`text-center p-[2.2vmin] rounded-[1.1vmin] border ${
                player.isEliminated
                  ? 'opacity-30 border-surface-border'
                  : 'border-surface-border bg-surface-card'
              }`}
            >
              <p className={`text-[2.2vmin] font-bold ${player.isEliminated ? 'line-through' : ''}`}>
                {player.name}
              </p>
              <div className="flex justify-center gap-[0.75vmin] mt-[1.1vmin]">
                {Array.from({ length: CHALK_DEFAULTS.KILLER_DEFAULT_LIVES }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-[1.85vmin] h-[1.85vmin] rounded-full ${
                      i < player.lives ? 'bg-loss' : 'bg-surface-border'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-[3vmin] chalk-animate-fade">
      <div className="text-center space-y-[0.75vmin]">
        <p className="text-[1.9vmin] text-gray-400 uppercase tracking-wider">
          {game.mode} — Game {table.sessionStats.gamesPlayed + 1}
        </p>
        <p className="text-[4.4vmin] font-mono font-bold text-baize">{gameTime}</p>
      </div>

      <div className="flex items-center gap-[4.5vmin] w-full max-w-[83vmin]">
        {/* Holder */}
        <div className="flex-1 text-center space-y-[1.1vmin]">
          <p className="text-[1.5vmin] text-gray-400 uppercase tracking-wider">Holder</p>
          <p className="text-[3.7vmin] font-bold">
            {holders.map((p) => p.name).join(' & ')}
          </p>
          {game.consecutiveWins > 0 && (
            <div className="flex items-center justify-center gap-[0.75vmin]">
              {game.consecutiveWins >= 3 && <CrownIcon size={20} />}
              <span className="text-[1.7vmin] text-accent">
                {game.consecutiveWins} win{game.consecutiveWins !== 1 ? 's' : ''} in a row
              </span>
            </div>
          )}
        </div>

        <span className="text-[5.6vmin] font-bold text-gray-600">vs</span>

        {/* Challenger */}
        <div className="flex-1 text-center space-y-[1.1vmin]">
          <p className="text-[1.5vmin] text-gray-400 uppercase tracking-wider">Challenger</p>
          <p className="text-[3.7vmin] font-bold">
            {challengers.map((p) => p.name).join(' & ')}
          </p>
        </div>
      </div>

      {game.breakingPlayer && (
        <p className="text-[1.7vmin] text-gray-400">
          <span className="text-baize font-medium">{game.breakingPlayer}</span> breaks
        </p>
      )}

      {/* Next up */}
      {table.queue.filter((e) => e.status === 'waiting').length > 0 && (
        <div className="text-center mt-[1.5vmin]">
          <p className="text-[1.5vmin] text-gray-500">
            Next up: <span className="text-gray-300 font-medium">
              {table.queue.find((e) => e.status === 'waiting')?.playerNames.join(' & ')}
            </span>
            {table.queue.filter((e) => e.status === 'waiting').length > 1 && (
              <span className="text-gray-600">
                {' '}+{table.queue.filter((e) => e.status === 'waiting').length - 1} more
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
