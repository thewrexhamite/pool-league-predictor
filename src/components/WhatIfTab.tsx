'use client';

import { Search, X, UserPlus, UserMinus, Undo2 } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, WhatIfResult, SquadOverrides } from '@/lib/types';
import { DIVISIONS, PLAYERS, PLAYERS_2526 } from '@/lib/data';
import {
  getRemainingFixtures,
  getTeamPlayers,
  getAllLeaguePlayers,
  calcSquadStrength,
  calcModifiedSquadStrength,
  calcStrengthAdjustments,
} from '@/lib/predictions';
import WhatIfRow from './WhatIfRow';

interface WhatIfTabProps {
  selectedDiv: DivisionCode;
  whatIfResults: WhatIfResult[];
  squadOverrides: SquadOverrides;
  squadBuilderTeam: string;
  squadPlayerSearch: string;
  squadTopN: number;
  onAddWhatIf: (home: string, away: string, homeScore: number, awayScore: number) => void;
  onRemoveWhatIf: (home: string, away: string) => void;
  onSquadBuilderTeamChange: (team: string) => void;
  onSquadPlayerSearchChange: (search: string) => void;
  onSquadTopNChange: (n: number) => void;
  onAddSquadPlayer: (team: string, playerName: string) => void;
  onRemoveSquadPlayer: (team: string, playerName: string) => void;
  onRestoreSquadPlayer: (team: string, playerName: string) => void;
  onUnaddSquadPlayer: (team: string, playerName: string) => void;
  onClearAll: () => void;
  onSimulate: () => void;
}

