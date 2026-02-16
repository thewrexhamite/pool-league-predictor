'use client';

interface WinLimitNoticeProps {
  winsNeeded: number;
  currentWins: number;
}

export function WinLimitNotice({ winsNeeded, currentWins }: WinLimitNoticeProps) {
  const isLastChance = currentWins >= winsNeeded - 1;

  if (!isLastChance) return null;

  return (
    <div className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-sm text-center">
      Win limit: {winsNeeded} consecutive wins — holder goes to back of queue if they win
    </div>
  );
}
