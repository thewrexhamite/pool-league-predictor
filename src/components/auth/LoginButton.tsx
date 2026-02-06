'use client';

/**
 * Login Button Component
 *
 * A simple button that triggers the login modal or navigates to login page.
 */

import { useAuth } from '@/lib/auth';
import { LogIn } from 'lucide-react';

interface LoginButtonProps {
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoginButton({
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
}: LoginButtonProps) {
  const { loading } = useAuth();

  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors';

  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700',
    ghost: 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <LogIn className="w-4 h-4" />
      )}
      <span>Sign In</span>
    </button>
  );
}
