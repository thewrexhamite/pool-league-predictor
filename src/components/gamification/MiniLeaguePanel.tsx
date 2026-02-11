'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Copy, Check, ChevronDown, ChevronUp, LogOut, Share2, Trophy } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';
import type { MiniLeague, LeaderboardEntry } from '@/lib/gamification/types';
import { createMiniLeague, joinMiniLeague, leaveMiniLeague, getMiniLeagueStandings } from '@/lib/gamification/mini-leagues';
import { useToast } from '../ToastProvider';

interface MiniLeaguePanelProps {
  userId: string;
  miniLeagues: MiniLeague[];
  seasonId: string;
  onUpdate: () => void;
}

export default function MiniLeaguePanel({ userId, miniLeagues, seasonId, onUpdate }: MiniLeaguePanelProps) {
  const { addToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [newName, setNewName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await createMiniLeague(newName.trim(), userId, seasonId);
      addToast('Mini-league created!', 'success');
      setNewName('');
      setCreating(false);
      onUpdate();
    } catch {
      addToast('Failed to create mini-league', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    try {
      const league = await joinMiniLeague(inviteCode.trim(), userId);
      if (league) {
        addToast(`Joined ${league.name}!`, 'success');
        setInviteCode('');
        setJoining(false);
        onUpdate();
      } else {
        addToast('Invalid code or league is full', 'warning');
      }
    } catch {
      addToast('Failed to join mini-league', 'warning');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Users size={16} className="text-baize" />
          Mini-Leagues
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => { setCreating(!creating); setJoining(false); }}
            className="text-xs text-baize hover:text-baize-light transition flex items-center gap-1"
          >
            <Plus size={12} /> Create
          </button>
          <button
            onClick={() => { setJoining(!joining); setCreating(false); }}
            className="text-xs text-baize hover:text-baize-light transition flex items-center gap-1"
          >
            <Users size={12} /> Join
          </button>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-card border border-surface-border rounded-lg p-3 space-y-2">
              <input
                type="text"
                placeholder="League name..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                maxLength={30}
                className="w-full bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize"
              />
              <button
                onClick={handleCreate}
                disabled={loading || !newName.trim()}
                className="w-full bg-baize text-white py-2 rounded text-sm font-medium hover:bg-baize-light transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create League'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join form */}
      <AnimatePresence>
        {joining && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-card border border-surface-border rounded-lg p-3 space-y-2">
              <input
                type="text"
                placeholder="Invite code (e.g. ABC123)"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full bg-surface border border-surface-border rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize font-mono tracking-wider text-center"
              />
              <button
                onClick={handleJoin}
                disabled={loading || inviteCode.length !== 6}
                className="w-full bg-baize text-white py-2 rounded text-sm font-medium hover:bg-baize-light transition disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join League'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* League list */}
      {miniLeagues.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">
          <Users size={24} className="mx-auto mb-2 opacity-30" />
          <p>No mini-leagues yet.</p>
          <p className="text-xs mt-1">Create one or join with an invite code.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {miniLeagues.map(league => (
            <MiniLeagueCard
              key={league.id}
              league={league}
              userId={userId}
              onLeave={() => {
                leaveMiniLeague(league.id, userId).then(() => {
                  addToast(`Left ${league.name}`, 'info');
                  onUpdate();
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniLeagueCard({
  league,
  userId,
  onLeave,
}: {
  league: MiniLeague;
  userId: string;
  onLeave: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [standings, setStandings] = useState<LeaderboardEntry[] | null>(null);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [copied, setCopied] = useState(false);

  const isCreator = league.createdBy === userId;

  const handleExpand = async () => {
    if (!expanded && !standings) {
      setLoadingStandings(true);
      try {
        const result = await getMiniLeagueStandings(league.id);
        setStandings(result?.standings || []);
      } catch {
        setStandings([]);
      } finally {
        setLoadingStandings(false);
      }
    }
    setExpanded(!expanded);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(league.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback — ignore
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${league.name}`,
          text: `Join my Pool League Pro mini-league! Code: ${league.inviteCode}`,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopyCode();
    }
  };

  return (
    <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between px-3 py-3 hover:bg-surface-elevated/50 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Trophy size={14} className="text-baize shrink-0" />
          <span className="text-sm font-medium text-white truncate">{league.name}</span>
          <span className="text-[10px] text-gray-500">{league.members.length} members</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-surface-border/50">
              {/* Invite code + actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide">Code:</span>
                  <span className="font-mono text-sm font-bold text-white tracking-wider">{league.inviteCode}</span>
                  <button onClick={handleCopyCode} className="text-gray-500 hover:text-white transition">
                    {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleShare} className="text-xs text-gray-500 hover:text-white transition flex items-center gap-1">
                    <Share2 size={10} /> Share
                  </button>
                  {!isCreator && (
                    <button onClick={onLeave} className="text-xs text-red-500 hover:text-red-400 transition flex items-center gap-1">
                      <LogOut size={10} /> Leave
                    </button>
                  )}
                </div>
              </div>

              {/* Standings */}
              {loadingStandings ? (
                <div className="text-center py-3 text-xs text-gray-500">Loading standings...</div>
              ) : standings && standings.length > 0 ? (
                <div className="space-y-1">
                  {standings.map(entry => (
                    <div
                      key={entry.userId}
                      className={clsx(
                        'flex items-center gap-2 px-2 py-1.5 rounded text-xs',
                        entry.userId === userId && 'bg-baize/10',
                      )}
                    >
                      <span className="w-5 text-right font-bold text-gray-500">#{entry.rank}</span>
                      {entry.photoURL ? (
                        <Image src={entry.photoURL} alt="" width={20} height={20} className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-surface-elevated flex items-center justify-center text-[8px] text-gray-400">
                          {entry.displayName.charAt(0)}
                        </div>
                      )}
                      <span className={clsx('flex-1 truncate', entry.userId === userId ? 'text-white font-medium' : 'text-gray-300')}>
                        {entry.displayName}
                      </span>
                      <span className="text-gray-500">{entry.xp.toLocaleString()} XP</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-gray-600">No standings data yet</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
