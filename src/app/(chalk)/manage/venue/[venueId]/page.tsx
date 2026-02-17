'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import {
  getVenue,
  updateVenue,
  deleteVenue,
  subscribeToVenueTables,
  removeTableFromVenue,
} from '@/lib/chalk/firestore';
import type { ChalkVenue, ChalkTable } from '@/lib/chalk/types';
import { ChalkButton } from '@/components/chalk/shared/ChalkButton';
import { ChalkCard } from '@/components/chalk/shared/ChalkCard';
import { VenueTableCard } from '@/components/chalk/manage/VenueTableCard';
import { AddTableForm } from '@/components/chalk/manage/AddTableForm';
import { ClaimTableForm } from '@/components/chalk/manage/ClaimTableForm';

export default function VenueDetailPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [venue, setVenue] = useState<ChalkVenue | null>(null);
  const [tables, setTables] = useState<ChalkTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [logoValue, setLogoValue] = useState('');
  const [savingLogo, setSavingLogo] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadVenue = useCallback(async () => {
    const v = await getVenue(venueId);
    setVenue(v);
    if (v) {
      setNameValue(v.name);
      setLogoValue(v.logoUrl ?? '');
    }
    setLoading(false);
  }, [venueId]);

  useEffect(() => {
    loadVenue();
  }, [loadVenue]);

  // Subscribe to live table updates
  useEffect(() => {
    const unsub = subscribeToVenueTables(
      venueId,
      (updated) => setTables(updated),
      (err) => console.error('Table subscription error:', err)
    );
    return unsub;
  }, [venueId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-baize border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!venue || !user || venue.ownerId !== user.uid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-lg font-medium">Venue not found</p>
          <p className="text-gray-400 text-sm">
            This venue doesn&apos;t exist or you don&apos;t have access.
          </p>
          <ChalkButton variant="ghost" onClick={() => router.push('/manage')}>
            Back to venues
          </ChalkButton>
        </div>
      </div>
    );
  }

  async function handleSaveName() {
    if (!nameValue.trim() || nameValue.trim() === venue!.name) {
      setEditingName(false);
      return;
    }
    await updateVenue(venueId, { name: nameValue.trim() });
    setVenue((v) => (v ? { ...v, name: nameValue.trim() } : v));
    setEditingName(false);
  }

  async function handleSaveLogo() {
    const url = logoValue.trim() || null;
    if (url === (venue?.logoUrl ?? null)) return;
    setSavingLogo(true);
    await updateVenue(venueId, { logoUrl: url });
    setVenue((v) => (v ? { ...v, logoUrl: url } : v));
    setSavingLogo(false);
  }

  async function handleDeleteVenue() {
    if (tables.length > 0) return;
    if (!confirm('Delete this venue? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteVenue(venueId);
      router.push('/manage');
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Failed to delete venue'
      );
      setDeleting(false);
    }
  }

  async function handleRemoveTable(tableId: string) {
    if (!confirm('Remove this table from the venue? The table will still exist but won\'t be managed here.')) return;
    await removeTableFromVenue(venueId, tableId);
    await loadVenue();
  }

  // Sort tables to match the order in venue.tableIds
  const sortedTables = [...tables].sort((a, b) => {
    const ai = venue.tableIds.indexOf(a.id);
    const bi = venue.tableIds.indexOf(b.id);
    return ai - bi;
  });

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <button
          onClick={() => router.push('/manage')}
          className="chalk-touch text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← My Venues
        </button>
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="text-2xl font-bold bg-surface-elevated rounded-lg px-3 py-1 border border-surface-border focus:border-baize focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') {
                  setNameValue(venue.name);
                  setEditingName(false);
                }
              }}
            />
            <ChalkButton size="sm" onClick={handleSaveName}>
              Save
            </ChalkButton>
          </div>
        ) : (
          <h1
            className="text-2xl font-bold cursor-pointer hover:text-baize transition-colors"
            onClick={() => setEditingName(true)}
            title="Click to edit"
          >
            {venue.name}
          </h1>
        )}
      </div>

      {/* Venue Logo */}
      <ChalkCard padding="lg">
        <h2 className="text-lg font-bold mb-3">Venue Logo</h2>
        <p className="text-sm text-gray-400 mb-3">
          Paste a URL to your venue&apos;s logo. It will appear in the kiosk header.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={logoValue}
            onChange={(e) => setLogoValue(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="flex-1 bg-surface-elevated rounded-lg px-3 py-2 text-sm border border-surface-border focus:border-baize focus:outline-none"
            onBlur={handleSaveLogo}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveLogo();
            }}
          />
          <ChalkButton
            size="sm"
            onClick={handleSaveLogo}
            disabled={savingLogo}
          >
            {savingLogo ? 'Saving…' : 'Save'}
          </ChalkButton>
        </div>
        {logoValue.trim() && (
          <div className="mt-3 flex items-center gap-3">
            <img
              src={logoValue.trim()}
              alt="Logo preview"
              className="h-10 w-auto object-contain rounded bg-surface-elevated p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="text-xs text-gray-400">Preview</span>
          </div>
        )}
      </ChalkCard>

      {/* Tables */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Tables ({sortedTables.length})
        </h2>
        {sortedTables.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No tables yet. Add one below or claim an existing table.
          </p>
        ) : (
          sortedTables.map((table) => (
            <div key={table.id} className="group relative">
              <VenueTableCard table={table} />
              <button
                onClick={() => handleRemoveTable(table.id)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-xs text-gray-500 hover:text-loss transition-all"
                title="Remove from venue"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add / Claim */}
      <div className="space-y-4">
        <AddTableForm
          venueId={venueId}
          venueName={venue.name}
          onAdded={loadVenue}
        />
        <ClaimTableForm venueId={venueId} onClaimed={loadVenue} />
      </div>

      {/* Danger zone */}
      {tables.length === 0 && (
        <ChalkCard padding="lg" className="border-loss/30">
          <h2 className="text-lg font-bold text-loss mb-3">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete venue</p>
              <p className="text-sm text-gray-400">
                Permanently remove this venue
              </p>
            </div>
            <ChalkButton
              variant="danger"
              size="sm"
              onClick={handleDeleteVenue}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </ChalkButton>
          </div>
        </ChalkCard>
      )}
    </div>
  );
}
