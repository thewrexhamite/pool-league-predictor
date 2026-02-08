// Dashboard configuration types and constants

// Widget types available in the dashboard
export type WidgetType =
  | 'my-team'
  | 'season-progress'
  | 'title-race'
  | 'relegation-battle'
  | 'next-matchday'
  | 'recent-results'
  | 'hot-cold'
  | 'prediction-accuracy';

// Widget size options
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

// Widget configuration for individual widgets
export interface WidgetConfig {
  id: string; // unique instance ID
  type: WidgetType;
  enabled: boolean;
  order: number; // display order (lower = earlier)
  size?: WidgetSize; // optional size override
  settings?: Record<string, unknown>; // widget-specific settings
}

// Dashboard layout configuration
export interface DashboardConfig {
  widgets: WidgetConfig[];
  version: number; // for future migrations
  lastModified: number; // timestamp
}

// Widget metadata for library/picker
export interface WidgetMetadata {
  type: WidgetType;
  name: string;
  description: string;
  icon: string; // lucide icon name
  defaultSize: WidgetSize;
  category: 'overview' | 'standings' | 'fixtures' | 'stats' | 'predictions';
  requiresMyTeam?: boolean; // true if widget needs myTeam context
}

// Widget library - available widgets with metadata
export const WIDGET_LIBRARY: Record<WidgetType, WidgetMetadata> = {
  'my-team': {
    type: 'my-team',
    name: 'My Team',
    description: 'Quick access to your team stats, roster, and upcoming fixtures',
    icon: 'Users',
    defaultSize: 'full',
    category: 'overview',
    requiresMyTeam: true,
  },
  'season-progress': {
    type: 'season-progress',
    name: 'Season Progress',
    description: 'Visual progress bar showing how much of the season is complete',
    icon: 'Activity',
    defaultSize: 'full',
    category: 'overview',
  },
  'title-race': {
    type: 'title-race',
    name: 'Title Race',
    description: 'Top 4 teams competing for the championship with recent form',
    icon: 'TrendingUp',
    defaultSize: 'medium',
    category: 'standings',
  },
  'relegation-battle': {
    type: 'relegation-battle',
    name: 'Relegation Battle',
    description: 'Bottom 4 teams fighting to avoid relegation',
    icon: 'TrendingDown',
    defaultSize: 'medium',
    category: 'standings',
  },
  'next-matchday': {
    type: 'next-matchday',
    name: 'Next Matchday',
    description: 'Upcoming fixtures with quick predict button',
    icon: 'Calendar',
    defaultSize: 'medium',
    category: 'fixtures',
  },
  'recent-results': {
    type: 'recent-results',
    name: 'Recent Results',
    description: 'Latest results from the most recent matchday',
    icon: 'Clock',
    defaultSize: 'medium',
    category: 'fixtures',
  },
  'hot-cold': {
    type: 'hot-cold',
    name: 'Hot & Cold',
    description: 'Best and worst performing teams and players',
    icon: 'Flame',
    defaultSize: 'full',
    category: 'stats',
  },
  'prediction-accuracy': {
    type: 'prediction-accuracy',
    name: 'Prediction Accuracy',
    description: 'Track how accurate the predictions have been',
    icon: 'Target',
    defaultSize: 'full',
    category: 'predictions',
  },
};

// Default dashboard configuration for new users
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  version: 1,
  lastModified: Date.now(),
  widgets: [
    {
      id: 'season-progress-1',
      type: 'season-progress',
      enabled: true,
      order: 0,
    },
    {
      id: 'title-race-1',
      type: 'title-race',
      enabled: true,
      order: 1,
    },
    {
      id: 'relegation-battle-1',
      type: 'relegation-battle',
      enabled: true,
      order: 2,
    },
    {
      id: 'next-matchday-1',
      type: 'next-matchday',
      enabled: true,
      order: 3,
    },
    {
      id: 'recent-results-1',
      type: 'recent-results',
      enabled: true,
      order: 4,
    },
    {
      id: 'hot-cold-1',
      type: 'hot-cold',
      enabled: true,
      order: 5,
    },
    {
      id: 'prediction-accuracy-1',
      type: 'prediction-accuracy',
      enabled: true,
      order: 6,
    },
  ],
};

// Helper function to generate unique widget ID
export function generateWidgetId(type: WidgetType): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to validate dashboard config
export function isValidDashboardConfig(config: unknown): config is DashboardConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as DashboardConfig;
  return (
    typeof c.version === 'number' &&
    typeof c.lastModified === 'number' &&
    Array.isArray(c.widgets) &&
    c.widgets.every(
      w =>
        typeof w.id === 'string' &&
        typeof w.type === 'string' &&
        typeof w.enabled === 'boolean' &&
        typeof w.order === 'number'
    )
  );
}

// Helper function to get enabled widgets sorted by order
export function getActiveWidgets(config: DashboardConfig): WidgetConfig[] {
  return config.widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order);
}

// Helper function to check if a widget type is available
export function isWidgetTypeAvailable(type: string): type is WidgetType {
  return type in WIDGET_LIBRARY;
}
