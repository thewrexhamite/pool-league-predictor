'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Save, X, ChevronDown, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import type { DivisionCode, MatchResult } from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { getDiv, parseDate } from '@/lib/predictions';

interface DataCorrectionPanelProps {
  selectedDiv?: DivisionCode;
}

export default function DataCorrectionPanel({ selectedDiv }: DataCorrectionPanelProps) {
  const { data: activeData, ds } = useActiveData();
  const [editingResult, setEditingResult] = useState<MatchResult | null>(null);
  const [editedHomeScore, setEditedHomeScore] = useState<number>(0);
  const [editedAwayScore, setEditedAwayScore] = useState<number>(0);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Filter results by division if provided
  const divResults = useMemo(() => {
    let results = ds.results;
    if (selectedDiv) {
      results = results.filter(r => getDiv(r.home, ds) === selectedDiv);
    }
    return results.sort((a, b) => parseDate(b.date).localeCompare(parseDate(a.date)));
  }, [ds, selectedDiv]);

  const toggleExpanded = (key: string) => {
    setExpandedKey(prev => (prev === key ? null : key));
  };

  const startEditing = (result: MatchResult) => {
    setEditingResult(result);
    setEditedHomeScore(result.home_score);
    setEditedAwayScore(result.away_score);
    setSaveError(null);
  };

  const cancelEditing = () => {
    setEditingResult(null);
    setEditedHomeScore(0);
    setEditedAwayScore(0);
    setSaveError(null);
  };

  const saveEdit = async () => {
    if (!editingResult) return;

    // Validate scores
    if (editedHomeScore < 0 || editedAwayScore < 0) {
      setSaveError('Scores cannot be negative');
      return;
    }

    if (!Number.isInteger(editedHomeScore) || !Number.isInteger(editedAwayScore)) {
      setSaveError('Scores must be whole numbers');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Find the index of the result to update
      const resultIndex = ds.results.findIndex(
        r => r.home === editingResult.home &&
             r.away === editingResult.away &&
             r.date === editingResult.date
      );

      if (resultIndex === -1) {
        setSaveError('Result not found');
        setIsSaving(false);
        return;
      }

      // Call admin API to update result
      const response = await fetch('/api/admin/results', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seasonId: '2025-26', // Current season
          resultIndex,
          result: {
            home_score: editedHomeScore,
            away_score: editedAwayScore,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update result');
      }

      const data = await response.json();

      // Success - update local state by canceling edit
      // The data will refresh from Firestore on next load
      cancelEditing();

      // Optionally reload the page to show updated standings
      // This ensures standings recalculate correctly
      window.location.reload();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (divResults.length === 0) {
    return (
      <div className="bg-surface-card rounded-card shadow-card p-8 text-center">
        <AlertCircle size={40} className="mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400">No results found</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <h2 className="text-lg font-bold mb-4 text-white">Data Correction</h2>
      <p className="text-sm text-gray-400 mb-4">
        Review and correct match results. Click on a result to expand and edit scores.
      </p>

      <div className="space-y-2">
        {divResults.map((r, i) => {
          const key = `${r.home}|${r.away}|${r.date}`;
          const isExpanded = expandedKey === key;
          const isEditing = editingResult?.home === r.home &&
                           editingResult?.away === r.away &&
                           editingResult?.date === r.date;
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
                <span className={clsx('flex-1 text-right', homeWin && 'font-bold text-win')}>
                  {r.home}
                </span>
                <span className="mx-3 font-bold text-center w-12">
                  {r.home_score} - {r.away_score}
                </span>
                <span className={clsx('flex-1', awayWin && 'font-bold text-win')}>
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
                    <div className="bg-surface/60 border-t border-surface-border/30 p-4 text-sm">
                      {!isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-gray-500 mb-1">Division</p>
                              <p className="text-white">{r.division || getDiv(r.home, ds)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 mb-1">Frames</p>
                              <p className="text-white">{r.frames || 'N/A'}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => startEditing(r)}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-900/30 text-blue-400 rounded-lg hover:bg-blue-900/50 transition text-xs font-medium"
                          >
                            <Edit2 size={14} />
                            Edit Result
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1.5">
                                {r.home} Score
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={editedHomeScore}
                                onChange={(e) => setEditedHomeScore(parseInt(e.target.value, 10) || 0)}
                                className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-baize-light"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1.5">
                                {r.away} Score
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={editedAwayScore}
                                onChange={(e) => setEditedAwayScore(parseInt(e.target.value, 10) || 0)}
                                className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-baize-light"
                              />
                            </div>
                          </div>

                          {saveError && (
                            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-900/20 rounded-lg p-2">
                              <AlertCircle size={14} />
                              {saveError}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={saveEdit}
                              disabled={isSaving}
                              className="flex items-center gap-2 px-3 py-2 bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50 transition text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Save size={14} />
                              {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isSaving}
                              className="flex items-center gap-2 px-3 py-2 bg-surface-elevated text-gray-400 rounded-lg hover:bg-surface transition text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <X size={14} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
