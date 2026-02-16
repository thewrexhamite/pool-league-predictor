'use client';

import { type HTMLAttributes } from 'react';
import clsx from 'clsx';

interface ChalkCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses = {
  default: 'bg-surface-card border border-surface-border',
  elevated: 'bg-surface-elevated border border-surface-border shadow-card',
  outline: 'bg-transparent border border-surface-border',
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function ChalkCard({
  variant = 'default',
  padding = 'md',
  className,
  children,
  ...props
}: ChalkCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl',
        variantClasses[variant],
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
