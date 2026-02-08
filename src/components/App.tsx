'use client';

import { useState } from 'react';
import type { LeagueMeta } from '@/lib/types';
import { useLeagueData } from '@/lib/data-provider';
import { ActiveDataProvider } from '@/lib/active-data-provider';
import { useAppState } from '@/hooks/use-app-state';

import { ToastProvider, useToast } from './ToastProvider';
import AppHeader from './AppHeader';
import AppTabs from './AppTabs';
import AppFooter from './AppFooter';
import MyTeamModal from './MyTeamModal';
import NotificationSettingsModal from './NotificationSettingsModal';
import BottomTabBar from './BottomTabBar';
import BackToTopButton from './BackToTopButton';

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
  const { addToast } = useToast();
  const appState = useAppState({ timeMachineDate, setTimeMachineDate, onToast: addToast });

  return (
    <div className="min-h-screen text-white">
      <AppHeader
        timeMachineDate={timeMachineDate}
        setTimeMachineDate={setTimeMachineDate}
        setSimResults={(results) => {
          if (results === null) appState.simulation.clearSimulation();
        }}
        setShowMyTeamModal={appState.setShowMyTeamModal}
        setShowNotificationSettings={appState.setShowNotificationSettings}
        refreshing={refreshing}
        availableDates={appState.availableDates}
        league={league}
      />

      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <AppTabs
          activeTab={appState.router.tab}
          selectedDiv={appState.safeDiv}
          selectedTeam={appState.router.team || null}
          selectedPlayer={appState.router.player || null}
          standings={appState.standings}
          myTeam={appState.myTeam}
          timeMachineDate={timeMachineDate}
          availableDates={appState.availableDates}
          onTimeMachineDateChange={(date) => {
            setTimeMachineDate(date);
            appState.simulation.clearSimulation();
          }}
          onTeamClick={appState.openTeamDetail}
          onPlayerClick={appState.openPlayerDetail}
          onPredict={(home, away) => {
            appState.prediction.setPredictionTeams(home, away);
            appState.router.openPredict(home, away);
          }}
          onTabChange={appState.router.setTab}
          onDivisionReset={appState.resetDivision}
          prediction={appState.prediction}
          simulation={appState.simulation}
          squadBuilder={appState.squadBuilder}
        />
        <AppFooter />
      </main>

      <BackToTopButton />

      <div className="md:hidden">
        <BottomTabBar activeTab={appState.router.tab} onTabChange={appState.router.setTab} />
      </div>

      <MyTeamModal
        isOpen={appState.showMyTeamModal}
        onClose={() => appState.setShowMyTeamModal(false)}
        myTeam={appState.myTeam}
        onSetMyTeam={appState.handleSetMyTeam}
        onClearMyTeam={appState.handleClearMyTeam}
      />

      <NotificationSettingsModal
        isOpen={appState.showNotificationSettings}
        onClose={() => appState.setShowNotificationSettings(false)}
      />
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
