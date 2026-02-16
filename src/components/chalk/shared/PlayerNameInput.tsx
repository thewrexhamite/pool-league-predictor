'use client';

import { useState, useRef, useCallback } from 'react';
import { ChalkButton } from './ChalkButton';

interface PlayerNameInputProps {
  onAdd: (name: string) => void;
  recentNames: string[];
  placeholder?: string;
  excludeNames?: string[];
}

export function PlayerNameInput({
  onAdd,
  recentNames,
  placeholder = 'Player name',
  excludeNames = [],
}: PlayerNameInputProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredRecent = recentNames.filter(
    (n) => !excludeNames.includes(n) && n.toLowerCase().includes(name.toLowerCase())
  );

  const handleSubmit = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName('');
    inputRef.current?.focus();
  }, [name, onAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 rounded-xl bg-surface-elevated px-4 py-3 text-lg text-white placeholder-gray-500 border border-surface-border focus:border-baize focus:outline-none"
          maxLength={30}
          autoComplete="off"
          autoCapitalize="words"
        />
        <ChalkButton onClick={handleSubmit} disabled={!name.trim()}>
          Add
        </ChalkButton>
      </div>

      {/* Recent names chips */}
      {filteredRecent.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filteredRecent.slice(0, 10).map((recentName) => (
            <button
              key={recentName}
              onClick={() => {
                onAdd(recentName);
                setName('');
                inputRef.current?.focus();
              }}
              className="px-3 py-1.5 rounded-lg bg-surface-elevated text-sm text-gray-300 hover:bg-baize/20 hover:text-baize transition-colors"
            >
              {recentName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
