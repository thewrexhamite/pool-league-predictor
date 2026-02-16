'use client';

import { useState } from 'react';
import { Search, Check, Loader2, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, addClaimedProfile } from '@/lib/auth';
import { useClaimSearch } from '@/hooks/use-claim-search';
import type { CrossLeaguePlayer } from '@/lib/claim-search';
import { formatWinPct } from '@/lib/stats';

interface ClaimProfileInlineProps {
  onComplete: () => void;
}

export function ClaimProfileInline({ onComplete }: ClaimProfileInlineProps) {
  const { user, profile, refreshProfile } = useAuth();
  const {
    suggestions,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedPlayer,
    selectPlayer,
    clearSelection,
    loading,
  } = useClaimSearch(profile);

  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSelectPlayer = (player: CrossLeaguePlayer) => {
    selectPlayer(player);
    setAgreedToDisclaimer(false);
    setError(null);
  };

  const handleClaim = async () => {
    if (!user || !selectedPlayer) return;

    setClaiming(true);
    setError(null);

    try {
      await addClaimedProfile(
        user.uid,
        selectedPlayer.leagueId,
        selectedPlayer.seasonId,
        selectedPlayer.name
      );
      await refreshProfile();
      await setDoc(
        doc(db, 'gamification', user.uid),
        { insightsEnabled: true, usageTrackingEnabled: true },
        { merge: true }
      );
      setSuccess(true);
      setTimeout(() => onComplete(), 1200);
    } catch (err) {
      console.error('Failed to claim profile:', err);
      setError('Failed to claim profile. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-2">
        <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center mx-auto mb-2">
          <Check className="w-5 h-5 text-green-400" />
        </div>
        <p className="text-sm text-green-400 font-medium">Profile claimed!</p>
      </div>
    );
  }

  // Confirm step
  if (selectedPlayer) {
    return (
      <div className="space-y-3">
        <div className="bg-surface rounded-lg p-3 text-left">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{selectedPlayer.name}</p>
              <p className="text-xs text-gray-400">
                {selectedPlayer.leagueShortName} &bull; {formatWinPct(selectedPlayer.data.total.pct)}%
              </p>
            </div>
            <button
              onClick={() => { clearSelection(); setAgreedToDisclaimer(false); }}
              className="text-xs text-gray-500 hover:text-white transition"
            >
              Change
            </button>
          </div>
        </div>

        <label className="flex items-start gap-2 text-left cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToDisclaimer}
            onChange={(e) => setAgreedToDisclaimer(e.target.checked)}
            className="mt-0.5 rounded border-surface-border"
          />
          <span className="text-[11px] text-gray-400">
            I confirm this is my player profile and understand it will be linked to my account.
          </span>
        </label>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleClaim}
          disabled={!agreedToDisclaimer || claiming}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
        >
          {claiming && <Loader2 size={14} className="animate-spin" />}
          {claiming ? 'Claiming...' : 'Confirm Claim'}
        </button>
      </div>
    );
  }

  // Search / suggestions step
  const results = searchQuery.length >= 2 ? searchResults : suggestions;
  const showingResults = searchQuery.length >= 2;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search your name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize"
          autoFocus
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={16} className="animate-spin text-gray-500" />
          <span className="text-xs text-gray-500 ml-2">Loading players...</span>
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {!showingResults && suggestions.length > 0 && (
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">Suggested for you</p>
          )}
          {showingResults && results.length > 0 && (
            <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-1">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
          )}
          {results.slice(0, 6).map((player) => (
            <button
              key={`${player.leagueId}-${player.name}`}
              onClick={() => handleSelectPlayer(player)}
              className={clsx(
                'w-full flex items-center justify-between bg-surface/50 rounded-lg p-2.5 text-left transition',
                player.isClaimed
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-surface-elevated/50 cursor-pointer'
              )}
              disabled={player.isClaimed}
            >
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{player.name}</p>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  {player.leagueShortName}
                  {player.distance !== null && (
                    <>
                      <MapPin size={8} />
                      {player.distance < 1 ? '< 1 mi' : `${Math.round(player.distance)} mi`}
                    </>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0 ml-2">
                {player.isClaimed ? (
                  <span className="text-[10px] text-green-400">Claimed</span>
                ) : (
                  <span className="text-xs text-gray-400">{formatWinPct(player.data.total.pct)}%</span>
                )}
              </div>
            </button>
          ))}
          {showingResults && results.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-3">
              No players found matching &quot;{searchQuery}&quot;
            </p>
          )}
          {!showingResults && suggestions.length === 0 && !loading && (
            <p className="text-xs text-gray-500 text-center py-3">
              Type your name above to search
            </p>
          )}
        </div>
      )}
    </div>
  );
}
