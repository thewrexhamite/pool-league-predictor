'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { LeagueMeta } from '@/lib/types';
import { useLeagueData } from '@/lib/data-provider';
import { ActiveDataProvider } from '@/lib/active-data-provider';
import { useAuth, useIsAuthenticated } from '@/lib/auth';
import { useAppState } from '@/hooks/use-app-state';
import { OnboardingModal } from './auth/OnboardingModal';
import { TutorialProvider, useTutorial } from './tutorial/TutorialProvider';
import TutorialWelcomeToast from './tutorial/TutorialWelcomeToast';

import { ToastProvider, useToast } from './ToastProvider';
import AppHeader from './AppHeader';
import AppTabs from './AppTabs';
import AppFooter from './AppFooter';
import MyTeamModal from './MyTeamModal';
import NotificationSettingsModal from './NotificationSettingsModal';
import AIChatPanel from './AIChatPanel';
import QuickLookupMode from './QuickLookupMode';
import { NotificationPrompt } from './NotificationPrompt';
import BottomTabBar from './BottomTabBar';
import DivisionBar from './DivisionBar';
import BackToTopButton from './BackToTopButton';
import ScrollProgress from './ui/ScrollProgress';
import DetailSheetProvider from './ui/DetailSheetProvider';
import DetailSheet from './ui/DetailSheet';
import SheetContent from './SheetContent';
import { useSheetBridge } from '@/hooks/use-sheet-bridge';
import { withViewTransition } from '@/lib/view-transitions';
import { GamificationProvider } from '@/lib/gamification/GamificationProvider';
import { QRScanner } from './chalk/join/QRScanner';

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
  const { user } = useAuth();

  return (
    <GamificationProvider userId={user?.uid || null}>
      <TutorialProvider>
        <DetailSheetProvider>
          <AppContentInner
            league={league}
            refreshing={refreshing}
            timeMachineDate={timeMachineDate}
            setTimeMachineDate={setTimeMachineDate}
          />
        </DetailSheetProvider>
      </TutorialProvider>
    </GamificationProvider>
  );
}

