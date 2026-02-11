'use client';

/**
 * Claim Page
 *
 * Cross-league player search and claim with geolocation-based suggestions.
 */

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, addClaimedProfile, type ClaimedProfile } from '@/lib/auth';
import { AuthGuard } from '@/components/auth';
import { formatWinPct } from '@/lib/stats';
import { useClaimSearch } from '@/hooks/use-claim-search';
import type { CrossLeaguePlayer } from '@/lib/claim-search';
import { ArrowLeft, Search, Trophy, Users, User, Check, MapPin, X } from 'lucide-react';

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ClaimPageContent />
    </Suspense>
  );
}

function ClaimPageContent() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const {
    geoStatus,
    suggestions,
    searchQuery,
    setSearchQuery,
    searchResults,
    selectedPlayer,
    selectPlayer,
    clearSelection,
    loading,
    allProfiles,
  } = useClaimSearch(profile);

  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [geoBannerDismissed, setGeoBannerDismissed] = useState(false);

  // Handle claiming a profile
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
      clearSelection();
    } catch (err) {
      console.error('Failed to claim profile:', err);
      setError('Failed to claim profile. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const handleSelectPlayer = (player: CrossLeaguePlayer) => {
    selectPlayer(player);
    setAgreedToDisclaimer(false);
    setError(null);
  };

  // Format distance for display
  const formatDistance = (distance: number | null): string | null => {
    if (distance === null) return null;
    if (distance < 1) return '< 1 mi';
    return `${Math.round(distance)} mi`;
  };

  // Group claimed profiles by league for display
  const claimedByLeague = allProfiles.reduce<Record<string, ClaimedProfile[]>>((acc, p) => {
    const key = `${p.league}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400
              hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Claim Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Search for your name across all leagues and link it to your account.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <AuthGuard message="Sign in to claim your player profile">
          {/* Geo prompt banner */}
          {geoStatus === 'pending' && !geoBannerDismissed && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20
              border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <p className="text-sm text-blue-800 dark:text-blue-300 flex-1">
                Allow location access to see nearby leagues first
              </p>
              <button
                onClick={() => setGeoBannerDismissed(true)}
                className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
                rounded-full animate-spin mx-auto"
              />
              <p className="text-gray-500 dark:text-gray-400 mt-4">
                Loading players from all leagues...
              </p>
            </div>
          ) : (
            <>
              {/* Suggested for you */}
              {suggestions.length > 0 && !selectedPlayer && searchQuery.length < 2 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      Suggested for you
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map((player) => (
                      <PlayerCard
                        key={`${player.leagueId}-${player.name}`}
                        player={player}
                        formatDistance={formatDistance}
                        onSelect={handleSelectPlayer}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Search input */}
              {!selectedPlayer && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="w-5 h-5 text-gray-400" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      Find Your Profile
                    </h2>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type your name to search all leagues..."
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg
                        border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto"
                      >
                        {searchResults.map((result) => (
                          <button
                            key={`${result.leagueId}-${result.name}`}
                            onClick={() => handleSelectPlayer(result)}
                            className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700
                              border-b border-gray-100 dark:border-gray-700 last:border-0 text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30
                              flex items-center justify-center shrink-0"
                            >
                              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {result.name}
                                </span>
                                <LeaguePill
                                  shortName={result.leagueShortName}
                                  color={result.leagueColor}
                                  distance={formatDistance(result.distance)}
                                />
                                {result.isClaimed && (
                                  <span className="px-1.5 py-0.5 text-xs font-medium rounded
                                    bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                  >
                                    <Check className="w-3 h-3 inline" /> Yours
                                  </span>
                                )}
                                {result.isFuzzy && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                    Similar name
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                <span>{formatWinPct(result.data.total.pct)}</span>
                                <span>{result.data.total.p} games</span>
                              </div>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                                {result.data.teams.map((t) => t.team).join(', ')}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchQuery.length >= 2 && searchResults.length === 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg
                        border border-gray-200 dark:border-gray-700 p-4 text-center text-gray-500 dark:text-gray-400"
                      >
                        No players found matching &quot;{searchQuery}&quot;
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Selected player confirmation */}
              {selectedPlayer && (
                <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      Confirm Your Profile
                    </h2>
                    <button
                      onClick={clearSelection}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30
                      flex items-center justify-center"
                    >
                      <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-gray-900 dark:text-white">
                        {selectedPlayer.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <LeaguePill
                          shortName={selectedPlayer.leagueShortName}
                          color={selectedPlayer.leagueColor}
                          distance={formatDistance(selectedPlayer.distance)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedPlayer.data.total.p}
                      </p>
                      <p className="text-xs text-gray-500">Games</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedPlayer.data.total.w}
                      </p>
                      <p className="text-xs text-gray-500">Wins</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatWinPct(selectedPlayer.data.total.pct)}
                      </p>
                      <p className="text-xs text-gray-500">Win Rate</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Teams:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlayer.data.teams.map((t) => (
                        <span
                          key={`${t.div}:${t.team}`}
                          className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded"
                        >
                          {t.team} ({t.div})
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedPlayer.isClaimed ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <Check className="w-5 h-5" />
                      <span>You&apos;ve already claimed this profile</span>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200
                        dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300"
                      >
                        <p>
                          Only claim a profile that belongs to you. Falsely claiming another
                          player&apos;s profile may result in your account being suspended.
                        </p>
                      </div>
                      <label className="flex items-start gap-3 mb-4 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={agreedToDisclaimer}
                          onChange={(e) => setAgreedToDisclaimer(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600
                            focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          I confirm this is my player profile and understand that misuse may lead to
                          account suspension.
                        </span>
                      </label>
                      <button
                        onClick={handleClaim}
                        disabled={claiming || !agreedToDisclaimer}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
                          hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {claiming ? 'Claiming...' : 'This is Me - Claim Profile'}
                      </button>
                    </>
                  )}

                  {error && (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
                  )}
                </div>
              )}

              {/* Your Profiles (all leagues) */}
              {allProfiles.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-green-500" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">
                      Your Profiles
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(claimedByLeague).map(([leagueId, profiles]) => (
                      <div key={leagueId}>
                        {profiles.map((claimed) => (
                          <div
                            key={`${claimed.league}-${claimed.season}-${claimed.name}`}
                            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800
                              rounded-lg border border-gray-200 dark:border-gray-700 mb-2"
                          >
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30
                              flex items-center justify-center"
                            >
                              <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {claimed.name}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {claimed.league} &middot; {claimed.season}
                              </p>
                            </div>
                            <Check className="w-5 h-5 text-green-500" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Help text */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900 dark:text-blue-300">
                      Played in multiple leagues?
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Your search covers all leagues automatically. Claim each profile separately
                      to link them all to your account.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </AuthGuard>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function LeaguePill({
  shortName,
  color,
  distance,
}: {
  shortName: string;
  color: string;
  distance: string | null;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full
      bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {shortName}
      {distance && (
        <span className="text-gray-400 dark:text-gray-500">
          &middot; {distance}
        </span>
      )}
    </span>
  );
}

function PlayerCard({
  player,
  formatDistance,
  onSelect,
}: {
  player: CrossLeaguePlayer;
  formatDistance: (d: number | null) => string | null;
  onSelect: (p: CrossLeaguePlayer) => void;
}) {
  return (
    <button
      onClick={() => onSelect(player)}
      className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200
        dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600
        hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30
          flex items-center justify-center shrink-0"
        >
          <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-white">
              {player.name}
            </span>
            <LeaguePill
              shortName={player.leagueShortName}
              color={player.leagueColor}
              distance={formatDistance(player.distance)}
            />
            {player.isClaimed && (
              <span className="px-1.5 py-0.5 text-xs font-medium rounded
                bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
              >
                Already yours
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{player.data.teams.map((t) => `${t.team} (${t.div})`).join(', ')}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{player.data.total.p} games</span>
            <span>{formatWinPct(player.data.total.pct)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
