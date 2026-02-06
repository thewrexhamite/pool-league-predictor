'use client';

/**
 * Login Page
 *
 * OAuth-only sign in with Google, Microsoft, and Facebook.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { OAuthButtons } from '@/components/auth';
import { Shield, Target, Trophy, Users } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Redirect if already signed in
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSuccess = () => {
    router.push('/');
  };

  const handleError = (err: Error) => {
    setError(err.message);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 text-white">
            <Target className="w-10 h-10" />
            <span className="text-2xl font-bold">Pool League Pro</span>
          </div>
        </div>

        <div className="space-y-8 text-white">
          <h1 className="text-4xl font-bold leading-tight">
            Track Your Pool Career
          </h1>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Claim Your Profile</h3>
                <p className="text-blue-100">
                  Link your player profile and track your career across seasons and leagues.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Head-to-Head Stats</h3>
                <p className="text-blue-100">
                  See your record against every opponent you have faced.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Career Intelligence</h3>
                <p className="text-blue-100">
                  Get insights into your form, rankings, and performance trends.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-blue-200 text-sm">
          Your data is safe and secure with OAuth authentication.
        </p>
      </div>

      {/* Right side - login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Target className="w-10 h-10 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              Pool League Pro
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome back
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Sign in to claim your player profile
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <OAuthButtons onSuccess={handleSuccess} onError={handleError} />

            <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              By signing in, you agree to our{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{' '}
            <span className="text-gray-700 dark:text-gray-300">
              Signing in will create one automatically.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
