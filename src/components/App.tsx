'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { Star } from 'lucide-react';
import type {
  DivisionCode,
  LeagueMeta,
  UserSession,
} from '@/lib/types';
import { useLeagueData } from '@/lib/data-provider';
import { ActiveDataProvider, useActiveData } from '@/lib/active-data-provider';
import { useUserSession } from '@/hooks/use-user-session';
import { useMyTeam } from '@/hooks/use-my-team';
import { usePrediction } from '@/hooks/use-prediction';
import { useSimulation } from '@/hooks/use-simulation';
import { useSquadBuilder } from '@/hooks/use-squad-builder';
import { useHashRouter } from '@/lib/router';
import {
  calcStandings,
  getAllRemainingFixtures,
} from '@/lib/predictions/index';
import { getAvailableMatchDates } from '@/lib/time-machine';
import { TABS } from '@/lib/tabs';

import { ToastProvider, useToast } from './ToastProvider';
import AppHeader from './AppHeader';
import BottomTabBar from './BottomTabBar';
import BackToTopButton from './BackToTopButton';
import DashboardTab from './DashboardTab';
import StandingsTab from './StandingsTab';
import ResultsTab from './ResultsTab';
import SimulateTab from './SimulateTab';
import PredictTab from './PredictTab';
import FixturesTab from './FixturesTab';
import PlayersTab from './PlayersTab';
import StatsTab from './StatsTab';
import TeamDetail from './TeamDetail';
import PlayerDetail from './PlayerDetail';
import Glossary from './Glossary';
import NotificationSettings from './NotificationSettings';

/** Outer shell: owns time-machine state + wraps children with ActiveDataProvider */
function AppInner({ league }: { league?: LeagueMeta }) {
  const { data: leagueData, refreshing, loading } = useLeagueData();
  const [timeMachineDate, setTimeMachineDate] = useState<string | null>(null);

  // Show loading state while data is being fetched or if no divisions exist yet
  const hasDivisions = Object.keys(leagueData.divisions).length > 0;
  if (loading || !hasDivisions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="skeleton w-12 h-12 rounded-full mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading league data...</p>
        </div>
      </div>
    );
  }

  return (
    <ActiveDataProvider leagueData={leagueData} timeMachineDate={timeMachineDate}>
      <AppContent
        league={league}
        refreshing={refreshing}
        timeMachineDate={timeMachineDate}
        setTimeMachineDate={setTimeMachineDate}
      />
    </ActiveDataProvider>
  );
}

interface AppContentProps {
  league?: LeagueMeta;
  refreshing: boolean;
  timeMachineDate: string | null;
  setTimeMachineDate: (d: string | null) => void;
}

