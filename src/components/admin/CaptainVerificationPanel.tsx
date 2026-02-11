'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, verifyCaptainClaim, removeCaptainClaim } from '@/lib/auth';
import type { UserProfile, CaptainClaim } from '@/lib/auth';
import { Shield, Check, X, Loader2 } from 'lucide-react';

interface ClaimWithUser {
  userId: string;
  displayName: string;
  email: string;
  claim: CaptainClaim;
}

export default function CaptainVerificationPanel() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPendingClaims();
  }, []);

  async function loadPendingClaims() {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snap = await getDocs(usersRef);
      const pending: ClaimWithUser[] = [];

      snap.forEach(doc => {
        const profile = doc.data() as UserProfile;
        const userId = doc.id;
        for (const claim of (profile.captainClaims || [])) {
          if (!claim.verified) {
            pending.push({
              userId,
              displayName: profile.displayName || profile.email,
              email: profile.email,
              claim,
            });
          }
        }
      });

      setClaims(pending);
    } catch (err) {
      console.error('Failed to load captain claims:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(item: ClaimWithUser) {
    if (!user) return;
    const key = `${item.userId}-${item.claim.team}`;
    setActionLoading(key);
    try {
      await verifyCaptainClaim(
        item.userId,
        item.claim.league,
        item.claim.season,
        item.claim.team,
        user.uid
      );
      setClaims(prev => prev.filter(c =>
        !(c.userId === item.userId && c.claim.team === item.claim.team && c.claim.season === item.claim.season)
      ));
    } catch (err) {
      console.error('Failed to verify claim:', err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(item: ClaimWithUser) {
    const key = `${item.userId}-${item.claim.team}`;
    setActionLoading(key);
    try {
      await removeCaptainClaim(
        item.userId,
        item.claim.league,
        item.claim.season,
        item.claim.team
      );
      setClaims(prev => prev.filter(c =>
        !(c.userId === item.userId && c.claim.team === item.claim.team && c.claim.season === item.claim.season)
      ));
    } catch (err) {
      console.error('Failed to reject claim:', err);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="bg-surface-card rounded-card shadow-card p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-amber-400" />
          Captain Verification
        </h2>
        {claims.length > 0 && (
          <span className="text-xs font-medium bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full">
            {claims.length} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : claims.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">
          No pending captain claims to verify.
        </p>
      ) : (
        <div className="space-y-3">
          {claims.map(item => {
            const key = `${item.userId}-${item.claim.team}`;
            const isLoading = actionLoading === key;
            return (
              <div
                key={key}
                className="flex items-center gap-3 p-3 bg-surface rounded-lg"
              >
                <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {item.displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Claims: <strong className="text-white">{item.claim.team}</strong>{' '}
                    ({item.claim.division} &bull; {item.claim.league} &bull; {item.claim.season})
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    Claimed {new Date(item.claim.claimedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleVerify(item)}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 transition disabled:opacity-50"
                    title="Verify"
                  >
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  </button>
                  <button
                    onClick={() => handleReject(item)}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition disabled:opacity-50"
                    title="Reject"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
