'use client';

import { useState, useMemo } from 'react';
import type { DivisionCode, FrameData } from '@/lib/types';
import { useLeagueData } from '@/lib/data-provider';
import { DIVISIONS } from '@/lib/data';
import { getDiv, parseDate } from '@/lib/predictions';

interface ResultsTabProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function ResultsTab({ selectedDiv, onTeamClick, onPlayerClick }: ResultsTabProps) {
  const { data: leagueData } = useLeagueData();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const divResults = leagueData.results
    .filter(r => getDiv(r.home) === selectedDiv)
    .sort((a, b) => parseDate(b.date).localeCompare(parseDate(a.date)));

  // Build O(1) lookup map for frame data keyed by home|away|date
  const frameLookup = useMemo(() => {
    const map = new Map<string, FrameData>();
    for (const f of leagueData.frames) {
      map.set(`${f.home}|${f.away}|${f.date}`, f);
    }
    return map;
  }, [leagueData.frames]);

  const toggleExpanded = (key: string) => {
    setExpandedKey(prev => (prev === key ? null : key));
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 md:p-6">
      <h2 className="text-xl font-bold mb-4">{DIVISIONS[selectedDiv].name} - Match Results</h2>
      <div className="space-y-2">
        {divResults.map((r, i) => {
          const key = `${r.home}|${r.away}|${r.date}`;
          const isExpanded = expandedKey === key;
          const frameData = frameLookup.get(key);

          return (
            <div key={i}>
              <div
                className={
                  'flex items-center bg-gray-700 rounded-lg p-3 text-sm cursor-pointer hover:bg-gray-600 transition' +
                  (isExpanded ? ' rounded-b-none' : '')
                }
                onClick={() => toggleExpanded(key)}
              >
                <span className="text-gray-400 text-xs w-6 shrink-0">
                  {isExpanded ? '▾' : '▸'}
                </span>
                <span className="text-gray-400 text-xs w-24 shrink-0">{r.date}</span>
                <span
                  className={
                    'flex-1 text-right cursor-pointer hover:text-blue-300 ' +
                    (r.home_score > r.away_score ? 'font-bold text-green-400' : '')
                  }
                  onClick={(e) => { e.stopPropagation(); onTeamClick(r.home); }}
                >
                  {r.home}
                </span>
                <span className="mx-3 font-bold text-center w-16">
                  {r.home_score} - {r.away_score}
                </span>
                <span
                  className={
                    'flex-1 cursor-pointer hover:text-blue-300 ' +
                    (r.away_score > r.home_score ? 'font-bold text-green-400' : '')
                  }
                  onClick={(e) => { e.stopPropagation(); onTeamClick(r.away); }}
                >
                  {r.away}
                </span>
              </div>

              {isExpanded && (
                <div className="bg-gray-750 border border-gray-600 border-t-0 rounded-b-lg p-3 text-sm"
                  style={{ backgroundColor: '#2d3748' }}
                >
                  {frameData && frameData.frames.length > 0 ? (
                    <FrameDetails frameData={frameData} onPlayerClick={onPlayerClick} />
                  ) : (
                    <p className="text-gray-500 text-center text-xs py-2">No frame data available</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FrameDetails({ frameData, onPlayerClick }: { frameData: FrameData; onPlayerClick: (name: string) => void }) {
  const sorted = [...frameData.frames].sort((a, b) => a.frameNum - b.frameNum);
  const set1 = sorted.filter(f => f.frameNum <= 5);
  const set2 = sorted.filter(f => f.frameNum > 5);

  return (
    <div className="space-y-3">
      {set1.length > 0 && (
        <FrameSet label="Set 1" frames={set1} onPlayerClick={onPlayerClick} />
      )}
      {set2.length > 0 && (
        <FrameSet label="Set 2" frames={set2} onPlayerClick={onPlayerClick} />
      )}
    </div>
  );
}

function FrameSet({
  label,
  frames,
  onPlayerClick,
}: {
  label: string;
  frames: FrameData['frames'];
  onPlayerClick: (name: string) => void;
}) {
  return (
    <div>
      <div className="text-gray-400 text-xs font-semibold mb-1 uppercase tracking-wide">{label}</div>
      <div className="space-y-1">
        {frames.map(f => {
          const homeWon = f.winner === 'home';
          const awayWon = f.winner === 'away';

          return (
            <div key={f.frameNum} className="flex items-center text-xs">
              <span className="text-gray-500 w-6 text-right mr-2">{f.frameNum}</span>
              <span
                className={
                  'flex-1 text-right cursor-pointer hover:text-blue-300 ' +
                  (homeWon ? 'text-green-400 font-semibold' : 'text-gray-300')
                }
                onClick={() => onPlayerClick(f.homePlayer)}
              >
                {f.homePlayer}
              </span>
              <span className="w-5 text-center text-green-400">
                {homeWon ? '✓' : ''}
              </span>
              <span className="text-gray-500 mx-1">vs</span>
              <span className="w-5 text-center text-green-400">
                {awayWon ? '✓' : ''}
              </span>
              <span
                className={
                  'flex-1 cursor-pointer hover:text-blue-300 ' +
                  (awayWon ? 'text-green-400 font-semibold' : 'text-gray-300')
                }
                onClick={() => onPlayerClick(f.awayPlayer)}
              >
                {f.awayPlayer}
              </span>
              <span className="w-10 text-right text-xs">
                {f.breakDish && <span className="text-yellow-400 ml-1" title="Break & Dish">B&D</span>}
                {f.forfeit && <span className="text-red-400 ml-1" title="Forfeit">FF</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
