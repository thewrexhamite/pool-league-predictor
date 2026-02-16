'use client';

import { useState } from 'react';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { ChalkButton } from '../shared/ChalkButton';
import { ChalkModal } from '../shared/ChalkModal';

interface PrivateModeToggleProps {
  isPrivate: boolean;
  privatePlayerNames: string[];
}

export function PrivateModeToggle({ isPrivate, privatePlayerNames }: PrivateModeToggleProps) {
  const { togglePrivateMode } = useChalkTable();
  const [showModal, setShowModal] = useState(false);
  const [names, setNames] = useState('');

  function handleToggleOff() {
    togglePrivateMode();
  }

  function handleOpenModal() {
    setNames('');
    setShowModal(true);
  }

  function handleConfirm() {
    const playerNames = names
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    togglePrivateMode(playerNames.length > 0 ? playerNames : undefined);
    setShowModal(false);
  }

  if (isPrivate) {
    return (
      <button
        onClick={handleToggleOff}
        className="chalk-touch px-2.5 py-1 rounded-full bg-accent/20 text-accent text-xs font-medium hover:bg-accent/30 transition-colors"
        aria-label="Disable private mode"
        title="Tap to disable private mode"
      >
        Private
        {privatePlayerNames.length > 0 && (
          <span className="ml-1 text-accent/60">({privatePlayerNames.length})</span>
        )}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="chalk-touch p-2 rounded-lg text-gray-400 hover:text-accent hover:bg-accent/10 transition-colors"
        aria-label="Enable private mode"
        title="Private mode"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect x="3" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 8V5a3 3 0 016 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <ChalkModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Private Mode"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Only listed players can join the queue. Leave blank to allow anyone who has the link.
          </p>
          <div>
            <label htmlFor="private-names" className="block text-sm font-medium mb-1">
              Allowed players (comma-separated)
            </label>
            <input
              id="private-names"
              type="text"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              placeholder="e.g. Dave, Sarah, Mike"
              className="w-full rounded-lg border border-surface-border bg-surface-elevated px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-baize"
            />
          </div>
          <div className="flex gap-3">
            <ChalkButton variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              Cancel
            </ChalkButton>
            <ChalkButton onClick={handleConfirm} className="flex-1">
              Enable
            </ChalkButton>
          </div>
        </div>
      </ChalkModal>
    </>
  );
}
