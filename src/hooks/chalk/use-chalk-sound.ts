'use client';

import { useCallback, useEffect, useRef } from 'react';

type SoundEffect = 'queue_add' | 'game_start' | 'game_end' | 'no_show' | 'crown' | 'hold' | 'error';

const FREQUENCIES: Record<SoundEffect, number[]> = {
  queue_add: [440, 554, 659],
  game_start: [330, 440, 554, 659],
  game_end: [659, 554, 440],
  no_show: [220, 220, 220],
  crown: [523, 659, 784, 1047],
  hold: [330, 262],
  error: [220, 165],
};

const DURATIONS: Record<SoundEffect, number> = {
  queue_add: 100,
  game_start: 120,
  game_end: 150,
  no_show: 200,
  crown: 150,
  hold: 120,
  error: 200,
};

export function useChalkSound(enabled: boolean, volume: number) {
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    };
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const play = useCallback(
    (effect: SoundEffect) => {
      if (!enabled) return;

      try {
        const ctx = getAudioContext();
        const freqs = FREQUENCIES[effect];
        const duration = DURATIONS[effect] / 1000;

        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.value = volume * 0.3;

          osc.connect(gain);
          gain.connect(ctx.destination);

          const startTime = ctx.currentTime + i * duration;
          osc.start(startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          osc.stop(startTime + duration);
        });
      } catch {
        // Audio not available
      }
    },
    [enabled, volume, getAudioContext]
  );

  return { play };
}
