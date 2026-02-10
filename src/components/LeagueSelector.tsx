'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  Trophy, ChevronRight, LayoutDashboard, BarChart3, Target, Calendar,
  ClipboardList, Dices, Settings, Users, GitCompare, Shield,
  MessageCircle, Bell, WifiOff, Clock, Search, ArrowRight, Sparkles,
  Zap,
} from 'lucide-react';
import clsx from 'clsx';
import { useLeague } from '@/lib/league-context';
import { UserMenu } from '@/components/auth';
import ThemeToggle from '@/components/ThemeToggle';
import type { LeagueMeta, SeasonMeta } from '@/lib/types';

/* ─── animation presets ─── */

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const fadeUp = {
  initial: { opacity: 0, y: 30 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, amount: 0.2 } as const,
  transition: { duration: 0.7, ease } as const,
};

const staggerItem = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease },
};

/* ─── feature data ─── */

interface Feature {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
  cols: number;
  highlighted?: boolean;
}

const FEATURES: Feature[] = [
  { id: 'home', label: 'Home', icon: LayoutDashboard, description: 'Personalized command center with customizable widgets and at-a-glance insights', cols: 2 },
  { id: 'standings', label: 'Standings', icon: Trophy, description: 'Live league tables with projected finishes and power rankings', cols: 1 },
  { id: 'stats', label: 'Stats', icon: BarChart3, description: 'Deep player and team statistics — win rates, Bayesian ratings, and career trends', cols: 1 },
  { id: 'matches', label: 'Matches', icon: Calendar, description: 'Unified match hub — upcoming fixtures, results, and AI-powered predictions', cols: 2, highlighted: true },
  { id: 'myteam', label: 'My Team', icon: Shield, description: "Captain's command center with squad builder, lineup optimizer, and team insights", cols: 4 },
];

const BONUS_FEATURES = [
  { icon: MessageCircle, label: 'AI Chat' },
  { icon: Bell, label: 'Push Notifications' },
  { icon: WifiOff, label: 'Offline Ready' },
  { icon: Clock, label: 'Time Machine' },
  { icon: Search, label: 'Quick Lookup' },
] as const;

/* ─── helpers ─── */

function getSavedSelection(): { leagueId: string; seasonId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('pool-league-selected');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.leagueId && parsed.seasonId) return parsed;
    return null;
  } catch { return null; }
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

/* ─── count-up hook ─── */

