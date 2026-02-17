'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ChalkTable, QueueEntry } from '@/lib/chalk/types';
import { getVenue } from '@/lib/chalk/firestore';
import { getLeaderboard } from '@/lib/chalk/stats-engine';
import { useVmin } from '@/hooks/chalk/use-vmin';
import { useTablePeriodStats } from '@/hooks/chalk/use-table-period-stats';
import { QRCodeDisplay } from './QRCodeDisplay';
import { CrownIcon } from '../shared/CrownIcon';
import { ListOrdered, BarChart3, Smartphone } from 'lucide-react';

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

function useQueueStatus(table: ChalkTable) {
  const waiting = table.queue.filter((e) => e.status === 'waiting').length;
  const hasGame = !!table.currentGame;

  if (!hasGame && waiting === 0) return 'No queue \u2014 walk up and play!';
  if (!hasGame && waiting > 0) return `${waiting} waiting \u2014 table is free`;
  if (hasGame && waiting === 0) return 'Game in progress \u2014 join the queue';
  return `Game in progress \u2014 ${waiting} waiting`;
}

function formatDuration(ms: number): string {
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return '<1m';
  return `${mins}m`;
}

const APP_DOWNLOAD_URL = 'https://pool-league-predictor-1--pool-league-predictor.us-east4.hosted.app/';

type Slide = 'qr' | 'stats' | 'hero';

const SLIDE_ORDER: Slide[] = ['qr', 'stats', 'hero'];
const SLIDE_ORDER_NO_STATS: Slide[] = ['qr', 'hero'];

