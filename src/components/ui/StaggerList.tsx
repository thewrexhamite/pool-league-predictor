'use client';

import { ReactNode, Children } from 'react';
import { motion } from 'framer-motion';

interface StaggerListProps {
  children: ReactNode;
  className?: string;
  /** Delay between each child animation */
  staggerDelay?: number;
  /** Animation duration for each child */
  duration?: number;
  /** Vertical offset before animation */
  offsetY?: number;
  /** How much of container must be visible (0-1) */
  threshold?: number;
  /** Only animate once */
  once?: boolean;
}

const ease = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const containerVariants = (staggerDelay: number) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

const itemVariants = (duration: number, offsetY: number) => ({
  hidden: { opacity: 0, y: offsetY },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration, ease },
  },
});

export default function StaggerList({
  children,
  className,
  staggerDelay = 0.08,
  duration = 0.5,
  offsetY = 20,
  threshold = 0.05,
  once = true,
}: StaggerListProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={containerVariants(staggerDelay)}
      className={className}
    >
      {Children.map(children, (child) => {
        if (!child) return null;
        return (
          <motion.div variants={itemVariants(duration, offsetY)}>
            {child}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
