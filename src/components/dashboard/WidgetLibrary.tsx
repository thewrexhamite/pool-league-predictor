'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import {
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Flame,
  Target,
  Plus,
  Check,
} from 'lucide-react';
import type { WidgetType } from '@/lib/dashboard-config';
import { WIDGET_LIBRARY } from '@/lib/dashboard-config';
import { useDashboardConfig } from '@/hooks/use-dashboard-config';

interface WidgetLibraryProps {
  onClose?: () => void;
}

// Icon mapping for widget types
const ICON_MAP = {
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Flame,
  Target,
};

export default function WidgetLibrary({ onClose }: WidgetLibraryProps) {
  const { dashboardConfig, addWidget } = useDashboardConfig();

  // Group widgets by category
  const widgetsByCategory = useMemo(() => {
    const categories: Record<string, typeof WIDGET_LIBRARY[WidgetType][]> = {};

    for (const widget of Object.values(WIDGET_LIBRARY)) {
      if (!categories[widget.category]) {
        categories[widget.category] = [];
      }
      categories[widget.category].push(widget);
    }

    return categories;
  }, []);

  // Check if widget type is already added
  const isWidgetAdded = (type: WidgetType): boolean => {
    return dashboardConfig.widgets.some(w => w.type === type && w.enabled);
  };

  // Handle adding a widget
  const handleAddWidget = (type: WidgetType) => {
    if (!isWidgetAdded(type)) {
      addWidget(type);
      if (onClose) {
        onClose();
      }
    }
  };

  // Category display names
  const categoryNames: Record<string, string> = {
    overview: 'Overview',
    standings: 'Standings',
    fixtures: 'Fixtures',
    stats: 'Statistics',
    predictions: 'Predictions',
  };

  // Category order
  const categoryOrder = ['overview', 'standings', 'fixtures', 'stats', 'predictions'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-200">Widget Library</h2>
        <p className="text-sm text-gray-500">Add widgets to customize your dashboard</p>
      </div>

      {categoryOrder.map(category => {
        const widgets = widgetsByCategory[category];
        if (!widgets || widgets.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {categoryNames[category] || category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {widgets.map(widget => {
                const IconComponent = ICON_MAP[widget.icon as keyof typeof ICON_MAP];
                const isAdded = isWidgetAdded(widget.type);

                return (
                  <motion.button
                    key={widget.type}
                    onClick={() => handleAddWidget(widget.type)}
                    disabled={isAdded}
                    className={clsx(
                      'relative flex items-start gap-3 p-4 rounded-lg text-left transition-all',
                      'bg-surface-card hover:bg-surface-elevated border border-transparent',
                      isAdded
                        ? 'opacity-60 cursor-not-allowed'
                        : 'hover:border-accent/30 hover:shadow-glow'
                    )}
                    whileHover={!isAdded ? { scale: 1.02 } : undefined}
                    whileTap={!isAdded ? { scale: 0.98 } : undefined}
                  >
                    {/* Icon */}
                    <div
                      className={clsx(
                        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                        isAdded ? 'bg-surface-elevated' : 'bg-accent-muted/20'
                      )}
                    >
                      {IconComponent && (
                        <IconComponent
                          size={20}
                          className={clsx(
                            isAdded ? 'text-gray-500' : 'text-accent'
                          )}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-gray-200">
                          {widget.name}
                        </h4>
                        {widget.requiresMyTeam && (
                          <span className="text-xs text-gray-500 italic">
                            (requires My Team)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {widget.description}
                      </p>
                    </div>

                    {/* Add/Added indicator */}
                    <div className="flex-shrink-0">
                      {isAdded ? (
                        <div className="w-6 h-6 rounded-full bg-win/20 flex items-center justify-center">
                          <Check size={14} className="text-win" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                          <Plus size={14} className="text-accent" />
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