function nextSlide(current: Slide, order: Slide[]): Slide {
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

function TrophyLogo({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 512 512">
      <path d="M155 110 C80 110 60 190 140 220 L155 220 L155 200 C100 195 95 130 155 130 Z" fill="#D4A855"/>
      <path d="M357 110 C432 110 452 190 372 220 L357 220 L357 200 C412 195 417 130 357 130 Z" fill="#D4A855"/>
      <path d="M150 90 L362 90 L340 240 C330 280 290 310 256 320 C222 310 182 280 172 240 Z" fill="#D4A855"/>
      <path d="M192 115 L194 210 C198 255 228 285 256 295" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round" strokeOpacity="0.2"/>
      <rect x="236" y="315" width="40" height="40" rx="4" fill="#D4A855"/>
      <rect x="196" y="350" width="120" height="18" rx="9" fill="#D4A855"/>
      <rect x="176" y="365" width="160" height="22" rx="11" fill="#D4A855"/>
    </svg>
  );
}

function HeroSlide({ vmin }: { vmin: number }) {
  const qrSize = Math.round(Math.max(80, Math.min(300, vmin * 18)));
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(APP_DOWNLOAD_URL)}&bgcolor=FFFFFF&color=0C1222&format=svg`;

  return (
    <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-[3vmin] chalk-animate-fade">
      {/* Trophy logo */}
      <TrophyLogo size={Math.round(vmin * 14)} />

      {/* Wordmark */}
      <h2 className="text-[5vmin] font-bold tracking-tight">
        Pool League <span className="text-accent">Pro</span>
      </h2>

      {/* Tagline */}
      <p className="text-[2.5vmin] text-gray-400">
        The smart way to manage your pool table
      </p>

      {/* Feature pills */}
      <div className="flex items-stretch gap-[2.5vmin] mt-[1vmin]">
        {[
          { icon: ListOrdered, label: 'Fair Queues' },
          { icon: BarChart3, label: 'Live Stats' },
          { icon: Smartphone, label: 'Play From Your Phone' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-[1vmin] rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.5vmin] py-[2vmin]"
          >
            <Icon size={Math.round(vmin * 3.5)} className="text-baize" />
            <span className="text-[1.7vmin] font-medium text-gray-300">{label}</span>
          </div>
        ))}
      </div>

      {/* Download QR */}
      <div className="flex flex-col items-center gap-[1.5vmin] mt-[2vmin] p-[2.5vmin] rounded-[2vmin] bg-surface-card border-2 border-baize chalk-attract-glow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt="QR code to download Pool League Pro"
          width={qrSize}
          height={qrSize}
          className="rounded-[0.7vmin]"
        />
        <p className="text-baize font-semibold text-[2vmin]">Get the app</p>
      </div>
    </div>
  );
}

export function AttractMode({ table, onWake, onClaim }: AttractModeProps) {
  const queueStatus = useQueueStatus(table);
  const vmin = useVmin();
  const qrSize = Math.round(Math.max(120, Math.min(500, vmin * 28)));
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const { daily, weekly, monthly } = useTablePeriodStats(table.id);
  const [slide, setSlide] = useState<Slide>('qr');

  // Use daily games for recent results (falls back to empty)
  const recentGames = daily.games;

  useEffect(() => {
    if (!table.venueId) return;
    getVenue(table.venueId).then((venue) => {
      if (venue?.logoUrl) setLogoUrl(venue.logoUrl);
    });
  }, [table.venueId]);

  // Rotate slides every 15s: qr → stats → hero (or qr → hero when no stats)
  useEffect(() => {
    const order = daily.gamesPlayed > 0 ? SLIDE_ORDER : SLIDE_ORDER_NO_STATS;
    const id = setInterval(() => {
      setSlide((prev) => nextSlide(prev, order));
    }, 15_000);
    return () => clearInterval(id);
  }, [daily.gamesPlayed]);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setRipple({ x: clientX - rect.left, y: clientY - rect.top, id: Date.now() });
      // Let the ripple render a frame before waking
      requestAnimationFrame(() => {
        requestAnimationFrame(() => onWake());
      });
    },
    [onWake],
  );

  const dailyLeaderboard = getLeaderboard(daily.stats);
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

      {slide === 'qr' && (
        <>
          {/* Top — branding */}
          <div className="relative z-10 flex-none text-center pt-[6vmin] pb-[3vmin] chalk-animate-fade">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={table.venueName}
                className="h-[14vmin] w-auto object-contain mx-auto mb-[2vmin]"
              />
            ) : (
              <h1 className="text-[9vmin] font-bold tracking-tight chalk-attract-title">
                {table.venueName}
              </h1>
            )}
            {table.name && table.name !== table.venueName && (
              <p className="text-[2.2vmin] text-gray-400 mt-[1vmin]">{table.name}</p>
            )}
          </div>

          {/* Middle — CTA + QR code */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-[3.7vmin] chalk-animate-fade">
            <p className="text-[3.3vmin] font-semibold text-baize">
              Tap to put your name down
            </p>

            <div className="flex flex-col items-center gap-[2.2vmin] p-[3vmin] rounded-[2.2vmin] bg-surface-card border-2 border-baize chalk-attract-glow">
              <QRCodeDisplay tableId={table.id} shortCode={table.shortCode} size={qrSize} showLabel={false} />
              <p className="text-baize font-semibold text-[2.2vmin]">Use the QR code to sign in with your Pool Pro App account</p>
            </div>
          </div>

          {/* Next Up + Recent Results */}
          {(table.currentGame || table.queue.length > 0 || recentGames.length > 0) && (
            <div className="relative z-10 flex-none mx-auto w-full max-w-[75vmin] px-[2.2vmin] pb-[1.5vmin] chalk-animate-fade">
              <div className="grid grid-cols-2 gap-[2.2vmin]">
                {/* Left — Next Up */}
                <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[1.1vmin]">
                  <h3 className="text-[1.7vmin] font-bold text-baize">Next Up</h3>
                  {table.currentGame && (
                    <div className="flex items-center gap-[1.1vmin] text-[1.9vmin]">
                      <span className="text-baize font-medium">Now playing</span>
                      <span className="text-gray-300 truncate">
                        {table.currentGame.players.map((p) => p.name).join(' vs ')}
                      </span>
                    </div>
                  )}
                  {table.queue.length > 0 ? (
                    <>
                      {table.queue.slice(0, 5).map((entry, i) => (
                        <div key={entry.id} className="flex items-center gap-[1.1vmin] text-[1.9vmin]">
                          <span className="w-[2.6vmin] text-right text-gray-600 font-mono">{i + 1}.</span>
                          <span className={i === 0 && !table.currentGame ? 'text-baize font-medium' : 'text-gray-400'}>
                            {formatNames(entry)}
                          </span>
                          {entry.status === 'on_hold' && (
                            <span className="text-[1.3vmin] text-gray-600">(hold)</span>
                          )}
                        </div>
                      ))}
                      {table.queue.length > 5 && (
                        <p className="text-gray-600 text-[1.5vmin] pl-[3.7vmin]">
                          +{table.queue.length - 5} more
                        </p>
                      )}
                    </>
                  ) : !table.currentGame ? (
                    <p className="text-gray-500 text-[1.7vmin]">No one in the queue</p>
                  ) : null}
                </div>

                {/* Right — Recent Results (tonight's games) */}
                <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[1.1vmin]">
                  <h3 className="text-[1.7vmin] font-bold text-baize">Recent Results</h3>
                  {recentGames.length > 0 ? (
                    recentGames.slice(0, 5).map((game) => {
                      const holders = game.players.filter((p) => p.side === 'holder').map((p) => p.name);
                      const challengers = game.players.filter((p) => p.side === 'challenger').map((p) => p.name);
                      const isKiller = game.mode === 'killer';

                      return (
                        <div key={game.id} className="space-y-[0.3vmin]">
                          <div className="flex items-center gap-[1.1vmin] text-[1.9vmin]">
                            {isKiller ? (
                              <span className="text-gray-300 truncate">
                                {game.players.map((p) => p.name).join(', ')}
                              </span>
                            ) : (
                              <span className="text-gray-300 truncate">
                                {holders.join(' & ')} vs {challengers.join(' & ')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-[0.8vmin] text-[1.3vmin]">
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
                    <p className="text-gray-500 text-[1.7vmin]">No games yet tonight</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {slide === 'hero' && <HeroSlide vmin={vmin} />}

      {slide === 'stats' && (
        /* Stats slide */
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-[4vmin] gap-[3vmin] chalk-animate-fade">
          {/* Tonight's Champion */}
          {daily.champion && (
            <div className="text-center space-y-[1vmin]">
              <div className="flex items-center justify-center gap-[1.1vmin]">
                <CrownIcon size={Math.round(vmin * 4)} />
                <h2 className="text-[3.7vmin] font-bold text-accent">Tonight&apos;s Champion</h2>
                <CrownIcon size={Math.round(vmin * 4)} />
              </div>
              <p className="text-[4.5vmin] font-bold">{daily.champion}</p>
              {daily.stats.playerStats[daily.champion] && (
                <p className="text-[2.2vmin] text-gray-400">
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
                  <h3 className="text-[1.7vmin] font-bold text-baize">This Week</h3>
                  <p className="text-[1.5vmin] text-gray-400">
                    {weekly.gamesPlayed} game{weekly.gamesPlayed !== 1 ? 's' : ''} played
                  </p>
                  {weeklyTopPlayer && (
                    <p className="text-[1.5vmin] text-gray-300">
                      Top: <span className="text-baize font-medium">{weeklyTopPlayer.name}</span>{' '}
                      ({weeklyTopPlayer.stats.wins}W)
                    </p>
                  )}
                  {weeklyAvgDuration > 0 && (
                    <p className="text-[1.5vmin] text-gray-400">
                      Avg game: {formatDuration(weeklyAvgDuration)}
                    </p>
                  )}
                </div>
              )}
              {monthly.gamesPlayed > 0 && (
                <div className="rounded-[1.5vmin] bg-surface-card/60 border border-surface-border px-[2.2vmin] py-[1.85vmin] space-y-[0.75vmin]">
                  <h3 className="text-[1.7vmin] font-bold text-baize">This Month</h3>
                  <p className="text-[1.5vmin] text-gray-400">
                    {monthly.gamesPlayed} game{monthly.gamesPlayed !== 1 ? 's' : ''} played
                  </p>
                  {monthlyTopPlayer && (
                    <p className="text-[1.5vmin] text-gray-300">
                      Top: <span className="text-baize font-medium">{monthlyTopPlayer.name}</span>{' '}
                      ({monthlyTopPlayer.stats.wins}W)
                    </p>
                  )}
                  {monthlyAvgDuration > 0 && (
                    <p className="text-[1.5vmin] text-gray-400">
                      Avg game: {formatDuration(monthlyAvgDuration)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tonight's Top 5 */}
          {dailyLeaderboard.length > 0 && (
            <div className="w-full max-w-[55vmin] space-y-[1.1vmin]">
              <h3 className="text-[2.2vmin] font-bold text-center">Tonight&apos;s Top 5</h3>
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
                        className={`w-[2.6vmin] text-center font-bold text-[1.7vmin] ${
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
                      <span className="flex-1 font-medium truncate flex items-center gap-[0.55vmin] text-[2vmin]">
                        {entry.name}
                        {isKing && <CrownIcon size={16} />}
                      </span>
                      <span className="text-[1.5vmin] text-baize font-mono">{entry.stats.wins}W</span>
                      <span className="text-[1.5vmin] text-loss font-mono">{entry.stats.losses}L</span>
                      <span className="text-[1.5vmin] text-gray-500 font-mono w-[5vmin] text-right">
                        {winRate}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-[1.3vmin] text-gray-500 mt-[1vmin]">
                {daily.gamesPlayed} game{daily.gamesPlayed !== 1 ? 's' : ''} tonight
                {avgGameDuration > 0 && ` \u00b7 avg ${formatDuration(avgGameDuration)}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom — status (always visible) */}
      <div className="relative z-10 flex-none text-center pb-[4.5vmin] chalk-animate-fade">
        <div className="flex items-center justify-center gap-[1.1vmin] text-[1.7vmin] text-gray-600">
          <span className="inline-block w-[0.9vmin] h-[0.9vmin] rounded-full bg-baize chalk-animate-pulse" />
          <span>{queueStatus}</span>
          <span className="mx-[0.4vmin]">&middot;</span>
          <LiveClock />
        </div>
      </div>
    </div>
  );
}