/** Inner content that can safely use useDetailSheet since DetailSheetProvider wraps it */
function AppContentInner({ league, refreshing, timeMachineDate, setTimeMachineDate }: AppContentProps) {
  const { addToast } = useToast();
  const { data: leagueData } = useLeagueData();
  const appState = useAppState({ timeMachineDate, setTimeMachineDate, onToast: addToast });
  const isAuthenticated = useIsAuthenticated();
  const { profile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Show onboarding modal for new sign-ups
  useEffect(() => {
    if (isAuthenticated && profile && !profile.onboarding?.completedAt) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated, profile]);

  // Track the last real (non-detail) tab so sheets don't blank the background
  const lastRealTab = useRef(appState.router.tab === 'team' || appState.router.tab === 'player' ? 'home' as const : appState.router.tab);
  if (appState.router.tab !== 'team' && appState.router.tab !== 'player') {
    lastRealTab.current = appState.router.tab;
  }
  const visibleTab = appState.router.tab === 'team' || appState.router.tab === 'player'
    ? lastRealTab.current
    : appState.router.tab;

  // Bridge router team/player navigation to sheet system
  const sheet = useSheetBridge(
    appState.router.tab,
    appState.router.team,
    appState.router.player,
    appState.safeDiv,
  );

  // Wrap tab changes in View Transition API for smooth cross-fades
  const handleTabChange = useCallback((tab: Parameters<typeof appState.router.setTab>[0]) => {
    withViewTransition(() => appState.router.setTab(tab));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.router.setTab]);

  // Check if current division is a knockout cup
  const knockoutCodes = useMemo(
    () => new Set((leagueData.knockouts || []).map(k => k.code)),
    [leagueData.knockouts]
  );
  const isKnockout = knockoutCodes.has(appState.safeDiv);

  // Auto-switch to standings when selecting a cup division while on a hidden tab
  useEffect(() => {
    if (isKnockout) {
      const currentTab = appState.router.tab;
      if (currentTab === 'matches' || currentTab === 'stats' || currentTab === 'myteam') {
        appState.router.setTab('standings');
      }
    }
  }, [isKnockout, appState.router.tab, appState.router]);

  // Cmd/Ctrl+K keyboard shortcut for Quick Lookup
  const { setShowQuickLookup } = appState;
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickLookup(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setShowQuickLookup]);

  return (
    <div className="min-h-screen text-white">
      <ScrollProgress />
      <AppHeader
        timeMachineDate={timeMachineDate}
        setTimeMachineDate={setTimeMachineDate}
        setSimResults={(results) => {
          if (results === null) appState.simulation.clearSimulation();
        }}
        setShowMyTeamModal={appState.setShowMyTeamModal}
        setShowNotificationSettings={appState.setShowNotificationSettings}
        setShowQuickLookup={appState.setShowQuickLookup}
        refreshing={refreshing}
        availableDates={appState.availableDates}
        league={league}
        isKnockout={isKnockout}
        setShowQRScanner={setShowQRScanner}
      />

      <DivisionBar selectedDiv={appState.safeDiv} onDivisionChange={appState.resetDivision} />

      <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <AppTabs
          activeTab={visibleTab}
          subView={appState.router.subView}
          selectedDiv={appState.safeDiv}
          selectedTeam={appState.router.team || null}
          selectedPlayer={appState.router.player || null}
          standings={appState.standings}
          myTeam={appState.myTeam}
          timeMachineDate={timeMachineDate}
          availableDates={appState.availableDates}
          knockouts={leagueData.knockouts}
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
          onTabChange={handleTabChange}
          onSubViewChange={appState.router.setSubView}
          onDivisionReset={appState.resetDivision}
          onSetMyTeam={() => appState.setShowMyTeamModal(true)}
          prediction={appState.prediction}
          simulation={appState.simulation}
          squadBuilder={appState.squadBuilder}
          onJoinTable={() => setShowQRScanner(true)}
        />
        <AppFooter />
      </main>

      <BackToTopButton />

      <div className="md:hidden">
        <BottomTabBar activeTab={appState.router.tab} onTabChange={handleTabChange} isKnockout={isKnockout} />
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

      {/* Quick Lookup overlay (Cmd/Ctrl+K) */}
      {appState.showQuickLookup && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4">
            <QuickLookupMode
              onClose={() => appState.setShowQuickLookup(false)}
              onTeamClick={(team) => {
                appState.setShowQuickLookup(false);
                appState.openTeamDetail(team);
              }}
              onPlayerClick={(name) => {
                appState.setShowQuickLookup(false);
                appState.openPlayerDetail(name);
              }}
            />
          </div>
        </div>
      )}

      {/* AI Chat FAB — auth-gated */}
      {isAuthenticated && <AIChatPanel />}

      {/* Notification opt-in prompt — auth-gated, shown after setting My Team */}
      {isAuthenticated && appState.showNotificationPrompt && (
        <div className="fixed bottom-20 right-4 z-40 w-80">
          <NotificationPrompt
            onSuccess={() => {
              appState.setShowNotificationPrompt(false);
              addToast('Notifications enabled!', 'success');
            }}
            onDismiss={() => appState.setShowNotificationPrompt(false)}
            onError={() => appState.setShowNotificationPrompt(false)}
          />
        </div>
      )}

      {/* Detail Sheet overlay for team/player views */}
      <DetailSheet>
        <SheetContent
          selectedDiv={appState.safeDiv}
          standings={appState.standings}
        />
      </DetailSheet>

      {/* First-visit tutorial prompt */}
      <TutorialWelcomeToast />

      {/* Onboarding modal for new sign-ups */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSetMyTeam={() => {
          appState.setShowMyTeamModal(true);
        }}
        onEnableNotifications={() => {
          appState.setShowNotificationSettings(true);
        }}
      />

      {showQRScanner && (
        <QRScanner
          onScan={(tableId) => {
            setShowQRScanner(false);
            window.location.href = `/join/${tableId}`;
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}
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
