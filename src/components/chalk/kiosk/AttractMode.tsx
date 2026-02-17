'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ChalkTable, QueueEntry } from '@/lib/chalk/types';
import { getVenue } from '@/lib/chalk/firestore';
import { useVmin } from '@/hooks/chalk/use-vmin';
import { useTableHistory } from '@/hooks/chalk/use-match-history';
import { QRCodeDisplay } from './QRCodeDisplay';
import { CrownIcon } from '../shared/CrownIcon';

interface AttractModeProps {
  table: ChalkTable;
  onWake: () => void;
  onClaim: () => void;
}

function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;
  return <span>{time}</span>;
}

function formatNames(entry: QueueEntry) {
  if (entry.playerNames.length === 1) return entry.playerNames[0];
  return entry.playerNames.join(' & ');
}

function useQueueStatus(table: ChalkTable) {
  const waiting = table.queue.filter((e) => e.status === 'waiting').length;
  const hasGame = !!table.currentGame;

  if (!hasGame && waiting === 0) return 'No queue \u2014 walk up and play!';
  if (!hasGame && waiting > 0) return `${waiting} waiting \u2014 table is free`;
  if (hasGame && waiting === 0) return 'Game in progress \u2014 join the queue';
  return `Game in progress \u2014 ${waiting} waiting`;
}

