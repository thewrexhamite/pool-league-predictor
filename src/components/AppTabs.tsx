'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { DivisionCode, StandingEntry, TabKey, KnockoutCompetition } from '@/lib/types';
import type { SubView } from '@/lib/router';
import DashboardTab from './DashboardTab';
import StandingsContainer from './tabs/StandingsContainer';
import MatchesContainer from './tabs/MatchesContainer';
import StatsContainer from './tabs/StatsContainer';
import MyTeamContainer from './tabs/MyTeamContainer';

interface AppTabsProps {
  activeTab: TabKey;
  subView?: SubView;
  selectedDiv: DivisionCode;
  selectedTeam: string | null;
  selectedPlayer: string | null;
  standings: StandingEntry[];
  myTeam: { team: string; div: DivisionCode } | null;
  timeMachineDate: string | null;
  availableDates: string[];
  knockouts: KnockoutCompetition[];
  onTimeMachineDateChange: (date: string | null) => void;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
  onPredict: (home: string, away: string) => void;
  onTabChange: (tab: TabKey) => void;
  onSubViewChange: (sv: SubView) => void;
  onDivisionReset: (div: DivisionCode) => void;
  onSetMyTeam?: () => void;
  onJoinTable?: () => void;
  prediction: any;
  simulation: any;
  squadBuilder: any;
}

export default function AppTabs({
  activeTab,
  subView,
  selectedDiv,
  selectedTeam,
  selectedPlayer,
  standings,
  myTeam,
  timeMachineDate,
  availableDates,
  knockouts,
  onTimeMachineDateChange,
  onTeamClick,
  onPlayerClick,
  onPredict,
  onTabChange,
  onSubViewChange,
  onDivisionReset,
  onSetMyTeam,
  onJoinTable,
  prediction,
  simulation,
  squadBuilder,
}: AppTabsProps) {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [activeTab, selectedDiv]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.15 }}
        role="tabpanel"
        className="vt-tab-content"
      >
        {activeTab === 'home' && (
          <DashboardTab
            selectedDiv={selectedDiv}
            standings={standings}
            myTeam={myTeam}
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
            onPredict={onPredict}
            onJoinTable={onJoinTable}
            onSetMyTeam={onSetMyTeam}
          />
        )}

        {activeTab === 'standings' && (
          <StandingsContainer
            subView={subView}
            onSubViewChange={onSubViewChange}
            selectedDiv={selectedDiv}
            standings={standings}
            myTeam={myTeam}
            onTeamClick={onTeamClick}
            simulation={simulation}
            squadBuilder={squadBuilder}
            timeMachineDate={timeMachineDate}
            onTimeMachineDateChange={onTimeMachineDateChange}
            availableDates={availableDates}
            knockouts={knockouts}
          />
        )}

        {activeTab === 'matches' && (
          <MatchesContainer
            subView={subView}
            onSubViewChange={onSubViewChange}
            selectedDiv={selectedDiv}
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
            onTabChange={onTabChange}
            prediction={prediction}
            simulation={simulation}
            squadBuilder={squadBuilder}
            myTeam={myTeam}
            knockouts={knockouts}
          />
        )}

        {activeTab === 'stats' && (
          <StatsContainer
            subView={subView}
            onSubViewChange={onSubViewChange}
            selectedDiv={selectedDiv}
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
          />
        )}

        {activeTab === 'myteam' && (
          <MyTeamContainer
            subView={subView}
            onSubViewChange={onSubViewChange}
            selectedDiv={selectedDiv}
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
            onSetMyTeam={onSetMyTeam}
            prediction={prediction}
            simulation={simulation}
            squadBuilder={squadBuilder}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