function useCountUp(target: number, inView: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, inView, duration]);
  return value;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function LeagueSelector() {
  const { leagues, loading, selectLeague } = useLeague();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  const [saved, setSaved] = useState<{ leagueId: string; seasonId: string } | null>(null);
  useEffect(() => { setSaved(getSavedSelection()); }, []);

  const savedLeague = saved ? leagues.find(l => l.id === saved.leagueId) : undefined;
  const savedSeason = savedLeague?.seasons.find(s => s.id === saved?.seasonId);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-4">
          <div className="text-center mb-8">
            <div className="skeleton w-48 h-8 mx-auto mb-2" />
            <div className="skeleton w-64 h-4 mx-auto" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <NavBar scrolled={scrolled} onLoginClick={() => router.push('/auth/login')} />
      <HeroSection
        savedLeague={savedLeague}
        savedSeason={savedSeason}
        onContinue={() => saved && selectLeague(saved.leagueId, saved.seasonId)}
      />
      <FeatureGrid />
      <BonusStrip />
      <StatsSection leagueCount={leagues.length} />
      <LeagueSelection
        leagues={leagues}
        selectLeague={selectLeague}
        savedLeague={savedLeague}
        savedSeason={savedSeason}
        saved={saved}
      />
      <FooterCTA />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

/* ─── NAV BAR ─── */

function NavBar({ scrolled, onLoginClick }: { scrolled: boolean; onLoginClick: () => void }) {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-surface/85 backdrop-blur-xl border-b border-surface-border/50 shadow-elevated'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 group">
          <div className="relative">
            <Trophy className="w-5 h-5 text-accent transition-transform duration-300 group-hover:scale-110" />
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">
            Pool League <span className="text-accent">Pro</span>
          </span>
        </button>

        {/* Center links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button onClick={() => scrollTo('features')} className="text-gray-400 hover:text-white transition-colors duration-200">
            Features
          </button>
          <button onClick={() => scrollTo('get-started')} className="text-gray-400 hover:text-white transition-colors duration-200">
            Get Started
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle variant="icon" />
          <div className="hidden sm:block">
            <UserMenu variant="minimal" onLoginClick={onLoginClick} />
          </div>
          <button
            onClick={() => scrollTo('get-started')}
            className="btn-shine hidden sm:flex items-center gap-1.5 text-sm font-semibold bg-baize hover:bg-baize-dark text-fixed-white px-5 py-2 rounded-full transition-all duration-200 hover:shadow-[0_0_20px_rgb(var(--baize)/0.3)]"
          >
            Get Started
          </button>
        </div>
      </div>
    </motion.nav>
  );
}

/* ─── HERO SECTION ─── */

function HeroSection({
  savedLeague,
  savedSeason,
  onContinue,
}: {
  savedLeague: LeagueMeta | undefined;
  savedSeason: SeasonMeta | undefined;
  onContinue: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center px-4 pt-16 pb-20 overflow-hidden">
      {/* Multi-layer background */}
      <motion.div className="absolute inset-0 pointer-events-none" style={{ y: bgY }} aria-hidden>
        {/* Grid */}
        <div className="absolute inset-0 hero-grid" />

        {/* Primary orb — baize, large, top-center */}
        <div
          className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[140px] opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, rgb(var(--baize)), transparent 70%)', animation: 'float-slow 20s ease-in-out infinite' }}
        />
        {/* Secondary orb — accent/gold, offset right */}
        <div
          className="absolute top-[40%] left-[60%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, rgb(var(--accent)), transparent 70%)', animation: 'float-slow-reverse 25s ease-in-out infinite' }}
        />
        {/* Tertiary orb — cool blue tint, offset left */}
        <div
          className="absolute top-[60%] left-[20%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, rgb(var(--info)), transparent 70%)', animation: 'float-slow 18s ease-in-out infinite' }}
        />

        {/* Noise overlay */}
        <div className="absolute inset-0 noise-overlay" />
      </motion.div>

      <motion.div style={{ opacity }} className="relative max-w-4xl mx-auto text-center">
        {/* Overline badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="inline-flex items-center gap-2 mb-8"
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-accent border border-accent/20 bg-accent/[0.06] rounded-full px-4 py-1.5">
            <Zap className="w-3 h-3" />
            The Ultimate Pool League Platform
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease }}
          className="text-[2.75rem] sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight text-white mb-6"
        >
          Your League.
          <br />
          Predicted, Simulated,
          <br />
          <span className="text-gradient-hero">Mastered.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease }}
          className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed"
        >
          AI-powered predictions, Monte Carlo simulations, deep player stats,
          and everything your pool league needs — all in one beautiful app.
        </motion.p>

        {/* Continue shortcut */}
        {savedLeague && savedSeason && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease }}
            onClick={onContinue}
            className="inline-flex items-center gap-2 text-sm bg-baize/[0.08] border border-baize/25 rounded-full px-5 py-2.5 text-baize-light hover:bg-baize/15 hover:border-baize/40 transition-all duration-200 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-baize animate-pulse" />
            Continue: {savedLeague.shortName} — {savedSeason.label}
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        )}

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.48, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
        >
          <button
            onClick={() => scrollTo('get-started')}
            className="btn-shine cta-glow flex items-center gap-2.5 bg-baize hover:bg-baize-dark text-fixed-white font-semibold px-8 py-3.5 rounded-full transition-all duration-200 text-base"
          >
            Get Started — It&apos;s Free
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => scrollTo('features')}
            className="flex items-center gap-2 border border-surface-border/60 hover:border-gray-400 text-gray-300 hover:text-white px-7 py-3.5 rounded-full transition-all duration-200 text-base backdrop-blur-sm hover:bg-surface-elevated/30"
          >
            See Features
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Trust line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="text-xs text-gray-500"
        >
          No credit card required &middot; Works with any pool league
        </motion.p>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
    </section>
  );
}

/* ─── FEATURE GRID (BENTO) ─── */

