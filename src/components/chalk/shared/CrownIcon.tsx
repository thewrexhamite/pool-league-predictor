'use client';

import clsx from 'clsx';

interface CrownIconProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export function CrownIcon({ size = 24, className, animated = false }: CrownIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={clsx(animated && 'chalk-animate-crown', className)}
    >
      <path
        d="M2 20h20L19 8l-5 5-2-7-2 7-5-5L2 20z"
        fill="rgb(var(--accent))"
        stroke="rgb(var(--accent-light))"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="6" r="1" fill="rgb(var(--accent-light))" />
      <circle cx="5" cy="8" r="1" fill="rgb(var(--accent-light))" />
      <circle cx="19" cy="8" r="1" fill="rgb(var(--accent-light))" />
    </svg>
  );
}
