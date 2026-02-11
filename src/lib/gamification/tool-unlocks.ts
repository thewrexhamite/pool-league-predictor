/**
 * Tool Unlocks — progressive feature unlocks based on app usage depth.
 *
 * Tools unlock naturally as users engage with the app, not through
 * artificial engagement metrics. Each unlock reveals a genuinely useful
 * analytical tool.
 */

import type { UnlockableTool, UsageCounters } from './types';

interface ToolDefinition {
  id: UnlockableTool;
  name: string;
  description: string;
  hint: string; // what to show before unlock
  condition: (usage: UsageCounters, extra?: ToolUnlockContext) => boolean;
  progress: (usage: UsageCounters, extra?: ToolUnlockContext) => { current: number; target: number };
}

export interface ToolUnlockContext {
  isCaptain?: boolean;
  hasUsedLineupOptimizer?: boolean;
  weeksUsingApp?: number;
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: 'pressure_frame_analysis',
    name: 'Pressure Frame Analysis',
    description: 'Frame-by-frame clutch data showing performance in high-pressure moments',
    hint: 'View {remaining} more player profiles to unlock',
    condition: (u) => u.playersViewed >= 10,
    progress: (u) => ({ current: Math.min(u.playersViewed, 10), target: 10 }),
  },
  {
    id: 'opponent_deep_dive',
    name: 'Opponent Deep Dive',
    description: 'Historical opponent breakdown with detailed head-to-head analysis',
    hint: 'Run {remaining} more comparisons to unlock',
    condition: (u) => u.comparisonsRun >= 3,
    progress: (u) => ({ current: Math.min(u.comparisonsRun, 3), target: 3 }),
  },
  {
    id: 'season_trajectory',
    name: 'Season Trajectory',
    description: 'Rolling form graph with narrative arc across the season',
    hint: 'Keep using the app — unlocks after 4 weeks',
    condition: (_u, extra) => (extra?.weeksUsingApp ?? 0) >= 4,
    progress: (_u, extra) => ({ current: Math.min(extra?.weeksUsingApp ?? 0, 4), target: 4 }),
  },
  {
    id: 'captains_toolkit',
    name: "Captain's Toolkit",
    description: 'Advanced lineup optimizer with matchup-aware suggestions',
    hint: 'Claim captain status and use the lineup optimizer to unlock',
    condition: (_u, extra) => !!extra?.isCaptain && !!extra?.hasUsedLineupOptimizer,
    progress: (_u, extra) => ({
      current: (extra?.isCaptain ? 1 : 0) + (extra?.hasUsedLineupOptimizer ? 1 : 0),
      target: 2,
    }),
  },
  {
    id: 'division_radar',
    name: 'Division Radar',
    description: 'Spider chart comparing your stats against the division average',
    hint: 'View {remaining} more unique players to unlock',
    condition: (u) => u.playersViewed >= 20,
    progress: (u) => ({ current: Math.min(u.playersViewed, 20), target: 20 }),
  },
];

export interface ToolStatus {
  id: UnlockableTool;
  name: string;
  description: string;
  unlocked: boolean;
  progress: { current: number; target: number };
  hint: string;
}

/**
 * Check which tools are unlocked and progress for locked ones.
 */
export function getToolStatuses(
  usage: UsageCounters,
  extra?: ToolUnlockContext,
): ToolStatus[] {
  return TOOL_DEFINITIONS.map(def => {
    const unlocked = def.condition(usage, extra);
    const prog = def.progress(usage, extra);
    const remaining = Math.max(0, prog.target - prog.current);
    const hint = def.hint.replace('{remaining}', String(remaining));

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      unlocked,
      progress: prog,
      hint,
    };
  });
}

/**
 * Get list of newly unlocked tool IDs by comparing previous vs current.
 */
export function getNewlyUnlockedTools(
  previouslyUnlocked: UnlockableTool[],
  usage: UsageCounters,
  extra?: ToolUnlockContext,
): UnlockableTool[] {
  const prevSet = new Set(previouslyUnlocked);
  const statuses = getToolStatuses(usage, extra);
  return statuses
    .filter(s => s.unlocked && !prevSet.has(s.id))
    .map(s => s.id);
}

/**
 * Get all tool definitions.
 */
export function getToolDefinitions(): ToolDefinition[] {
  return TOOL_DEFINITIONS;
}
