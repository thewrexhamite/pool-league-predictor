'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Calendar, Download, Check, X, ChevronDown } from 'lucide-react';
import { useLeagueData } from '@/lib/data-provider';
import { useMyTeam } from '@/hooks/use-my-team';
import { generateICalendar, downloadICalendar } from '@/lib/calendar-export';
import type { DivisionCode } from '@/lib/types';

interface CalendarExportProps {
  division?: DivisionCode;
  className?: string;
}

type ExportOption = 'my-team' | 'all-division';

export default function CalendarExport({
  division,
  className,
}: CalendarExportProps) {
  const { data } = useLeagueData();
  const { myTeam } = useMyTeam();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get fixtures from data
  const allFixtures = data.fixtures || [];
  const divisionFixtures = division
    ? allFixtures.filter(f => f.division === division)
    : allFixtures;

  // Handle export
  const handleExport = async (option: ExportOption) => {
    setIsExporting(true);
    setMessage(null);

    try {
      let fixtures = divisionFixtures;
      let filename = 'fixtures';
      let teamName: string | undefined;

      if (option === 'my-team') {
        if (!myTeam) {
          setMessage({ type: 'error', text: 'No team selected. Please set your team in settings.' });
          setIsExporting(false);
          return;
        }

        teamName = myTeam.team;
        fixtures = divisionFixtures.filter(
          f => f.home === myTeam.team || f.away === myTeam.team
        );
        filename = `${myTeam.team.replace(/\s+/g, '-').toLowerCase()}-fixtures`;
      } else {
        // All division fixtures
        if (division) {
          filename = `${division.toLowerCase()}-fixtures`;
        }
      }

      if (fixtures.length === 0) {
        setMessage({
          type: 'error',
          text: option === 'my-team'
            ? 'No fixtures found for your team'
            : 'No fixtures found for this division'
        });
        setIsExporting(false);
        return;
      }

      // Generate and download calendar
      const icalContent = generateICalendar(fixtures, teamName);
      downloadICalendar(icalContent, filename);

      setMessage({
        type: 'success',
        text: `Calendar exported successfully! (${fixtures.length} fixture${fixtures.length === 1 ? '' : 's'})`
      });
      setTimeout(() => {
        setMessage(null);
        setIsOpen(false);
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to export calendar'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const hasMyTeam = !!myTeam;
  const myTeamFixtureCount = hasMyTeam
    ? divisionFixtures.filter(f => f.home === myTeam.team || f.away === myTeam.team).length
    : 0;
  const allFixtureCount = divisionFixtures.length;

  return (
    <div className={clsx('relative', className)}>
      {/* Main button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting || allFixtureCount === 0}
        className={clsx(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
          'bg-blue-600 hover:bg-blue-700 text-white',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'shadow-md hover:shadow-lg'
        )}
      >
        <Calendar className="w-4 h-4" />
        <span>Export to Calendar</span>
        <ChevronDown className={clsx(
          'w-4 h-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50"
          >
            <div className="p-3 border-b border-gray-700 bg-gray-750">
              <h3 className="text-sm font-semibold text-gray-200">Choose export option</h3>
              <p className="text-xs text-gray-400 mt-1">
                Download fixtures as .ics file for your calendar app
              </p>
            </div>

            <div className="p-2">
              {/* My Team option */}
              {hasMyTeam && (
                <button
                  onClick={() => handleExport('my-team')}
                  disabled={isExporting || myTeamFixtureCount === 0}
                  className={clsx(
                    'w-full text-left px-3 py-3 rounded-lg transition-colors',
                    'hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
                    'group'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-lg bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors">
                      <Calendar className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-200">My Team</div>
                      <div className="text-sm text-gray-400 mt-0.5">
                        {myTeam.team} fixtures only
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {myTeamFixtureCount} fixture{myTeamFixtureCount === 1 ? '' : 's'}
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors mt-2" />
                  </div>
                </button>
              )}

              {/* All Division option */}
              <button
                onClick={() => handleExport('all-division')}
                disabled={isExporting || allFixtureCount === 0}
                className={clsx(
                  'w-full text-left px-3 py-3 rounded-lg transition-colors',
                  'hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed',
                  'group',
                  hasMyTeam && 'mt-2'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-purple-600/10 group-hover:bg-purple-600/20 transition-colors">
                    <Calendar className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-200">All Division</div>
                    <div className="text-sm text-gray-400 mt-0.5">
                      {division ? `All ${division} fixtures` : 'All fixtures'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {allFixtureCount} fixture{allFixtureCount === 1 ? '' : 's'}
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-500 group-hover:text-purple-400 transition-colors mt-2" />
                </div>
              </button>
            </div>

            {/* Message display */}
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={clsx(
                    'px-4 py-3 border-t',
                    message.type === 'success'
                      ? 'bg-green-600/10 border-green-600/20'
                      : 'bg-red-600/10 border-red-600/20'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {message.type === 'success' ? (
                      <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    )}
                    <span className={clsx(
                      'text-sm',
                      message.type === 'success' ? 'text-green-200' : 'text-red-200'
                    )}>
                      {message.text}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
