'use client';

/**
 * Auth Guard Component
 *
 * Wraps content that requires authentication.
 * Shows a login prompt if user is not authenticated.
 */

import { type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { OAuthButtons } from './OAuthButtons';
import { Shield, Lock } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  message?: string;
  showLoginForm?: boolean;
}

export function AuthGuard({
  children,
  fallback,
  message = 'Sign in to continue',
  showLoginForm = true,
}: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showLoginForm) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Lock className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-6">
          <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {message}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          Create an account or sign in to access this feature.
        </p>
        <div className="w-full">
          <OAuthButtons />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