function AppContent({ league, refreshing, timeMachineDate, setTimeMachineDate }: AppContentProps) {
  const { data: activeData, ds } = useActiveData();
  const { data: leagueData, loading: dataLoading } = useLeagueData();
  const { addToast } = useToast();
  const { myTeam, setMyTeam, clearMyTeam } = useMyTeam();

  // Dynamic divisions from data
  const divisionCodes = useMemo(() => Object.keys(ds.divisions), [ds.divisions]);
  const routerOptions = useMemo(() => ({
    validDivisions: divisionCodes.length > 0 ? divisionCodes : [],
    defaultDiv: divisionCodes[0] || '',
  }), [divisionCodes]);
  const router = useHashRouter(routerOptions);

  // Ensure division is valid for current league (handles switching between leagues)
  const safeDiv = useMemo(() => {
    if (divisionCodes.length === 0) return '' as DivisionCode;
    if (ds.divisions[router.div]) return router.div;
    return (divisionCodes[0] as DivisionCode) || router.div;
  }, [router.div, ds.divisions, divisionCodes]);

  // Squad builder hook
  const squadBuilder = useSquadBuilder();

  // Prediction hook
  const prediction = usePrediction({
    ds,
    squadOverrides: squadBuilder.squadOverrides,
    squadTopN: squadBuilder.squadTopN,
  });

  // Simulation hook
  const simulation = useSimulation({
    ds,
    selectedDiv: safeDiv,
    squadOverrides: squadBuilder.squadOverrides,
    squadTopN: squadBuilder.squadTopN,
    onSimulationComplete: (message) => addToast(message, 'success'),
    onAddWhatIf: (message) => addToast(message, 'success'),
    onRemoveWhatIf: (message) => addToast(message, 'info'),
  });

  // My Team modal
  const [showMyTeamModal, setShowMyTeamModal] = useState(false);

  // Notification Settings modal
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [router.tab]);

  // Sync predict teams from router
  useEffect(() => {
    if (router.tab === 'predict' && router.home && router.away) {
      prediction.setPredictionTeams(router.home, router.away);
    }
  }, [router.tab, router.home, router.away, prediction]);

  // Available match dates for time machine (always from raw data)
  const availableDates = useMemo(
    () => getAvailableMatchDates(leagueData.results),
    [leagueData.results]
  );

  const handleSessionRestore = useCallback((session: UserSession) => {
    if (session.whatIfResults.length > 0) simulation.setWhatIfResults(session.whatIfResults);
    if (Object.keys(session.squadOverrides).length > 0) squadBuilder.restoreOverrides(session.squadOverrides);
  }, [simulation, squadBuilder]);

  useUserSession({
    selectedDiv: safeDiv,
    whatIfResults: simulation.whatIfResults,
    squadOverrides: squadBuilder.squadOverrides,
    onRestore: handleSessionRestore,
  });

  const standings = calcStandings(safeDiv, ds);
  const totalRemaining = getAllRemainingFixtures(ds).length;
  const totalPlayed = ds.results.length;

  const addSquadPlayer = (team: string, playerName: string) => {
    squadBuilder.setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      if (existing.removed.includes(playerName)) {
        const newOv = { ...existing, removed: existing.removed.filter(n => n !== playerName) };
        if (newOv.added.length === 0 && newOv.removed.length === 0) {
          const { [team]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [team]: newOv };
      }
      if (existing.added.includes(playerName)) return prev;
      return { ...prev, [team]: { ...existing, added: [...existing.added, playerName] } };
    });
    simulation.clearSimulation();
    addToast(`Added ${playerName} to ${team}`, 'success');
  };

  const removeSquadPlayer = (team: string, playerName: string) => {
    squadBuilder.setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      if (existing.added.includes(playerName)) {
        const newOv = { ...existing, added: existing.added.filter(n => n !== playerName) };
        if (newOv.added.length === 0 && newOv.removed.length === 0) {
          const { [team]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [team]: newOv };
      }
      if (existing.removed.includes(playerName)) return prev;
      return { ...prev, [team]: { ...existing, removed: [...existing.removed, playerName] } };
    });
    simulation.clearSimulation();
    addToast(`Removed ${playerName} from ${team}`, 'warning');
  };

  const restoreSquadPlayer = (team: string, playerName: string) => {
    squadBuilder.setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      const newOv = { ...existing, removed: existing.removed.filter(n => n !== playerName) };
      if (newOv.added.length === 0 && newOv.removed.length === 0) {
        const { [team]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [team]: newOv };
    });
    simulation.clearSimulation();
  };

  const unaddSquadPlayer = (team: string, playerName: string) => {
    squadBuilder.setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      const newOv = { ...existing, added: existing.added.filter(n => n !== playerName) };
      if (newOv.added.length === 0 && newOv.removed.length === 0) {
        const { [team]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [team]: newOv };
    });
    simulation.clearSimulation();
  };

  const openTeamDetail = (team: string) => {
    router.openTeam(team);
  };

  const openPlayerDetail = (name: string) => {
    router.openPlayer(name);
  };

  const resetDivision = (key: DivisionCode) => {
    router.setDiv(key);
    simulation.clearSimulation();
    simulation.clearWhatIfResults();
    squadBuilder.clearAllOverrides();
    squadBuilder.clearTeam();
    squadBuilder.clearPlayerSearch();
    squadBuilder.setTopN(5);
    prediction.clearPrediction();
  };

  // My team handler
  const handleSetMyTeam = (team: string, div: DivisionCode) => {
    setMyTeam(team, div);
    setShowMyTeamModal(false);
    if (div !== router.div) resetDivision(div);
    addToast(`My Team set to ${team}`, 'success');
  };

  const activeTab = router.tab;
  const selectedDiv = safeDiv;
  const selectedTeam = router.team || null;
  const selectedPlayer = router.player || null;

  const seasonPct = totalPlayed + totalRemaining > 0
    ? Math.round((totalPlayed / (totalPlayed + totalRemaining)) * 100)
    : 0;

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <AppHeader
        timeMachineDate={timeMachineDate}
        setTimeMachineDate={setTimeMachineDate}
        setSimResults={(results) => {
          if (results === null) simulation.clearSimulation();
        }}
        setShowMyTeamModal={setShowMyTeamModal}
        setShowNotificationSettings={setShowNotificationSettings}
        refreshing={refreshing}
        availableDates={availableDates}
        league={league}
      />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (activeTab === 'team' ? selectedTeam : '') + (activeTab === 'player' ? selectedPlayer : '')}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            role="tabpanel"
          >
            {activeTab === 'dashboard' && (
              <DashboardTab
                selectedDiv={selectedDiv}
                standings={standings}
                myTeam={myTeam}
                onTeamClick={openTeamDetail}
                onPlayerClick={openPlayerDetail}
                onPredict={(home, away) => {
                  prediction.setPredictionTeams(home, away);
                  router.openPredict(home, away);
                }}
              />
            )}

            {activeTab === 'standings' && (
              <StandingsTab
                selectedDiv={selectedDiv}
                standings={standings}
                myTeam={myTeam}
                onTeamClick={openTeamDetail}
              />
            )}

            {activeTab === 'results' && (
              <ResultsTab selectedDiv={selectedDiv} onTeamClick={openTeamDetail} onPlayerClick={openPlayerDetail} />
            )}

            {activeTab === 'team' && selectedTeam && (
              <TeamDetail
                team={selectedTeam}
                selectedDiv={selectedDiv}
                standings={standings}
                onBack={() => router.setTab('standings')}
                onTeamClick={openTeamDetail}
                onPlayerClick={openPlayerDetail}
              />
            )}

            {activeTab === 'player' && selectedPlayer && (
              <PlayerDetail
                player={selectedPlayer}
                selectedTeam={selectedTeam}
                onBack={() => {
                  if (selectedTeam) router.openTeam(selectedTeam);
                  else router.setTab('players');
                }}
                onTeamClick={(team, div) => {
                  if (div !== router.div) resetDivision(div as DivisionCode);
                  router.openTeam(team);
                }}
              />
            )}

            {activeTab === 'players' && (
              <PlayersTab
                selectedDiv={selectedDiv}
                onTeamClick={openTeamDetail}
                onPlayerClick={openPlayerDetail}
              />
            )}

            {activeTab === 'stats' && (
              <StatsTab
                selectedDiv={selectedDiv}
                onTeamClick={openTeamDetail}
                onPlayerClick={openPlayerDetail}
              />
            )}

            {activeTab === 'simulate' && (
              <SimulateTab
                selectedDiv={selectedDiv}
                simResults={simulation.simResults}
                isSimulating={simulation.isSimulating}
                whatIfResults={simulation.whatIfResults}
                whatIfSimResults={simulation.whatIfSimResults}
                squadOverrides={squadBuilder.squadOverrides}
                squadTopN={squadBuilder.squadTopN}
                myTeam={myTeam}
                onRunSimulation={simulation.runSimulation}
                onTeamClick={openTeamDetail}
                timeMachineDate={timeMachineDate}
                onTimeMachineDateChange={(date) => { setTimeMachineDate(date); simulation.clearSimulation(); }}
                availableDates={availableDates}
              />
            )}

            {activeTab === 'predict' && (
              <PredictTab
                selectedDiv={selectedDiv}
                homeTeam={prediction.homeTeam}
                awayTeam={prediction.awayTeam}
                prediction={prediction.prediction}
                squadOverrides={squadBuilder.squadOverrides}
                onHomeTeamChange={prediction.setHomeTeam}
                onAwayTeamChange={prediction.setAwayTeam}
                onTeamClick={openTeamDetail}
                onPlayerClick={openPlayerDetail}
              />
            )}

            {activeTab === 'fixtures' && (
              <FixturesTab
                selectedDiv={selectedDiv}
                whatIfResults={simulation.whatIfResults}
                myTeam={myTeam}
                squadOverrides={squadBuilder.squadOverrides}
                squadBuilderTeam={squadBuilder.squadBuilderTeam}
                squadPlayerSearch={squadBuilder.squadPlayerSearch}
                squadTopN={squadBuilder.squadTopN}
                onAddWhatIf={simulation.addWhatIf}
                onRemoveWhatIf={simulation.removeWhatIf}
                onPredict={(home, away) => {
                  prediction.setPredictionTeams(home, away);
                  router.setTab('predict');
                }}
                onTeamClick={openTeamDetail}
                onSimulate={() => {
                  router.setTab('simulate');
                  setTimeout(simulation.runSimulation, 200);
                }}
                onClearWhatIf={() => {
                  simulation.clearWhatIfResults();
                  simulation.clearSimulation();
                }}
                onSquadBuilderTeamChange={team => {
                  squadBuilder.selectTeam(team);
                  squadBuilder.clearPlayerSearch();
                }}
                onSquadPlayerSearchChange={squadBuilder.setPlayerSearch}
                onSquadTopNChange={n => {
                  squadBuilder.setTopN(n);
                  simulation.clearSimulation();
                }}
                onAddSquadPlayer={addSquadPlayer}
                onRemoveSquadPlayer={removeSquadPlayer}
                onRestoreSquadPlayer={restoreSquadPlayer}
                onUnaddSquadPlayer={unaddSquadPlayer}
                onClearAll={() => {
                  simulation.clearWhatIfResults();
                  squadBuilder.clearAllOverrides();
                  squadBuilder.clearTeam();
                  simulation.clearSimulation();
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>


        {/* Glossary */}
        <Glossary />

        <p className="text-center text-gray-600 text-xs mt-4">
          Home Win = 2pts &bull; Away Win = 3pts &bull; Draw = 1pt each
        </p>
        <p className="text-center text-gray-600 text-xs mt-2">
          &copy; Mike Lewis {new Date().getFullYear()} &bull; Pool League Pro
        </p>
      </main>

      {/* Back to top button */}
      <BackToTopButton />

      {/* Bottom tab bar — mobile only */}
      <div className="md:hidden">
        <BottomTabBar activeTab={activeTab} onTabChange={tab => router.setTab(tab)} />
      </div>

      {/* My Team Modal */}
      <AnimatePresence>
        {showMyTeamModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowMyTeamModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-card border border-surface-border rounded-card shadow-elevated p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Star size={20} className="text-accent" />
                Set My Team
              </h3>
              {(Object.entries(ds.divisions) as [DivisionCode, { name: string; teams: string[] }][]).map(([divCode, divData]) => (
                <div key={divCode} className="mb-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{divData.name}</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {divData.teams.map(team => (
                      <button
                        key={team}
                        onClick={() => handleSetMyTeam(team, divCode)}
                        className={clsx(
                          'text-left text-sm px-3 py-1.5 rounded transition',
                          myTeam?.team === team
                            ? 'bg-accent text-fixed-white'
                            : 'text-gray-300 hover:bg-surface-elevated'
                        )}
                      >
                        {team}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {myTeam && (
                <button
                  onClick={() => { clearMyTeam(); setShowMyTeamModal(false); addToast('My Team cleared', 'info'); }}
                  className="w-full mt-2 text-loss text-sm py-2 hover:bg-loss-muted/20 rounded transition"
                >
                  Clear My Team
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Settings Modal */}
      <AnimatePresence>
        {showNotificationSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setShowNotificationSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-card border border-surface-border rounded-card shadow-elevated p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <NotificationSettings onUnsubscribe={() => setShowNotificationSettings(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App({ league }: { league?: LeagueMeta }) {
  return (
    <ToastProvider>
      <AppInner league={league} />
    </ToastProvider>
  );
}
