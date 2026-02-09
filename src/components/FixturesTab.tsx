'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Lock, PartyPopper, Search, X, UserPlus, UserMinus, Undo2 } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, WhatIfResult, FixtureImportance, SquadOverrides, PredictionResult, PredictionSnapshot } from '@/lib/types';
import { PLAYERS, PLAYERS_2526 } from '@/lib/data';
import {
  getRemainingFixtures,
  calcFixtureImportance,
  getTeamPlayers,
  getAllLeaguePlayers,
  calcSquadStrength,
  calcModifiedSquadStrength,
  calcStrengthAdjustments,
} from '@/lib/predictions';
import { useActiveData } from '@/lib/active-data-provider';
import WhatIfRow from './WhatIfRow';
import CalendarExport from './CalendarExport';

const DEVICE_ID_KEY = 'pool-league-device-id';

function generateDeviceId(): string {
  return 'dev_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

interface FixturesTabProps {
  selectedDiv: DivisionCode;
  whatIfResults: WhatIfResult[];
  myTeam: { team: string; div: DivisionCode } | null;
  squadOverrides: SquadOverrides;
  squadBuilderTeam: string;
  squadPlayerSearch: string;
  squadTopN: number;
  fixturePredictions?: Map<string, PredictionResult>;
  onAddWhatIf: (home: string, away: string, homeScore: number, awayScore: number) => void;
  onRemoveWhatIf: (home: string, away: string) => void;
  onPredict: (home: string, away: string) => void;
  onTeamClick: (team: string) => void;
  onSimulate: () => void;
  onClearWhatIf: () => void;
  onSquadBuilderTeamChange: (team: string) => void;
  onSquadPlayerSearchChange: (search: string) => void;
  onSquadTopNChange: (n: number) => void;
  onAddSquadPlayer: (team: string, playerName: string) => void;
  onRemoveSquadPlayer: (team: string, playerName: string) => void;
  onRestoreSquadPlayer: (team: string, playerName: string) => void;
  onUnaddSquadPlayer: (team: string, playerName: string) => void;
  onClearAll: () => void;
}

export default function FixturesTab({
  selectedDiv,
  whatIfResults,
  myTeam,
  squadOverrides,
  squadBuilderTeam,
  squadPlayerSearch,
  squadTopN,
  fixturePredictions,
  onAddWhatIf,
  onRemoveWhatIf,
  onPredict,
  onTeamClick,
  onSimulate,
  onClearWhatIf,
  onSquadBuilderTeamChange,
  onSquadPlayerSearchChange,
  onSquadTopNChange,
  onAddSquadPlayer,
  onRemoveSquadPlayer,
  onRestoreSquadPlayer,
  onUnaddSquadPlayer,
  onClearAll,
}: FixturesTabProps) {
  const [showAllFixtures, setShowAllFixtures] = useState(false);
  const [importanceTeam, setImportanceTeam] = useState('');
  const [fixtureImportance, setFixtureImportance] = useState<FixtureImportance[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [mustWinOpen, setMustWinOpen] = useState(true);
  const [squadBuilderOpen, setSquadBuilderOpen] = useState(false);
  const { ds } = useActiveData();

  const fixtures = getRemainingFixtures(selectedDiv, ds);

  // Store bulk predictions to Firestore when generated
  const storedPredictionsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!fixturePredictions || fixturePredictions.size === 0) return;

    // Store predictions asynchronously
    (async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return;

      try {
        const { db } = await import('@/lib/firebase');
        const deviceId = getDeviceId();
        if (!deviceId) return;

        // Iterate through all fixture predictions
        for (const [fixtureKey, prediction] of fixturePredictions) {
          // Skip if already stored
          if (storedPredictionsRef.current.has(fixtureKey)) continue;

          // Parse fixture key (format: "home:away")
          const [home, away] = fixtureKey.split(':');
          if (!home || !away) continue;

          // Generate prediction ID
          const predictionId = `${deviceId}_${Date.now()}_${fixtureKey.replace(/:/g, '_')}`;

          // Determine predicted winner
          const pHome = parseFloat(prediction.pHomeWin);
          const pDraw = parseFloat(prediction.pDraw);
          const pAway = parseFloat(prediction.pAwayWin);
          const maxProb = Math.max(pHome, pDraw, pAway);
          let predictedWinner: 'home' | 'away' | 'draw';
          if (pHome === maxProb) predictedWinner = 'home';
          else if (pAway === maxProb) predictedWinner = 'away';
          else predictedWinner = 'draw';

          // Find the fixture date
          const fixture = fixtures.find(f => f.home === home && f.away === away);
          const fixtureDate = fixture?.date || new Date().toISOString().split('T')[0];

          // Create prediction snapshot
          const snapshot: PredictionSnapshot = {
            id: predictionId,
            seasonId: '2025-26', // Current season
            date: fixtureDate, // Use fixture date
            home,
            away,
            division: selectedDiv,
            predictedAt: Date.now(),
            pHomeWin: pHome / 100, // Convert percentage to 0-1
            pDraw: pDraw / 100,
            pAwayWin: pAway / 100,
            expectedHome: parseFloat(prediction.expectedHome),
            expectedAway: parseFloat(prediction.expectedAway),
            confidence: maxProb / 100,
            predictedWinner,
          };

          // Store to Firestore
          const docRef = doc(db, 'predictions', predictionId);
          await setDoc(docRef, snapshot);

          // Mark as stored
          storedPredictionsRef.current.add(fixtureKey);
        }
      } catch {
        // Firestore unavailable - silent fail
      }
    })();
  }, [fixturePredictions, selectedDiv, fixtures]);
  const teams = ds.divisions[selectedDiv].teams;
  const lockedKeys = new Set(whatIfResults.map(wi => wi.home + ':' + wi.away));
  const unlockedFixtures = fixtures.filter(f => !lockedKeys.has(f.home + ':' + f.away));
  const displayedFixtures = showAllFixtures ? unlockedFixtures : unlockedFixtures.slice(0, 10);

  const importanceLookup = new Map<string, FixtureImportance>();
  if (fixtureImportance) {
    for (const fi of fixtureImportance) {
      importanceLookup.set(fi.home + ':' + fi.away, fi);
    }
  }

  const runImportanceCalc = useCallback(() => {
    if (!importanceTeam) return;
    setIsCalculating(true);
    setFixtureImportance(null);
    setTimeout(() => {
      const result = calcFixtureImportance(selectedDiv, importanceTeam, {}, 5, whatIfResults, ds);
      setFixtureImportance(result);
      setIsCalculating(false);
    }, 50);
  }, [selectedDiv, importanceTeam, whatIfResults, ds]);

  if (fixtures.length === 0) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-8 text-center">
        <PartyPopper size={48} className="mx-auto text-gold mb-3" />
        <p className="text-white font-medium">All fixtures have been played!</p>
        <p className="text-gray-500 text-sm mt-1">The season is complete.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">
          Fixtures — {ds.divisions[selectedDiv].name}
          <span className="text-gray-500 text-sm font-normal ml-2">({fixtures.length} remaining)</span>
        </h2>
        <CalendarExport division={selectedDiv} />
      </div>

      {/* Squad Builder (collapsible) */}
      <div className="mb-4 bg-surface/50 rounded-lg border border-surface-border/30 overflow-hidden">
        <button
          onClick={() => setSquadBuilderOpen(!squadBuilderOpen)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-elevated/30 transition"
        >
          <h3 className="text-sm font-semibold text-accent-light flex items-center gap-1.5">
            <UserPlus size={14} />
            Squad Builder
            {Object.keys(squadOverrides).length > 0 && (
              <span className="text-[10px] text-accent bg-accent-muted/30 px-1.5 rounded-full ml-1">
                {Object.keys(squadOverrides).length} modified
              </span>
            )}
          </h3>
          <ChevronDown size={16} className={clsx('text-gray-500 transition-transform', squadBuilderOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {squadBuilderOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                <div>
                  <label htmlFor="squad-builder-team" className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Team</label>
                  <select
                    id="squad-builder-team"
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
                        squadTopN === n ? 'bg-accent text-fixed-white' : 'bg-surface text-gray-400 hover:text-white'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {squadBuilderTeam && (() => {
                  const basePlayers = getTeamPlayers(squadBuilderTeam, ds);
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
                                {pl.rating !== null && <span title="Last season rating">{pl.s2526 ? ' | ' : ''}{pl.rating > 0 ? '+' : ''}{pl.rating.toFixed(2)}</span>}
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
                          const results = getAllLeaguePlayers(ds)
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
                        const origStr = calcSquadStrength(squadBuilderTeam, squadTopN, ds);
                        const modStr = calcModifiedSquadStrength(squadBuilderTeam, squadOverrides, squadTopN, ds);
                        const adj = calcStrengthAdjustments(selectedDiv, squadOverrides, squadTopN, ds);
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Must-Win Calculator */}
      <div className="mb-4 bg-surface/50 rounded-lg border border-surface-border/30 overflow-hidden">
        <button
          onClick={() => setMustWinOpen(!mustWinOpen)}
          className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-elevated/30 transition"
        >
          <h3 className="text-sm font-semibold text-gold">Must-Win Analysis</h3>
          <ChevronDown size={16} className={clsx('text-gray-500 transition-transform', mustWinOpen && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {mustWinOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <label htmlFor="must-win-team" className="text-xs text-gray-500 uppercase tracking-wide">Team:</label>
                  <select
                    id="must-win-team"
                    value={importanceTeam}
                    onChange={(e) => { setImportanceTeam(e.target.value); setFixtureImportance(null); }}
                    className="bg-surface border border-surface-border rounded-lg p-2 text-xs flex-1 min-w-[150px] focus:outline-none focus:border-baize"
                  >
                    <option value="">Select team...</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    onClick={runImportanceCalc}
                    disabled={!importanceTeam || isCalculating}
                    className={clsx(
                      'px-4 py-2 rounded-lg text-xs font-medium transition',
                      !importanceTeam || isCalculating
                        ? 'bg-surface-elevated text-gray-500 cursor-not-allowed'
                        : 'bg-gold hover:bg-amber-600 text-surface'
                    )}
                  >
                    {isCalculating ? 'Calculating...' : 'Calculate'}
                  </button>
                </div>
                {fixtureImportance && fixtureImportance.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {fixtureImportance.map(fi => {
                      const opponent = fi.home === importanceTeam ? fi.away : fi.home;
                      const venue = fi.home === importanceTeam ? '(H)' : '(A)';
                      const barWidth = Math.min(fi.importance, 40) / 40 * 100;
                      return (
                        <div key={fi.home + ':' + fi.away} className="flex items-center text-xs gap-2">
                          <span className="text-gray-500 w-20 shrink-0">{fi.date}</span>
                          <div className="w-20 shrink-0">
                            <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
                              <div
                                className={clsx(
                                  'h-full rounded-full',
                                  fi.importance >= 20 ? 'bg-loss' : fi.importance >= 10 ? 'bg-gold' : 'bg-gray-500'
                                )}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                          <span className={clsx(
                            'w-12 font-bold text-center',
                            fi.importance >= 20 ? 'text-loss' : fi.importance >= 10 ? 'text-gold' : 'text-gray-400'
                          )}>
                            {fi.importance.toFixed(0)}pp
                          </span>
                          <span className="text-gray-500">{venue}</span>
                          <button className="text-gray-300 hover:text-info transition" onClick={() => onTeamClick(opponent)}>
                            vs {opponent}
                          </button>
                          <span className="text-gray-600 text-[10px] ml-auto">
                            W:{fi.pTop2IfWin.toFixed(0)}% L:{fi.pTop2IfLoss.toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {fixtureImportance && fixtureImportance.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">No remaining fixtures for this team.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Locked Results */}
      {whatIfResults.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gold mb-2 flex items-center gap-1.5">
            <Lock size={14} />
            Locked Results ({whatIfResults.length})
          </h3>
          <div className="space-y-1.5">
            {whatIfResults.map(wi => (
              <div
                key={wi.home + ':' + wi.away}
                className="flex items-center justify-between bg-amber-900/20 border border-amber-600/20 rounded-lg p-3 text-sm"
              >
                <span className="text-gray-200">
                  {wi.home} <span className="font-bold text-gold">{wi.homeScore}-{wi.awayScore}</span> {wi.away}
                </span>
                <button onClick={() => onRemoveWhatIf(wi.home, wi.away)} className="text-loss hover:text-loss/80 text-xs ml-2 transition">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixture list */}
      <div className="space-y-2">
        {displayedFixtures.map(fixture => {
          const fi = importanceLookup.get(fixture.home + ':' + fixture.away);
          const isMyFixture = myTeam && (fixture.home === myTeam.team || fixture.away === myTeam.team) && myTeam.div === selectedDiv;
          return (
            <div key={fixture.home + ':' + fixture.away} className={clsx('relative', isMyFixture && 'ring-1 ring-accent/30 rounded-card')}>
              {fi && (
                <span className={clsx(
                  'absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full',
                  fi.importance >= 20 ? 'bg-loss' : fi.importance >= 10 ? 'bg-gold' : 'bg-gray-600'
                )} />
              )}
              <WhatIfRow fixture={fixture} onAdd={onAddWhatIf} onPredict={onPredict} onTeamClick={onTeamClick} />
            </div>
          );
        })}
      </div>

      {unlockedFixtures.length > 10 && (
        <button
          onClick={() => setShowAllFixtures(!showAllFixtures)}
          className="w-full mt-3 text-info hover:text-info-light text-sm py-2 transition"
        >
          {showAllFixtures ? 'Show Less' : `Show All (${unlockedFixtures.length - 10} more)`}
        </button>
      )}

      {/* Action buttons */}
      {(whatIfResults.length > 0 || Object.keys(squadOverrides).length > 0) && (
        <div className="flex gap-3 mt-4">
          <button onClick={onSimulate} className="flex-1 bg-baize hover:bg-baize-dark font-bold py-3 px-6 rounded-lg transition text-fixed-white shadow-card">
            Simulate with {whatIfResults.length > 0 ? `${whatIfResults.length} Locked Result${whatIfResults.length > 1 ? 's' : ''}` : 'Squad Changes'}
          </button>
          <button onClick={onClearAll} className="bg-loss hover:bg-red-600 font-bold py-3 px-6 rounded-lg transition text-fixed-white">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