export default function WhatIfTab({
  selectedDiv,
  whatIfResults,
  squadOverrides,
  squadBuilderTeam,
  squadPlayerSearch,
  squadTopN,
  onAddWhatIf,
  onRemoveWhatIf,
  onSquadBuilderTeamChange,
  onSquadPlayerSearchChange,
  onSquadTopNChange,
  onAddSquadPlayer,
  onRemoveSquadPlayer,
  onRestoreSquadPlayer,
  onUnaddSquadPlayer,
  onClearAll,
  onSimulate,
}: WhatIfTabProps) {
  const teams = DIVISIONS[selectedDiv].teams;
  const divFixtures = getRemainingFixtures(selectedDiv);

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <h2 className="text-lg font-bold mb-2 text-white">What If — {DIVISIONS[selectedDiv].name}</h2>
      <p className="text-gray-500 text-sm mb-4">
        Set specific match results or modify team squads, then run a simulation.
      </p>

      {/* SQUAD BUILDER */}
      <div className="mb-6 border border-surface-border/30 rounded-lg p-4">
        <h3 className="font-bold text-sm mb-3 text-accent-light flex items-center gap-1.5">
          <UserPlus size={16} />
          Squad Builder
        </h3>
        <div>
          <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Team</label>
          <select
            value={squadBuilderTeam}
            onChange={e => { onSquadBuilderTeamChange(e.target.value); onSquadPlayerSearchChange(''); }}
            className="w-full bg-surface border border-surface-border rounded-lg p-3 text-sm text-white focus:outline-none focus:border-baize"
          >
            <option value="">Choose a team...</option>
            {teams.map(t => (
              <option key={t} value={t}>{t}{squadOverrides[t] ? ' (modified)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Lineup size:</span>
          {[5, 6, 7, 8, 9, 10].map(n => (
            <button
              key={n}
              onClick={() => onSquadTopNChange(n)}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-medium transition',
                squadTopN === n ? 'bg-accent text-white' : 'bg-surface text-gray-400 hover:text-white'
              )}
            >
              {n}
            </button>
          ))}
        </div>

        {squadBuilderTeam && (() => {
          const basePlayers = getTeamPlayers(squadBuilderTeam);
          const override = squadOverrides[squadBuilderTeam] || { added: [], removed: [] };
          const removedSet = new Set(override.removed);

          return (
            <div className="mt-3">
              <h4 className="text-xs font-medium text-gray-500 mb-2">{squadBuilderTeam} — Squad</h4>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {basePlayers.map(pl => (
                  <div key={pl.name} className={clsx(
                    'flex items-center justify-between text-xs rounded-lg p-2',
                    removedSet.has(pl.name) ? 'bg-loss-muted/20 line-through text-gray-600' : 'bg-surface/50'
                  )}>
                    <span className={removedSet.has(pl.name) ? 'text-gray-600' : 'text-info'}>{pl.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        {pl.s2526 ? `${pl.s2526.pct.toFixed(0)}% (${pl.s2526.p}g)` : ''}
                        {pl.rating !== null ? `${pl.s2526 ? ' | ' : ''}${pl.rating > 0 ? '+' : ''}${pl.rating.toFixed(2)}` : ''}
                      </span>
                      {removedSet.has(pl.name) ? (
                        <button onClick={() => onRestoreSquadPlayer(squadBuilderTeam, pl.name)}
                          className="text-win hover:text-win/80 transition" aria-label="Restore">
                          <Undo2 size={14} />
                        </button>
                      ) : (
                        <button onClick={() => onRemoveSquadPlayer(squadBuilderTeam, pl.name)}
                          className="text-loss hover:text-loss/80 transition" aria-label="Remove">
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {(override.added || []).map(name => {
                  const s2526 = PLAYERS_2526[name];
                  const s2425 = PLAYERS[name];
                  return (
                    <div key={name} className="flex items-center justify-between text-xs bg-win-muted/15 border border-win/20 rounded-lg p-2">
                      <span className="text-win/80">+ {name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">
                          {s2526 ? `${s2526.total.pct.toFixed(0)}% (${s2526.total.p}g)` : ''}
                          {s2425 ? `${s2526 ? ' | ' : ''}${s2425.r > 0 ? '+' : ''}${s2425.r.toFixed(2)}` : ''}
                        </span>
                        <button onClick={() => onUnaddSquadPlayer(squadBuilderTeam, name)}
                          className="text-loss hover:text-loss/80 transition" aria-label="Undo add">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Player search */}
              <div className="mt-3 relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search players to add..."
                  value={squadPlayerSearch}
                  onChange={e => onSquadPlayerSearchChange(e.target.value)}
                  className="w-full bg-surface border border-surface-border rounded-lg pl-8 pr-8 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-baize"
                />
                {squadPlayerSearch && (
                  <button onClick={() => onSquadPlayerSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    <X size={14} />
                  </button>
                )}
                {squadPlayerSearch.length >= 2 && (() => {
                  const currentNames = new Set([
                    ...basePlayers.filter(p => !removedSet.has(p.name)).map(p => p.name),
                    ...override.added,
                  ]);
                  const results = getAllLeaguePlayers()
                    .filter(p => p.name.toLowerCase().includes(squadPlayerSearch.toLowerCase()))
                    .filter(p => !currentNames.has(p.name))
                    .slice(0, 8);
                  return results.length > 0 ? (
                    <div className="mt-1 bg-surface-card rounded-lg overflow-hidden border border-surface-border absolute w-full z-10 shadow-elevated">
                      {results.map(p => (
                        <button key={p.name}
                          onClick={() => { onAddSquadPlayer(squadBuilderTeam, p.name); onSquadPlayerSearchChange(''); }}
                          className="w-full flex items-center justify-between p-2 text-xs hover:bg-surface-elevated transition border-b border-surface-border/30 last:border-0 text-left"
                        >
                          <span className="text-info">{p.name}</span>
                          <span className="text-gray-500">
                            {p.teams2526.length > 0 ? p.teams2526.slice(0, 2).join(', ') : ''}
                            {p.totalPct2526 !== null ? ` ${p.totalPct2526.toFixed(0)}%` : ''}
                            {p.rating !== null ? ` | ${p.rating > 0 ? '+' : ''}${p.rating.toFixed(2)}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-1 bg-surface-card rounded-lg p-2 text-xs text-gray-500 absolute w-full z-10 shadow-elevated border border-surface-border">
                      No matching players
                    </div>
                  );
                })()}
              </div>

              {/* Strength impact */}
              {squadOverrides[squadBuilderTeam] && (() => {
                const origStr = calcSquadStrength(squadBuilderTeam, squadTopN);
                const modStr = calcModifiedSquadStrength(squadBuilderTeam, squadOverrides, squadTopN);
                const adj = calcStrengthAdjustments(selectedDiv, squadOverrides, squadTopN);
                const delta = adj[squadBuilderTeam] || 0;
                return origStr !== null && modStr !== null && (
                  <div className="mt-3 bg-surface/50 rounded-lg p-3">
                    <h4 className="text-xs font-medium text-gray-500 mb-2">Strength Impact</h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <div className="text-gray-400">{(origStr * 100).toFixed(1)}%</div>
                        <div className="text-[10px] text-gray-600">Best {squadTopN}</div>
                      </div>
                      <div>
                        <div className="text-white font-bold">{(modStr * 100).toFixed(1)}%</div>
                        <div className="text-[10px] text-gray-600">Modified</div>
                      </div>
                      <div>
                        <div className={clsx('font-bold', delta > 0 ? 'text-win' : delta < 0 ? 'text-loss' : 'text-gray-400')}>
                          {delta > 0 ? '+' : ''}{delta.toFixed(3)}
                        </div>
                        <div className="text-[10px] text-gray-600">Adjust</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {Object.keys(squadOverrides).length > 0 && (
          <div className="mt-3 p-3 bg-accent-muted/20 border border-accent/20 rounded-lg text-sm">
            <span className="text-accent-light font-medium">Squad changes: </span>
            {Object.entries(squadOverrides).map(([team, ov], i) => (
              <span key={team} className="text-gray-300">
                {team} ({(ov.added || []).length > 0 ? '+' + ov.added.length : ''}{(ov.removed || []).length > 0 ? ' -' + ov.removed.length : ''})
                {i < Object.keys(squadOverrides).length - 1 ? ', ' : ''}
              </span>
            ))}
            <button onClick={onClearAll} className="text-loss hover:text-loss/80 text-xs ml-2 transition">Clear all</button>
          </div>
        )}
      </div>

      {/* Locked results */}
      {whatIfResults.length > 0 && (
        <div className="mb-4 space-y-1.5">
          <h3 className="text-sm font-medium text-gray-400">Locked results:</h3>
          {whatIfResults.map((wi, i) => (
            <div key={i} className="flex items-center justify-between bg-surface/50 rounded-lg p-3 text-sm">
              <span>{wi.home} <span className="font-bold text-win">{wi.homeScore}</span> - <span className="font-bold text-loss">{wi.awayScore}</span> {wi.away}</span>
              <button onClick={() => onRemoveWhatIf(wi.home, wi.away)} className="text-loss hover:text-loss/80 text-xs ml-2 transition">Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming fixtures */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-400">Upcoming fixtures:</h3>
        {divFixtures
          .filter(f => !whatIfResults.some(wi => wi.home === f.home && wi.away === f.away))
          .slice(0, 20)
          .map(f => <WhatIfRow key={f.home + f.away} fixture={f} onAdd={onAddWhatIf} />)}
      </div>

      {/* Action buttons */}
      {(whatIfResults.length > 0 || Object.keys(squadOverrides).length > 0) && (
        <div className="mt-4 flex gap-2">
          <button onClick={onSimulate} className="flex-1 bg-baize hover:bg-baize-dark font-bold py-3 px-6 rounded-lg transition text-white shadow-card">
            Simulate with What-If Changes
          </button>
          <button onClick={onClearAll} className="bg-loss hover:bg-red-600 py-3 px-4 rounded-lg text-sm transition text-white">
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
