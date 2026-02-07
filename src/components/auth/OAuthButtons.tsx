'use client';

/**
 * OAuth Sign-in Buttons
 *
 * Buttons for signing in with various OAuth providers.
 */

import { useState } from 'react';
import { useAuth, type AuthProviderType } from '@/lib/auth';

interface OAuthButtonProps {
  provider: AuthProviderType;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const providerConfig: Record<
  AuthProviderType,
  { label: string; icon: React.ReactNode; bgColor: string; hoverColor: string }
> = {
  google: {
    label: 'Continue with Google',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="currentColor"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="currentColor"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="currentColor"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    bgColor: 'bg-white dark:bg-gray-800',
    hoverColor: 'hover:bg-gray-50 dark:hover:bg-gray-700',
  },
};

export function OAuthButton({ provider, onSuccess, onError }: OAuthButtonProps) {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const config = providerConfig[provider];

  const handleClick = async () => {
    setLoading(true);
    try {
      await signIn(provider);
      onSuccess?.();
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Sign in failed'));
    } finally {
      setLoading(false);
    }
  };

  const isGoogle = provider === 'google';
  const textColor =
    isGoogle
      ? 'text-gray-900 dark:text-white'
      : 'text-white';

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
        border border-gray-200 dark:border-gray-600
        ${config.bgColor} ${config.hoverColor}
        ${textColor}
        font-medium transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        config.icon
      )}
      <span>{config.label}</span>
    </button>
  );
}

interface OAuthButtonsProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  providers?: AuthProviderType[];
}

export function OAuthButtons({
  onSuccess,
  onError,
  providers = ['google'],
}: OAuthButtonsProps) {
  return (
    <div className="flex flex-col gap-3">
      {providers.map((provider) => (
        <OAuthButton
          key={provider}
          provider={provider}
          onSuccess={onSuccess}
          onError={onError}
        />
      ))}
    </div>
  );
}
