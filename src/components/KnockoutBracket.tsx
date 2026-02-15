'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { KnockoutCompetition, KnockoutRound, KnockoutMatch } from '@/lib/types';
import FadeInOnScroll from './ui/FadeInOnScroll';

interface KnockoutBracketProps {
  competition: KnockoutCompetition;
  onTeamClick: (team: string) => void;
}

export default function KnockoutBracket({ competition, onTeamClick }: KnockoutBracketProps) {
  const { rounds } = competition;
  const [selectedRoundIdx, setSelectedRoundIdx] = useState(0);

  if (rounds.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No bracket data available for {competition.name}.
      </div>
    );
  }

  const selectedRound = rounds[selectedRoundIdx];

  return (
    <div className="space-y-4">
      {/* Mobile: round selector pills */}
      <div className="md:hidden">
        <FadeInOnScroll>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {rounds.map((round, i) => (
              <button
                key={round.name}
                onClick={() => setSelectedRoundIdx(i)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                  i === selectedRoundIdx
                    ? 'bg-baize text-fixed-white'
                    : 'bg-surface-card text-gray-400 hover:text-gray-200'
                )}
              >
                {round.name}
              </button>
            ))}
          </div>
        </FadeInOnScroll>

        <FadeInOnScroll>
          <div className="space-y-2 mt-3">
            {selectedRound.matches.map((match, i) => (
              <MatchCard key={`${match.round}-${match.matchNum}-${i}`} match={match} onTeamClick={onTeamClick} />
            ))}
          </div>
        </FadeInOnScroll>
      </div>

      {/* Desktop: horizontal bracket columns */}
      <div className="hidden md:block overflow-x-auto">
        <FadeInOnScroll>
          <div className="flex gap-4 min-w-max">
            {rounds.map((round) => (
              <div key={round.name} className="flex flex-col">
                <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-3 text-center">
                  {round.name}
                </h3>
                <div className="flex flex-col justify-around flex-1 gap-2">
                  {round.matches.map((match, i) => (
                    <div key={`${match.round}-${match.matchNum}-${i}`} className="flex items-center">
                      <MatchCard match={match} onTeamClick={onTeamClick} compact />
                      {/* Connector line to next round */}
                      {round.index > 1 && (
                        <div className="w-4 border-t border-surface-border/50" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FadeInOnScroll>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  onTeamClick,
  compact = false,
}: {
  match: KnockoutMatch;
  onTeamClick: (team: string) => void;
  compact?: boolean;
}) {
  const isBye = match.status === 'bye';
  const isPlayed = match.status === 'played';
  const isScheduled = match.status === 'scheduled';

  if (isBye) {
    return (
      <div className={clsx(
        'rounded-lg border border-surface-border/30 bg-surface-elevated/20 text-gray-600 text-xs text-center',
        compact ? 'w-52 py-3 px-2' : 'py-3 px-3',
      )}>
        TBD
      </div>
    );
  }

  const teamAWon = match.winner === match.teamA;
  const teamBWon = match.winner === match.teamB;

  return (
    <div className={clsx(
      'rounded-lg border overflow-hidden',
      compact ? 'w-52' : '',
      isPlayed ? 'border-surface-border bg-surface-card' : 'border-surface-border/50 bg-surface-card/50',
    )}>
      {/* Team A */}
      <button
        onClick={() => match.teamA && onTeamClick(match.teamA)}
        disabled={!match.teamA}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left',
          match.teamA && 'hover:bg-surface-elevated/50 cursor-pointer',
          teamAWon && 'bg-win-muted/10',
        )}
      >
        <span className={clsx(
          'truncate',
          teamAWon ? 'font-semibold text-win' : teamBWon ? 'text-gray-500' : 'text-info',
        )}>
          {match.teamA || 'TBD'}
        </span>
        {match.scoreA !== null ? (
          <span className={clsx(
            'ml-2 font-bold tabular-nums min-w-[1.5rem] text-right',
            teamAWon ? 'text-win' : teamBWon ? 'text-gray-500' : '',
          )}>
            {match.scoreA}
          </span>
        ) : (
          isScheduled && <span className="ml-2 text-gray-600 text-xs">vs</span>
        )}
      </button>

      {/* Divider */}
      <div className="border-t border-surface-border/30" />

      {/* Team B */}
      <button
        onClick={() => match.teamB && onTeamClick(match.teamB)}
        disabled={!match.teamB}
        className={clsx(
          'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left',
          match.teamB && 'hover:bg-surface-elevated/50 cursor-pointer',
          teamBWon && 'bg-win-muted/10',
        )}
      >
        <span className={clsx(
          'truncate',
          teamBWon ? 'font-semibold text-win' : teamAWon ? 'text-gray-500' : 'text-info',
        )}>
          {match.teamB || 'TBD'}
        </span>
        {match.scoreB !== null ? (
          <span className={clsx(
            'ml-2 font-bold tabular-nums min-w-[1.5rem] text-right',
            teamBWon ? 'text-win' : teamAWon ? 'text-gray-500' : '',
          )}>
            {match.scoreB}
          </span>
        ) : (
          isScheduled && <span className="ml-2 text-gray-600 text-xs">vs</span>
        )}
      </button>

      {/* Match details for scheduled matches */}
      {isScheduled && (match.date || match.time || match.venue) && (
        <div className="border-t border-surface-border/30 px-3 py-1.5 text-[10px] text-gray-500 flex gap-2 flex-wrap">
          {match.date && <span>{match.date}</span>}
          {match.time && <span>{match.time}</span>}
          {match.venue && <span className="truncate">{match.venue}</span>}
        </div>
      )}
    </div>
  );
}
