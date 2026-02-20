'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { ChalkCard } from '../shared/ChalkCard';
import type { LinkedTeam } from '@/lib/chalk/types';
import type { LeagueMeta } from '@/lib/types';

export function LeagueSettings() {
  const { table, updateSettings } = useChalkTable();
  if (!table) return null;

  return (
    <LeagueSettingsInner
      linkedTeams={table.settings.linkedTeams ?? []}
      updateSettings={updateSettings}
    />
  );
}

function LeagueSettingsInner({
  linkedTeams,
  updateSettings,
}: {
  linkedTeams: LinkedTeam[];
  updateSettings: (s: Record<string, unknown>) => void;
}) {
  const [leagues, setLeagues] = useState<LeagueMeta[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [divisions, setDivisions] = useState<Record<string, { name: string; teams: string[] }>>({});
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [loadingDivisions, setLoadingDivisions] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Load leagues when form opens
  useEffect(() => {
    if (!showAddForm) return;
    let cancelled = false;
    async function load() {
      setLoadingLeagues(true);
      try {
        const snap = await getDocs(collection(db, 'leagues'));
        if (cancelled) return;
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LeagueMeta[];
        setLeagues(data);
        if (data.length > 0 && !selectedLeague) {
          setSelectedLeague(data[0].id);
          const current = data[0].seasons.find(s => s.current);
          setSelectedSeason(current?.id ?? data[0].seasons[0]?.id ?? '');
        }
      } catch (err) {
        console.error('Failed to load leagues:', err);
      } finally {
        if (!cancelled) setLoadingLeagues(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [showAddForm]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load divisions when league/season changes
  useEffect(() => {
    if (!selectedLeague || !selectedSeason) return;
    let cancelled = false;
    async function load() {
      setLoadingDivisions(true);
      try {
        const snap = await getDoc(doc(db, 'leagues', selectedLeague, 'seasons', selectedSeason));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data();
          const divs = (data.divisions ?? {}) as Record<string, { name: string; teams: string[] }>;
          setDivisions(divs);
          const keys = Object.keys(divs);
          if (keys.length > 0) {
            setSelectedDivision(keys[0]);
            setSelectedTeam('');
          }
        } else {
          setDivisions({});
        }
      } catch (err) {
        console.error('Failed to load divisions:', err);
      } finally {
        if (!cancelled) setLoadingDivisions(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedLeague, selectedSeason]);

  const currentLeague = leagues.find(l => l.id === selectedLeague);

  const teams = useMemo(() => {
    if (!selectedDivision || !divisions[selectedDivision]) return [];
    return divisions[selectedDivision].teams ?? [];
  }, [selectedDivision, divisions]);

  const isAlreadyLinked = (teamName: string) =>
    linkedTeams.some(
      lt => lt.leagueId === selectedLeague && lt.seasonId === selectedSeason && lt.teamName === teamName
    );

  const handleAdd = () => {
    if (!selectedTeam || isAlreadyLinked(selectedTeam)) return;
    const newTeam: LinkedTeam = {
      leagueId: selectedLeague,
      seasonId: selectedSeason,
      teamName: selectedTeam,
      divisionCode: selectedDivision,
    };
    updateSettings({ linkedTeams: [...linkedTeams, newTeam] });
    setSelectedTeam('');
    setShowAddForm(false);
  };

  const handleRemove = (index: number) => {
    const updated = linkedTeams.filter((_, i) => i !== index);
    updateSettings({ linkedTeams: updated });
  };

  return (
    <ChalkCard padding="lg">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">League Link</h2>
          <p className="text-sm text-gray-400 mt-0.5">Show league standings on the attract screen</p>
        </div>

        {/* Current linked teams */}
        {linkedTeams.length > 0 && (
          <div className="space-y-2">
            {linkedTeams.map((lt, i) => (
              <div
                key={`${lt.leagueId}-${lt.seasonId}-${lt.teamName}`}
                className="flex items-center justify-between bg-surface rounded-lg px-3 py-2.5 border border-surface-border"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-white truncate">{lt.teamName}</p>
                  <p className="text-xs text-gray-500">{lt.divisionCode} &middot; {lt.seasonId}</p>
                </div>
                <button
                  onClick={() => handleRemove(i)}
                  className="text-gray-500 hover:text-loss transition text-sm px-2 py-1 shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add team form */}
        {showAddForm ? (
          <div className="space-y-3 p-3 bg-surface rounded-lg border border-surface-border">
            {loadingLeagues ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-baize border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* League / Season row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">League</label>
                    <select
                      value={selectedLeague}
                      onChange={e => {
                        setSelectedLeague(e.target.value);
                        const league = leagues.find(l => l.id === e.target.value);
                        const current = league?.seasons.find(s => s.current);
                        setSelectedSeason(current?.id ?? league?.seasons[0]?.id ?? '');
                        setSelectedDivision('');
                        setSelectedTeam('');
                      }}
                      className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white"
                    >
                      {leagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Season</label>
                    <select
                      value={selectedSeason}
                      onChange={e => {
                        setSelectedSeason(e.target.value);
                        setSelectedDivision('');
                        setSelectedTeam('');
                      }}
                      className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white"
                    >
                      {currentLeague?.seasons.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Division */}
                {loadingDivisions ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="w-4 h-4 border-2 border-baize border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : Object.keys(divisions).length > 0 ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Division</label>
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(divisions).map(([key]) => (
                        <button
                          key={key}
                          onClick={() => { setSelectedDivision(key); setSelectedTeam(''); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            selectedDivision === key
                              ? 'bg-baize text-white'
                              : 'bg-surface-card text-gray-400 hover:text-white'
                          }`}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Team */}
                {selectedDivision && teams.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Team</label>
                    <select
                      value={selectedTeam}
                      onChange={e => setSelectedTeam(e.target.value)}
                      className="w-full bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select a team...</option>
                      {teams.map(t => (
                        <option key={t} value={t} disabled={isAlreadyLinked(t)}>
                          {t}{isAlreadyLinked(t) ? ' (already linked)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-surface-card border border-surface-border transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!selectedTeam || isAlreadyLinked(selectedTeam)}
                    className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-baize hover:bg-baize-light disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Add Team
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-baize border border-baize/30 hover:bg-baize/10 transition"
          >
            + Link a Team
          </button>
        )}
      </div>
    </ChalkCard>
  );
}
