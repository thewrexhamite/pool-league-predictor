'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  DivisionCode,
  PredictionResult,
  SimulationResult,
  WhatIfResult,
  SquadOverrides,
  UserSession,
} from '@/lib/types';
import { useLeagueData } from '@/lib/data-provider';
import { useUserSession } from '@/hooks/use-user-session';
import {
  calcStandings,
  calcTeamStrength,
  calcStrengthAdjustments,
  predictFrame,
  getAllRemainingFixtures,
  runPredSim,
  runSeasonSimulation,
  getDiv,
  type DataSources,
} from '@/lib/predictions';

import StandingsTab from './StandingsTab';
import ResultsTab from './ResultsTab';
import SimulateTab from './SimulateTab';
import PredictTab from './PredictTab';
import FixturesTab from './FixturesTab';
import WhatIfTab from './WhatIfTab';
import PlayersTab from './PlayersTab';
import TeamDetail from './TeamDetail';
import PlayerDetail from './PlayerDetail';
import FourDogsReport from './FourDogsReport';
import Glossary from './Glossary';
import AIChatPanel from './AIChatPanel';

const TABS: [string, string][] = [
  ['standings', 'Standings'],
  ['results', 'Results'],
  ['simulate', 'Simulate'],
  ['predict', 'Predict'],
  ['fixtures', 'Fixtures'],
  ['whatif', 'What If'],
  ['players', 'Players'],
];