export function AttractMode({ table, onWake, onClaim }: AttractModeProps) {
  const queueStatus = useQueueStatus(table);
  const vmin = useVmin();
  const qrSize = Math.round(Math.max(120, Math.min(500, vmin * 28)));
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { games: recentGames } = useTableHistory(table.id);

  useEffect(() => {
    if (!table.venueId) return;
    getVenue(table.venueId).then((venue) => {
      if (venue?.logoUrl) setLogoUrl(venue.logoUrl);
    });
  }, [table.venueId]);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setRipple({ x: clientX - rect.left, y: clientY - rect.top, id: Date.now() });
      // Let the ripple render a frame before waking
      requestAnimationFrame(() => {
        requestAnimationFrame(() => onWake());
      });
    },
    [onWake],
  );

  return (
    <div
      className="chalk-kiosk flex flex-col cursor-pointer chalk-attract-drift bg-surface"
      onClick={handleTap}
      onTouchStart={handleTap}
    >
      {/* Tap ripple */}
      {ripple && (
        <div
          key={ripple.id}
          className="chalk-tap-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      )}

      {/* Chalk dust particles */}
      <div className="chalk-dust-container" aria-hidden>
        <div className="chalk-dust chalk-dust-1" />
        <div className="chalk-dust chalk-dust-2" />
        <div className="chalk-dust chalk-dust-3" />
        <div className="chalk-dust chalk-dust-4" />
        <div className="chalk-dust chalk-dust-5" />
        <div className="chalk-dust chalk-dust-6" />
        <div className="chalk-dust chalk-dust-7" />
        <div className="chalk-dust chalk-dust-8" />
      </div>

      {/* Top — branding */}
      <div className="relative z-10 flex-none text-center pt-[6vmin] pb-[3vmin] chalk-animate-fade">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={table.venueName}
            className="h-[14vmin] w-auto object-contain mx-auto mb-[2vmin]"
          />
        ) : (
          <h1 className="text-[9vmin] font-bold tracking-tight chalk-attract-title">
            {table.venueName}
          </h1>
        )}
        {table.name && table.name !== table.venueName && (
          <p className="text-[2.2vmin] text-gray-400 mt-[1vmin]">{table.name}</p>
        )}
      </div>

      {/* Middle — CTA + QR code */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-[3.7vmin] chalk-animate-fade">
        <p className="text-[3.3vmin] font-semibold text-baize">
          Put your name down to play
        </p>

        <div className="flex flex-col items-center gap-[2.2vmin] p-[3vmin] rounded-[2.2vmin] bg-surface-card border-2 border-baize chalk-attract-glow">
          <QRCodeDisplay tableId={table.id} shortCode={table.shortCode} size={qrSize} showLabel={false} />
          <p className="text-baize font-semibold text-[2.2vmin]">Scan to join the queue</p>
        </div>
      </div>

      {/* Next Up + Recent Results */}
      {(table.currentGame || table.queue.length > 0 || recentGames.length > 0) && (
        <div className="relative z-10 flex-none mx-auto w-full max-w-[75vmin] px-[2.2vmin] pb-[1.5vmin] chalk-animate-fade">
          <div className="grid grid-cols-2 gap-[2.2vmin]">
            {/* Left — Next Up */}
            <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[1.1vmin]">
              <h3 className="text-[1.7vmin] font-bold text-baize">Next Up</h3>
              {table.currentGame && (
                <div className="flex items-center gap-[1.1vmin] text-[1.9vmin]">
                  <span className="text-baize font-medium">Now playing</span>
                  <span className="text-gray-300 truncate">
                    {table.currentGame.players.map((p) => p.name).join(' vs ')}
                  </span>
                </div>
              )}
              {table.queue.length > 0 ? (
                <>
                  {table.queue.slice(0, 5).map((entry, i) => (
                    <div key={entry.id} className="flex items-center gap-[1.1vmin] text-[1.9vmin]">
                      <span className="w-[2.6vmin] text-right text-gray-600 font-mono">{i + 1}.</span>
                      <span className={i === 0 && !table.currentGame ? 'text-baize font-medium' : 'text-gray-400'}>
                        {formatNames(entry)}
                      </span>
                      {entry.status === 'on_hold' && (
                        <span className="text-[1.3vmin] text-gray-600">(hold)</span>
                      )}
                    </div>
                  ))}
                  {table.queue.length > 5 && (
                    <p className="text-gray-600 text-[1.5vmin] pl-[3.7vmin]">
                      +{table.queue.length - 5} more
                    </p>
                  )}
                </>
              ) : !table.currentGame ? (
                <p className="text-gray-500 text-[1.7vmin]">No one in the queue</p>
              ) : null}
            </div>

            {/* Right — Recent Results */}
            <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[1.1vmin]">
              <h3 className="text-[1.7vmin] font-bold text-baize">Recent Results</h3>
              {recentGames.length > 0 ? (
                recentGames.slice(0, 5).map((game) => {
                  const holders = game.players.filter((p) => p.side === 'holder').map((p) => p.name);
                  const challengers = game.players.filter((p) => p.side === 'challenger').map((p) => p.name);
                  const isKiller = game.mode === 'killer';

                  return (
                    <div key={game.id} className="space-y-[0.3vmin]">
                      <div className="flex items-center gap-[1.1vmin] text-[1.9vmin]">
                        {isKiller ? (
                          <span className="text-gray-300 truncate">
                            {game.players.map((p) => p.name).join(', ')}
                          </span>
                        ) : (
                          <span className="text-gray-300 truncate">
                            {holders.join(' & ')} vs {challengers.join(' & ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-[0.8vmin] text-[1.3vmin]">
                        {game.winner && (
                          <span className="text-baize font-medium">{game.winner} won</span>
                        )}
                        {game.consecutiveWins >= 3 && (
                          <span className="flex items-center gap-[0.3vmin] text-accent">
                            <CrownIcon size={12} />
                            {game.consecutiveWins}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500 text-[1.7vmin]">No games yet this session</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom — tap CTA + stats + status */}
      <div className="relative z-10 flex-none text-center pb-[4.5vmin] space-y-[2.2vmin] chalk-animate-fade">
        <p className="text-gray-400 text-[2.2vmin]">
          or tap here to add your name
        </p>

        <button
          onClick={(e) => { e.stopPropagation(); onClaim(); }}
          onTouchStart={(e) => { e.stopPropagation(); }}
          className="text-baize/70 hover:text-baize text-[1.7vmin] underline underline-offset-4 transition-colors"
        >
          Already at the table? Tap here
        </button>

        {table.sessionStats.gamesPlayed > 0 && (
          <div className="text-[1.7vmin] text-gray-600">
            {table.sessionStats.gamesPlayed} games played this session
            {table.sessionStats.kingOfTable && (
              <> &mdash; King: {table.sessionStats.kingOfTable.playerName}</>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-[1.1vmin] text-[1.7vmin] text-gray-600">
          <span className="inline-block w-[0.9vmin] h-[0.9vmin] rounded-full bg-baize chalk-animate-pulse" />
          <span>{queueStatus}</span>
          <span className="mx-[0.4vmin]">&middot;</span>
          <LiveClock />
        </div>
      </div>
    </div>
  );
}
