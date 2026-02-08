'use client';

/**
 * Admin Guard Component
 *
 * Wraps content that requires admin privileges.
 * Shows a login prompt if user is not authenticated.
 * Shows an access denied message if user is not an admin.
 */

import { type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useAdmin } from '@/hooks/use-admin';
import { OAuthButtons } from '../auth/OAuthButtons';
import { Shield, Lock, ShieldAlert } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  message?: string;
  accessDeniedMessage?: string;
  showLoginForm?: boolean;
}

export function AdminGuard({
  children,
  fallback,
  message = 'Sign in to continue',
  accessDeniedMessage = 'Admin access required',
  showLoginForm = true,
}: AdminGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  const loading = authLoading || adminLoading;

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

  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center">
          {accessDeniedMessage}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
