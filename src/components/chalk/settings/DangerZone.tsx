'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { deleteTable } from '@/lib/chalk/firestore';
import { ChalkCard } from '../shared/ChalkCard';
import { ChalkButton } from '../shared/ChalkButton';
import { ChalkModal } from '../shared/ChalkModal';

interface DangerZoneProps {
  tableId: string;
}

export function DangerZone({ tableId }: DangerZoneProps) {
  const router = useRouter();
  const { resetTable } = useChalkTable();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleReset() {
    if (confirm('Reset the table? This clears the queue, current game, and session stats.')) {
      await resetTable();
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTable(tableId);
      router.push('/kiosk');
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <>
      <ChalkCard padding="lg" className="border-loss/30">
        <h2 className="text-lg font-bold text-loss mb-4">Danger Zone</h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Reset session</p>
              <p className="text-sm text-gray-400">
                Clear queue, current game, and stats
              </p>
            </div>
            <ChalkButton variant="danger" size="sm" onClick={handleReset}>
              Reset
            </ChalkButton>
          </div>

          <div className="h-px bg-surface-border" />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete table</p>
              <p className="text-sm text-gray-400">
                Permanently delete this table and all data
              </p>
            </div>
            <ChalkButton
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </ChalkButton>
          </div>
        </div>
      </ChalkCard>

      <ChalkModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Table?"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            This will permanently delete the table, all queue data, and game history.
            This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <ChalkButton
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </ChalkButton>
            <ChalkButton
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </ChalkButton>
          </div>
        </div>
      </ChalkModal>
    </>
  );
}
