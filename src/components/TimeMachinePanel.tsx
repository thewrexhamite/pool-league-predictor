'use client';

import clsx from 'clsx';
import { Clock, ArrowLeft } from 'lucide-react';
import { useToast } from './ToastProvider';

interface TimeMachinePanelProps {
  timeMachineDate: string | null;
  setTimeMachineDate: (date: string | null) => void;
  timeMachineOpen: boolean;
  setTimeMachineOpen: (open: boolean) => void;
  availableDates: string[];
  onDateChange?: () => void;
  variant?: 'desktop' | 'mobile';
}

export default function TimeMachinePanel({
  timeMachineDate,
  setTimeMachineDate,
  timeMachineOpen,
  setTimeMachineOpen,
  availableDates,
  onDateChange,
  variant = 'desktop',
}: TimeMachinePanelProps) {
  const { addToast } = useToast();

  const handleDateSelect = (date: string | null) => {
    setTimeMachineDate(date);
    setTimeMachineOpen(false);
    onDateChange?.();
    if (date) {
      addToast(`Time Machine: viewing as of ${date}`, 'info');
    }
  };

  const handleReset = () => {
    setTimeMachineDate(null);
    onDateChange?.();
  };

  if (variant === 'desktop') {
    return (
      <>
        {/* Desktop button and dropdown */}
        <div className="hidden md:block relative">
          <button
            onClick={() => setTimeMachineOpen(!timeMachineOpen)}
            className={clsx(
              'p-2 rounded transition',
              timeMachineDate
                ? 'text-accent bg-accent-muted/30'
                : 'text-gray-400 hover:text-white'
            )}
            aria-label="Time Machine"
            title="Time Machine"
          >
            <Clock size={18} />
          </button>
          {timeMachineOpen && (
            <div className="absolute right-0 top-full mt-1 bg-surface-card border border-surface-border rounded-lg shadow-elevated z-50 w-52 max-h-64 overflow-y-auto">
              <div className="p-2 border-b border-surface-border/30">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Time Machine</div>
              </div>
              <button
                onClick={() => handleDateSelect(null)}
                className={clsx(
                  'w-full text-left px-3 py-1.5 text-xs transition hover:bg-surface-elevated',
                  !timeMachineDate ? 'text-baize font-bold' : 'text-gray-300'
                )}
              >
                Present (live)
              </button>
              {[...availableDates].reverse().map(date => (
                <button
                  key={date}
                  onClick={() => handleDateSelect(date)}
                  className={clsx(
                    'w-full text-left px-3 py-1.5 text-xs transition hover:bg-surface-elevated',
                    timeMachineDate === date ? 'text-accent font-bold' : 'text-gray-400'
                  )}
                >
                  {date}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Time Machine banner (when active) */}
        {timeMachineDate && (
          <div className="mt-2 flex items-center justify-center gap-2 bg-accent-muted/20 border border-accent/30 rounded-lg px-3 py-1.5 text-xs">
            <Clock size={12} className="text-accent" />
            <span className="text-accent-light font-medium">Time Machine: Viewing as of {timeMachineDate}</span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-gray-400 hover:text-white transition ml-2"
            >
              <ArrowLeft size={12} />
              <span>Reset</span>
            </button>
          </div>
        )}
      </>
    );
  }

  // Mobile variant
  return (
    <>
      {/* Mobile button */}
      <button
        onClick={() => setTimeMachineOpen(!timeMachineOpen)}
        className={clsx(
          'flex-1 flex items-center justify-center gap-1.5 bg-surface-card border border-surface-border rounded-lg py-2 text-xs transition',
          timeMachineDate ? 'text-accent border-accent/30' : 'text-gray-300 hover:text-white'
        )}
      >
        <Clock size={14} />
        {timeMachineDate || 'Time Machine'}
      </button>

      {/* Mobile date picker */}
      {timeMachineOpen && (
        <div className="bg-surface-card border border-surface-border rounded-lg overflow-hidden">
          <div className="p-2 border-b border-surface-border/30">
            <div className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">Time Machine</div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => handleDateSelect(null)}
              className={clsx(
                'w-full text-left px-3 py-1.5 text-xs transition hover:bg-surface-elevated',
                !timeMachineDate ? 'text-baize font-bold' : 'text-gray-300'
              )}
            >
              Present (live)
            </button>
            {[...availableDates].reverse().map(date => (
              <button
                key={date}
                onClick={() => handleDateSelect(date)}
                className={clsx(
                  'w-full text-left px-3 py-1.5 text-xs transition hover:bg-surface-elevated',
                  timeMachineDate === date ? 'text-accent font-bold' : 'text-gray-400'
                )}
              >
                {date}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
