'use client';

import { type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type ChalkButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ChalkButtonSize = 'sm' | 'md' | 'lg';

interface ChalkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ChalkButtonVariant;
  size?: ChalkButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ChalkButtonVariant, string> = {
  primary: 'bg-baize text-fixed-black hover:bg-baize-light active:bg-baize-dark',
  secondary: 'bg-surface-elevated text-white hover:bg-surface-border active:bg-surface-elevated',
  danger: 'bg-loss/20 text-loss hover:bg-loss/30 active:bg-loss/10',
  ghost: 'bg-transparent text-gray-300 hover:bg-surface-elevated active:bg-surface-border',
};

const sizeClasses: Record<ChalkButtonSize, string> = {
  sm: 'px-3 py-2 text-sm rounded-lg',
  md: 'px-4 py-3 text-base rounded-xl',
  lg: 'px-6 py-4 text-lg rounded-xl',
};

export function ChalkButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  disabled,
  children,
  ...props
}: ChalkButtonProps) {
  return (
    <button
      className={clsx(
        'chalk-touch font-semibold transition-colors active:scale-[0.98]',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
