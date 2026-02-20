'use client';

import { motion } from 'framer-motion';
import type { LinkedTeamData } from '@/hooks/chalk/use-league-standings';

interface LeagueStandingsSlideProps {
  data: LinkedTeamData;
  vmin: number;
}

function formatFixtureDate(dateStr: string): string {
  // dateStr is DD-MM-YYYY
  const [dd, mm, yyyy] = dateStr.split('-');
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function LeagueStandingsSlide({ data, vmin }: LeagueStandingsSlideProps) {
  const { standings, teamName, nextFixture, lastResult } = data;

  // Determine result info for last result card
  let lastResultInfo: { score: string; opponent: string; outcome: 'Won' | 'Lost' | 'Drew' } | null = null;
  if (lastResult) {
    const isHome = lastResult.home === teamName;
    const teamScore = isHome ? lastResult.home_score : lastResult.away_score;
    const oppScore = isHome ? lastResult.away_score : lastResult.home_score;
    const opponent = isHome ? lastResult.away : lastResult.home;
    const outcome = teamScore > oppScore ? 'Won' : teamScore < oppScore ? 'Lost' : 'Drew';
    lastResultInfo = {
      score: `${teamScore}-${oppScore}`,
      opponent,
      outcome,
    };
  }

  // Next fixture info
  let nextFixtureInfo: { opponent: string; date: string; homeAway: 'Home' | 'Away' } | null = null;
  if (nextFixture) {
    const isHome = nextFixture.home === teamName;
    nextFixtureInfo = {
      opponent: isHome ? nextFixture.away : nextFixture.home,
      date: formatFixtureDate(nextFixture.date),
      homeAway: isHome ? 'Home' : 'Away',
    };
  }

  const outcomeColor = lastResultInfo?.outcome === 'Won'
    ? 'text-baize'
    : lastResultInfo?.outcome === 'Lost'
      ? 'text-loss'
      : 'text-accent';

  return (
    <div key="league_standings" className="relative z-10 flex-1 flex flex-col items-center justify-center p-[4vmin] gap-[2.5vmin]">
      {/* Header */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-[3vmin] font-bold text-baize">
          {data.leagueName} &middot; {data.divisionName}
        </h2>
      </motion.div>

      {/* Standings Table */}
      <motion.div
        className="w-full max-w-[70vmin]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {/* Table header */}
        <div className="grid grid-cols-[2.5vmin_1fr_3.5vmin_3.5vmin_3.5vmin_4.5vmin_4vmin] gap-x-[1vmin] px-[1.5vmin] py-[0.5vmin] text-[1.4vmin] font-bold uppercase tracking-wider text-white/50">
          <span className="text-center">#</span>
          <span>Team</span>
          <span className="text-center">P</span>
          <span className="text-center">W</span>
          <span className="text-center">L</span>
          <span className="text-center">+/-</span>
          <span className="text-center">Pts</span>
        </div>

        {/* Table rows */}
        {standings.map((entry, i) => {
          const isLinked = entry.team === teamName;
          return (
            <motion.div
              key={entry.team}
              className={`grid grid-cols-[2.5vmin_1fr_3.5vmin_3.5vmin_3.5vmin_4.5vmin_4vmin] gap-x-[1vmin] px-[1.5vmin] py-[0.6vmin] rounded-[0.5vmin] text-[1.7vmin] ${
                isLinked ? 'bg-baize/15 text-baize font-bold' : ''
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
            >
              <span className={`text-center ${!isLinked ? 'text-white/50' : ''}`}>{i + 1}</span>
              <span className="truncate">
                {entry.team}
                {isLinked && <span className="ml-[0.5vmin] text-[1.2vmin]">●</span>}
              </span>
              <span className="text-center">{entry.p}</span>
              <span className="text-center">{entry.w}</span>
              <span className="text-center">{entry.l}</span>
              <span className="text-center">{entry.diff > 0 ? `+${entry.diff}` : entry.diff}</span>
              <span className="text-center font-bold">{entry.pts}</span>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom cards: Next Fixture + Last Result */}
      <motion.div
        className="grid grid-cols-2 gap-[2.5vmin] w-full max-w-[65vmin]"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 + standings.length * 0.05 }}
      >
        {/* Next Fixture */}
        <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[0.7vmin]">
          <h3 className="text-[1.5vmin] font-bold uppercase tracking-wider text-white/50">Next Fixture</h3>
          {nextFixtureInfo ? (
            <>
              <p className="text-[2.2vmin] font-bold text-white truncate">vs {nextFixtureInfo.opponent}</p>
              <div className="flex items-center gap-[1vmin] text-[1.7vmin] text-white/65">
                <span>{nextFixtureInfo.date}</span>
                <span className="mx-[0.3vmin]">&middot;</span>
                <span className={nextFixtureInfo.homeAway === 'Home' ? 'text-baize font-medium' : 'text-accent font-medium'}>
                  {nextFixtureInfo.homeAway}
                </span>
              </div>
            </>
          ) : (
            <p className="text-[1.7vmin] text-white/50">No upcoming fixtures</p>
          )}
        </div>

        {/* Last Result */}
        <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[0.7vmin]">
          <h3 className="text-[1.5vmin] font-bold uppercase tracking-wider text-white/50">Last Result</h3>
          {lastResultInfo ? (
            <>
              <p className="text-[2.2vmin] font-bold text-white">
                {teamName} <span className={outcomeColor}>{lastResultInfo.score}</span>
              </p>
              <div className="flex items-center gap-[1vmin] text-[1.7vmin] text-white/65">
                <span className={outcomeColor}>{lastResultInfo.outcome}</span>
                <span className="mx-[0.3vmin]">&middot;</span>
                <span className="truncate">vs {lastResultInfo.opponent}</span>
              </div>
            </>
          ) : (
            <p className="text-[1.7vmin] text-white/50">Season not started</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
