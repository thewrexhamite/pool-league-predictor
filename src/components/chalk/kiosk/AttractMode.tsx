'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import type { ChalkTable, QueueEntry, GameHistoryRecord } from '@/lib/chalk/types';
import { getVenue } from '@/lib/chalk/firestore';
import { getLeaderboard } from '@/lib/chalk/stats-engine';
import { useVmin } from '@/hooks/chalk/use-vmin';
import { useGameTimer } from '@/hooks/chalk/use-game-timer';
import { useTablePeriodStats } from '@/hooks/chalk/use-table-period-stats';
import { QRCodeDisplay } from './QRCodeDisplay';
import { CrownIcon } from '../shared/CrownIcon';
import { AnimatedChalkTitle } from '../shared/AnimatedChalkTitle';
import { AnimatedPoolLeagueProLogo } from '../shared/AnimatedPoolLeagueProLogo';

// ===== Animated count-up number =====

function CountUp({ target, duration = 1.5, delay = 0 }: { target: number; duration?: number; delay?: number }) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    const delayTimer = setTimeout(() => {
      startedRef.current = true;
      const start = performance.now();
      function tick(now: number) {
        const elapsed = (now - start) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay * 1000);
    return () => clearTimeout(delayTimer);
  }, [target, duration, delay]);

  return <>{value}</>;
}

interface AttractModeProps {
  table: ChalkTable;
  onWake: () => void;
  onClaim: () => void;
}

function LiveClock() {
  const [time, setTime] = useState('');

  useEffect(() => {
    function tick() {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;
  return <span>{time}</span>;
}

function formatNames(entry: QueueEntry) {
  if (entry.playerNames.length === 1) return entry.playerNames[0];
  return entry.playerNames.join(' & ');
}

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return '<1m';
  return `${mins}m`;
}

// ===== Rotating status bar messages =====

function useRotatingStatus(table: ChalkTable, king: string | null) {
  const [index, setIndex] = useState(0);

  const messages = useMemo(() => {
    const msgs: string[] = [];
    const waiting = table.queue.filter((e) => e.status === 'waiting').length;
    const hasGame = !!table.currentGame;

    // Core status
    if (!hasGame && waiting === 0) msgs.push('Table is free \u2014 walk up and play!');
    else if (!hasGame && waiting > 0) msgs.push(`${waiting} in the queue \u2014 table is free`);
    else if (hasGame && waiting === 0) msgs.push('Game in progress \u2014 join the queue');
    else msgs.push(`Game in progress \u2014 ${waiting} waiting`);

    // CTA
    msgs.push('Scan the QR code to join from your phone');

    // King announcement
    if (king) msgs.push(`\uD83D\uDC51 ${king} is the King of the Table`);

    // Current game info
    if (table.currentGame && table.currentGame.mode !== 'killer') {
      const holders = table.currentGame.players.filter((p) => p.side === 'holder').map((p) => p.name);
      const challengers = table.currentGame.players.filter((p) => p.side === 'challenger').map((p) => p.name);
      msgs.push(`Now: ${holders.join(' & ')} vs ${challengers.join(' & ')}`);
    }

    return msgs;
  }, [table.queue, table.currentGame, king]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 5_000);
    return () => clearInterval(id);
  }, [messages.length]);

  return messages[index % messages.length] ?? '';
}

// ===== Fun stats computation =====

interface FunStats {
  fastestGame: { duration: number; players: string } | null;
  mostGamesPlayer: { name: string; count: number } | null;
  longestStreak: { name: string; streak: number } | null;
  totalGames: number;
  totalPlayers: number;
}

function computeFunStats(games: GameHistoryRecord[], playerStats: Record<string, { gamesPlayed: number; bestStreak: number }>): FunStats {
  let fastestGame: FunStats['fastestGame'] = null;
  let mostGamesPlayer: FunStats['mostGamesPlayer'] = null;
  let longestStreak: FunStats['longestStreak'] = null;

  // Fastest game
  for (const game of games) {
    if (game.duration > 0 && (!fastestGame || game.duration < fastestGame.duration)) {
      const players = game.mode === 'killer'
        ? game.players.map((p) => p.name).join(', ')
        : `${game.players.filter((p) => p.side === 'holder').map((p) => p.name).join(' & ')} vs ${game.players.filter((p) => p.side === 'challenger').map((p) => p.name).join(' & ')}`;
      fastestGame = { duration: game.duration, players };
    }
  }

  // Most games played + longest streak
  for (const [name, s] of Object.entries(playerStats)) {
    if (!mostGamesPlayer || s.gamesPlayed > mostGamesPlayer.count) {
      mostGamesPlayer = { name, count: s.gamesPlayed };
    }
    if (s.bestStreak > 0 && (!longestStreak || s.bestStreak > longestStreak.streak)) {
      longestStreak = { name, streak: s.bestStreak };
    }
  }

  return {
    fastestGame,
    mostGamesPlayer,
    longestStreak,
    totalGames: games.length,
    totalPlayers: Object.keys(playerStats).length,
  };
}

