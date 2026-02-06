'use client';

/**
 * User Menu Component
 *
 * Dropdown menu showing user info and actions when signed in,
 * or a sign in button when signed out.
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';

interface UserMenuProps {
  onLoginClick?: () => void;
}

export function UserMenu({ onLoginClick }: UserMenuProps) {
  const { user, profile, loading, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={onLoginClick}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium
          text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white
          hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <User className="w-4 h-4" />
        <span>Sign In</span>
      </button>
    );
  }

  const displayName = profile?.displayName || user.displayName || 'User';
  const photoURL = profile?.photoURL || user.photoURL;
  const email = profile?.email || user.email || '';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg
          hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {photoURL ? (
          <img
            src={photoURL}
            alt={displayName}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-lg shadow-lg
          bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
          overflow-hidden z-50"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="font-medium text-gray-900 dark:text-white truncate">
              {displayName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {email}
            </p>
          </div>

          {/* Claimed profiles info */}
          {profile && profile.claimedProfiles.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {profile.claimedProfiles.length} claimed profile
                {profile.claimedProfiles.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                // Navigate to settings - implement as needed
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm
                text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>

            <button
              onClick={async () => {
                setIsOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm
                text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
