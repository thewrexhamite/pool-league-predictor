'use client';

import { useState, useCallback } from 'react';
import { CHALK_DEFAULTS } from '@/lib/chalk/constants';

interface ChalkPinPadProps {
  onSubmit: (pin: string) => void;
  error?: string | null;
  title?: string;
}

export function ChalkPinPad({
  onSubmit,
  error,
  title = 'Enter PIN',
}: ChalkPinPadProps) {
  const [pin, setPin] = useState('');

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length >= CHALK_DEFAULTS.PIN_LENGTH) return;
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === CHALK_DEFAULTS.PIN_LENGTH) {
        onSubmit(newPin);
        // Reset after a short delay so user sees the full pin
        setTimeout(() => setPin(''), 500);
      }
    },
    [pin, onSubmit]
  );

  const handleDelete = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold">{title}</h2>

      {/* PIN dots */}
      <div className="flex gap-3">
        {Array.from({ length: CHALK_DEFAULTS.PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-colors ${
              i < pin.length ? 'bg-baize' : 'bg-surface-border'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-loss text-sm chalk-animate-shake">{error}</p>}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            className="chalk-touch h-16 rounded-xl bg-surface-elevated text-xl font-semibold hover:bg-surface-border active:scale-95 transition-all"
          >
            {digit}
          </button>
        ))}
        <div /> {/* Empty cell */}
        <button
          onClick={() => handleDigit('0')}
          className="chalk-touch h-16 rounded-xl bg-surface-elevated text-xl font-semibold hover:bg-surface-border active:scale-95 transition-all"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          aria-label="Delete"
          className="chalk-touch h-16 rounded-xl bg-surface-elevated text-gray-400 hover:bg-surface-border active:scale-95 transition-all flex items-center justify-center"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 12 12)" />
            <path d="M19 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
