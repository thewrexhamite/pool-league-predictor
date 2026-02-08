'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { FrameData } from './types';
import type { DataSources } from './predictions/index';
import type { LeagueData } from './data-provider';
import { createTimeMachineData } from './time-machine';

interface ActiveDataContextValue {
  data: LeagueData;
  ds: DataSources;
  frames: FrameData[];
  isTimeMachine: boolean;
}

function buildDs(data: LeagueData): DataSources {
  return {
    divisions: data.divisions,
    results: data.results,
    fixtures: data.fixtures,
    players: data.players,
    rosters: data.rosters,
    players2526: data.players2526,
  };
}

const ActiveDataContext = createContext<ActiveDataContextValue | null>(null);

interface ActiveDataProviderProps {
  leagueData: LeagueData;
  timeMachineDate: string | null;
  children: ReactNode;
}

export function ActiveDataProvider({ leagueData, timeMachineDate, children }: ActiveDataProviderProps) {
  const value = useMemo<ActiveDataContextValue>(() => {
    if (!timeMachineDate) {
      return {
        data: leagueData,
        ds: buildDs(leagueData),
        frames: leagueData.frames,
        isTimeMachine: false,
      };
    }

    const tm = createTimeMachineData(leagueData, timeMachineDate);
    const filteredData: LeagueData = {
      ...leagueData,
      results: tm.ds.results,
      fixtures: tm.ds.fixtures,
      players2526: tm.ds.players2526,
      frames: tm.frames,
    };

    return {
      data: filteredData,
      ds: tm.ds,
      frames: tm.frames,
      isTimeMachine: true,
    };
  }, [leagueData, timeMachineDate]);

  return (
    <ActiveDataContext.Provider value={value}>
      {children}
    </ActiveDataContext.Provider>
  );
}

export function useActiveData(): ActiveDataContextValue {
  const ctx = useContext(ActiveDataContext);
  if (!ctx) {
    throw new Error('useActiveData must be used within an ActiveDataProvider');
  }
  return ctx;
}
