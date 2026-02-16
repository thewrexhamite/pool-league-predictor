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
import { ChalkButton } from '../shared/ChalkButton';
import { QueueEntry } from './QueueEntry';
import { QRCodeDisplay } from './QRCodeDisplay';

interface QueuePanelProps {
  table: ChalkTable;
  onAddPlayer: () => void;
}

export function QueuePanel({ table, onAddPlayer }: QueuePanelProps) {
  const { reorderQueue } = useChalkTable();

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">Queue</h2>
          <span className="px-2 py-0.5 rounded-full bg-baize/20 text-baize text-sm font-medium">
            {waitingCount}
          </span>
          {holdCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-sm font-medium">
              {holdCount} held
            </span>
          )}
        </div>
        <ChalkButton size="sm" onClick={onAddPlayer}>
          + Add
        </ChalkButton>
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {table.queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 space-y-4 py-8">
            <QRCodeDisplay tableId={table.id} shortCode={table.shortCode} size={140} />
            <div className="space-y-1">
              <p className="text-lg text-gray-400">No one in the queue</p>
              <p className="text-sm">Scan the QR code to join from your phone</p>
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
