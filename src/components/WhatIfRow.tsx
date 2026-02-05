'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Edit, Lock, X, Plus, Minus } from 'lucide-react';
import clsx from 'clsx';
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

  const adjust = (side: 'home' | 'away', delta: number) => {
    if (side === 'home') {
      const v = Math.min(10, Math.max(0, hs + delta));
      setHs(v);
      setAwayS(10 - v);
    } else {
      const v = Math.min(10, Math.max(0, awayS + delta));
      setAwayS(v);
      setHs(10 - v);
    }
  };

  return (
    <div className="bg-surface-card rounded-card shadow-card overflow-hidden">
      <div
        className={clsx(
          'flex items-center p-3 text-sm transition',
          !editing && 'hover:bg-surface-elevated/50'
        )}
      >
        <span className="text-gray-500 text-xs w-20 shrink-0">{fixture.date}</span>
        <span className="flex-1 text-center">
          {onTeamClick ? (
            <>
              <span className="cursor-pointer hover:text-info transition" onClick={() => onTeamClick(fixture.home)}>{fixture.home}</span>
              <span className="text-gray-600 mx-1">vs</span>
              <span className="cursor-pointer hover:text-info transition" onClick={() => onTeamClick(fixture.away)}>{fixture.away}</span>
            </>
          ) : (
            <>{fixture.home} <span className="text-gray-600">vs</span> {fixture.away}</>
          )}
        </span>
        {!editing && (
          <div className="flex items-center gap-2 ml-2 shrink-0">
            {onPredict && (
              <button
                onClick={() => onPredict(fixture.home, fixture.away)}
                className="flex items-center gap-1 text-baize hover:text-baize-light text-xs transition"
                aria-label="Predict"
              >
                <Target size={14} />
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-info hover:text-info-light text-xs transition"
              aria-label="Set result"
            >
              <Edit size={14} />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 flex items-center gap-2 justify-center flex-wrap border-t border-surface-border/30 pt-3">
              <span className="text-gray-400 text-xs truncate max-w-[80px]">{fixture.home}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => adjust('home', -1)} className="w-7 h-7 rounded bg-surface-elevated flex items-center justify-center text-gray-400 hover:text-white transition" aria-label="Decrease home score">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold text-lg">{hs}</span>
                <button onClick={() => adjust('home', 1)} className="w-7 h-7 rounded bg-surface-elevated flex items-center justify-center text-gray-400 hover:text-white transition" aria-label="Increase home score">
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-gray-600 text-xs">-</span>
              <div className="flex items-center gap-1">
                <button onClick={() => adjust('away', -1)} className="w-7 h-7 rounded bg-surface-elevated flex items-center justify-center text-gray-400 hover:text-white transition" aria-label="Decrease away score">
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center font-bold text-lg">{awayS}</span>
                <button onClick={() => adjust('away', 1)} className="w-7 h-7 rounded bg-surface-elevated flex items-center justify-center text-gray-400 hover:text-white transition" aria-label="Increase away score">
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-gray-400 text-xs truncate max-w-[80px]">{fixture.away}</span>
              <button
                onClick={() => {
                  onAdd(fixture.home, fixture.away, hs, awayS);
                  setEditing(false);
                }}
                className="flex items-center gap-1 bg-baize hover:bg-baize-dark px-3 py-1.5 rounded-lg text-xs font-medium text-fixed-white transition ml-1"
              >
                <Lock size={12} /> Lock
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-gray-500 hover:text-gray-300 transition"
                aria-label="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
