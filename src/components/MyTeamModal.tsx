'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Star } from 'lucide-react';
import type { DivisionCode } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';

interface MyTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  myTeam: { team: string; div: DivisionCode } | null;
  onSetMyTeam: (team: string, div: DivisionCode) => void;
  onClearMyTeam: () => void;
}

export default function MyTeamModal({
  isOpen,
  onClose,
  myTeam,
  onSetMyTeam,
  onClearMyTeam,
}: MyTeamModalProps) {
  const { ds } = useActiveData();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-surface-card border border-surface-border rounded-card shadow-elevated p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Star size={20} className="text-accent" />
              Set My Team
            </h3>
            {(Object.entries(ds.divisions) as [DivisionCode, { name: string; teams: string[] }][]).map(([divCode, divData]) => (
              <div key={divCode} className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{divData.name}</h4>
                <div className="grid grid-cols-2 gap-1">
                  {divData.teams.map(team => (
                    <button
                      key={team}
                      onClick={() => onSetMyTeam(team, divCode)}
                      className={clsx(
                        'text-left text-sm px-3 py-1.5 rounded transition',
                        myTeam?.team === team
                          ? 'bg-accent text-fixed-white'
                          : 'text-gray-300 hover:bg-surface-elevated'
                      )}
                    >
                      {team}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {myTeam && (
              <button
                onClick={onClearMyTeam}
                className="w-full mt-2 text-loss text-sm py-2 hover:bg-loss-muted/20 rounded transition"
              >
                Clear My Team
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
