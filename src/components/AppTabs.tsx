'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { DivisionCode, StandingEntry, TabKey } from '@/lib/types';
import DashboardTab from './DashboardTab';
import StandingsTab from './StandingsTab';
import ResultsTab from './ResultsTab';
import TeamDetail from './TeamDetail';
import PlayerDetail from './PlayerDetail';
import PlayersTab from './PlayersTab';
import StatsTab from './StatsTab';
import SimulateTab from './SimulateTab';
import PredictTab from './PredictTab';
import FixturesTab from './FixturesTab';

interface AppTabsProps {
  activeTab: TabKey;
  selectedDiv: DivisionCode;
  selectedTeam: string | null;
  selectedPlayer: string | null;
  standings: StandingEntry[];
  myTeam: { team: string; div: DivisionCode } | null;
  timeMachineDate: string | null;
  availableDates: string[];
  onTimeMachineDateChange: (date: string | null) => void;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
  onPredict: (home: string, away: string) => void;
  onTabChange: (tab: TabKey) => void;
  onDivisionReset: (div: DivisionCode) => void;
  prediction: any;
  simulation: any;
  squadBuilder: any;
}

export default function AppTabs({
  activeTab,
  selectedDiv,
  selectedTeam,
  selectedPlayer,
  standings,
  myTeam,
  timeMachineDate,
  availableDates,
  onTimeMachineDateChange,
  onTeamClick,
  onPlayerClick,
  onPredict,
  onTabChange,
  onDivisionReset,
  prediction,
  simulation,
  squadBuilder,
}: AppTabsProps) {
  return (
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
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
            onPredict={onPredict}
          />
        )}

        {activeTab === 'standings' && (
          <StandingsTab
            selectedDiv={selectedDiv}
            standings={standings}
            myTeam={myTeam}
            onTeamClick={onTeamClick}
          />
        )}

        {activeTab === 'results' && (
          <ResultsTab selectedDiv={selectedDiv} onTeamClick={onTeamClick} onPlayerClick={onPlayerClick} />
        )}

        {activeTab === 'team' && selectedTeam && (
          <TeamDetail
            team={selectedTeam}
            selectedDiv={selectedDiv}
            standings={standings}
            onBack={() => onTabChange('standings')}
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
          />
        )}

        {activeTab === 'player' && selectedPlayer && (
          <PlayerDetail
            player={selectedPlayer}
            selectedTeam={selectedTeam}
            onBack={() => {
              if (selectedTeam) onTeamClick(selectedTeam);
              else onTabChange('players');
            }}
            onTeamClick={(team, div) => {
              if (div !== selectedDiv) onDivisionReset(div as DivisionCode);
              onTeamClick(team);
            }}
          />
        )}

        {activeTab === 'players' && (
          <PlayersTab
            selectedDiv={selectedDiv}
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
          />
        )}

        {activeTab === 'stats' && (
          <StatsTab
            selectedDiv={selectedDiv}
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
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
            onTeamClick={onTeamClick}
            timeMachineDate={timeMachineDate}
            onTimeMachineDateChange={onTimeMachineDateChange}
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
            onTeamClick={onTeamClick}
            onPlayerClick={onPlayerClick}
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
              onTabChange('predict');
            }}
            onTeamClick={onTeamClick}
            onSimulate={() => {
              onTabChange('simulate');
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
            onAddSquadPlayer={squadBuilder.addSquadPlayer}
            onRemoveSquadPlayer={squadBuilder.removeSquadPlayer}
            onRestoreSquadPlayer={squadBuilder.restoreSquadPlayer}
            onUnaddSquadPlayer={squadBuilder.unaddSquadPlayer}
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
  );
}
