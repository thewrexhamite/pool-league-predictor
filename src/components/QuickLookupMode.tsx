'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface QuickLookupModeProps {
  onClose?: () => void;
}

export default function QuickLookupMode({ onClose }: QuickLookupModeProps) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="bg-surface-card rounded-card shadow-card p-4 md:p-6">
      <h2 className="text-lg font-bold mb-4 text-white">Quick Lookup</h2>

      {/* Search input with large touch targets (min 44px height) */}
      <div className="relative w-full">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search players or teams..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-surface-border rounded-lg pl-12 pr-12 py-3 text-base text-white placeholder-gray-500 focus:outline-none focus:border-baize min-h-[44px]"
          autoFocus
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
            aria-label="Clear search"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Results placeholder */}
      {searchQuery.length >= 2 ? (
        <div className="mt-4">
          <p className="text-gray-500 text-sm text-center py-8">
            Search results will appear here
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-gray-500 text-sm text-center py-8">
            Start typing to search for players or teams
          </p>
        </div>
      )}
    </div>
  );
}
