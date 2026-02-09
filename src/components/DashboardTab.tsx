'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Plus, X } from 'lucide-react';
import type { DivisionCode, StandingEntry } from '@/lib/types';
import DashboardEditor from './dashboard/DashboardEditor';
import WidgetLibrary from './dashboard/WidgetLibrary';

interface DashboardTabProps {
  selectedDiv: DivisionCode;
  standings: StandingEntry[];
  myTeam: { team: string; div: DivisionCode } | null;
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
  onPredict: (home: string, away: string) => void;
  onQuickLookup?: () => void;
  seasonId?: string;
  seasonLabel?: string;
}

export default function DashboardTab({
  selectedDiv,
  standings,
  myTeam,
  onTeamClick,
  onPlayerClick,
  onPredict,
  onQuickLookup,
  seasonId,
  seasonLabel,
}: DashboardTabProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);

  // Determine if viewing historical data
  const isHistorical = seasonId !== undefined;

  return (
    <div className="relative space-y-4">
      {/* Control buttons */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setShowWidgetLibrary(!showWidgetLibrary)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-card hover:bg-surface-elevated text-gray-300 transition-colors"
          title="Add widgets"
        >
          <Plus size={14} />
          Add Widget
        </button>
        <button
          onClick={() => setIsEditMode(!isEditMode)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            isEditMode
              ? 'bg-accent text-white'
              : 'bg-surface-card hover:bg-surface-elevated text-gray-300'
          }`}
          title={isEditMode ? 'Exit edit mode' : 'Edit dashboard'}
        >
          <Settings size={14} />
          {isEditMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Widget Library Panel */}
      <AnimatePresence>
        {showWidgetLibrary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-surface-card rounded-card shadow-card p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-200">Widget Library</h3>
                <button
                  onClick={() => setShowWidgetLibrary(false)}
                  className="p-1 rounded-lg hover:bg-surface-elevated transition-colors"
                  title="Close"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>
              <WidgetLibrary onClose={() => setShowWidgetLibrary(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard with widgets */}
      <DashboardEditor
        selectedDiv={selectedDiv}
        standings={standings}
        myTeam={myTeam}
        onTeamClick={onTeamClick}
        onPlayerClick={onPlayerClick}
        onPredict={onPredict}
        isEditMode={isEditMode}
      />
    </div>
  );
}