function FeatureGrid() {
  return (
    <section id="features" className="relative py-28 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div {...fadeUp} className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            whileInView={{ opacity: 1, width: 48 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="block h-0.5 bg-accent rounded-full mx-auto mb-6"
          />
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Everything your league needs
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            From live standings to AI-powered predictions — all built for pool league captains and players.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.05 }}
          variants={{ whileInView: { transition: { staggerChildren: 0.06 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.id} feature={f} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({ feature: f }: { feature: Feature }) {
  const Icon = f.icon;

  if (f.highlighted) {
    return (
      <motion.div
        variants={staggerItem}
        className={clsx(
          'gradient-border group relative rounded-card p-px sm:col-span-2',
        )}
      >
        <div className="relative rounded-[11px] bg-surface-card p-6 h-full overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-baize/[0.06] rounded-full blur-[60px] pointer-events-none" />

          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-baize/15 text-baize-light px-2.5 py-1 rounded-full mb-4">
            <Sparkles className="w-3 h-3" /> AI Powered
          </span>

          <div className="w-11 h-11 rounded-xl bg-baize/15 flex items-center justify-center mb-4 ring-1 ring-baize/20">
            <Icon className="w-5 h-5 text-baize-light" />
          </div>

          <h3 className="font-semibold text-lg text-white mb-1.5">{f.label}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={staggerItem}
      className={clsx(
        'card-glow group relative rounded-card p-6 bg-surface-card border border-surface-border/80 overflow-hidden',
        'hover:border-accent/25 hover:shadow-[0_8px_30px_rgb(var(--accent)/0.06)]',
        f.cols === 2 && 'sm:col-span-2',
        f.cols === 4 && 'sm:col-span-2 lg:col-span-4',
      )}
    >
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative">
        <div className="w-11 h-11 rounded-xl bg-surface-elevated/80 border border-surface-border/50 flex items-center justify-center mb-4 transition-all duration-300 group-hover:border-accent/20 group-hover:bg-accent/[0.08]">
          <Icon className="w-5 h-5 text-gray-400 transition-colors duration-300 group-hover:text-accent" />
        </div>

        <h3 className="font-semibold text-white mb-1.5">{f.label}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
      </div>
    </motion.div>
  );
}

/* ─── BONUS FEATURES STRIP ─── */

function BonusStrip() {
  return (
    <section className="py-12 px-4 sm:px-6 border-y border-surface-border/30">
      <motion.div
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true, amount: 0.3 }}
        variants={{ whileInView: { transition: { staggerChildren: 0.06 } } }}
        className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-3"
      >
        {BONUS_FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <motion.span
              key={f.label}
              variants={staggerItem}
              className="inline-flex items-center gap-2.5 text-sm text-gray-400 bg-surface-card/60 border border-surface-border/60 rounded-full px-5 py-2.5 backdrop-blur-sm hover:border-accent/20 hover:text-gray-300 transition-all duration-200"
            >
              <Icon className="w-4 h-4 text-accent/70" />
              {f.label}
            </motion.span>
          );
        })}
      </motion.div>
    </section>
  );
}

/* ─── STATS / SOCIAL PROOF ─── */

