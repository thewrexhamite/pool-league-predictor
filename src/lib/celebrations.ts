import type confetti from 'canvas-confetti';

type ConfettiFn = typeof confetti;

let cachedConfetti: ConfettiFn | null = null;

async function getConfetti(): Promise<ConfettiFn | null> {
  if (cachedConfetti) return cachedConfetti;
  try {
    const mod = await import('canvas-confetti');
    cachedConfetti = mod.default;
    return cachedConfetti;
  } catch {
    return null;
  }
}

export async function celebrateSubtle() {
  const confetti = await getConfetti();
  if (!confetti) return;
  confetti({
    particleCount: 40,
    spread: 55,
    origin: { y: 0.7 },
    colors: ['#2d8a4e', '#f59e0b', '#f093fb', '#3b82f6'],
    ticks: 100,
    gravity: 1.2,
    scalar: 0.8,
  });
}

export async function celebrateGrand() {
  const confetti = await getConfetti();
  if (!confetti) return;
  const colors = ['#2d8a4e', '#f59e0b', '#f093fb', '#3b82f6', '#ef4444'];
  const end = Date.now() + 1500;
  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export const haptic = {
  tap: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },
  step: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(25);
    }
  },
  celebrate: () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 30, 10, 30, 50]);
    }
  },
};
