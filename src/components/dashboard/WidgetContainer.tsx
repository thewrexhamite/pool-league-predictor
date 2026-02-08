'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';
import type { WidgetConfig } from '@/lib/dashboard-config';

interface WidgetContainerProps {
  config: WidgetConfig;
  children: ReactNode;
  className?: string;
  // Drag-and-drop props (for future use with @dnd-kit)
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  // Edit mode props
  isEditMode?: boolean;
  onRemove?: (id: string) => void;
}

export default function WidgetContainer({
  config,
  children,
  className,
  isDragging = false,
  dragHandleProps = {},
  isEditMode = false,
  onRemove,
}: WidgetContainerProps) {
  const handleRemove = () => {
    if (onRemove && config.id) {
      onRemove(config.id);
    }
  };

  return (
    <div
      className={clsx(
        'relative transition-opacity',
        isDragging && 'opacity-50',
        className
      )}
      data-widget-id={config.id}
      data-widget-type={config.type}
      {...dragHandleProps}
    >
      {isEditMode && onRemove && (
        <button
          onClick={handleRemove}
          className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md transition-colors"
          aria-label={`Remove ${config.type} widget`}
        >
          ×
        </button>
      )}
      {children}
    </div>
  );
}
