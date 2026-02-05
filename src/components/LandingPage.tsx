'use client';

import clsx from 'clsx';
import { useLeague } from '@/lib/league-context';
import type { LeagueMeta, SeasonMeta } from '@/lib/types';

export default function LandingPage() {
  const { leagues, loading, selectLeague } = useLeague();

  // Check for previous selection shortcut
  const saved = typeof window !== 'undefined'
    ? (() => {
        try {
          const raw = localStorage.getItem('pool-league-selected');
          return raw ? JSON.parse(raw) as { leagueId: string; seasonId: string } : null;
        } catch { return null; }
      })()
    : null;

  const savedLeague = saved ? leagues.find(l => l.id === saved.leagueId) : null;
  const savedSeason = savedLeague?.seasons.find(s => s.id === saved?.seasonId);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Logo + title */}
        <div className="text-center">
          <svg width="64" height="64" viewBox="0 0 512 512" className="mx-auto mb-4">
            <defs>
              <radialGradient id="lpGrad" cx="38%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#3a3a3a" />
                <stop offset="55%" stopColor="#1a1a1a" />
                <stop offset="100%" stopColor="#080808" />
              </radialGradient>
              <radialGradient id="lpGloss" cx="40%" cy="30%" r="50%">
                <stop offset="0%" stopColor="white" stopOpacity="0.35" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
              <clipPath id="lpClip">
                <circle cx="256" cy="256" r="179" />
              </clipPath>
            </defs>
            <rect width="512" height="512" rx="96" fill="#0C1222" />
            <circle cx="256" cy="256" r="179" fill="url(#lpGrad)" />
            <g clipPath="url(#lpClip)">
              <ellipse cx="256" cy="256" rx="200" ry="72" fill="white" transform="rotate(-18, 256, 256)" />
            </g>
            <ellipse cx="225" cy="195" rx="65" ry="40" fill="url(#lpGloss)" transform="rotate(-25, 225, 195)" />
            <circle cx="256" cy="256" r="63" fill="white" />
            <text x="256" y="256" textAnchor="middle" dominantBaseline="central" fontFamily="'Space Grotesk',sans-serif" fontWeight="700" fontSize="62" fill="#0C1222">8</text>
            <path d="M 350 370 A 155 155 0 0 1 270 425" fill="none" stroke="#D4A855" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <h1 className="text-2xl font-bold">
            <span className="text-gray-100">Pool League </span>
            <span className="text-accent">Pro</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Select a league to get started</p>
        </div>

        {/* Continue shortcut */}
        {savedLeague && savedSeason && (
          <button
            onClick={() => selectLeague(saved!.leagueId, saved!.seasonId)}
            className="w-full bg-baize/10 border border-baize/30 rounded-lg px-4 py-3 text-left hover:bg-baize/20 transition group"
          >
            <div className="text-xs text-gray-500 mb-0.5">Continue where you left off</div>
            <div className="text-sm font-medium text-white group-hover:text-baize-light transition">
              {savedLeague.name} &mdash; {savedSeason.label}
            </div>
          </button>
        )}

        {/* League cards */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="skeleton h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          leagues.map(league => (
            <LeagueCard key={league.id} league={league} onSelect={selectLeague} />
          ))
        )}
      </div>
    </div>
  );
}

function LeagueCard({ league, onSelect }: { league: LeagueMeta; onSelect: (leagueId: string, seasonId: string) => void }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-surface-border/50">
        <h2 className="font-semibold text-white">{league.name}</h2>
      </div>
      <div className="p-2 space-y-1">
        {league.seasons.map(season => (
          <SeasonRow key={season.id} league={league} season={season} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function SeasonRow({ league, season, onSelect }: { league: LeagueMeta; season: SeasonMeta; onSelect: (leagueId: string, seasonId: string) => void }) {
  return (
    <button
      onClick={() => onSelect(league.id, season.id)}
      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-surface-elevated transition"
    >
      <span className="text-gray-300">{season.label}</span>
      <div className="flex items-center gap-2">
        {season.current && (
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-baize/20 text-baize-light px-1.5 py-0.5 rounded">
            Current
          </span>
        )}
        <span className="text-xs text-gray-500">{season.divisions.length} divisions</span>
      </div>
    </button>
  );
}