export default function App() {
  const { data: leagueData } = useLeagueData();

  const [activeTab, setActiveTab] = useState('standings');
  const [selectedDiv, setSelectedDiv] = useState<DivisionCode>('SD2');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [simResults, setSimResults] = useState<SimulationResult[] | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [whatIfResults, setWhatIfResults] = useState<WhatIfResult[]>([]);
  const [whatIfSimResults, setWhatIfSimResults] = useState<WhatIfResult[] | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [squadOverrides, setSquadOverrides] = useState<SquadOverrides>({});
  const [squadBuilderTeam, setSquadBuilderTeam] = useState('');
  const [squadPlayerSearch, setSquadPlayerSearch] = useState('');
  const [squadTopN, setSquadTopN] = useState(5);

  // Build data sources from the provider (Firestore/cache/static)
  const ds: DataSources = useMemo(() => ({
    divisions: leagueData.divisions,
    results: leagueData.results,
    fixtures: leagueData.fixtures,
    players: leagueData.players,
    rosters: leagueData.rosters,
    players2526: leagueData.players2526,
  }), [leagueData]);

  // Session persistence: restore what-if and squad state across sessions
  const handleSessionRestore = useCallback((session: UserSession) => {
    if (session.whatIfResults.length > 0) setWhatIfResults(session.whatIfResults);
    if (Object.keys(session.squadOverrides).length > 0) setSquadOverrides(session.squadOverrides);
    if (session.selectedDiv) setSelectedDiv(session.selectedDiv);
  }, []);

  useUserSession({
    selectedDiv,
    whatIfResults,
    squadOverrides,
    onRestore: handleSessionRestore,
  });

  // Prediction via useEffect
  useEffect(() => {
    if (!homeTeam || !awayTeam) {
      setPrediction(null);
      return;
    }
    const div = getDiv(homeTeam, ds);
    if (!div) return;
    const strengths = calcTeamStrength(div, ds);
    const hasSquadChanges =
      Object.keys(squadOverrides).length > 0 &&
      (squadOverrides[homeTeam] || squadOverrides[awayTeam]);

    const modStr = { ...strengths };
    const pAdj = calcStrengthAdjustments(div, squadOverrides, squadTopN, ds);
    Object.entries(pAdj).forEach(([t, adj]) => {
      if (modStr[t] !== undefined) modStr[t] += adj;
    });
    const p = predictFrame(modStr[homeTeam] || 0, modStr[awayTeam] || 0);
    const pred = runPredSim(p);

    if (hasSquadChanges) {
      const pBase = predictFrame(strengths[homeTeam] || 0, strengths[awayTeam] || 0);
      const base = runPredSim(pBase);
      pred.baseline = base;
    }

    setPrediction(pred);
  }, [homeTeam, awayTeam, squadOverrides, squadTopN, ds]);

  const standings = calcStandings(selectedDiv, ds);
  const totalRemaining = getAllRemainingFixtures(ds).length;

  const runSimulation = useCallback(() => {
    setIsSimulating(true);
    setTimeout(() => {
      const results = runSeasonSimulation(
        selectedDiv,
        squadOverrides,
        squadTopN,
        whatIfResults,
        ds
      );
      setSimResults(results);
      setWhatIfSimResults(whatIfResults.length > 0 ? [...whatIfResults] : null);
      setIsSimulating(false);
    }, 100);
  }, [selectedDiv, squadOverrides, squadTopN, whatIfResults, ds]);

  const addWhatIf = (home: string, away: string, homeScore: number, awayScore: number) => {
    setWhatIfResults(prev => [
      ...prev.filter(wi => wi.home !== home || wi.away !== away),
      { home, away, homeScore, awayScore },
    ]);
    setSimResults(null);
  };

  const removeWhatIf = (home: string, away: string) => {
    setWhatIfResults(prev => prev.filter(wi => wi.home !== home || wi.away !== away));
    setSimResults(null);
  };

  // Squad builder handlers
  const addSquadPlayer = (team: string, playerName: string) => {
    setSquadOverrides(prev => {
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
    setSimResults(null);
  };

  const removeSquadPlayer = (team: string, playerName: string) => {
    setSquadOverrides(prev => {
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
    setSimResults(null);
  };

  const restoreSquadPlayer = (team: string, playerName: string) => {
    setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      const newOv = { ...existing, removed: existing.removed.filter(n => n !== playerName) };
      if (newOv.added.length === 0 && newOv.removed.length === 0) {
        const { [team]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [team]: newOv };
    });
    setSimResults(null);
  };

  const unaddSquadPlayer = (team: string, playerName: string) => {
    setSquadOverrides(prev => {
      const existing = prev[team] || { added: [], removed: [] };
      const newOv = { ...existing, added: existing.added.filter(n => n !== playerName) };
      if (newOv.added.length === 0 && newOv.removed.length === 0) {
        const { [team]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [team]: newOv };
    });
    setSimResults(null);
  };

  const openTeamDetail = (team: string) => {
    setSelectedTeam(team);
    setSelectedPlayer(null);
    setActiveTab('team');
  };

  const openPlayerDetail = (name: string) => {
    setSelectedPlayer(name);
    setActiveTab('player');
  };

  const resetDivision = (key: DivisionCode) => {
    setSelectedDiv(key);
    setSimResults(null);
    setWhatIfSimResults(null);
    setWhatIfResults([]);
    setSquadOverrides({});
    setSquadBuilderTeam('');
    setSquadPlayerSearch('');
    setSquadTopN(5);
    setHomeTeam('');
    setAwayTeam('');
    setSelectedTeam(null);
    setSelectedPlayer(null);
    if (activeTab === 'team' || activeTab === 'player') setActiveTab('standings');
  };

  const homeAdvPct = (1 / (1 + Math.exp(-0.2)) * 100 - 50).toFixed(0);

  return (
    <div className="min-h-screen text-white p-4 gradient-bg">
      <div className="max-w-6xl mx-auto">
        <h1
          className="text-2xl md:text-4xl font-bold text-center mb-2 text-green-400 cursor-pointer"
          onClick={() => {
            setActiveTab('standings');
            setSelectedTeam(null);
            setSelectedPlayer(null);
          }}
        >
          Pool League Predictor
        </h1>
        <p className="text-center text-gray-400 mb-6 text-sm">
          Wrexham &amp; District 25/26 &bull; {ds.results.length} matches played &bull;{' '}
          {totalRemaining} remaining
        </p>

        {/* Division selector */}
        <div className="flex justify-center gap-1 md:gap-2 mb-4 flex-wrap">
          {(Object.entries(ds.divisions) as [DivisionCode, { name: string; teams: string[] }][]).map(
            ([key, data]) => (
              <button
                key={key}
                onClick={() => resetDivision(key)}
                className={
                  'px-3 py-2 rounded-lg font-medium transition text-xs md:text-sm ' +
                  (selectedDiv === key ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600')
                }
              >
                {key}
                <span className="hidden md:inline">
                  {' '}
                  - {data.name.replace('Sunday ', 'Sun ').replace('Wednesday ', 'Wed ')}
                </span>
              </button>
            )
          )}
        </div>

        {/* Tab selector */}
        <div className="flex justify-center gap-1 md:gap-2 mb-6 flex-wrap">
          {TABS.map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedTeam(null);
                setSelectedPlayer(null);
              }}
              className={
                'px-3 py-2 rounded-lg transition text-xs md:text-sm ' +
                (activeTab === tab ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600')
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'standings' && (
          <StandingsTab
            selectedDiv={selectedDiv}
            standings={standings}
            onTeamClick={openTeamDetail}
          />
        )}

        {activeTab === 'results' && (
          <ResultsTab selectedDiv={selectedDiv} onTeamClick={openTeamDetail} />
        )}

        {activeTab === 'team' && selectedTeam && (
          <TeamDetail
            team={selectedTeam}
            selectedDiv={selectedDiv}
            standings={standings}
            onBack={() => setActiveTab('standings')}
            onTeamClick={openTeamDetail}
            onPlayerClick={openPlayerDetail}
          />
        )}

        {activeTab === 'player' && selectedPlayer && (
          <PlayerDetail
            player={selectedPlayer}
            selectedTeam={selectedTeam}
            onBack={() => {
              if (selectedTeam) setActiveTab('team');
              else setActiveTab('players');
            }}
            onTeamClick={(team, div) => {
              setSelectedDiv(div as DivisionCode);
              openTeamDetail(team);
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

        {activeTab === 'simulate' && (
          <SimulateTab
            selectedDiv={selectedDiv}
            simResults={simResults}
            isSimulating={isSimulating}
            whatIfResults={whatIfResults}
            whatIfSimResults={whatIfSimResults}
            squadOverrides={squadOverrides}
            squadTopN={squadTopN}
            onRunSimulation={runSimulation}
            onTeamClick={openTeamDetail}
          />
        )}

        {activeTab === 'predict' && (
          <PredictTab
            selectedDiv={selectedDiv}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            prediction={prediction}
            squadOverrides={squadOverrides}
            onHomeTeamChange={setHomeTeam}
            onAwayTeamChange={setAwayTeam}
            onTeamClick={openTeamDetail}
            onPlayerClick={openPlayerDetail}
          />
        )}

        {activeTab === 'fixtures' && (
          <FixturesTab
            selectedDiv={selectedDiv}
            whatIfResults={whatIfResults}
            onAddWhatIf={addWhatIf}
            onRemoveWhatIf={removeWhatIf}
            onPredict={(home, away) => {
              setHomeTeam(home);
              setAwayTeam(away);
              setActiveTab('predict');
            }}
            onTeamClick={openTeamDetail}
            onSimulate={() => {
              setActiveTab('simulate');
              setTimeout(runSimulation, 200);
            }}
            onClearWhatIf={() => {
              setWhatIfResults([]);
              setSimResults(null);
              setWhatIfSimResults(null);
            }}
          />
        )}

        {activeTab === 'whatif' && (
          <WhatIfTab
            selectedDiv={selectedDiv}
            whatIfResults={whatIfResults}
            squadOverrides={squadOverrides}
            squadBuilderTeam={squadBuilderTeam}
            squadPlayerSearch={squadPlayerSearch}
            squadTopN={squadTopN}
            onAddWhatIf={addWhatIf}
            onRemoveWhatIf={removeWhatIf}
            onSquadBuilderTeamChange={team => {
              setSquadBuilderTeam(team);
              setSquadPlayerSearch('');
            }}
            onSquadPlayerSearchChange={setSquadPlayerSearch}
            onSquadTopNChange={n => {
              setSquadTopN(n);
              setSimResults(null);
            }}
            onAddSquadPlayer={addSquadPlayer}
            onRemoveSquadPlayer={removeSquadPlayer}
            onRestoreSquadPlayer={restoreSquadPlayer}
            onUnaddSquadPlayer={unaddSquadPlayer}
            onClearAll={() => {
              setWhatIfResults([]);
              setSquadOverrides({});
              setSquadBuilderTeam('');
              setSimResults(null);
              setWhatIfSimResults(null);
            }}
            onSimulate={() => {
              setActiveTab('simulate');
              setTimeout(runSimulation, 200);
            }}
          />
        )}

        {/* Four Dogs Report */}
        {selectedDiv === 'SD2' && activeTab !== 'team' && activeTab !== 'player' && (
          <FourDogsReport standings={standings} onTeamClick={openTeamDetail} />
        )}

        {/* Glossary */}
        <Glossary />

        <p className="text-center text-gray-500 text-xs mt-4">
          Model: Frame-differential ratings &bull; Logistic prediction &bull; Home advantage +
          {homeAdvPct}% &bull; Points: HW=2, AW=3, D=1 &bull; Squad builder: best-N weighted avg
          win% delta
        </p>
        <p className="text-center text-gray-600 text-xs mt-2">
          &copy; Mike Lewis {new Date().getFullYear()}
        </p>
      </div>

      {/* AI Chat Panel */}
      <AIChatPanel />
    </div>
  );
}
