'use client';

import type { DivisionCode } from '@/lib/types';

interface CompareTabProps {
  selectedDiv: DivisionCode;
}

export default function CompareTab({ selectedDiv }: CompareTabProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-white mb-2">Player Comparison</h2>
        <p className="text-gray-400">
          Compare two players side-by-side (Coming soon)
        </p>
      </div>
    </div>
  );
}
