'use client';

import { motion } from 'framer-motion';

interface SeasonProgressWidgetProps {
  totalPlayed: number;
  remaining: number;
  pct: number;
}

export default function SeasonProgressWidget({
  totalPlayed,
  remaining,
  pct,
}: SeasonProgressWidgetProps) {
  return (
    <div className="bg-surface-card rounded-card shadow-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-300">Season Progress</h3>
        <span className="text-xs text-gray-500">{pct}% complete</span>
      </div>
      <div className="w-full bg-surface-elevated rounded-full h-3 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-baize-dark to-baize-light rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1.5">
        {totalPlayed} played &bull; {remaining} remaining
      </p>
    </div>
  );
}
