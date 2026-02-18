'use client';

import { motion } from 'framer-motion';
import type { ChalkTable } from '@/lib/chalk/types';
import { AnimatedChalkTitle } from '../shared/AnimatedChalkTitle';

interface TVAttractModeProps {
  table: ChalkTable;
  onWake: () => void;
}

export function TVAttractMode({ table, onWake }: TVAttractModeProps) {
  // Timing anchors — cascade after title finishes
  const titleDuration = 1.5; // letters + underline
  const venueDelay = titleDuration;
  const ctaDelay = venueDelay + 0.4;
  const scanDelay = ctaDelay + 0.4;
  const kingDelay = scanDelay + 0.4;

  return (
    <div
      className="chalk-kiosk chalk-tv flex items-center justify-center cursor-pointer"
      onClick={onWake}
    >
      <div className="text-center space-y-[3vmin]">
        <AnimatedChalkTitle text="Chalk It Up!" size="9vmin" />

        <motion.p
          className="text-[2.8vmin] text-gray-400"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: venueDelay, ease: 'easeOut' }}
        >
          {table.venueName}
        </motion.p>

        <motion.p
          className="text-[3.3vmin] font-semibold text-baize mt-[3vmin]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: ctaDelay, ease: 'easeOut' }}
        >
          Put your name down to play
        </motion.p>

        <motion.div
          className="mt-[4.5vmin] space-y-[1.5vmin]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: scanDelay, ease: 'easeOut' }}
        >
          <p className="text-[2.2vmin] text-gray-500">Scan to join the queue</p>
          <p className="text-[3.3vmin] font-mono text-baize">{table.shortCode}</p>
        </motion.div>

        {table.sessionStats.gamesPlayed > 0 && table.sessionStats.kingOfTable && (
          <motion.div
            className="mt-[3vmin] text-[1.9vmin] text-gray-500"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: kingDelay, ease: 'easeOut' }}
          >
            King of the Table: <span className="text-accent font-medium">{table.sessionStats.kingOfTable.playerName}</span>
            {' '}({table.sessionStats.kingOfTable.consecutiveWins} wins)
          </motion.div>
        )}
      </div>
    </div>
  );
}
