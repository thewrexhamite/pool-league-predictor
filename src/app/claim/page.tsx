'use client';

/**
 * Claim Page
 *
 * Search and claim player profiles from season data.
 */

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, addClaimedProfile, hasClaimedProfile, type ClaimedProfile } from '@/lib/auth';
import { AuthGuard } from '@/components/auth';
import type { Players2526Map, PlayerData2526, LeagueMeta } from '@/lib/types';
import { formatWinPct, getSeasonLabel } from '@/lib/stats';
import { ArrowLeft, Search, Trophy, Users, ChevronRight, User, Check } from 'lucide-react';

interface PlayerSearchResult {
  name: string;
  data: PlayerData2526;
  isClaimed: boolean;
}

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
  const searchParams = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();

  // Get pre-filled name from URL query parameter
  const initialName = searchParams.get('name') || '';

  // League/season selection
  const [leagues, setLeagues] = useState<LeagueMeta[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [selectedSeason, setSelectedSeason] = useState<string>('');

  // Player data
  const [players2526, setPlayers2526] = useState<Players2526Map>({});
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search - initialize with URL query param if provided
  const [searchQuery, setSearchQuery] = useState(initialName);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);

  // Load available leagues
  useEffect(() => {
    async function loadLeagues() {
      try {
        const leaguesRef = collection(db, 'leagues');
        const snapshot = await getDocs(leaguesRef);
        const leagueData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LeagueMeta[];
        setLeagues(leagueData);

        // Default to first league and current season
        if (leagueData.length > 0) {
          setSelectedLeague(leagueData[0].id);
          const currentSeason = leagueData[0].seasons.find((s) => s.current);
          if (currentSeason) {
            setSelectedSeason(currentSeason.id);
          }
        }
      } catch (err) {
        console.error('Failed to load leagues:', err);
        setError('Failed to load leagues');
      }
    }

    loadLeagues();
  }, []);

  // Load season data when league/season changes
  useEffect(() => {
    if (!selectedLeague || !selectedSeason) {
      setLoading(false);
      return;
    }

    async function loadSeasonData() {
      setLoading(true);
      try {
        const seasonRef = doc(db, 'leagues', selectedLeague, 'seasons', selectedSeason);
        const seasonSnap = await getDoc(seasonRef);

        if (seasonSnap.exists()) {
          const data = seasonSnap.data();
          setPlayers2526(data.players2526 || {});
        } else {
          setPlayers2526({});
        }
      } catch (err) {
        console.error('Failed to load season data:', err);
        setError('Failed to load player data');
      } finally {
        setLoading(false);
      }
    }

    loadSeasonData();
  }, [selectedLeague, selectedSeason]);

  // Filter players based on search
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    const results: PlayerSearchResult[] = [];

    for (const [name, data] of Object.entries(players2526)) {
      if (name.toLowerCase().includes(query)) {
        const isClaimed = profile
          ? hasClaimedProfile(profile, selectedLeague, selectedSeason, name)
          : false;
        results.push({ name, data, isClaimed });
      }
    }

    // Sort by total games played (most active first)
    return results.sort((a, b) => b.data.total.p - a.data.total.p).slice(0, 10);
  }, [searchQuery, players2526, profile, selectedLeague, selectedSeason]);

  // Handle claiming a profile
  const handleClaim = async () => {
    if (!user || !selectedPlayer) return;

    setClaiming(true);
    setError(null);

    try {
      await addClaimedProfile(user.uid, selectedLeague, selectedSeason, selectedPlayer.name);
      await refreshProfile();
      setSelectedPlayer(null);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to claim profile:', err);
      setError('Failed to claim profile. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  // Get current league and season info
  const currentLeague = leagues.find((l) => l.id === selectedLeague);
  const currentSeasonMeta = currentLeague?.seasons.find((s) => s.id === selectedSeason);

  // Get user's claimed profiles for this league/season
  const myProfiles = profile?.claimedProfiles.filter(
    (p) => p.league === selectedLeague && p.season === selectedSeason
  ) || [];

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
            Search for your name and link it to your account.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <AuthGuard message="Sign in to claim your player profile">
          {/* League/Season Selection */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                League
              </label>
              <select
                value={selectedLeague}
                onChange={(e) => {
                  setSelectedLeague(e.target.value);
                  const league = leagues.find((l) => l.id === e.target.value);
                  const current = league?.seasons.find((s) => s.current);
                  setSelectedSeason(current?.id || league?.seasons[0]?.id || '');
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Season
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {currentLeague?.seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-5 h-5 text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Find Your Profile
              </h2>
            </div>

            {loading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent
                  rounded-full animate-spin mx-auto"
                />
                <p className="text-gray-500 dark:text-gray-400 mt-4">
                  Loading players...
                </p>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type your name to search..."
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700
                    bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg
                    border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto"
                  >
                    {searchResults.map((result) => (
                      <button
                        key={result.name}
                        onClick={() => setSelectedPlayer(result)}
                        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700
                          border-b border-gray-100 dark:border-gray-700 last:border-0 text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30
                          flex items-center justify-center shrink-0"
                        >
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white truncate">
                              {result.name}
                            </span>
                            {result.isClaimed && (
                              <span className="shrink-0 px-1.5 py-0.5 text-xs font-medium rounded
                                bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                              >
                                <Check className="w-3 h-3 inline" /> Yours
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
            )}
          </div>

          {/* Selected player confirmation */}
          {selectedPlayer && (
            <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
                Confirm Your Profile
              </h2>

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
                  <p className="text-gray-500 dark:text-gray-400">
                    {currentLeague?.name} - {currentSeasonMeta?.label}
                  </p>
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
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium
                    hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claiming ? 'Claiming...' : 'This is Me - Claim Profile'}
                </button>
              )}

              {error && (
                <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
          )}

          {/* Already claimed profiles */}
          {myProfiles.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-green-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Your Profiles ({currentSeasonMeta?.label})
                </h2>
              </div>
              <div className="space-y-3">
                {myProfiles.map((claimed) => {
                  const playerData = players2526[claimed.name];
                  return (
                    <div
                      key={claimed.name}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800
                        rounded-lg border border-gray-200 dark:border-gray-700"
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
                        {playerData && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {playerData.total.p} games - {formatWinPct(playerData.total.pct)}
                          </p>
                        )}
                      </div>
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Help text */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-300">
                  Played in multiple leagues or seasons?
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                  Switch the league and season above to claim your profile in each competition
                  you&apos;ve participated in.
                </p>
              </div>
            </div>
          </div>
        </AuthGuard>
      </div>
    </div>
  );
}
