'use client';

interface WinLimitNoticeProps {
  winsNeeded: number;
  currentWins: number;
}

export function WinLimitNotice({ winsNeeded, currentWins }: WinLimitNoticeProps) {
  const isLastChance = currentWins >= winsNeeded - 1;

  if (!isLastChance) return null;

  return (
    <div className="px-[1.5vmin] py-[0.75vmin] rounded-[0.7vmin] bg-accent/10 border border-accent/20 text-accent text-[1.3vmin] text-center">
      Win limit: {winsNeeded} consecutive wins — holder goes to back of queue if they win
    </div>
  );
}
