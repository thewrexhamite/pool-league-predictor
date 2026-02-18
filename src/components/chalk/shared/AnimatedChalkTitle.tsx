'use client';

import { motion, useAnimation } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface AnimatedChalkTitleProps {
  /** The text to animate (defaults to "Chalk It Up!") */
  text?: string;
  /** CSS font-size value, e.g. "9vmin" */
  size?: string;
  /** Delay before the animation starts, in seconds */
  delay?: number;
  /** Callback when the title entrance animation completes */
  onComplete?: () => void;
}

const letterVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: 'blur(8px)',
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

const containerVariants = {
  hidden: {},
  visible: (delay: number) => ({
    transition: {
      staggerChildren: 0.05,
      delayChildren: delay,
    },
  }),
};

export function AnimatedChalkTitle({
  text = 'Chalk It Up!',
  size = '9vmin',
  delay = 0,
  onComplete,
}: AnimatedChalkTitleProps) {
  const controls = useAnimation();
  const [showGlow, setShowGlow] = useState(false);
  const completeCalled = useRef(false);

  useEffect(() => {
    controls.start('visible');
  }, [controls]);

  const chars = text.split('');
  // Total entrance time: delay + (chars * 0.05 stagger) + 0.5s letter anim
  const entranceDuration = delay + chars.length * 0.05 + 0.5;
  const underlineDelay = delay + chars.length * 0.05 * 0.6; // start at ~60% through letters

  return (
    <div className="flex flex-col items-center gap-[0.5vmin]">
      {/* Animated title text */}
      <motion.h1
        className={`font-bold tracking-tight ${showGlow ? 'chalk-attract-title' : ''}`}
        style={{ fontSize: size, willChange: 'contents' }}
        variants={containerVariants}
        custom={delay}
        initial="hidden"
        animate={controls}
        onAnimationComplete={() => {
          setShowGlow(true);
          if (!completeCalled.current) {
            completeCalled.current = true;
            onComplete?.();
          }
        }}
      >
        {chars.map((char, i) => (
          <motion.span
            key={i}
            variants={letterVariants}
            style={{
              display: 'inline-block',
              willChange: 'transform, opacity, filter',
              // Preserve whitespace width
              ...(char === ' ' ? { width: '0.3em' } : {}),
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </motion.h1>

      {/* SVG chalk underline */}
      <motion.svg
        viewBox="0 0 300 12"
        style={{
          width: `calc(${size} * 3.3)`,
          height: `calc(${size} * 0.4)`,
          overflow: 'visible',
        }}
        aria-hidden
      >
        <motion.path
          d="M10 6 Q 75 2, 150 6 Q 225 10, 290 6"
          fill="none"
          stroke="rgb(16, 185, 129)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 0.7,
            delay: underlineDelay,
            ease: 'easeInOut',
          }}
        />
        {/* Second stroke — slightly offset chalk texture */}
        <motion.path
          d="M15 9 Q 80 5, 155 9 Q 230 12, 285 8"
          fill="none"
          stroke="rgb(16, 185, 129)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 0.6,
            delay: underlineDelay + 0.15,
            ease: 'easeInOut',
          }}
        />
      </motion.svg>
    </div>
  );
}
