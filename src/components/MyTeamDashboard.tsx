'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Trash2,
  Home,
  Plane,
  Users,
  BarChart3,
  FileText,
  Calendar,
} from 'lucide-react';
import type {
  DivisionCode,
  StandingEntry,
  TeamReportData,
  TeamReportOutput,
  StoredTeamReport,
} from '@/lib/types';
import { useActiveData } from '@/lib/active-data-provider';
import { useLeague } from '@/lib/league-context';
import {
  getTeamResults,
  getTeamPlayers,
  calcPlayerForm,
  calcAppearanceRates,
  calcTeamHomeAway,
  calcSetPerformance,
  calcTeamBDStats,
  calcBayesianPct,
  getRemainingFixtures,
  calcStandings,
  parseDate,
} from '@/lib/predictions';
import { generateTeamReportAction } from '@/lib/ai-actions';
import { useTeamReports } from '@/hooks/use-team-reports';

interface MyTeamDashboardProps {
  team: string;
  div: DivisionCode;
  standings: StandingEntry[];
  onTeamClick: (team: string) => void;
  onPlayerClick: (name: string) => void;
  onPredict: (home: string, away: string) => void;
}

export default function MyTeamDashboard({
  team,
  div,
  standings,
  onTeamClick,
  onPlayerClick,
  onPredict,
}: MyTeamDashboardProps) {
  const { ds, frames } = useActiveData();
  const { selected } = useLeague();
  const leagueName = selected?.league?.name;
  const { reports, addReport, deleteReport } = useTeamReports(team);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  // Team standing
  const standing = standings.find(s => s.team === team);
  const position = standings.findIndex(s => s.team === team) + 1;
  const totalTeams = standings.length;

  // Gaps
  const leader = standings[0];
  const gapToLeader = standing && leader ? leader.pts - standing.pts : 0;
  const safetyLine = totalTeams > 2 ? standings[totalTeams - 3] : null;
  const gapToSafety = standing && safetyLine && position > totalTeams - 2
    ? safetyLine.pts - standing.pts
    : 0;

  // Results & form
  const teamResults = useMemo(() => getTeamResults(team, ds), [team, ds]);
  const form = useMemo(() => teamResults.slice(0, 5).map(r => r.result), [teamResults]);
  const recentResults = useMemo(() => teamResults.slice(0, 5), [teamResults]);

  // Home/away split
  const homeAway = useMemo(() => calcTeamHomeAway(team, ds.results), [team, ds.results]);

  // Next fixture
  const nextFixture = useMemo(() => {
    const remaining = getRemainingFixtures(div, ds);
    const teamFixtures = remaining
      .filter(f => f.home === team || f.away === team)
      .sort((a, b) => parseDate(a.date).localeCompare(parseDate(b.date)));
    return teamFixtures[0] || null;
  }, [team, div, ds]);

  // Squad data
  const squadData = useMemo(() => {
    const players = getTeamPlayers(team, ds);
    const appearances = calcAppearanceRates(team, frames);
    const appMap = new Map(appearances.map(a => [a.name, a]));

    return players.map(p => {
      const playerForm = calcPlayerForm(p.name, frames);
      const app = appMap.get(p.name);
      const played = p.s2526?.p ?? 0;
      const won = p.s2526?.w ?? 0;
      const winPct = played > 0 ? (won / played) * 100 : 0;
      const adjPct = calcBayesianPct(won, played);
      return {
        name: p.name,
        played,
        winPct,
        adjPct,
        trend: playerForm?.trend ?? null,
        category: app?.category ?? null,
      };
    })
    .filter(p => p.played > 0)
    .sort((a, b) => b.adjPct - a.adjPct);
  }, [team, ds, frames]);

  // Set performance
  const setPerf = useMemo(() => {
    const sp = calcSetPerformance(team, frames);
    if (!sp || (sp.set1.played === 0 && sp.set2.played === 0)) return null;
    return { set1Pct: sp.set1.pct, set2Pct: sp.set2.pct, bias: sp.bias };
  }, [team, frames]);

  // B&D stats
  const bdStats = useMemo(() => calcTeamBDStats(team, ds.players2526), [team, ds.players2526]);

  // Division name
  const divisionName = ds.divisions[div]?.name ?? div;

  // Generate report
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const input: TeamReportData = {
        teamName: team,
        divisionName,
        leagueName,
        position,
        totalTeams,
        standing: standing
          ? { p: standing.p, w: standing.w, d: standing.d, l: standing.l, f: standing.f, a: standing.a, pts: standing.pts, diff: standing.diff }
          : { p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, pts: 0, diff: 0 },
        form,
        recentResults: recentResults.map(r => ({
          opponent: r.opponent,
          teamScore: r.teamScore,
          oppScore: r.oppScore,
          result: r.result,
          isHome: r.isHome,
        })),
        homeAway: {
          home: { p: homeAway.home.p, w: homeAway.home.w, d: homeAway.home.d, l: homeAway.home.l, winPct: homeAway.home.winPct },
          away: { p: homeAway.away.p, w: homeAway.away.w, d: homeAway.away.d, l: homeAway.away.l, winPct: homeAway.away.winPct },
        },
        playerSummaries: squadData,
        setPerformance: setPerf,
        bdStats: { bdFRate: bdStats.bdFRate, bdARate: bdStats.bdARate, netBD: bdStats.netBD, forfRate: bdStats.forfRate },
        nextOpponent: nextFixture
          ? nextFixture.home === team ? nextFixture.away : nextFixture.home
          : null,
        nextIsHome: nextFixture ? nextFixture.home === team : null,
        gapToLeader,
        gapToSafety,
      };

      const result = await generateTeamReportAction(input);
      const stored: StoredTeamReport = {
        id: crypto.randomUUID(),
        teamName: team,
        divisionCode: div,
        generatedAt: Date.now(),
        report: result,
      };
      addReport(stored);
      setExpandedReportId(stored.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate report';
      setGenerateError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!standing) return null;

  const isApiKeyError = generateError?.includes('not configured');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 mb-6"
    >
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-6 bg-accent rounded-full" />
        <h2 className="text-base font-bold text-white">My Team</h2>
        <span className="text-xs text-gray-400">{team}</span>
      </div>

      {/* a) Team Overview Card */}
      <div className="bg-surface-card rounded-card shadow-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className={clsx(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
            position === 1 ? 'bg-gold text-surface' :
            position <= 3 ? 'bg-win-muted text-win' :
            position > totalTeams - 2 ? 'bg-loss-muted text-loss' :
            'bg-surface-elevated text-gray-300'
          )}>
            {position}
          </span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">{team}</div>
            <div className="text-xs text-gray-400">{divisionName}</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-gold">{standing.pts} <span className="text-xs text-gray-500 font-normal">pts</span></div>
            <div className="text-xs text-gray-400">
              W{standing.w} D{standing.d} L{standing.l}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 mr-1">Form</span>
            {form.map((r, i) => (
              <span
                key={i}
                className={clsx(
                  'w-5 h-5 rounded-sm text-[10px] font-bold flex items-center justify-center',
                  r === 'W' ? 'bg-win-muted text-win' :
                  r === 'L' ? 'bg-loss-muted text-loss' :
                  'bg-surface-elevated text-draw'
                )}
              >
                {r}
              </span>
            ))}
          </div>
          <div className="flex gap-3 text-xs">
            {gapToLeader > 0 && (
              <span className="text-gray-400">
                <span className="text-gray-500">Leader:</span> -{gapToLeader}
              </span>
            )}
            {gapToSafety < 0 && (
              <span className="text-loss">
                <span className="text-gray-500">Safety:</span> {gapToSafety}
              </span>
            )}
            <span className="text-gray-400">
              Diff: <span className={standing.diff > 0 ? 'text-win' : standing.diff < 0 ? 'text-loss' : 'text-gray-400'}>
                {standing.diff > 0 ? '+' : ''}{standing.diff}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* b) Next Match + Home/Away Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Next Fixture */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-info mb-3 flex items-center gap-1.5">
            <Calendar size={16} />
            Next Match
          </h3>
          {nextFixture ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={clsx(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded',
                  nextFixture.home === team ? 'bg-win-muted text-win' : 'bg-info/20 text-info'
                )}>
                  {nextFixture.home === team ? 'HOME' : 'AWAY'}
                </span>
                <span className="text-xs text-gray-500">{nextFixture.date}</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="flex-1 text-right text-gray-300 truncate">{nextFixture.home}</span>
                <span className="mx-2 text-gray-600 text-xs">vs</span>
                <span className="flex-1 text-gray-300 truncate">{nextFixture.away}</span>
                <button
                  onClick={() => onPredict(nextFixture.home, nextFixture.away)}
                  className="ml-2 text-baize hover:text-baize-light transition"
                  aria-label="Predict match"
                  title="Predict match"
                >
                  <Target size={14} />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">No upcoming fixtures</p>
          )}
        </div>

        {/* Home/Away Split */}
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <BarChart3 size={16} />
            Home / Away
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <span title="Home win %"><Home size={14} className="mx-auto mb-1 text-win" /></span>
              <div className="text-lg font-bold text-white">{homeAway.home.winPct.toFixed(0)}%</div>
              <div className="text-xs text-gray-500">
                W{homeAway.home.w} D{homeAway.home.d} L{homeAway.home.l}
              </div>
            </div>
            <div className="text-center">
              <span title="Away win %"><Plane size={14} className="mx-auto mb-1 text-info" /></span>
              <div className="text-lg font-bold text-white">{homeAway.away.winPct.toFixed(0)}%</div>
              <div className="text-xs text-gray-500">
                W{homeAway.away.w} D{homeAway.away.d} L{homeAway.away.l}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* c) Recent Results */}
      {recentResults.length > 0 && (
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <FileText size={16} />
            Recent Results
          </h3>
          <div className="space-y-1.5">
            {recentResults.map((r, i) => (
              <div key={i} className="flex items-center text-sm p-2 rounded-lg bg-surface/50">
                <span className="text-xs text-gray-500 w-20 shrink-0">{r.date}</span>
                <span className={clsx(
                  'w-5 h-5 rounded-sm text-[10px] font-bold flex items-center justify-center shrink-0 mr-2',
                  r.result === 'W' ? 'bg-win-muted text-win' :
                  r.result === 'L' ? 'bg-loss-muted text-loss' :
                  'bg-surface-elevated text-draw'
                )}>
                  {r.result}
                </span>
                <span className="font-bold text-white w-12 text-center shrink-0">
                  {r.teamScore} - {r.oppScore}
                </span>
                <span className="text-xs text-gray-500 mx-1.5 shrink-0">{r.isHome ? '(H)' : '(A)'}</span>
                <button
                  onClick={() => onTeamClick(r.opponent)}
                  className="text-gray-300 hover:text-info transition truncate text-left"
                >
                  {r.opponent}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* d) Squad Status */}
      {squadData.length > 0 && (
        <div className="bg-surface-card rounded-card shadow-card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-1.5">
            <Users size={16} />
            Squad Status
          </h3>
          <div className="space-y-1">
            {squadData.map(p => (
              <div key={p.name} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface-elevated transition">
                <button
                  onClick={() => onPlayerClick(p.name)}
                  className="flex-1 text-sm text-gray-300 hover:text-info transition truncate text-left"
                >
                  {p.name}
                </button>
                <span className="text-xs text-gray-500 w-8 text-right">{p.played}p</span>
                <span className={clsx(
                  'text-xs font-medium w-12 text-right',
                  p.adjPct >= 60 ? 'text-win' : p.adjPct <= 40 ? 'text-loss' : 'text-gray-300'
                )}>
                  {p.adjPct.toFixed(0)}%
                </span>
                {p.trend && (
                  <span className="shrink-0" title={p.trend === 'hot' ? 'Hot streak' : p.trend === 'cold' ? 'Cold streak' : 'Steady form'}>
                    {p.trend === 'hot' && <TrendingUp size={12} className="text-win" />}
                    {p.trend === 'cold' && <TrendingDown size={12} className="text-loss" />}
                    {p.trend === 'steady' && <Minus size={12} className="text-gray-500" />}
                  </span>
                )}
                {p.category && (
                  <span className={clsx(
                    'text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0',
                    p.category === 'core' ? 'bg-win-muted text-win' :
                    p.category === 'rotation' ? 'bg-surface-elevated text-gray-400' :
                    'bg-surface-elevated text-gray-600'
                  )} title={p.category === 'core' ? '80%+ match appearances' : p.category === 'rotation' ? '40–80% match appearances' : 'Under 40% match appearances'}>
                    {p.category.toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* e) Team Report Section */}
      <div className="bg-surface-card rounded-card shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-accent flex items-center gap-1.5">
            <FileText size={16} />
            Team Report
          </h3>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            title={isApiKeyError ? 'Reports require configuration' : undefined}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition',
              isGenerating
                ? 'bg-surface-elevated text-gray-500 cursor-not-allowed'
                : 'bg-accent/20 text-accent hover:bg-accent/30'
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Generating report...
              </>
            ) : (
              <>
                <FileText size={12} />
                Generate Report
              </>
            )}
          </button>
        </div>

        {generateError && !isApiKeyError && (
          <p className="text-xs text-loss mb-3">{generateError}</p>
        )}

        {reports.length === 0 && !isGenerating && (
          <p className="text-xs text-gray-500">
            {isApiKeyError
              ? 'Reports are currently unavailable.'
              : 'No reports yet. Click "Generate Report" to create an analysis of your team.'}
          </p>
        )}

        <AnimatePresence>
          {reports.map((report, idx) => {
            const isLatest = idx === 0;
            const isExpanded = isLatest || expandedReportId === report.id;
            const dateStr = new Date(report.generatedAt).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <motion.div
                key={report.id}
                initial={isLatest && idx === 0 ? { opacity: 0, y: -5 } : false}
                animate={{ opacity: 1, y: 0 }}
                className={clsx('border border-surface-elevated rounded-lg', idx > 0 && 'mt-2')}
              >
                <button
                  onClick={() => setExpandedReportId(isExpanded && !isLatest ? null : report.id)}
                  className="w-full flex items-center gap-2 p-3 text-left hover:bg-surface-elevated/50 transition rounded-lg"
                >
                  <FileText size={14} className={isLatest ? 'text-accent' : 'text-gray-500'} />
                  <span className={clsx('text-xs flex-1', isLatest ? 'text-white font-medium' : 'text-gray-400')}>
                    {dateStr}
                    {isLatest && <span className="ml-2 text-accent text-[10px] font-bold">LATEST</span>}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }}
                    className="text-gray-600 hover:text-loss transition p-1"
                    aria-label="Delete report"
                  >
                    <Trash2 size={12} />
                  </button>
                  {!isLatest && (
                    isExpanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />
                  )}
                </button>

                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3">
                      <ReportSection title="Overall Assessment" content={report.report.overallAssessment} />
                      <ReportSection title="Player Performances" content={report.report.playerPerformances} />
                      <ReportSection title="Trends" content={report.report.trends} />
                      <ReportSection title="Stats Highlights" content={report.report.statsHighlights} />
                      <ReportSection title="Outlook" content={report.report.outlook} />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ReportSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">{title}</h4>
      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  );
}
