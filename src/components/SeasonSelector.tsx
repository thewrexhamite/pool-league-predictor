'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, Check } from 'lucide-react';
import { useLeague } from '@/lib/league-context';
import type { SeasonMeta } from '@/lib/types';

export default function SeasonSelector() {
  const { selected, selectLeague } = useLeague();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!selected) {
    return null;
  }

  const { league, seasonId } = selected;
  const currentSeason = league.seasons.find(s => s.id === seasonId);

  if (!currentSeason) {
    return null;
  }

  const handleSeasonSelect = (season: SeasonMeta) => {
    selectLeague(league.id, season.id);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-card border border-surface-border hover:border-accent/30 transition-colors"
        aria-label="Select season"
        aria-expanded={isOpen}
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-300">{currentSeason.label}</span>
        {currentSeason.current && (
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-baize/20 text-baize-light px-1.5 py-0.5 rounded">
            Current
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-64 bg-surface-card border border-surface-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div className="px-3 py-2 border-b border-surface-border/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Select Season
              </p>
            </div>
            <div className="py-1 max-h-80 overflow-y-auto">
              {league.seasons.map(season => (
                <button
                  key={season.id}
                  onClick={() => handleSeasonSelect(season)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-surface-elevated transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${season.id === seasonId ? 'text-accent' : 'text-gray-300'}`}>
                      {season.label}
                    </span>
                    {season.current && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-baize/20 text-baize-light px-1.5 py-0.5 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {season.divisions.length} {season.divisions.length === 1 ? 'div' : 'divs'}
                    </span>
                    {season.id === seasonId && (
                      <Check className="w-4 h-4 text-accent" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            {league.seasons.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-gray-500">
                No seasons available
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
