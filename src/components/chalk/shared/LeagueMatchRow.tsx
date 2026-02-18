'use client';

import type { LeagueMatchItem } from '@/lib/unified-history';
import clsx from 'clsx';

interface LeagueMatchRowProps {
  match: LeagueMatchItem;
}

function formatDate(dateStr: string): string {
  // Handle DD/MM/YYYY or YYYY-MM-DD
  let d: Date;
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/');
    d = new Date(`${year}-${month}-${day}`);
  } else {
    d = new Date(dateStr);
  }
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function LeagueMatchRow({ match }: LeagueMatchRowProps) {
  const result = match.teamWon ? 'win' : 'loss';

  return (
    <div
      className={clsx(
        'bg-surface-card border border-surface-border rounded-lg px-3 py-2.5 border-l-2',
        result === 'win' && 'border-l-win',
        result === 'loss' && 'border-l-loss',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm truncate">
              {match.homeTeam} vs {match.awayTeam}
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded shrink-0 font-medium"
              style={{
                backgroundColor: match.leagueColor + '20',
                color: match.leagueColor,
              }}
            >
              {match.leagueName}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-500">
              {formatDate(match.matchDate)}
            </span>
            <span className="text-[10px] text-gray-600">
              {match.framesWon}/{match.framesPlayed} frames
            </span>
          </div>
        </div>
        <span
          className={clsx(
            'text-xs shrink-0 font-medium',
            result === 'win' ? 'text-win' : 'text-loss',
          )}
        >
          {result === 'win' ? 'W' : 'L'}
        </span>
      </div>
    </div>
  );
}
