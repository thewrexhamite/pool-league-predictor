'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface FadeInOnScrollProps {
  children: ReactNode;
  className?: string;
  /** Delay in seconds before animation starts */
  delay?: number;
  /** Animation duration in seconds */
  duration?: number;
  /** Vertical offset in pixels before animation */
  offsetY?: number;
  /** How much of the element must be visible (0-1) */
  threshold?: number;
  /** Only animate once */
  once?: boolean;
  /** Direction of the slide-in */
  direction?: 'up' | 'down' | 'left' | 'right';
}

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

function getInitial(direction: string, offsetY: number) {
  switch (direction) {
    case 'down': return { opacity: 0, y: -offsetY } as const;
    case 'left': return { opacity: 0, x: offsetY } as const;
    case 'right': return { opacity: 0, x: -offsetY } as const;
    default: return { opacity: 0, y: offsetY } as const;
  }
}

function getAnimate(direction: string) {
  if (direction === 'left' || direction === 'right') {
    return { opacity: 1, x: 0 } as const;
  }
  return { opacity: 1, y: 0 } as const;
}

export default function FadeInOnScroll({
  children,
  className,
  delay = 0,
  duration = 0.6,
  offsetY = 24,
  threshold = 0.1,
  once = true,
  direction = 'up',
}: FadeInOnScrollProps) {
  return (
    <motion.div
      initial={getInitial(direction, offsetY)}
      whileInView={getAnimate(direction)}
      viewport={{ once, amount: threshold }}
      transition={{ duration, delay, ease }}
      className={className}
      style={{ willChange: 'opacity, transform' }}
    >
      {children}
    </motion.div>
  );
}
