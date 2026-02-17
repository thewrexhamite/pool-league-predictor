'use client';

import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { ChalkTable } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useVmin } from '@/hooks/chalk/use-vmin';
import { ChalkButton } from '../shared/ChalkButton';
import { QueueEntry } from './QueueEntry';
import { QRCodeDisplay } from './QRCodeDisplay';

interface QueuePanelProps {
  table: ChalkTable;
  onAddPlayer: () => void;
}

export function QueuePanel({ table, onAddPlayer }: QueuePanelProps) {
  const { reorderQueue } = useChalkTable();
  const vmin = useVmin();
  const qrSize = Math.round(Math.max(140, Math.min(360, vmin * 24)));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const newIndex = table.queue.findIndex((e) => e.id === over.id);
      if (newIndex !== -1) {
        reorderQueue(active.id as string, newIndex);
      }
    },
    [table.queue, reorderQueue]
  );

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
        <ChalkButton size="sm" onClick={onAddPlayer}>
          + Add
        </ChalkButton>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto p-[1.1vmin] space-y-[0.75vmin]">
        {table.queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-[1.5vmin] py-[3vmin]">
            <QRCodeDisplay tableId={table.id} shortCode={table.shortCode} size={qrSize} />
            <div className="space-y-[0.37vmin]">
              <p className="text-[1.7vmin] text-gray-400">No one in the queue</p>
              <p className="text-[1.3vmin]">Scan the QR code to join from your phone</p>
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={table.queue.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              {table.queue.map((entry, index) => (
                <QueueEntry
                  key={entry.id}
                  entry={entry}
                  position={index + 1}
                  isCurrentHolder={index === 0 && !!table.currentGame}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
