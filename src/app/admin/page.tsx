'use client';

import { useState } from 'react';
import { useLeague } from '@/lib/league-context';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import LeagueForm from '@/components/admin/LeagueForm';
import type { LeagueConfig } from '@/lib/types';

function AdminDashboardContent() {
  const { leagues, loading } = useLeague();
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedLeague, setSelectedLeague] = useState<LeagueConfig | null>(null);

  // Handle opening the create form
  const handleCreateLeague = () => {
    setFormMode('create');
    setSelectedLeague(null);
    setIsFormOpen(true);
  };

  // Handle form submission
  const handleFormSubmit = async (league: Partial<LeagueConfig>): Promise<boolean> => {
    try {
      const url = '/api/admin/leagues';
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(league),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${formMode} league`);
      }

      // Refresh the page to show updated leagues
      window.location.reload();

      return true;
    } catch (error) {
      console.error(`Error ${formMode}ing league:`, error);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="skeleton w-12 h-12 rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading leagues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">League Administration</h1>
          <p className="text-base-content/70">
            Manage leagues, data sources, and player linking
          </p>
        </div>

        {/* League List */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">Leagues</h2>
              <button
                onClick={handleCreateLeague}
                className="btn btn-primary gap-2"
              >
                <Plus size={20} />
                Add League
              </button>
            </div>

            {leagues.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-base-content/60 mb-4">No leagues configured</p>
                <button
                  onClick={handleCreateLeague}
                  className="btn btn-primary gap-2"
                >
                  <Plus size={20} />
                  Create Your First League
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Short Name</th>
                      <th>Seasons</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagues.map(league => (
                      <tr key={league.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            {league.logo && (
                              <div className="avatar">
                                <div className="mask mask-squircle w-12 h-12">
                                  <img src={league.logo} alt={league.name} />
                                </div>
                              </div>
                            )}
                            <div>
                              <div className="font-bold">{league.name}</div>
                              <div className="text-sm opacity-50">{league.id}</div>
                            </div>
                          </div>
                        </td>
                        <td>{league.shortName}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {league.seasons.map(season => (
                              <span
                                key={season.id}
                                className={`badge ${
                                  season.current ? 'badge-primary' : 'badge-ghost'
                                }`}
                              >
                                {season.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => router.push(`/admin/leagues/${league.id}`)}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="stat bg-base-100 shadow-xl rounded-lg">
            <div className="stat-title">Total Leagues</div>
            <div className="stat-value">{leagues.length}</div>
          </div>
          <div className="stat bg-base-100 shadow-xl rounded-lg">
            <div className="stat-title">Total Seasons</div>
            <div className="stat-value">
              {leagues.reduce((acc, l) => acc + l.seasons.length, 0)}
            </div>
          </div>
          <div className="stat bg-base-100 shadow-xl rounded-lg">
            <div className="stat-title">Active Seasons</div>
            <div className="stat-value">
              {leagues.reduce(
                (acc, l) => acc + l.seasons.filter(s => s.current).length,
                0
              )}
            </div>
          </div>
        </div>
      </div>

      {/* League Form Modal */}
      <LeagueForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        league={selectedLeague}
        mode={formMode}
      />
    </div>
  );
}

export default function AdminPage() {
  return <AdminDashboardContent />;
}
