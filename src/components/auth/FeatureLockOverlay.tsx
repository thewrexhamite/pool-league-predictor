'use client';

import { Lock } from 'lucide-react';
import { OAuthButtons } from './OAuthButtons';

interface FeatureLockOverlayProps {
  featureName: string;
  onSuccess?: () => void;
}

export function FeatureLockOverlay({ featureName, onSuccess }: FeatureLockOverlayProps) {
  return (
    <div className="relative">
      {/* Blurred backdrop placeholder */}
      <div className="h-48 rounded-card bg-surface-card/50 blur-sm" />

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-surface/80 backdrop-blur-sm rounded-card border border-surface-border">
        <div className="w-12 h-12 rounded-full bg-baize/10 flex items-center justify-center">
          <Lock className="w-6 h-6 text-baize" />
        </div>
        <div className="text-center px-6">
          <p className="text-sm font-medium text-white mb-1">
            Sign in to unlock {featureName}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Create an account to access this feature and more.
          </p>
          <div className="max-w-[240px] mx-auto">
            <OAuthButtons onSuccess={onSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
}
