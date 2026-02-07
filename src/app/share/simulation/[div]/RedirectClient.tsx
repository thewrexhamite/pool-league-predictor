'use client';

import { useEffect } from 'react';

interface RedirectClientProps {
  hashUrl: string;
}

export function RedirectClient({ hashUrl }: RedirectClientProps) {
  useEffect(() => {
    // Redirect to hash URL after component mounts
    window.location.href = hashUrl;
  }, [hashUrl]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading simulation...</p>
      </div>
    </div>
  );
}
