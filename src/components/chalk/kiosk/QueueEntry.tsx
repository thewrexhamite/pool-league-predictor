'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { QueueEntry as QueueEntryType } from '@/lib/chalk/types';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { useHoldTimer } from '@/hooks/chalk/use-hold-timer';
import { GAME_MODE_LABELS } from '@/lib/chalk/constants';
import clsx from 'clsx';

interface QueueEntryProps {
  entry: QueueEntryType;
  position: number;
  isCurrentHolder: boolean;
}

export function QueueEntry({ entry, position, isCurrentHolder }: QueueEntryProps) {
  const { removeFromQueue, holdPosition, unholdPosition } = useChalkTable();
  const { minutesLeft, isExpired: holdExpired } = useHoldTimer(entry.holdUntil);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOnHold = entry.status === 'on_hold';
  const isCalled = entry.status === 'called';
  const playerLabel = entry.playerNames.join(' & ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'rounded-[1.1vmin] border p-[1.1vmin] transition-colors chalk-animate-in',
        isDragging && 'opacity-50 shadow-elevated z-10',
        isOnHold && !holdExpired && 'bg-accent/5 border-accent/20',
        isOnHold && holdExpired && 'bg-loss/5 border-loss/20',
        isCalled && 'bg-baize/10 border-baize/30',
        !isOnHold && !isCalled && 'bg-surface-card border-surface-border',
      )}
    >
      <div className="flex items-center gap-[1.1vmin]">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="chalk-touch cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 touch-none"
          aria-label={`Reorder ${playerLabel}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>

        {/* Position number */}
        <span
          className={clsx(
            'w-[3vmin] h-[3vmin] rounded-[0.7vmin] flex items-center justify-center text-[1.3vmin] font-bold',
            isCalled && 'bg-baize text-fixed-black',
            isOnHold && !holdExpired && 'bg-accent/20 text-accent',
            isOnHold && holdExpired && 'bg-loss/20 text-loss',
            !isCalled && !isOnHold && 'bg-surface-elevated text-gray-300'
          )}
        >
          {position}
        </span>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[0.75vmin]">
            <span className="font-semibold truncate text-[1.5vmin]">
              {playerLabel}
            </span>
            {entry.gameMode !== 'singles' && (
              <span className="px-[0.55vmin] py-[0.2vmin] rounded text-[1.1vmin] bg-surface-elevated text-gray-400">
                {GAME_MODE_LABELS[entry.gameMode]}
              </span>
            )}
          </div>
          {isOnHold && !holdExpired && minutesLeft !== null && (
            <p className="text-[1.1vmin] text-accent">
              Hold: {minutesLeft}m left
            </p>
          )}
          {isOnHold && holdExpired && (
            <p className="text-[1.1vmin] text-loss">
              Hold expired
            </p>
          )}
          {isCalled && (
            <p className="text-[1.1vmin] text-baize font-medium">
              Called to table
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-[0.37vmin]">
          {!isCalled && (
            <>
              {isOnHold ? (
                <button
                  onClick={() => unholdPosition(entry.id)}
                  className="chalk-touch p-[0.75vmin] rounded-[0.7vmin] text-accent hover:bg-accent/10 transition-colors"
                  aria-label={`Unhold ${playerLabel}`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8l4 4 6-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => holdPosition(entry.id)}
                  className="chalk-touch p-[0.75vmin] rounded-[0.7vmin] text-gray-500 hover:text-accent hover:bg-accent/10 transition-colors"
                  aria-label={`Hold position for ${playerLabel}`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="2" y="3" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="10" y="3" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              )}
            </>
          )}
          <button
            onClick={() => removeFromQueue(entry.id)}
            className="chalk-touch p-[0.75vmin] rounded-[0.7vmin] text-gray-500 hover:text-loss hover:bg-loss/10 transition-colors"
            aria-label={`Remove ${playerLabel} from queue`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
