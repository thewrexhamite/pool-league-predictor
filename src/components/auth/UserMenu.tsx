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
import { User, LogOut, UserCheck, ChevronDown, Bell, Shield, HelpCircle, Users as UsersIcon } from 'lucide-react';

interface UserMenuProps {
  onLoginClick?: () => void;
  onNotificationSettingsClick?: () => void;
  onStartTutorial?: () => void;
  variant?: 'default' | 'minimal';
}

export function UserMenu({ onLoginClick, onNotificationSettingsClick, onStartTutorial, variant = 'default' }: UserMenuProps) {
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

    // Default: visible pill button
    return (
      <button
        onClick={onLoginClick}
        className="flex items-center gap-1.5 text-sm font-medium text-white bg-baize hover:bg-baize-light px-3 py-1.5 rounded-full transition-colors shadow-sm"
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
  const captainClaims = profile?.captainClaims || [];
  const hasVerifiedCaptain = captainClaims.some(c => c.verified);
  const isCaptain = captainClaims.length > 0;

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

      <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-elevated
          bg-surface-card border border-surface-border overflow-hidden z-50 dropdown-animated" hidden={!isOpen}
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <p className="font-medium text-white truncate text-sm">
                {displayName}
              </p>
              {isCaptain && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  hasVerifiedCaptain
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-amber-900/30 text-amber-400'
                }`}>
                  <Shield className="w-2.5 h-2.5" />
                  {hasVerifiedCaptain ? 'Captain' : 'Unverified'}
                </span>
              )}
              {profile?.isAdmin && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-900/30 text-purple-400">
                  <Shield className="w-2.5 h-2.5" />
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {email}
            </p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {/* My Profile */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm
                text-gray-300 hover:bg-surface-elevated hover:text-white transition"
            >
              <User className="w-4 h-4" />
              <span>My Profile</span>
            </Link>

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

            {/* Claim Team (Captain) */}
            <Link
              href="/profile#captain"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm
                text-gray-300 hover:bg-surface-elevated hover:text-white transition"
            >
              <UsersIcon className="w-4 h-4" />
              <span>Claim Team (Captain)</span>
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

            {/* App Tour */}
            {onStartTutorial && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onStartTutorial();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm
                  text-gray-300 hover:bg-surface-elevated hover:text-white transition"
              >
                <HelpCircle className="w-4 h-4" />
                <span>App Tour</span>
              </button>
            )}

            {/* Admin Dashboard */}
            {profile?.isAdmin && (
              <Link
                href="/admin/leagues"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm
                  text-gray-300 hover:bg-surface-elevated hover:text-white transition"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </Link>
            )}

            <div className="border-t border-surface-border/50 my-1" />

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
    </div>
  );
}