// ===== Slide types and ordering =====

type Slide = 'qr' | 'stats' | 'hero' | 'king' | 'live_game' | 'table_free' | 'fun_stats';

function nextSlide(current: Slide, order: Slide[]): Slide {
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

export function AttractMode({ table, onWake, onClaim }: AttractModeProps) {
  const vmin = useVmin();
  const qrSize = Math.round(Math.max(120, Math.min(500, vmin * 28)));
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { daily, weekly, monthly } = useTablePeriodStats(table.id);
  const [slide, setSlide] = useState<Slide>('qr');
  const [slideFading, setSlideFading] = useState(false);
  const { display: gameTime } = useGameTimer(table.currentGame?.startedAt ?? null);

  const recentGames = daily.games;
  const dailyLeaderboard = getLeaderboard(daily.stats);

  // King of table (from daily stats or session stats)
  const king = daily.stats.kingOfTable?.playerName
    ?? table.sessionStats.kingOfTable?.playerName
    ?? null;
  const kingStreak = daily.stats.kingOfTable?.consecutiveWins
    ?? table.sessionStats.kingOfTable?.consecutiveWins
    ?? 0;

  const rotatingStatus = useRotatingStatus(table, king);

  // Fun stats
  const funStats = useMemo(
    () => computeFunStats(daily.games, daily.stats.playerStats),
    [daily.games, daily.stats.playerStats],
  );

  // Build dynamic slide order based on table state
  const slideOrder = useMemo(() => {
    const order: Slide[] = ['qr'];

    // Challenge the King slide
    if (king) order.push('king');

    // Live game slide
    if (table.currentGame && table.currentGame.mode !== 'killer') {
      order.push('live_game');
    }

    // Table free CTA
    if (!table.currentGame && table.queue.filter((e) => e.status === 'waiting').length === 0) {
      order.push('table_free');
    }

    // Stats slide
    if (daily.gamesPlayed > 0) order.push('stats');

    // Fun stats (need at least 3 games for interesting data)
    if (daily.games.length >= 3) order.push('fun_stats');

    // Hero always last
    order.push('hero');

    return order;
  }, [king, table.currentGame, table.queue, daily.gamesPlayed, daily.games.length]);

  useEffect(() => {
    if (!table.venueId) return;
    getVenue(table.venueId).then((venue) => {
      if (venue?.logoUrl) setLogoUrl(venue.logoUrl);
    });
  }, [table.venueId]);

  // Rotate slides every 12s with fade transition
  useEffect(() => {
    const id = setInterval(() => {
      setSlideFading(true);
      setTimeout(() => {
        setSlide((prev) => nextSlide(prev, slideOrder));
        setSlideFading(false);
      }, 1000);
    }, 12_000);
    return () => clearInterval(id);
  }, [slideOrder]);

  // If current slide isn't in the order, snap to first
  useEffect(() => {
    if (!slideOrder.includes(slide)) {
      setSlide(slideOrder[0]);
    }
  }, [slideOrder, slide]);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setRipple({ x: clientX - rect.left, y: clientY - rect.top, id: Date.now() });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => onWake());
      });
    },
    [onWake],
  );

  const avgGameDuration = daily.games.length > 0
    ? daily.games.reduce((sum, g) => sum + g.duration, 0) / daily.games.length
    : 0;

  const weeklyAvgDuration = weekly.games.length > 0
    ? weekly.games.reduce((sum, g) => sum + g.duration, 0) / weekly.games.length
    : 0;

  const monthlyAvgDuration = monthly.games.length > 0
    ? monthly.games.reduce((sum, g) => sum + g.duration, 0) / monthly.games.length
    : 0;

  const weeklyTopPlayer = weekly.champion
    ? { name: weekly.champion, stats: weekly.stats.playerStats[weekly.champion] }
    : null;

  const monthlyTopPlayer = monthly.champion
    ? { name: monthly.champion, stats: monthly.stats.playerStats[monthly.champion] }
    : null;

  return (
    <div
      className="chalk-kiosk flex flex-col cursor-pointer chalk-attract-drift bg-surface"
      onClick={handleTap}
      onTouchStart={handleTap}
    >
      {/* Tap ripple */}
      {ripple && (
        <div
          key={ripple.id}
          className="chalk-tap-ripple"
          style={{ left: ripple.x, top: ripple.y }}
        />
      )}

      {/* Chalk dust particles */}
      <div className="chalk-dust-container" aria-hidden>
        <div className="chalk-dust chalk-dust-1" />
        <div className="chalk-dust chalk-dust-2" />
        <div className="chalk-dust chalk-dust-3" />
        <div className="chalk-dust chalk-dust-4" />
        <div className="chalk-dust chalk-dust-5" />
        <div className="chalk-dust chalk-dust-6" />
        <div className="chalk-dust chalk-dust-7" />
        <div className="chalk-dust chalk-dust-8" />
      </div>

      <div
        className="flex-1 flex flex-col transition-opacity duration-1000 ease-in-out"
        style={{ opacity: slideFading ? 0 : 1 }}
      >

      {/* ===== QR Slide (main branding + join CTA) ===== */}
      {slide === 'qr' && (
        <div key="qr" className="flex-1 flex flex-col">
          {/* Top — branding */}
          <div className="relative z-10 flex-none text-center pt-[6vmin] pb-[3vmin]">
            {logoUrl ? (
              <motion.img
                src={logoUrl}
                alt={table.venueName}
                className="h-[14vmin] w-auto object-contain mx-auto mb-[2vmin]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            ) : (
              <AnimatedChalkTitle text={table.venueName} size="9vmin" />
            )}
            {table.name && table.name !== table.venueName && (
              <motion.p
                className="text-[2.5vmin] text-gray-400 mt-[1vmin]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.5 }}
              >
                {table.name}
              </motion.p>
            )}
          </div>

          {/* Middle — CTA + QR code */}
          <motion.div
            className="relative z-10 flex-1 flex flex-col items-center justify-center gap-[3.7vmin]"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.8, ease: 'easeOut' }}
          >
            <p className="text-[4vmin] font-bold text-baize">
              Tap to put your name down
            </p>

            <div className="flex flex-col items-center gap-[2.2vmin] p-[3vmin] rounded-[2.2vmin] bg-surface-card border-2 border-baize chalk-attract-glow">
              <QRCodeDisplay tableId={table.id} shortCode={table.shortCode} size={qrSize} showLabel={false} />
              <p className="text-baize font-semibold text-[2.5vmin] max-w-[50vmin] mx-auto text-center">Scan to sign in with your Pool Pro account</p>
            </div>
          </motion.div>

          {/* Next Up + Recent Results */}
          {(table.currentGame || table.queue.length > 0 || recentGames.length > 0) && (
            <motion.div
              className="relative z-10 flex-none mx-auto w-full max-w-[75vmin] px-[2.2vmin] pb-[1.5vmin]"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 2.2, ease: 'easeOut' }}
            >
              <div className="grid grid-cols-2 gap-[2.2vmin]">
                {/* Left — Next Up */}
                <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[1.1vmin]">
                  <h3 className="text-[2vmin] font-bold text-baize">Next Up</h3>
                  {table.currentGame && (
                    <div className="flex items-center gap-[1.1vmin] text-[2vmin]">
                      <span className="text-baize font-medium">Now playing</span>
                      <span className="break-words" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        {table.currentGame.players.map((p) => p.name).join(' vs ')}
                      </span>
                    </div>
                  )}
                  {table.queue.length > 0 ? (
                    <>
                      {table.queue.slice(0, 5).map((entry, i) => (
                        <div key={entry.id} className="flex items-center gap-[1.1vmin] text-[2vmin]">
                          <span className="w-[2.6vmin] text-right font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{i + 1}.</span>
                          <span className={i === 0 && !table.currentGame ? 'text-baize font-medium' : ''} style={i === 0 && !table.currentGame ? undefined : { color: 'rgba(255,255,255,0.65)' }}>
                            {formatNames(entry)}
                          </span>
                          {entry.status === 'on_hold' && (
                            <span className="text-[1.3vmin]" style={{ color: 'rgba(255,255,255,0.35)' }}>(hold)</span>
                          )}
                        </div>
                      ))}
                      {table.queue.length > 5 && (
                        <p className="text-[1.5vmin] pl-[3.7vmin]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          +{table.queue.length - 5} more
                        </p>
                      )}
                    </>
                  ) : !table.currentGame ? (
                    <p className="text-[2vmin]" style={{ color: 'rgba(255,255,255,0.5)' }}>No one in the queue</p>
                  ) : null}
                </div>

                {/* Right — Recent Results */}
                <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[1.1vmin]">
                  <h3 className="text-[2vmin] font-bold text-baize">Recent Results</h3>
                  {recentGames.length > 0 ? (
                    recentGames.slice(0, 5).map((game) => {
                      const holders = game.players.filter((p) => p.side === 'holder').map((p) => p.name);
                      const challengers = game.players.filter((p) => p.side === 'challenger').map((p) => p.name);
                      const isKiller = game.mode === 'killer';

                      return (
                        <div key={game.id} className="space-y-[0.3vmin]">
                          <div className="flex items-center gap-[1.1vmin] text-[2vmin]">
                            {isKiller ? (
                              <span className="break-words" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                {game.players.map((p) => p.name).join(', ')}
                              </span>
                            ) : (
                              <span className="break-words" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                {holders.join(' & ')} vs {challengers.join(' & ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-[0.8vmin] text-[1.5vmin]">
                            {game.winner && (
                              <span className="text-baize font-medium">{game.winner} won</span>
                            )}
                            {game.consecutiveWins >= 3 && (
                              <span className="flex items-center gap-[0.3vmin] text-accent">
                                <CrownIcon size={12} />
                                {game.consecutiveWins}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[2vmin]" style={{ color: 'rgba(255,255,255,0.5)' }}>No games yet today</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ===== Challenge the King Slide ===== */}
      {slide === 'king' && king && (
        <div key="king" className="relative z-10 flex-1 flex flex-col items-center justify-center p-[4vmin] gap-[3vmin]">
          <motion.div
            className="text-center space-y-[3vmin]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Crown icon */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center"
            >
              <CrownIcon size={Math.round(vmin * 12)} />
            </motion.div>

            {/* Title */}
            <motion.p
              className="text-[3.5vmin] font-bold text-accent uppercase tracking-[0.5vmin]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              King of the Table
            </motion.p>

            {/* King name */}
            <motion.p
              className={`font-bold text-white max-w-[70vmin] mx-auto break-words text-center ${king.length > 15 ? 'text-[5vmin]' : 'text-[7vmin]'}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {king}
            </motion.p>

            {/* Streak */}
            <motion.p
              className="text-[3vmin] text-baize font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {kingStreak} wins in a row
            </motion.p>

            {/* CTA */}
            <motion.p
              className="text-[3.5vmin] font-bold text-white mt-[2vmin] chalk-attract-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
            >
              Think you can dethrone them?
            </motion.p>

            {/* QR code */}
            <motion.div
              className="flex flex-col items-center gap-[1.5vmin] mt-[2vmin]"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6, duration: 0.5 }}
            >
              <div className="p-[2vmin] rounded-[1.5vmin] bg-surface-card border-2 border-accent chalk-attract-glow">
                <QRCodeDisplay
                  tableId={table.id}
                  shortCode={table.shortCode}
                  size={Math.round(Math.max(100, Math.min(280, vmin * 16)))}
                  showLabel={false}
                />
              </div>
              <p className="text-[2vmin] text-gray-400">Scan to join the queue</p>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* ===== Live Game Slide ===== */}
      {slide === 'live_game' && table.currentGame && (
        <div key="live_game" className="relative z-10 flex-1 flex flex-col items-center justify-center p-[4vmin] gap-[3vmin]">
          <motion.div
            className="text-center space-y-[3vmin]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Live indicator */}
            <div className="flex items-center justify-center gap-[1.5vmin]">
              <span className="inline-block w-[1.5vmin] h-[1.5vmin] rounded-full bg-loss chalk-animate-pulse" />
              <p className="text-[3vmin] font-bold text-loss uppercase tracking-[0.4vmin]">
                Live Game
              </p>
            </div>

            {/* Timer */}
            <motion.p
              className="text-[5vmin] font-mono font-bold text-baize"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              {gameTime}
            </motion.p>

            {/* Matchup */}
            <div className="flex items-start gap-[4vmin] max-w-[85vmin] mx-auto w-full">
              <motion.div
                className="flex-1 text-right min-w-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <p className="text-[5vmin] font-bold text-white break-words">
                  {table.currentGame.players
                    .filter((p) => p.side === 'holder')
                    .map((p) => p.name)
                    .join(' & ')}
                </p>
              </motion.div>

              <motion.span
                className="text-[5vmin] font-bold text-gray-500 flex-shrink-0 mt-[0.5vmin]"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
              >
                vs
              </motion.span>

              <motion.div
                className="flex-1 text-left min-w-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <p className="text-[5vmin] font-bold text-white break-words">
                  {table.currentGame.players
                    .filter((p) => p.side === 'challenger')
                    .map((p) => p.name)
                    .join(' & ')}
                </p>
              </motion.div>
            </div>

            {/* Badges below matchup — include holder name for context */}
            {(table.currentGame.consecutiveWins > 0 || table.currentGame.mode === 'challenge') && (
              <motion.p
                className="text-[2vmin] text-accent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {table.currentGame.consecutiveWins > 0 && (
                  <span>
                    {table.currentGame.players.filter((p) => p.side === 'holder').map((p) => p.name).join(' & ')} — {table.currentGame.consecutiveWins} win{table.currentGame.consecutiveWins !== 1 ? 's' : ''} in a row
                  </span>
                )}
                {table.currentGame.mode === 'challenge' && <span>Challenge match</span>}
              </motion.p>
            )}

            {/* Queue CTA */}
            <motion.div
              className="mt-[3vmin] flex flex-col items-center gap-[1.5vmin]"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
            >
              <p className="text-[2.5vmin] text-gray-400">
                {table.queue.filter((e) => e.status === 'waiting').length > 0
                  ? `${table.queue.filter((e) => e.status === 'waiting').length} in the queue \u2014 scan to join`
                  : 'Scan to play next'}
              </p>
              <div className="p-[1.5vmin] rounded-[1.5vmin] bg-surface-card/60 border border-surface-border">
                <QRCodeDisplay
                  tableId={table.id}
                  shortCode={table.shortCode}
                  size={Math.round(Math.max(80, Math.min(180, vmin * 12)))}
                  showLabel={false}
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* ===== Table Free CTA Slide ===== */}
      {slide === 'table_free' && (
        <div key="table_free" className="relative z-10 flex-1 flex flex-col items-center justify-center p-[4vmin] gap-[3vmin]">
          <motion.div
            className="text-center space-y-[3.5vmin]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Big bold CTA */}
            <motion.p
              className="text-[8vmin] font-bold text-baize chalk-attract-title leading-tight"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 150, damping: 15 }}
            >
              Table is Free!
            </motion.p>

            <motion.p
              className="text-[3.5vmin] text-gray-300 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Walk up and play or scan to join
            </motion.p>

            {/* Large pulsing QR */}
            <motion.div
              className="flex flex-col items-center gap-[2vmin] mt-[2vmin]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <div className="p-[3vmin] rounded-[2.2vmin] bg-surface-card border-2 border-baize chalk-attract-glow">
                <QRCodeDisplay
                  tableId={table.id}
                  shortCode={table.shortCode}
                  size={Math.round(Math.max(140, Math.min(400, vmin * 24)))}
                  showLabel={false}
                />
              </div>
              <p className="text-baize font-semibold text-[2.5vmin]">Scan to get started</p>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* ===== Stats Slide ===== */}
      {slide === 'stats' && (
        <div key="stats" className="relative z-10 flex-1 flex flex-col items-center justify-center p-[4vmin] gap-[3vmin]">
          {/* Today's Champion */}
          {daily.champion && (
            <div className="text-center space-y-[1vmin]">
              <div className="flex items-center justify-center gap-[1.1vmin]">
                <CrownIcon size={Math.round(vmin * 4)} />
                <h2 className="text-[4vmin] font-bold text-accent">Today&apos;s Top Shooter</h2>
                <CrownIcon size={Math.round(vmin * 4)} />
              </div>
              <p className="text-[5vmin] font-bold">{daily.champion}</p>
              {daily.stats.playerStats[daily.champion] && (
                <p className="text-[2.5vmin] text-gray-400">
                  {daily.stats.playerStats[daily.champion].wins}W{' '}
                  {daily.stats.playerStats[daily.champion].losses}L
                  {daily.stats.playerStats[daily.champion].currentStreak > 1 && (
                    <span className="text-baize ml-[1vmin]">
                      {daily.stats.playerStats[daily.champion].currentStreak} streak
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Weekly / Monthly summary */}
          {(weekly.gamesPlayed > 0 || monthly.gamesPlayed > 0) && (
            <div className="grid grid-cols-2 gap-[3vmin] w-full max-w-[65vmin]">
              {weekly.gamesPlayed > 0 && (
                <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[0.75vmin]">
                  <h3 className="text-[2vmin] font-bold text-baize">This Week</h3>
                  <p className="text-[1.7vmin]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {weekly.gamesPlayed} game{weekly.gamesPlayed !== 1 ? 's' : ''} played
                  </p>
                  {weeklyTopPlayer && (
                    <p className="text-[1.7vmin]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Top: <span className="text-baize font-medium">{weeklyTopPlayer.name}</span>{' '}
                      ({weeklyTopPlayer.stats.wins}W)
                    </p>
                  )}
                  {weeklyAvgDuration > 0 && (
                    <p className="text-[1.7vmin]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      Avg game: {formatDuration(weeklyAvgDuration)}
                    </p>
                  )}
                </div>
              )}
              {monthly.gamesPlayed > 0 && (
                <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[0.75vmin]">
                  <h3 className="text-[2vmin] font-bold text-baize">This Month</h3>
                  <p className="text-[1.7vmin]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {monthly.gamesPlayed} game{monthly.gamesPlayed !== 1 ? 's' : ''} played
                  </p>
                  {monthlyTopPlayer && (
                    <p className="text-[1.7vmin]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Top: <span className="text-baize font-medium">{monthlyTopPlayer.name}</span>{' '}
                      ({monthlyTopPlayer.stats.wins}W)
                    </p>
                  )}
                  {monthlyAvgDuration > 0 && (
                    <p className="text-[1.7vmin]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      Avg game: {formatDuration(monthlyAvgDuration)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Today's Top 5 */}
          {dailyLeaderboard.length > 0 && (
            <div className="w-full max-w-[55vmin] space-y-[1.1vmin]">
              <h3 className="text-[2.5vmin] font-bold text-center">Today&apos;s Top 5</h3>
              <div className="space-y-[0.55vmin]">
                {dailyLeaderboard.slice(0, 5).map((entry, index) => {
                  const winRate =
                    entry.stats.gamesPlayed > 0
                      ? Math.round((entry.stats.wins / entry.stats.gamesPlayed) * 100)
                      : 0;
                  const isKing = daily.stats.kingOfTable?.playerName === entry.name;

                  return (
                    <div
                      key={entry.name}
                      className={`flex items-center gap-[1.5vmin] rounded-[0.7vmin] px-[1.5vmin] py-[1vmin] ${
                        index === 0 ? 'bg-accent/10' : ''
                      }`}
                    >
                      <span
                        className={`w-[2.6vmin] text-center font-bold text-[2vmin] ${
                          index === 0
                            ? 'text-accent'
                            : index === 1
                              ? 'text-gray-300'
                              : index === 2
                                ? 'text-amber-700'
                                : 'text-gray-500'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 font-medium break-words flex items-center gap-[0.55vmin] text-[2.2vmin]">
                        {entry.name}
                        {isKing && <CrownIcon size={18} />}
                      </span>
                      <span className="text-[1.7vmin] text-baize font-mono">{entry.stats.wins}W</span>
                      <span className="text-[1.7vmin] text-loss font-mono">{entry.stats.losses}L</span>
                      <span className="text-[1.7vmin] text-gray-500 font-mono w-[5vmin] text-right">
                        {winRate}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-[1.5vmin] text-gray-500 mt-[1vmin]">
                {daily.gamesPlayed} game{daily.gamesPlayed !== 1 ? 's' : ''} today
                {avgGameDuration > 0 && ` \u00b7 avg ${formatDuration(avgGameDuration)}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===== Fun Stats Slide ===== */}
      {slide === 'fun_stats' && (() => {
        const bottomCards = [funStats.fastestGame ? 'fastest' : null, funStats.longestStreak ? 'streak' : null].filter(Boolean);
        const useWideGrid = bottomCards.length < 2;
        return (
        <div key="fun_stats" className="relative z-10 flex-1 flex flex-col items-center justify-center p-[4vmin] gap-[4vmin]">
          <motion.h2
            className="text-[4vmin] font-bold text-baize"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            Today&apos;s Numbers
          </motion.h2>

          <div className={`grid gap-[3vmin] w-full max-w-[65vmin] ${useWideGrid ? 'grid-cols-1 max-w-[35vmin]' : 'grid-cols-2'}`}>
            {/* Total games */}
            <motion.div
              className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[3vmin] py-[2.5vmin] text-center"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-[6vmin] font-bold text-baize">
                <CountUp target={funStats.totalGames} delay={0.3} />
              </p>
              <p className="text-[2vmin] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Games Played</p>
            </motion.div>

            {/* Total players */}
            <motion.div
              className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[3vmin] py-[2.5vmin] text-center"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-[6vmin] font-bold text-accent">
                <CountUp target={funStats.totalPlayers} delay={0.4} />
              </p>
              <p className="text-[2vmin] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Players Today</p>
            </motion.div>

            {/* Fastest game */}
            {funStats.fastestGame && (
              <motion.div
                className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[3vmin] py-[2.5vmin] text-center"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <p className="text-[5vmin] font-bold" style={{ color: '#fff' }}>{formatDuration(funStats.fastestGame.duration)}</p>
                <p className="text-[2vmin] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Fastest Game</p>
                <p className="text-[1.5vmin] mt-[0.5vmin] break-words max-w-[28vmin] mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>{funStats.fastestGame.players}</p>
              </motion.div>
            )}

            {/* Longest streak */}
            {funStats.longestStreak && (
              <motion.div
                className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[3vmin] py-[2.5vmin] text-center"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <p className="text-[5vmin] font-bold text-baize">
                  <CountUp target={funStats.longestStreak.streak} delay={0.6} />
                </p>
                <p className="text-[2vmin] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Best Streak</p>
                <p className="text-[1.5vmin] mt-[0.5vmin] break-words max-w-[28vmin] mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>{funStats.longestStreak.name}</p>
              </motion.div>
            )}
          </div>

          {/* Most active player */}
          {funStats.mostGamesPlayer && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="text-[2vmin] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.65)' }}>Most Active Player</p>
              <p className="text-[3.5vmin] font-bold mt-[0.5vmin] break-words max-w-[50vmin] mx-auto" style={{ color: '#fff' }}>
                {funStats.mostGamesPlayer.name}
              </p>
              <p className="text-[2vmin]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <CountUp target={funStats.mostGamesPlayer.count} delay={0.8} /> game{funStats.mostGamesPlayer.count !== 1 ? 's' : ''} played
              </p>
            </motion.div>
          )}
        </div>
        );
      })()}

      {/* ===== Hero Slide (Pool League Pro branding) ===== */}
      {slide === 'hero' && <AnimatedPoolLeagueProLogo key="hero" vmin={vmin} />}

      </div>

      {/* ===== Slide indicator dots ===== */}
      {slideOrder.length > 1 && (
        <div className="relative z-10 flex items-center justify-center gap-[1vmin] pb-[1.5vmin]">
          {slideOrder.map((s) => (
            <span
              key={s}
              className={`inline-block rounded-full transition-all duration-500 ${
                s === slide
                  ? 'w-[2.2vmin] h-[0.8vmin] bg-baize'
                  : 'w-[0.8vmin] h-[0.8vmin] bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}

      {/* ===== Bottom — rotating status bar (always visible) ===== */}
      <div className="relative z-10 flex-none text-center pb-[4.5vmin]">
        <div className="flex items-center justify-center gap-[1.1vmin] text-[2vmin] text-gray-500">
          <span className="inline-block w-[1vmin] h-[1vmin] rounded-full bg-baize chalk-animate-pulse" />
          <motion.span
            key={rotatingStatus}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            {rotatingStatus}
          </motion.span>
          <span className="mx-[0.4vmin]">&middot;</span>
          <LiveClock />
        </div>
      </div>
    </div>
  );
}
