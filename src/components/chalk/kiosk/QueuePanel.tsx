'use client';

import type { ChalkTable } from '@/lib/chalk/types';
import { useVmin } from '@/hooks/chalk/use-vmin';
import { ChalkButton } from '../shared/ChalkButton';
import { QueueEntry } from './QueueEntry';
import { QRCodeDisplay } from './QRCodeDisplay';

interface QueuePanelProps {
  table: ChalkTable;
  onAddPlayer: () => void;
  onStartKiller: () => void;
}

export function QueuePanel({ table, onAddPlayer, onStartKiller }: QueuePanelProps) {
  const vmin = useVmin();
  const qrSize = Math.round(Math.max(140, Math.min(360, vmin * 24)));

  const waitingCount = table.queue.filter((e) => e.status === 'waiting').length;
  const holdCount = table.queue.filter((e) => e.status === 'on_hold').length;

  return (
    <div className="chalk-kiosk-queue flex flex-col">
      {/* Queue header */}
      <div className="flex items-center justify-between px-[1.5vmin] py-[1.1vmin] border-b border-surface-border">
        <div className="flex items-center gap-[1.1vmin]">
          <h2 className="text-[1.7vmin] font-bold">Queue</h2>
          <span className="px-[0.75vmin] py-[0.2vmin] rounded-full bg-baize/20 text-baize text-[1.3vmin] font-medium">
            {waitingCount}
          </span>
          {holdCount > 0 && (
            <span className="px-[0.75vmin] py-[0.2vmin] rounded-full bg-accent/20 text-accent text-[1.3vmin] font-medium">
              {holdCount} held
            </span>
          )}
        </div>
        <div className="flex items-center gap-[0.75vmin]">
          <ChalkButton size="sm" variant="secondary" onClick={onStartKiller} disabled={!!table.currentGame}>
            Start Killer
          </ChalkButton>
          <ChalkButton size="sm" onClick={onAddPlayer}>
            + Add
          </ChalkButton>
        </div>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto p-[1.1vmin] space-y-[0.75vmin]">
        {table.queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-[1.5vmin] py-[3vmin]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <QRCodeDisplay tableId={table.id} shortCode={table.shortCode} size={qrSize} />
            <div className="space-y-[0.37vmin]">
              <p className="text-[1.7vmin]" style={{ color: 'rgba(255,255,255,0.65)' }}>No one in the queue</p>
              <p className="text-[1.3vmin]">Scan the QR code to join from your phone</p>
            </div>
          </div>
        ) : (
          <>
            {table.queue.map((entry, index) => (
              <QueueEntry
                key={entry.id}
                entry={entry}
                position={index + 1}
                isCurrentHolder={index === 0 && !!table.currentGame}
              />
            ))}
            {/* Persistent QR code at bottom of queue */}
            <div className="flex items-center gap-[1.1vmin] mt-[1.5vmin] pt-[1.5vmin] border-t border-surface-border/50">
              <QRCodeDisplay tableId={table.id} shortCode={table.shortCode} size={Math.round(Math.max(60, Math.min(100, vmin * 7)))} showLabel={false} />
              <div className="flex-1 min-w-0">
                <p className="text-[1.1vmin]" style={{ color: 'rgba(255,255,255,0.65)' }}>Scan to join the queue</p>
                <p className="text-[1.1vmin] font-mono text-baize">{table.shortCode}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
