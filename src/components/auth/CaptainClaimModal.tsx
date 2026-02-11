'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Search, AlertTriangle, Check } from 'lucide-react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth, addCaptainClaim, hasCaptainClaim } from '@/lib/auth';
import type { LeagueMeta } from '@/lib/types';

interface CaptainClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CaptainClaimModal({ isOpen, onClose, onSuccess }: CaptainClaimModalProps) {
  const { user, profile, refreshProfile } = useAuth();

  const [leagues, setLeagues] = useState<LeagueMeta[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [divisions, setDivisions] = useState<Record<string, { name: string; teams: string[] }>>({});
  const [selectedDivision, setSelectedDivision] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load leagues
  useEffect(() => {
    if (!isOpen) return;
    async function loadLeagues() {
      try {
        const snap = await getDocs(collection(db, 'leagues'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as LeagueMeta[];
        setLeagues(data);
        if (data.length > 0) {
          setSelectedLeague(data[0].id);
          const current = data[0].seasons.find(s => s.current);
          if (current) setSelectedSeason(current.id);
        }
      } catch {
        setError('Failed to load leagues');
      }
    }
    loadLeagues();
  }, [isOpen]);

  // Load divisions when league/season changes
  useEffect(() => {
    if (!selectedLeague || !selectedSeason) {
      setLoading(false);
      return;
    }
    async function loadDivisions() {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'leagues', selectedLeague, 'seasons', selectedSeason));
        if (snap.exists()) {
          const data = snap.data();
          const divs = data.divisions || {};
          setDivisions(divs);
          const keys = Object.keys(divs);
          if (keys.length > 0) setSelectedDivision(keys[0]);
        } else {
          setDivisions({});
        }
      } catch {
        setError('Failed to load divisions');
      } finally {
        setLoading(false);
      }
    }
    loadDivisions();
  }, [selectedLeague, selectedSeason]);

  const currentLeague = leagues.find(l => l.id === selectedLeague);

  const teams = useMemo(() => {
    if (!selectedDivision || !divisions[selectedDivision]) return [];
    return divisions[selectedDivision].teams || [];
  }, [selectedDivision, divisions]);

  const filteredTeams = useMemo(() => {
    if (searchQuery.length < 1) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter(t => t.toLowerCase().includes(q));
  }, [teams, searchQuery]);

  const isAlreadyClaimed = selectedTeam && profile
    ? hasCaptainClaim(profile, selectedLeague, selectedSeason, selectedTeam)
    : false;

  const handleClaim = async () => {
    if (!user || !selectedTeam || !selectedDivision) return;
    setClaiming(true);
    setError(null);
    try {
      await addCaptainClaim(user.uid, selectedLeague, selectedSeason, selectedTeam, selectedDivision);
      await refreshProfile();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError('Failed to claim team. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface-card border border-surface-border rounded-2xl shadow-elevated w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-baize" />
            <h2 className="font-semibold text-white">Claim Team as Captain</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition p-1">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          {/* League / Season */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">League</label>
              <select
                value={selectedLeague}
                onChange={e => {
                  setSelectedLeague(e.target.value);
                  const league = leagues.find(l => l.id === e.target.value);
                  const current = league?.seasons.find(s => s.current);
                  setSelectedSeason(current?.id || league?.seasons[0]?.id || '');
                  setSelectedTeam(null);
                }}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white"
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
                onChange={e => { setSelectedSeason(e.target.value); setSelectedTeam(null); }}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white"
              >
                {currentLeague?.seasons.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Division */}
          {Object.keys(divisions).length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Division</label>
              <div className="flex gap-1">
                {Object.entries(divisions).map(([key, div]) => (
                  <button
                    key={key}
                    onClick={() => { setSelectedDivision(key); setSelectedTeam(null); setSearchQuery(''); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition text-center ${
                      selectedDivision === key
                        ? 'bg-baize text-white'
                        : 'bg-surface text-gray-400 hover:text-white'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Team search */}
          {!loading && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Team</label>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search teams..."
                  className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-baize"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredTeams.map(team => (
                  <button
                    key={team}
                    onClick={() => { setSelectedTeam(team); setAgreedToDisclaimer(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedTeam === team
                        ? 'bg-baize/20 text-baize-light border border-baize/30'
                        : 'text-gray-300 hover:bg-surface-elevated'
                    }`}
                  >
                    {team}
                  </button>
                ))}
                {filteredTeams.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-4">No teams found</p>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-baize border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Selected team confirmation */}
          {selectedTeam && !isAlreadyClaimed && (
            <>
              <div className="p-3 bg-amber-900/20 border border-amber-800/50 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>Only claim a team if you are its captain. Falsely claiming captaincy may result in account suspension.</span>
              </div>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToDisclaimer}
                  onChange={e => setAgreedToDisclaimer(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-gray-600 text-baize focus:ring-baize"
                />
                <span className="text-xs text-gray-400">
                  I confirm I am the captain of <strong className="text-white">{selectedTeam}</strong> and understand that misuse may lead to account suspension.
                </span>
              </label>
            </>
          )}

          {isAlreadyClaimed && (
            <div className="flex items-center gap-2 text-green-400 text-sm p-3 bg-green-900/20 rounded-lg">
              <Check size={16} />
              <span>You&apos;ve already claimed this team</span>
            </div>
          )}

          {error && <p className="text-sm text-loss">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-border/50 shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white bg-surface border border-surface-border transition"
            >
              Cancel
            </button>
            <button
              onClick={handleClaim}
              disabled={!selectedTeam || !agreedToDisclaimer || claiming || !!isAlreadyClaimed}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white bg-baize hover:bg-baize-light disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {claiming ? 'Claiming...' : 'Claim as Captain'}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-2">
            Your claim will be shown as &quot;Unverified&quot; until a league admin verifies it.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
