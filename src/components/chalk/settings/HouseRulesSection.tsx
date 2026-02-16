'use client';

import { useChalkTable } from '@/hooks/chalk/use-chalk-table';
import { BREAK_RULE_LABELS, FOUL_RULE_LABELS } from '@/lib/chalk/constants';
import type { BreakRule, FoulRule } from '@/lib/chalk/types';
import { ChalkCard } from '../shared/ChalkCard';
import clsx from 'clsx';

export function HouseRulesSection() {
  const { table, updateSettings } = useChalkTable();
  if (!table) return null;

  const { houseRules } = table.settings;

  function setBreakRule(breakRule: BreakRule) {
    updateSettings({ houseRules: { ...houseRules, breakRule } });
  }

  function setFoulRule(foulRule: FoulRule) {
    updateSettings({ houseRules: { ...houseRules, foulRule } });
  }

  function toggleBlackSpot() {
    updateSettings({ houseRules: { ...houseRules, blackSpotRule: !houseRules.blackSpotRule } });
  }

  return (
    <ChalkCard padding="lg">
      <h2 className="text-lg font-bold mb-4">House Rules</h2>

      <div className="space-y-5">
        {/* Break rule */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Break rule</label>
          <div className="flex gap-2">
            {(Object.entries(BREAK_RULE_LABELS) as [BreakRule, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setBreakRule(value)}
                className={clsx(
                  'chalk-touch flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
                  houseRules.breakRule === value
                    ? 'bg-baize/15 border-baize text-baize'
                    : 'bg-surface-elevated border-surface-border text-gray-400'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Foul rule */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Foul rule</label>
          <div className="flex gap-2">
            {(Object.entries(FOUL_RULE_LABELS) as [FoulRule, string][]).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFoulRule(value)}
                className={clsx(
                  'chalk-touch flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors border',
                  houseRules.foulRule === value
                    ? 'bg-baize/15 border-baize text-baize'
                    : 'bg-surface-elevated border-surface-border text-gray-400'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Black spot */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Black ball spot rule</p>
            <p className="text-sm text-gray-400">Black must be potted in the opposite pocket</p>
          </div>
          <button
            onClick={toggleBlackSpot}
            role="switch"
            aria-checked={houseRules.blackSpotRule}
            className={clsx(
              'relative w-12 h-7 rounded-full transition-colors',
              houseRules.blackSpotRule ? 'bg-baize' : 'bg-surface-border'
            )}
          >
            <span
              className={clsx(
                'absolute top-0.5 w-6 h-6 rounded-full bg-white transition-transform',
                houseRules.blackSpotRule ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
      </div>
    </ChalkCard>
  );
}
