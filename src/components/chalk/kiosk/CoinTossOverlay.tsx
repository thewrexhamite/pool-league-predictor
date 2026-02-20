'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CoinTossOverlayProps {
  holderName: string;
  challengerName: string;
  onResult: (winnerName: string) => void;
  onDismiss: () => void;
}

type Phase = 'ready' | 'spinning' | 'result';

export function CoinTossOverlay({ holderName, challengerName, onResult, onDismiss }: CoinTossOverlayProps) {
  const [phase, setPhase] = useState<Phase>('ready');
  const [winner, setWinner] = useState<string | null>(null);
  // Total rotation: pick a random number of full spins + final half to land on back
  const [targetRotation, setTargetRotation] = useState(0);
  const [winnerIsHolder, setWinnerIsHolder] = useState(true);

  const flip = useCallback(() => {
    // Random pick
    const isHolder = Math.random() < 0.5;
    setWinnerIsHolder(isHolder);
    setWinner(isHolder ? holderName : challengerName);

    // Full rotations (4-6 full spins) plus 0 for heads (holder) or 180 for tails (challenger)
    const fullSpins = 4 + Math.floor(Math.random() * 3);
    const finalAngle = isHolder ? 0 : 180;
    setTargetRotation(fullSpins * 360 + finalAngle);

    setPhase('spinning');
  }, [holderName, challengerName]);

  // Transition to result phase after spin completes
  useEffect(() => {
    if (phase !== 'spinning') return;
    const timer = setTimeout(() => {
      setPhase('result');
    }, 2500);
    return () => clearTimeout(timer);
  }, [phase]);

  // Fire onResult when result is shown
  useEffect(() => {
    if (phase !== 'result' || !winner) return;
    onResult(winner);
  }, [phase, winner, onResult]);

  // Auto-dismiss after 3s on result
  useEffect(() => {
    if (phase !== 'result') return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [phase, onDismiss]);

  return (
    <div className="chalk-coin-toss-overlay" onClick={phase === 'result' ? onDismiss : undefined}>
      <AnimatePresence mode="wait">
        {phase === 'ready' && (
          <motion.div
            key="ready"
            className="text-center space-y-[4vmin]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[3vmin] font-bold text-accent uppercase tracking-[0.4vmin]">
              Coin Toss
            </p>
            <p className="text-[2vmin]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {holderName} vs {challengerName}
            </p>

            {/* Coin preview */}
            <div className="chalk-coin-container mx-auto">
              <div className="chalk-coin">
                <div className="chalk-coin-face chalk-coin-heads">
                  <span className="text-[3vmin] font-bold">{holderName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="chalk-coin-face chalk-coin-tails">
                  <span className="text-[3vmin] font-bold">{challengerName.charAt(0).toUpperCase()}</span>
                </div>
              </div>
            </div>

            <motion.button
              className="px-[4vmin] py-[1.5vmin] rounded-[1.5vmin] bg-accent text-black font-bold text-[2.5vmin] uppercase tracking-wider"
              whileTap={{ scale: 0.95 }}
              onClick={flip}
            >
              Flip!
            </motion.button>

            <button
              className="block mx-auto text-[1.5vmin] text-gray-500 hover:text-gray-300 transition-colors"
              onClick={onDismiss}
            >
              Cancel
            </button>
          </motion.div>
        )}

        {phase === 'spinning' && (
          <motion.div
            key="spinning"
            className="text-center space-y-[3vmin]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-[2.5vmin] font-bold text-gray-400 uppercase tracking-[0.3vmin]">
              Flipping...
            </p>

            {/* Spinning coin */}
            <div className="chalk-coin-container mx-auto">
              <motion.div
                className="chalk-coin"
                initial={{ rotateY: 0 }}
                animate={{ rotateY: targetRotation }}
                transition={{
                  duration: 2.4,
                  ease: [0.2, 0.8, 0.3, 1], // Fast start, slow deceleration
                }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="chalk-coin-face chalk-coin-heads">
                  <span className="text-[3vmin] font-bold">{holderName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="chalk-coin-face chalk-coin-tails">
                  <span className="text-[3vmin] font-bold">{challengerName.charAt(0).toUpperCase()}</span>
                </div>
              </motion.div>
            </div>

            <div className="flex justify-center gap-[4vmin] text-[2vmin]">
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{holderName}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>vs</span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{challengerName}</span>
            </div>
          </motion.div>
        )}

        {phase === 'result' && winner && (
          <motion.div
            key="result"
            className="text-center space-y-[3vmin]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 15 }}
          >
            {/* Landed coin */}
            <div className="chalk-coin-container mx-auto">
              <div
                className="chalk-coin"
                style={{
                  transform: `rotateY(${winnerIsHolder ? 0 : 180}deg)`,
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="chalk-coin-face chalk-coin-heads">
                  <span className="text-[3vmin] font-bold">{holderName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="chalk-coin-face chalk-coin-tails">
                  <span className="text-[3vmin] font-bold">{challengerName.charAt(0).toUpperCase()}</span>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <p className="text-[5vmin] font-bold chalk-animate-shake" style={{ color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
                {winner}
              </p>
              <p className="text-[2.5vmin] font-semibold text-baize mt-[1vmin]">
                breaks!
              </p>
            </motion.div>

            <motion.p
              className="text-[1.3vmin] text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Tap to continue
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
