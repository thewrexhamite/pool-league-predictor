'use client';

/**
 * User Menu Component
 *
 * Dropdown menu showing user info and actions when signed in,
 * or a subtle sign in link when signed out.
 */

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { User, LogOut, UserCheck, ChevronDown, Bell } from 'lucide-react';

interface UserMenuProps {
  onLoginClick?: () => void;
  onNotificationSettingsClick?: () => void;
  variant?: 'default' | 'minimal';
}

export function UserMenu({ onLoginClick, onNotificationSettingsClick, variant = 'default' }: UserMenuProps) {
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
      <div className="w-6 h-6 rounded-full bg-surface-elevated animate-pulse" />
    );
  }

  if (!user) {
    // Minimal variant: just text link
    if (variant === 'minimal') {
      return (
        <button
          onClick={onLoginClick}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Sign In
        </button>
      );
    }

    // Default: subtle link with icon
    return (
      <button
        onClick={onLoginClick}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Sign In</span>
      </button>
    );
  }

  const displayName = profile?.displayName || user.displayName || 'User';
  const photoURL = profile?.photoURL || user.photoURL;
  const email = profile?.email || user.email || '';
  const claimedCount = profile?.claimedProfiles?.length || 0;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg hover:bg-surface-elevated transition-colors p-1"
      >
        {photoURL ? (
          <Image
            src={photoURL}
            alt={displayName}
            width={28}
            height={28}
            className="w-7 h-7 rounded-full"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-baize flex items-center justify-center text-white text-sm font-medium">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <ChevronDown
          className={`w-3 h-3 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-elevated
          bg-surface-card border border-surface-border overflow-hidden z-50"
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="font-medium text-white truncate text-sm">
              {displayName}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {email}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {/* Claim Profile */}
            <Link
              href="/claim"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm
                text-gray-300 hover:bg-surface-elevated hover:text-white transition"
            >
              <UserCheck className="w-4 h-4" />
              <span>Claim Profile</span>
              {claimedCount > 0 && (
                <span className="ml-auto text-xs text-gray-500">
                  {claimedCount} claimed
                </span>
              )}
            </Link>

            {/* Notification Settings */}
            {onNotificationSettingsClick && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNotificationSettingsClick();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm
                  text-gray-300 hover:bg-surface-elevated hover:text-white transition"
              >
                <Bell className="w-4 h-4" />
                <span>Notification Settings</span>
              </button>
            )}

            {/* Sign Out */}
            <button
              onClick={async () => {
                setIsOpen(false);
                await signOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm
                text-loss hover:bg-surface-elevated transition"
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