function StatsSection({ leagueCount }: { leagueCount: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  const countLeagues = useCountUp(leagueCount, inView);
  const countFeatures = useCountUp(11, inView);

  return (
    <section className="relative py-28 px-4 sm:px-6 overflow-hidden" ref={ref}>
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/[0.03] blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto text-center">
        <motion.div
          {...fadeUp}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 mb-14"
        >
          <StatBlock>
            <span className="stat-gradient text-4xl sm:text-5xl font-bold">{countLeagues}</span>
            <span className="text-sm text-gray-500 mt-1.5 font-medium">{countLeagues === 1 ? 'League' : 'Leagues'}</span>
          </StatBlock>
          <StatBlock>
            <span className="stat-gradient text-4xl sm:text-5xl font-bold">{countFeatures}</span>
            <span className="text-sm text-gray-500 mt-1.5 font-medium">Features</span>
          </StatBlock>
          <StatBlock>
            <span className="stat-gradient text-2xl sm:text-3xl font-bold">AI-Powered</span>
            <span className="text-sm text-gray-500 mt-1.5 font-medium">Predictions</span>
          </StatBlock>
          <StatBlock>
            <span className="stat-gradient text-2xl sm:text-3xl font-bold">100% Free</span>
            <span className="text-sm text-gray-500 mt-1.5 font-medium">No Catch</span>
          </StatBlock>
        </motion.div>

        <motion.div {...fadeUp}>
          <div className="inline-flex items-center gap-3 bg-surface-card/60 border border-surface-border/40 rounded-2xl px-8 py-5 backdrop-blur-sm">
            <div className="w-1 h-8 rounded-full bg-accent/60" />
            <blockquote className="text-gray-300 italic text-base sm:text-lg">
              Built by a pool league captain, for pool league captains.
            </blockquote>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      {children}
    </div>
  );
}

/* ─── LEAGUE SELECTION ─── */

function LeagueSelection({
  leagues,
  selectLeague,
  savedLeague,
  savedSeason,
  saved,
}: {
  leagues: LeagueMeta[];
  selectLeague: (leagueId: string, seasonId: string) => void;
  savedLeague: LeagueMeta | undefined;
  savedSeason: SeasonMeta | undefined;
  saved: { leagueId: string; seasonId: string } | null;
}) {
  return (
    <section id="get-started" className="relative py-28 px-4 sm:px-6">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-baize/[0.04] blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto">
        {/* Heading */}
        <motion.div {...fadeUp} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
            Choose Your League
          </h2>
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-0.5 bg-surface-border rounded-full" />
            <div className="w-12 h-1 bg-accent rounded-full" />
            <div className="w-8 h-0.5 bg-surface-border rounded-full" />
          </div>
        </motion.div>

        {/* Continue shortcut */}
        {savedLeague && savedSeason && saved && (
          <motion.button
            {...fadeUp}
            onClick={() => selectLeague(saved.leagueId, saved.seasonId)}
            className="w-full mb-6 flex items-center justify-between bg-baize/[0.06] border border-baize/25 rounded-card px-6 py-5 text-left hover:bg-baize/[0.12] hover:border-baize/40 transition-all duration-200 group"
          >
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-baize animate-pulse" />
                Continue where you left off
              </div>
              <div className="text-sm font-semibold text-white group-hover:text-baize-light transition-colors">
                {savedLeague.name} &mdash; {savedSeason.label}
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-baize/10 flex items-center justify-center group-hover:bg-baize/20 transition-colors">
              <ArrowRight className="w-4 h-4 text-baize-light" />
            </div>
          </motion.button>
        )}

        {/* League cards */}
        <motion.div
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, amount: 0.1 }}
          variants={{ whileInView: { transition: { staggerChildren: 0.1 } } }}
          className="space-y-4"
        >
          {leagues.map(league => (
            <LeagueCard key={league.id} league={league} onSelect={selectLeague} />
          ))}
        </motion.div>

        {leagues.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No leagues available</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── LEAGUE CARD ─── */

function LeagueCard({ league, onSelect }: { league: LeagueMeta; onSelect: (leagueId: string, seasonId: string) => void }) {
  return (
    <motion.div
      variants={staggerItem}
      className="card-glow bg-surface-card border border-surface-border/80 rounded-card overflow-hidden hover:border-accent/25 hover:shadow-[0_8px_30px_rgb(var(--accent)/0.06)]"
    >
      <div className="px-6 py-5 border-b border-surface-border/40">
        <h3 className="font-semibold text-lg text-white">{league.name}</h3>
        {league.shortName !== league.name && (
          <p className="text-xs text-gray-500 mt-0.5">{league.shortName}</p>
        )}
      </div>
      <div className="p-2 space-y-0.5">
        {league.seasons.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            No seasons available
          </div>
        ) : (
          league.seasons.map(season => (
            <SeasonRow key={season.id} league={league} season={season} onSelect={onSelect} />
          ))
        )}
      </div>
    </motion.div>
  );
}

/* ─── SEASON ROW ─── */

function SeasonRow({ league, season, onSelect }: { league: LeagueMeta; season: SeasonMeta; onSelect: (leagueId: string, seasonId: string) => void }) {
  return (
    <button
      onClick={() => onSelect(league.id, season.id)}
      className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg text-sm hover:bg-surface-elevated/70 transition-all duration-200 group"
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-300 font-medium group-hover:text-white transition-colors">{season.label}</span>
        {season.current && (
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-baize/15 text-baize-light px-2 py-0.5 rounded-full ring-1 ring-baize/20">
            Current
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500">
          {season.divisions.length} {season.divisions.length === 1 ? 'division' : 'divisions'}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200" />
      </div>
    </button>
  );
}

/* ─── FOOTER CTA ─── */

function FooterCTA() {
  return (
    <section className="relative py-28 px-4 sm:px-6 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-baize/[0.06] blur-[120px]" />
      </div>

      <motion.div {...fadeUp} className="relative max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
          Ready to elevate your league?
        </h2>
        <p className="text-gray-400 mb-10 text-base sm:text-lg leading-relaxed">
          Join the platform built specifically for pool league players and captains.
        </p>
        <button
          onClick={() => scrollTo('get-started')}
          className="btn-shine cta-glow inline-flex items-center gap-2.5 bg-baize hover:bg-baize-dark text-fixed-white font-semibold px-10 py-4 rounded-full transition-all duration-200 text-base"
        >
          Get Started — It&apos;s Free
          <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>

      {/* Footer */}
      <div className="relative max-w-6xl mx-auto mt-24 pt-8 border-t border-surface-border/30">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Trophy className="w-3.5 h-3.5 text-accent/50" />
            <span>Pool League Pro</span>
          </div>
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
}
