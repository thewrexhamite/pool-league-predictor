'use client';

/**
 * League Detail/Edit Page
 *
 * View and edit league configuration, manage seasons, and configure data sources.
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Edit, Trash2, Database, Users, Calendar, Palette } from 'lucide-react';
import LeagueForm from '@/components/admin/LeagueForm';
import DataSourceConfig from '@/components/admin/DataSourceConfig';
import type { LeagueConfig, DataSourceConfig as DataSourceConfigType } from '@/lib/types';

export default function LeagueDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LeagueDetailContent />
    </Suspense>
  );
}

function LeagueDetailContent() {
  const router = useRouter();
  const params = useParams();
  const leagueId = params.leagueId as string;

  const [league, setLeague] = useState<LeagueConfig | null>(null);
  const [dataSources, setDataSources] = useState<DataSourceConfigType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDataSourceConfig, setShowDataSourceConfig] = useState(false);

  // Load league data
  useEffect(() => {
    async function loadLeague() {
      try {
        const leagueRef = doc(db, 'leagues', leagueId);
        const leagueSnap = await getDoc(leagueRef);

        if (!leagueSnap.exists()) {
          setError('League not found');
          setLoading(false);
          return;
        }

        const data = leagueSnap.data();
        setLeague({
          id: leagueSnap.id,
          name: data.name || '',
          shortName: data.shortName || '',
          primaryColor: data.primaryColor || '#3b82f6',
          logo: data.logo,
          seasons: data.seasons || [],
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
        });

        // Load data sources for this league
        const dataSourcesRef = collection(db, 'dataSources');
        const dataSourcesSnap = await getDocs(dataSourcesRef);
        const sources = dataSourcesSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as DataSourceConfigType))
          .filter(ds => ds.leagueId === leagueId);
        setDataSources(sources);

        setLoading(false);
      } catch (err) {
        console.error('Failed to load league:', err);
        setError('Failed to load league data');
        setLoading(false);
      }
    }

    loadLeague();
  }, [leagueId]);

  // Handle form submission
  const handleFormSubmit = async (updatedLeague: Partial<LeagueConfig>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/leagues/${leagueId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedLeague),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update league');
      }

      // Refresh the page to show updated data
      window.location.reload();

      return true;
    } catch (error) {
      console.error('Error updating league:', error);
      return false;
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${league?.name}? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/leagues/${leagueId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete league');
      }

      // Redirect to admin dashboard
      router.push('/admin');
    } catch (error) {
      console.error('Error deleting league:', error);
      alert('Failed to delete league. Please try again.');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center">
          <div className="skeleton w-12 h-12 rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading league...</p>
        </div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen bg-base-200">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-base-content/70 hover:text-base-content mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin</span>
          </button>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body text-center">
              <h2 className="text-2xl font-bold text-error">Error</h2>
              <p className="text-base-content/70">{error || 'League not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-base-content/70 hover:text-base-content mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin</span>
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {league.logo && (
                <div className="avatar">
                  <div className="mask mask-squircle w-16 h-16">
                    <img src={league.logo} alt={league.name} />
                  </div>
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold">{league.name}</h1>
                <p className="text-base-content/70 mt-1">
                  {league.shortName} • {league.id}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsFormOpen(true)}
                className="btn btn-primary gap-2"
              >
                <Edit size={20} />
                Edit League
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn btn-error gap-2"
              >
                <Trash2 size={20} />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* League Info */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">League Information</h2>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-sm text-base-content/60">Full Name</label>
                    <p className="font-medium">{league.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-base-content/60">Short Name</label>
                    <p className="font-medium">{league.shortName}</p>
                  </div>
                  <div>
                    <label className="text-sm text-base-content/60">League ID</label>
                    <p className="font-mono text-sm">{league.id}</p>
                  </div>
                  <div>
                    <label className="text-sm text-base-content/60 flex items-center gap-2">
                      <Palette size={14} />
                      Primary Color
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border border-base-content/20"
                        style={{ backgroundColor: league.primaryColor }}
                      />
                      <p className="font-mono text-sm">{league.primaryColor}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Seasons */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title flex items-center gap-2">
                  <Calendar size={20} />
                  Seasons
                </h2>
                {league.seasons.length === 0 ? (
                  <div className="text-center py-8 text-base-content/60">
                    No seasons configured
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {league.seasons.map((season) => (
                      <span
                        key={season}
                        className="badge badge-lg badge-primary"
                      >
                        {season}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Data Sources */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title flex items-center gap-2">
                    <Database size={20} />
                    Data Sources
                  </h2>
                  {!showDataSourceConfig && (
                    <button
                      onClick={() => setShowDataSourceConfig(true)}
                      className="btn btn-sm btn-primary"
                    >
                      {dataSources.length === 0 ? 'Configure' : 'Add Source'}
                    </button>
                  )}
                </div>

                {showDataSourceConfig ? (
                  <div className="space-y-4">
                    <DataSourceConfig
                      leagueId={leagueId}
                      existingConfig={dataSources[0] || null}
                      onSave={() => {
                        setShowDataSourceConfig(false);
                        // Refresh data sources
                        window.location.reload();
                      }}
                    />
                    <button
                      onClick={() => setShowDataSourceConfig(false)}
                      className="btn btn-sm btn-ghost"
                    >
                      Cancel
                    </button>
                  </div>
                ) : dataSources.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-base-content/60">No data sources configured</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataSources.map((ds) => (
                          <tr key={ds.id}>
                            <td className="font-medium">{ds.sourceType}</td>
                            <td>
                              <span
                                className={`badge ${
                                  ds.enabled ? 'badge-success' : 'badge-ghost'
                                }`}
                              >
                                {ds.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </td>
                            <td>
                              <button
                                onClick={() => setShowDataSourceConfig(true)}
                                className="btn btn-xs btn-ghost"
                              >
                                Configure
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="font-bold text-lg mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70 text-sm">Seasons</span>
                    <span className="font-bold">{league.seasons.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70 text-sm">Data Sources</span>
                    <span className="font-bold">{dataSources.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/70 text-sm">Active Sources</span>
                    <span className="font-bold">
                      {dataSources.filter(ds => ds.enabled).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="font-bold text-lg mb-4">Metadata</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-base-content/60 block">Created</span>
                    <span className="font-medium">
                      {new Date(league.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-base-content/60 block">Last Updated</span>
                    <span className="font-medium">
                      {new Date(league.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h3 className="font-bold text-lg mb-4">Actions</h3>
                <div className="space-y-2">
                  <button className="btn btn-sm btn-block btn-ghost justify-start">
                    <Users size={16} />
                    Manage Players
                  </button>
                  <button className="btn btn-sm btn-block btn-ghost justify-start">
                    <Database size={16} />
                    Sync Data
                  </button>
                  <button className="btn btn-sm btn-block btn-ghost justify-start">
                    <Calendar size={16} />
                    Manage Seasons
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* League Form Modal */}
      <LeagueForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        league={league}
        mode="edit"
      />
    </div>
  );
}
