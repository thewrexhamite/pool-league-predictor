'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DivisionCode, UserSession } from '@/lib/types';
import { useLeagueData } from '@/lib/data-provider';
import { useActiveData } from '@/lib/active-data-provider';
import { useUserSession } from '@/hooks/use-user-session';
import { useMyTeam } from '@/hooks/use-my-team';
import { usePrediction } from '@/hooks/use-prediction';
import { useSimulation } from '@/hooks/use-simulation';
import { useSquadBuilder } from '@/hooks/use-squad-builder';
import { useHashRouter } from '@/lib/router';
import { calcStandings, getAllRemainingFixtures } from '@/lib/predictions/index';
import { getAvailableMatchDates } from '@/lib/time-machine';

interface UseAppStateOptions {
  timeMachineDate: string | null;
  setTimeMachineDate: (d: string | null) => void;
  onToast: (message: string, type: 'success' | 'warning' | 'info') => void;
}

export function useAppState({ timeMachineDate, setTimeMachineDate, onToast }: UseAppStateOptions) {
  const { ds } = useActiveData();
  const { data: leagueData } = useLeagueData();
  const { myTeam, setMyTeam, clearMyTeam } = useMyTeam();

  // Dynamic divisions from data
  const divisionCodes = useMemo(() => Object.keys(ds.divisions), [ds.divisions]);
  const routerOptions = useMemo(() => ({
    validDivisions: divisionCodes.length > 0 ? divisionCodes : [],
    defaultDiv: divisionCodes[0] || '',
  }), [divisionCodes]);
  const router = useHashRouter(routerOptions);

  // Ensure division is valid for current league
  const safeDiv = useMemo(() => {
    if (divisionCodes.length === 0) return '' as DivisionCode;
    if (ds.divisions[router.div]) return router.div;
    return (divisionCodes[0] as DivisionCode) || router.div;
  }, [router.div, ds.divisions, divisionCodes]);

  // Modal state
  const [showMyTeamModal, setShowMyTeamModal] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Simulation hook
  const simulation = useSimulation({
    ds,
    selectedDiv: safeDiv,
    squadOverrides: {},
    squadTopN: 5,
    onSimulationComplete: (message) => onToast(message, 'success'),
    onAddWhatIf: (message) => onToast(message, 'success'),
    onRemoveWhatIf: (message) => onToast(message, 'info'),
  });

  // Squad builder hook
  const squadBuilder = useSquadBuilder({
    onSquadChange: () => simulation.clearSimulation(),
    onToast,
  });

  // Update simulation when squad changes
  useEffect(() => {
    simulation.setWhatIfResults(simulation.whatIfResults);
  }, [squadBuilder.squadOverrides, squadBuilder.squadTopN]);

  // Prediction hook
  const prediction = usePrediction({
    ds,
    squadOverrides: squadBuilder.squadOverrides,
    squadTopN: squadBuilder.squadTopN,
  });

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

  // Available match dates for time machine
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

  // Handler functions
  const openTeamDetail = (team: string) => router.openTeam(team);
  const openPlayerDetail = (name: string) => router.openPlayer(name);

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

  const handleSetMyTeam = (team: string, div: DivisionCode) => {
    setMyTeam(team, div);
    setShowMyTeamModal(false);
    if (div !== router.div) resetDivision(div);
    onToast(`My Team set to ${team}`, 'success');
  };

  const handleClearMyTeam = () => {
    clearMyTeam();
    setShowMyTeamModal(false);
    onToast('My Team cleared', 'info');
  };

  return {
    // State
    router,
    safeDiv,
    standings,
    myTeam,
    showMyTeamModal,
    setShowMyTeamModal,
    showNotificationSettings,
    setShowNotificationSettings,
    availableDates,

    // Hooks
    prediction,
    simulation,
    squadBuilder,

    // Handlers
    openTeamDetail,
    openPlayerDetail,
    resetDivision,
    handleSetMyTeam,
    handleClearMyTeam,
  };
}
