'use client';

import { useState } from 'react';
import type { Fixture } from '@/lib/types';

interface WhatIfRowProps {
  fixture: Fixture;
  onAdd: (home: string, away: string, homeScore: number, awayScore: number) => void;
  onPredict?: (home: string, away: string) => void;
  onTeamClick?: (team: string) => void;
}

export default function WhatIfRow({ fixture, onAdd, onPredict, onTeamClick }: WhatIfRowProps) {
  const [editing, setEditing] = useState(false);
  const [hs, setHs] = useState(5);
  const [awayS, setAwayS] = useState(5);

  if (!editing) {
    return (
      <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3 text-sm">
        <span className="text-gray-400 text-xs w-24 shrink-0">{fixture.date}</span>
        <span className="flex-1 text-center">
          {onTeamClick ? (
            <>
              <span
                className="cursor-pointer hover:text-blue-300"
                onClick={() => onTeamClick(fixture.home)}
              >
                {fixture.home}
              </span>{' '}
              vs{' '}
              <span
                className="cursor-pointer hover:text-blue-300"
                onClick={() => onTeamClick(fixture.away)}
              >
                {fixture.away}
              </span>
            </>
          ) : (
            <>
              {fixture.home} vs {fixture.away}
            </>
          )}
        </span>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          {onPredict && (
            <button
              onClick={() => onPredict(fixture.home, fixture.away)}
              className="text-green-400 hover:text-green-300 text-xs"
            >
              Predict
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="text-blue-400 hover:text-blue-300 text-xs"
          >
            Set result
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-700 rounded-lg p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">
          {fixture.home} vs {fixture.away}
        </span>
      </div>
      <div className="flex items-center gap-2 justify-center flex-wrap">
        <span className="text-gray-400 text-xs">{fixture.home}</span>
        <input
          type="number"
          min="0"
          max="10"
          value={hs}
          onChange={e => {
            const v = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
            setHs(v);
            setAwayS(10 - v);
          }}
          className="w-14 bg-gray-600 rounded p-1 text-center"
        />
        <span className="text-gray-500">-</span>
        <input
          type="number"
          min="0"
          max="10"
          value={awayS}
          onChange={e => {
            const v = Math.min(10, Math.max(0, parseInt(e.target.value) || 0));
            setAwayS(v);
            setHs(10 - v);
          }}
          className="w-14 bg-gray-600 rounded p-1 text-center"
        />
        <span className="text-gray-400 text-xs">{fixture.away}</span>
        <button
          onClick={() => {
            onAdd(fixture.home, fixture.away, hs, awayS);
            setEditing(false);
          }}
          className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs ml-2"
        >
          Lock
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-gray-400 hover:text-gray-300 text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
