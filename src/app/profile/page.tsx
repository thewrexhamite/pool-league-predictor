'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  User,
  Trophy,
  Shield,
  Star,
  Bell,
  LogOut,
  Check,
  Plus,
  Settings,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth, updateUserProfile } from '@/lib/auth';
import { AuthGuard } from '@/components/auth';
import { CaptainClaimModal } from '@/components/auth/CaptainClaimModal';
import { usePlayerInsights, usePlayerLabels } from '@/hooks/use-gamification';
import PlayerLabels from '@/components/gamification/PlayerLabels';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [showCaptainClaim, setShowCaptainClaim] = useState(false);
  const [notifPref, setNotifPref] = useState(profile?.settings?.notifications ?? false);
  const [publicProfile, setPublicProfile] = useState(profile?.settings?.publicProfile ?? true);

  const { insights } = usePlayerInsights();
  const { active: activeLabels } = usePlayerLabels();

  const captainClaims = profile?.captainClaims || [];
  const claimedProfiles = profile?.claimedProfiles || [];
  const hasVerified = captainClaims.some(c => c.verified);

  const roleBadge = () => {
    if (profile?.isAdmin) return { label: 'Admin', color: 'bg-purple-900/30 text-purple-400' };
    if (hasVerified) return { label: 'Verified Captain', color: 'bg-green-900/30 text-green-400' };
    if (captainClaims.length > 0) return { label: 'Captain (Unverified)', color: 'bg-amber-900/30 text-amber-400' };
    return { label: 'Player', color: 'bg-blue-900/30 text-blue-400' };
  };

  const badge = roleBadge();

  const handleToggleNotifications = async () => {
    if (!user) return;
    const next = !notifPref;
    setNotifPref(next);
    try {
      await updateUserProfile(user.uid, { settings: { ...profile!.settings, notifications: next } });
      await refreshProfile();
    } catch { /* revert on error */
      setNotifPref(!next);
    }
  };

  const handleTogglePublicProfile = async () => {
    if (!user) return;
    const next = !publicProfile;
    setPublicProfile(next);
    try {
      await updateUserProfile(user.uid, { settings: { ...profile!.settings, publicProfile: next } });
      await refreshProfile();
    } catch {
      setPublicProfile(!next);
    }
  };

  const handleToggleInsights = async () => {
    if (!user) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const gamRef = doc(db, 'gamification', user.uid);
      await updateDoc(gamRef, { insightsEnabled: !insights.insightsEnabled });
    } catch {
      // ignore
    }
  };

  const handleToggleUsageTracking = async () => {
    if (!user) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const gamRef = doc(db, 'gamification', user.uid);
      await updateDoc(gamRef, { usageTrackingEnabled: !insights.usageTrackingEnabled });
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-card border-b border-surface-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <AuthGuard message="Sign in to view your profile">
          {/* Profile header */}
          <div className="bg-surface-card border border-surface-border rounded-card p-6">
            <div className="flex items-start gap-4">
              {profile?.photoURL ? (
                <Image
                  src={profile.photoURL}
                  alt={profile.displayName}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-baize flex items-center justify-center text-white text-2xl font-bold">
                  {(profile?.displayName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate">
                  {profile?.displayName || 'User'}
                </h2>
                <p className="text-sm text-gray-500 truncate">{profile?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${badge.color}`}>
                    <Shield className="w-3 h-3" />
                    {badge.label}
                  </span>
                  {profile?.createdAt && (
                    <span className="text-[10px] text-gray-600">
                      Member since {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Player Insights Summary */}
          {insights.insightsEnabled && (
            <div className="bg-surface-card border border-surface-border rounded-card p-6 space-y-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-baize" />
                Player Insights
              </h3>

              {/* Active labels */}
              {activeLabels.length > 0 && (
                <PlayerLabels active={activeLabels} />
              )}

              {/* Prediction stats */}
              {insights.predictions.total > 0 && (
                <div className="flex gap-4">
                  <div>
                    <div className="text-lg font-bold text-white">{insights.predictions.total}</div>
                    <div className="text-[10px] text-gray-500">Predictions</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">
                      {Math.round((insights.predictions.correct / insights.predictions.total) * 100)}%
                    </div>
                    <div className="text-[10px] text-gray-500">Accuracy</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{insights.unlockedTools.length}</div>
                    <div className="text-[10px] text-gray-500">Tools Unlocked</div>
                  </div>
                </div>
              )}

              {/* Mini-leagues count */}
              {insights.miniLeagues.length > 0 && (
                <div className="text-xs text-gray-500">
                  {insights.miniLeagues.length} mini-league{insights.miniLeagues.length !== 1 ? 's' : ''} joined
                </div>
              )}
            </div>
          )}

          {/* Claimed Profiles */}
          <div className="bg-surface-card border border-surface-border rounded-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-green-400" />
                Claimed Profiles
              </h3>
              <Link
                href="/claim"
                className="text-xs text-baize hover:text-baize-light transition flex items-center gap-1"
              >
                <Plus size={12} /> Claim another
              </Link>
            </div>
            {claimedProfiles.length === 0 ? (
              <p className="text-sm text-gray-500">
                No profiles claimed yet.{' '}
                <Link href="/claim" className="text-baize hover:underline">
                  Claim your player profile
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {claimedProfiles.map((cp) => (
                  <div
                    key={`${cp.league}-${cp.season}-${cp.name}`}
                    className="flex items-center gap-3 p-3 bg-surface rounded-lg"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{cp.name}</p>
                      <p className="text-xs text-gray-500">{cp.league} &bull; {cp.season}</p>
                    </div>
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Captain Claims */}
          <div id="captain" className="bg-surface-card border border-surface-border rounded-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-baize" />
                Captain Claims
              </h3>
              <button
                onClick={() => setShowCaptainClaim(true)}
                className="text-xs text-baize hover:text-baize-light transition flex items-center gap-1"
              >
                <Plus size={12} /> Claim a Team
              </button>
            </div>
            {captainClaims.length === 0 ? (
              <p className="text-sm text-gray-500">
                Not claiming any teams.{' '}
                <button
                  onClick={() => setShowCaptainClaim(true)}
                  className="text-baize hover:underline"
                >
                  Are you a team captain?
                </button>
              </p>
            ) : (
              <div className="space-y-2">
                {captainClaims.map((cc) => (
                  <div
                    key={`${cc.league}-${cc.season}-${cc.team}`}
                    className="flex items-center gap-3 p-3 bg-surface rounded-lg"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      cc.verified ? 'bg-green-900/30' : 'bg-amber-900/30'
                    }`}>
                      <Shield className={`w-4 h-4 ${cc.verified ? 'text-green-400' : 'text-amber-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{cc.team}</p>
                      <p className="text-xs text-gray-500">
                        {cc.division} &bull; {cc.league} &bull; {cc.season}
                      </p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      cc.verified
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-amber-900/30 text-amber-400'
                    }`}>
                      {cc.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-surface-card border border-surface-border rounded-card p-6">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-gray-400" />
              Settings
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Notifications</span>
                </div>
                <button
                  onClick={handleToggleNotifications}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    notifPref ? 'bg-baize' : 'bg-surface-elevated'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    notifPref ? 'left-5' : 'left-1'
                  }`} />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Public profile</span>
                </div>
                <button
                  onClick={handleTogglePublicProfile}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    publicProfile ? 'bg-baize' : 'bg-surface-elevated'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    publicProfile ? 'left-5' : 'left-1'
                  }`} />
                </button>
              </label>

              {/* Insight toggles */}
              <div className="pt-2 border-t border-surface-border/30">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide font-medium mb-2">Player Insights</div>
                <label className="flex items-center justify-between cursor-pointer mb-2">
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Show player insights</span>
                  </div>
                  <button
                    onClick={handleToggleInsights}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      insights.insightsEnabled ? 'bg-baize' : 'bg-surface-elevated'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      insights.insightsEnabled ? 'left-5' : 'left-1'
                    }`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <EyeOff className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Track usage for tool unlocks</span>
                  </div>
                  <button
                    onClick={handleToggleUsageTracking}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      insights.usageTrackingEnabled ? 'bg-baize' : 'bg-surface-elevated'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      insights.usageTrackingEnabled ? 'left-5' : 'left-1'
                    }`} />
                  </button>
                </label>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-surface-card border border-loss/20 rounded-card p-6">
            <h3 className="font-semibold text-loss mb-4">Danger Zone</h3>
            <button
              onClick={async () => {
                await signOut();
                router.push('/');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-loss border border-loss/30 rounded-lg hover:bg-loss/10 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </AuthGuard>
      </div>

      <CaptainClaimModal
        isOpen={showCaptainClaim}
        onClose={() => setShowCaptainClaim(false)}
        onSuccess={() => refreshProfile()}
      />
    </div>
  );
}
