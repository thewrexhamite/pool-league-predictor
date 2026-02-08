'use client';

import { useEffect, useState } from 'react';
import { useLeague } from '@/lib/league-context';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PlayerLinking from '@/components/admin/PlayerLinking';
import type { Players2526Map } from '@/lib/types';

function AdminPlayersContent() {
  const { leagues, loading: leaguesLoading } = useLeague();
  const router = useRouter();
  const [playersData, setPlayersData] = useState<
    Map<string, { leagueName: string; players2526: Players2526Map }>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch players data for all leagues
  useEffect(() => {
    async function fetchPlayersData() {
      if (leaguesLoading || leagues.length === 0) return;

      try {
        setLoading(true);
        setError(null);

        const dataMap = new Map<
          string,
          { leagueName: string; players2526: Players2526Map }
        >();

        // Fetch players data for each league
        for (const league of leagues) {
          try {
            // Fetch the players data from the league's data endpoint
            // For now, we'll use the static import as a fallback
            // In production, this would fetch from Firestore or the league's data source
            const response = await fetch(`/api/leagues/${league.id}/data`);

            if (response.ok) {
              const data = await response.json();
              if (data.players2526 && Object.keys(data.players2526).length > 0) {
                dataMap.set(league.id, {
                  leagueName: league.name,
                  players2526: data.players2526,
                });
              }
            } else {
              // If the API doesn't exist yet, skip this league
              console.warn(`No data available for league: ${league.name}`);
            }
          } catch (err) {
            console.warn(`Failed to fetch data for league ${league.name}:`, err);
          }
        }

        // If no data was fetched, try to use current league data as fallback
        if (dataMap.size === 0) {
          // Import the static data as fallback for development
          const { PLAYERS_2526 } = await import('@/lib/data');
          if (PLAYERS_2526 && Object.keys(PLAYERS_2526).length > 0) {
            const wrexhamLeague = leagues.find(l => l.id === 'wrexham');
            if (wrexhamLeague) {
              dataMap.set('wrexham', {
                leagueName: wrexhamLeague.name,
                players2526: PLAYERS_2526,
              });
            }
          }
        }

        setPlayersData(dataMap);
      } catch (err) {
        console.error('Error fetching players data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load players data');
      } finally {
        setLoading(false);
      }
    }

    fetchPlayersData();
  }, [leagues, leaguesLoading]);

  // Handle back navigation
  const handleBack = () => {
    router.push('/admin');
  };

  if (leaguesLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={handleBack} className="btn btn-ghost btn-sm">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-bold text-white">Player Management</h1>
        </div>
        <div className="bg-surface-card rounded-lg shadow-card p-12 text-center">
          <div className="loading loading-spinner loading-lg text-info mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading players data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={handleBack} className="btn btn-ghost btn-sm">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-bold text-white">Player Management</h1>
        </div>
        <div className="bg-surface-card rounded-lg shadow-card p-8">
          <div className="alert alert-error">
            <span>Error: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (playersData.size === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <button onClick={handleBack} className="btn btn-ghost btn-sm">
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-3xl font-bold text-white">Player Management</h1>
        </div>
        <div className="bg-surface-card rounded-lg shadow-card p-12 text-center">
          <p className="text-gray-400">No players data available</p>
          <p className="text-sm text-gray-500 mt-2">
            Please ensure leagues have been configured with data sources
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={handleBack} className="btn btn-ghost btn-sm">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-3xl font-bold text-white">Player Management</h1>
      </div>
      <div className="bg-surface-card rounded-lg shadow-card p-6">
        <PlayerLinking playersDataByLeague={playersData} />
      </div>
    </div>
  );
}

export default function AdminPlayersPage() {
  return <AdminPlayersContent />;
}
