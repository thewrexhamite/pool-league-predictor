'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Clock } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, FrameData } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getDiv, parseDate } from '@/lib/predictions';

interface ResultsTabProps {
  selectedDiv: DivisionCode;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
}

export default function ResultsTab({ selectedDiv, onTeamClick, onPlayerClick }: ResultsTabProps) {
  const { ds, frames } = useActiveData();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);

  const divResults = ds.results
    .filter(r => getDiv(r.home, ds) === selectedDiv)
    .sort((a, b) => parseDate(b.date).localeCompare(parseDate(a.date)));

  const frameLookup = useMemo(() => {
    const map = new Map<string, FrameData>();
    for (const f of frames) {
      map.set(`${f.home}|${f.away}|${f.date}`, f);
    }
    return map;
  }, [frames]);

  const toggleExpanded = (key: string) => {
    setExpandedKey(prev => (prev === key ? null : key));
  };

  const visibleResults = showAllResults ? divResults : divResults.slice(0, 8);
  const hiddenResultsCount = Math.max(0, divResults.length - visibleResults.length);

  if (divResults.length === 0) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-8 text-center">
        <Clock size={40} className="mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400">No results yet for this division</p>
      </div>
    );
  }

  return (
    <div className="card-interactive bg-surface-card rounded-card shadow-card p-3 md:p-6">
      <h2 className="text-base md:text-lg font-bold mb-3 md:mb-4 text-white">{ds.divisions[selectedDiv].name} — Results</h2>
      <div className="space-y-2">
        {visibleResults.map((r, i) => {
          const key = `${r.home}|${r.away}|${r.date}`;
          const isExpanded = expandedKey === key;
          const frameData = frameLookup.get(key);
          const homeWin = r.home_score > r.away_score;
          const awayWin = r.away_score > r.home_score;
          const isDraw = r.home_score === r.away_score;
          const borderColor = homeWin || awayWin ? (homeWin ? 'border-l-win' : 'border-l-loss') : 'border-l-draw';

          return (
            <div key={i} className={clsx('border-l-4 rounded-lg overflow-hidden', borderColor)}>
              <button
                className={clsx(
                  'w-full flex items-center bg-surface-elevated/30 p-3 text-sm text-left hover:bg-surface-elevated/50 transition',
                  isExpanded && 'bg-surface-elevated/50'
                )}
                onClick={() => toggleExpanded(key)}
              >
                <ChevronDown
                  size={14}
                  className={clsx('text-gray-500 shrink-0 transition-transform mr-1', isExpanded && 'rotate-180')}
                />
                <span className="text-gray-500 text-xs w-20 shrink-0">{r.date}</span>
                <span
                  className={clsx('flex-1 text-right cursor-pointer hover:text-info transition', homeWin && 'font-bold text-win')}
                  onClick={(e) => { e.stopPropagation(); onTeamClick(r.home); }}
                >
                  {r.home}
                </span>
                <span className="mx-3 font-bold text-center w-12">
                  {r.home_score} - {r.away_score}
                </span>
                <span
                  className={clsx('flex-1 cursor-pointer hover:text-info transition', awayWin && 'font-bold text-win')}
                  onClick={(e) => { e.stopPropagation(); onTeamClick(r.away); }}
                >
                  {r.away}
                </span>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-surface/60 border-t border-surface-border/30 p-3 text-sm">
                      {frameData && frameData.frames.length > 0 ? (
                        <FrameDetails frameData={frameData} onPlayerClick={onPlayerClick} />
                      ) : (
                        <p className="text-gray-500 text-center text-xs py-2">No frame data available</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      {hiddenResultsCount > 0 && (
        <button
          onClick={() => setShowAllResults(true)}
          className="md:hidden mt-3 text-[11px] text-info hover:text-info-light transition"
        >
          Show {hiddenResultsCount} more result{hiddenResultsCount === 1 ? '' : 's'}
        </button>
      )}
      {showAllResults && divResults.length > 8 && (
        <button
          onClick={() => setShowAllResults(false)}
          className="md:hidden mt-1 text-[11px] text-gray-500 hover:text-gray-300 transition"
        >
          Show fewer results
        </button>
      )}
    </div>
  );
}

function FrameDetails({ frameData, onPlayerClick }: { frameData: FrameData; onPlayerClick: (name: string) => void }) {
  const sorted = [...frameData.frames].sort((a, b) => a.frameNum - b.frameNum);
  const set1 = sorted.filter(f => f.frameNum <= 5);
  const set2 = sorted.filter(f => f.frameNum > 5);

  return (
    <div className="space-y-3">
      {set1.length > 0 && <FrameSet label="Set 1" frames={set1} onPlayerClick={onPlayerClick} />}
      {set2.length > 0 && <FrameSet label="Set 2" frames={set2} onPlayerClick={onPlayerClick} />}
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
      <div className="text-gray-500 text-[10px] font-semibold mb-1 uppercase tracking-wider">{label}</div>
      <div className="space-y-0.5">
        {frames.map((f, i) => {
          const homeWon = f.winner === 'home';
          const awayWon = f.winner === 'away';
          const isEven = i % 2 === 0;

          return (
            <div key={f.frameNum} className={clsx('flex items-center text-xs rounded py-0.5', isEven && 'bg-surface-elevated/20')}>
              {/* Match headline: [chevron 14px + mr-1] [date w-20] */}
              <span className="shrink-0 w-[14px] mr-1" />
              <span className="text-gray-600 w-20 shrink-0">{f.frameNum}</span>
              <span
                className={clsx('flex-1 text-right cursor-pointer hover:text-info transition', homeWon ? 'text-win font-semibold' : 'text-gray-400')}
                onClick={() => onPlayerClick(f.homePlayer)}
              >
                {f.homePlayer}
                {homeWon && <span className="text-win ml-1">{'\u2713'}</span>}
              </span>
              {/* Match headline: [score mx-3 w-12] */}
              <span className="mx-3 w-12 text-center text-gray-600 text-[10px]">vs</span>
              <span
                className={clsx('flex-1 cursor-pointer hover:text-info transition', awayWon ? 'text-win font-semibold' : 'text-gray-400')}
                onClick={() => onPlayerClick(f.awayPlayer)}
              >
                {awayWon && <span className="text-win mr-1">{'\u2713'}</span>}
                {f.awayPlayer}
                {f.breakDish && <span className="text-gold ml-2 bg-gold/10 px-1 rounded text-[9px] font-medium">B&amp;D</span>}
                {f.forfeit && <span className="text-loss ml-2 text-[9px]">FF</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
