'use client';

import PredictionAccuracyPanel from '@/components/PredictionAccuracyPanel';
import type { DivisionCode } from '@/lib/types';

interface PredictionAccuracyWidgetProps {
  selectedDiv: DivisionCode;
}

export default function PredictionAccuracyWidget({ selectedDiv }: PredictionAccuracyWidgetProps) {
  return <PredictionAccuracyPanel selectedDiv={selectedDiv} />;
}
