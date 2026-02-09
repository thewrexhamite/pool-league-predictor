'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Mail, Home } from 'lucide-react';

type UnsubscribeStatus = 'loading' | 'success' | 'error' | 'missing-params';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<UnsubscribeStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const userId = searchParams.get('userId');

  useEffect(() => {
    const unsubscribe = async () => {
      // Validate required parameters
      if (!userId) {
        setStatus('missing-params');
        setErrorMessage('Invalid unsubscribe link. Missing required parameters.');
        return;
      }

      try {
        // Call the unsubscribe API
        const response = await fetch('/api/notifications/email/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'Failed to unsubscribe. Please try again.');
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again later.');
      }
    };

    unsubscribe();
  }, [userId]);

  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body items-center text-center">
            {/* Status Icon */}
            <div className="mb-4">
              {status === 'loading' && (
                <div className="loading loading-spinner loading-lg text-primary"></div>
              )}
              {status === 'success' && (
                <CheckCircle2 className="w-16 h-16 text-success" />
              )}
              {(status === 'error' || status === 'missing-params') && (
                <XCircle className="w-16 h-16 text-error" />
              )}
            </div>

            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-6 h-6" />
              <h1 className="card-title text-2xl">Email Notifications</h1>
            </div>

            {/* Status Message */}
            {status === 'loading' && (
              <div>
                <p className="text-lg mb-2">Unsubscribing...</p>
                <p className="text-sm text-base-content/70">
                  Please wait while we process your request.
                </p>
              </div>
            )}

            {status === 'success' && (
              <div>
                <p className="text-lg font-semibold mb-2 text-success">
                  Successfully Unsubscribed
                </p>
                <p className="text-sm text-base-content/70 mb-4">
                  You have been removed from our email notification list. You will no longer receive emails from Pool League Predictor.
                </p>
                <p className="text-sm text-base-content/70">
                  If you change your mind, you can re-subscribe anytime from your notification settings in the app.
                </p>
              </div>
            )}

            {status === 'error' && (
              <div>
                <p className="text-lg font-semibold mb-2 text-error">
                  Unsubscribe Failed
                </p>
                <p className="text-sm text-base-content/70 mb-4">
                  {errorMessage}
                </p>
                <p className="text-sm text-base-content/70">
                  You can also manage your email preferences in the app&apos;s notification settings.
                </p>
              </div>
            )}

            {status === 'missing-params' && (
              <div>
                <p className="text-lg font-semibold mb-2 text-error">
                  Invalid Link
                </p>
                <p className="text-sm text-base-content/70 mb-4">
                  {errorMessage}
                </p>
                <p className="text-sm text-base-content/70">
                  Please use the unsubscribe link from a valid Pool League Predictor email.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="card-actions justify-center mt-6">
              {status === 'success' && (
                <Link
                  href="/"
                  className="btn btn-primary"
                >
                  <Home className="w-4 h-4" />
                  Return to Pool League Predictor
                </Link>
              )}
              {(status === 'error' || status === 'missing-params') && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    href="/"
                    className="btn btn-primary"
                  >
                    <Home className="w-4 h-4" />
                    Go to App
                  </Link>
                  {status === 'error' && (
                    <button
                      onClick={() => window.location.reload()}
                      className="btn btn-outline"
                    >
                      Try Again
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-base-300 w-full">
              <p className="text-xs text-base-content/50">
                © {new Date().getFullYear()} Pool League Predictor. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
