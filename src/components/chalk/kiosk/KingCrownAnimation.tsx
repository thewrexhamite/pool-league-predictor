'use client';

import { useEffect, useState, useRef } from 'react';
import { CrownIcon } from '../shared/CrownIcon';

interface KingCrownAnimationProps {
  playerName: string;
  consecutiveWins: number;
  onComplete?: () => void;
}

export function KingCrownAnimation({
  playerName,
  consecutiveWins,
  onComplete,
}: KingCrownAnimationProps) {
  const [visible, setVisible] = useState(true);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onCompleteRef.current?.();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-fixed-black/80 backdrop-blur-sm chalk-animate-fade">
      <div className="text-center space-y-4 chalk-animate-in">
        <CrownIcon size={96} animated className="mx-auto" />
        <p className="text-4xl font-bold text-accent">{playerName}</p>
        <p className="text-xl text-gray-300">
          King of the Table
        </p>
        <p className="text-sm text-gray-500">
          {consecutiveWins} consecutive wins
        </p>
      </div>
    </div>
  );
}
