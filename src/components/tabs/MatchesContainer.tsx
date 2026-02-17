'use client';

import { Trophy } from 'lucide-react';
import type { DivisionCode, TabKey, KnockoutCompetition } from '@/lib/types';
import type { SubView } from '@/lib/router';
import SegmentedControl from '../ui/SegmentedControl';
import FadeInOnScroll from '../ui/FadeInOnScroll';
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
  knockouts?: KnockoutCompetition[];
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
  knockouts,
}: MatchesContainerProps) {
  const active = (subView as MatchesSubView) || 'upcoming';

  // Check if selected division is a knockout competition
  const knockoutMatch = knockouts?.find(k => k.code === selectedDiv);
  if (knockoutMatch) {
    return (
      <FadeInOnScroll>
        <div className="card-interactive bg-surface-card rounded-card shadow-card p-4 md:p-8 text-center">
          <Trophy size={28} className="mx-auto text-accent mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">{knockoutMatch.name}</h3>
          <p className="text-sm text-gray-400 mb-4">
            This is a knockout competition. View the bracket in the Standings tab.
          </p>
          <button
            onClick={() => onTabChange('standings')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-baize hover:bg-baize-light rounded-lg transition"
          >
            View Bracket
          </button>
        </div>
      </FadeInOnScroll>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <FadeInOnScroll>
        <SegmentedControl
          segments={SEGMENTS}
          value={active}
          onChange={(v) => onSubViewChange(v)}
          className="w-full"
        />
      </FadeInOnScroll>

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
