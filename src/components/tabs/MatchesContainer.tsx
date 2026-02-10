'use client';

import type { DivisionCode, TabKey } from '@/lib/types';
import type { SubView } from '@/lib/router';
import SegmentedControl from '../ui/SegmentedControl';
import FixturesTab from '../FixturesTab';
import ResultsTab from '../ResultsTab';
import PredictTab from '../PredictTab';

type MatchesSubView = 'upcoming' | 'results' | 'whatif';

const SEGMENTS = [
  { value: 'upcoming' as const, label: 'Upcoming' },
  { value: 'results' as const, label: 'Results' },
  { value: 'whatif' as const, label: 'What-If' },
];

interface MatchesContainerProps {
  subView?: SubView;
  onSubViewChange: (sv: SubView) => void;
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
  onTabChange: (tab: TabKey) => void;
  prediction: any;
  simulation: any;
  squadBuilder: any;
  myTeam: { team: string; div: DivisionCode } | null;
}

export default function MatchesContainer({
  subView,
  onSubViewChange,
  selectedDiv,
  onTeamClick,
  onPlayerClick,
  onTabChange,
  prediction,
  simulation,
  squadBuilder,
  myTeam,
}: MatchesContainerProps) {
  const active = (subView as MatchesSubView) || 'upcoming';

  return (
    <div className="space-y-4">
      <SegmentedControl
        segments={SEGMENTS}
        value={active}
        onChange={(v) => onSubViewChange(v)}
        className="w-full"
      />

      {active === 'upcoming' && (
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
          onPredict={(home: string, away: string) => {
            prediction.setPredictionTeams(home, away);
          }}
          onTeamClick={onTeamClick}
          onSimulate={() => {
            onSubViewChange('whatif');
            setTimeout(simulation.runSimulation, 200);
          }}
          onClearWhatIf={() => {
            simulation.clearWhatIfResults();
            simulation.clearSimulation();
          }}
          onSquadBuilderTeamChange={(team: string) => {
            squadBuilder.selectTeam(team);
            squadBuilder.clearPlayerSearch();
          }}
          onSquadPlayerSearchChange={squadBuilder.setPlayerSearch}
          onSquadTopNChange={(n: number) => {
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

      {active === 'results' && (
        <ResultsTab
          selectedDiv={selectedDiv}
          onTeamClick={onTeamClick}
          onPlayerClick={onPlayerClick}
        />
      )}

      {active === 'whatif' && (
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
    </div>
  );
}
