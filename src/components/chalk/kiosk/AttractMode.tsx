'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ChalkTable, QueueEntry } from '@/lib/chalk/types';
import { QRCodeDisplay } from './QRCodeDisplay';

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
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

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
      className="chalk-kiosk flex flex-col cursor-pointer chalk-attract-drift"
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
      <div className="relative z-10 flex-none text-center pt-16 pb-8 chalk-animate-fade">
        <h1 className="text-8xl font-bold tracking-tight chalk-attract-title">
          Chalk It Up!
        </h1>
        <p className="text-2xl text-gray-400 mt-4">{table.venueName}</p>
        {table.name && table.name !== table.venueName && (
          <p className="text-xl text-gray-500 mt-2">{table.name}</p>
        )}
      </div>

      {/* Middle — CTA + QR code */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-10 chalk-animate-fade">
        <p className="text-4xl font-semibold text-baize">
          Put your name down to play
        </p>

        <div className="flex flex-col items-center gap-6 p-8 rounded-3xl bg-surface-card border-2 border-baize chalk-attract-glow">
          <QRCodeDisplay tableId={table.id} shortCode={table.shortCode} size={300} showLabel={false} />
          <p className="text-baize font-semibold text-2xl">Scan to join the queue</p>
          <p className="text-gray-400 font-mono text-2xl tracking-wider">{table.shortCode}</p>
        </div>
      </div>

      {/* Queue snapshot */}
      {(table.currentGame || table.queue.length > 0) && (
        <div className="relative z-10 flex-none mx-auto w-full max-w-md px-6 pb-4 chalk-animate-fade">
          <div className="rounded-2xl bg-surface-card/60 border border-surface-border px-6 py-5 space-y-3">
            {table.currentGame && (
              <div className="flex items-center gap-3 text-xl">
                <span className="text-baize font-medium">Now playing</span>
                <span className="text-gray-300">
                  {table.currentGame.players.map((p) => p.name).join(' vs ')}
                </span>
              </div>
            )}
            {table.queue.slice(0, 5).map((entry, i) => (
              <div key={entry.id} className="flex items-center gap-3 text-xl">
                <span className="w-7 text-right text-gray-600 font-mono">{i + 1}.</span>
                <span className={i === 0 && !table.currentGame ? 'text-baize font-medium' : 'text-gray-400'}>
                  {formatNames(entry)}
                </span>
                {entry.status === 'on_hold' && (
                  <span className="text-sm text-gray-600">(hold)</span>
                )}
              </div>
            ))}
            {table.queue.length > 5 && (
              <p className="text-gray-600 text-base pl-10">
                +{table.queue.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bottom — tap CTA + stats + status */}
      <div className="relative z-10 flex-none text-center pb-12 space-y-6 chalk-animate-fade">
        <p className="text-gray-400 text-2xl">
          or tap here to add your name
        </p>

        <button
          onClick={(e) => { e.stopPropagation(); onClaim(); }}
          onTouchStart={(e) => { e.stopPropagation(); }}
          className="text-baize/70 hover:text-baize text-lg underline underline-offset-4 transition-colors"
        >
          Already at the table? Tap here
        </button>

        {table.sessionStats.gamesPlayed > 0 && (
          <div className="text-lg text-gray-600">
            {table.sessionStats.gamesPlayed} games played this session
            {table.sessionStats.kingOfTable && (
              <> &mdash; King: {table.sessionStats.kingOfTable.playerName}</>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 text-lg text-gray-600">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-baize chalk-animate-pulse" />
          <span>{queueStatus}</span>
          <span className="mx-1">&middot;</span>
          <LiveClock />
        </div>
      </div>
    </div>
  );
}
