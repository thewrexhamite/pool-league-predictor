'use client';

import { Crown } from 'lucide-react';
import clsx from 'clsx';

interface CrownIconProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export function CrownIcon({ size = 24, className, animated = false }: CrownIconProps) {
  return (
    <Crown
      width={size}
      height={size}
      className={clsx('text-accent', animated && 'chalk-animate-crown', className)}
      strokeWidth={1.75}
    />
  );
}
