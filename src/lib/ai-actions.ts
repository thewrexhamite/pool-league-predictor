'use server';

import { analyzeMatch } from '@/ai/flows/match-analysis';
import { answerLeagueQuestion } from '@/ai/flows/natural-language';
import { generatePlayerInsight } from '@/ai/flows/player-insights';
import { generateTeamReport } from '@/ai/flows/team-report';
import {
  calcStandings,
  calcTeamStrength,
  predictFrame,
  runPredSim,
  getDiv,
  getPlayerStats,
  getPlayerStats2526,
  getPlayerTeams,
  getTeamPlayers,
  type DataSources,
} from '@/lib/predictions';
import { RESULTS } from '@/lib/data';
import type { DivisionCode, TeamReportData, TeamReportOutput, Divisions } from '@/lib/types';

export async function analyzeMatchAction(
  homeTeam: string,
  awayTeam: string,
  divisions: Divisions,
  results?: any[],
  leagueName?: string
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('This feature is currently unavailable. Please try again later.');
  }

  // Build DataSources for prediction functions
  const ds: DataSources = {
    divisions,
    results: results || RESULTS,
    fixtures: [],
    players: {},
    rosters: {},
    players2526: {},
  };

  const div = getDiv(homeTeam, ds);
  if (!div) throw new Error('Could not determine division for team.');

  const strengths = calcTeamStrength(div, ds);
  const standings = calcStandings(div, ds);
  const homeStanding = standings.find(s => s.team === homeTeam);
  const awayStanding = standings.find(s => s.team === awayTeam);

  if (!homeStanding || !awayStanding) {
    throw new Error('Could not find standings for teams.');
  }

  const pFrame = predictFrame(strengths[homeTeam] || 0, strengths[awayTeam] || 0);
  const pred = runPredSim(pFrame);

  try {
    const result = await analyzeMatch({
      homeTeam,
      awayTeam,
      division: divisions[div].name,
      leagueName: leagueName || 'the league',
      homeStrength: strengths[homeTeam] || 0,
      awayStrength: strengths[awayTeam] || 0,
      pHomeWin: pred.pHomeWin,
      pDraw: pred.pDraw,
      pAwayWin: pred.pAwayWin,
      expectedHome: pred.expectedHome,
      expectedAway: pred.expectedAway,
      homeStanding,
      awayStanding,
    });

    if (!result || !result.preview) {
      throw new Error('AI returned an incomplete response.');
    }

    return (
      result.preview +
      '\n\nKey Factors:\n' +
      (result.keyFactors || []).map((f: string) => '- ' + f).join('\n') +
      '\n\nTactical Insights:\n' +
      (result.tacticalInsights || []).map((i: string) => '- ' + i).join('\n') +
      '\n\n' +
      (result.predictedOutcome || '')
    );
  } catch (error) {
    console.error('AI match analysis error:', error);
    throw new Error('Failed to analyze match. Please try again.');
  }
}

export async function askQuestionAction(
  question: string,
  divisions: Divisions,
  results?: any[],
  leagueName?: string
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('This feature is currently unavailable. Please try again later.');
  }

  if (!question || question.length < 3) {
    throw new Error('Please ask a more detailed question.');
  }

  // Build DataSources for prediction functions
  const ds: DataSources = {
    divisions,
    results: results || RESULTS,
    fixtures: [],
    players: {},
    rosters: {},
    players2526: {},
  };

  // Build league context from current data
  const context: string[] = [];
  const divCodes: DivisionCode[] = Object.keys(divisions) as DivisionCode[];
  divCodes.forEach(div => {
    const standings = calcStandings(div, ds);
    context.push(
      `${divisions[div].name} Standings:\n` +
        standings
          .map(
            (s, i) =>
              `  ${i + 1}. ${s.team} - P${s.p} W${s.w} D${s.d} L${s.l} F${s.f} A${s.a} Diff${s.diff > 0 ? '+' : ''}${s.diff} Pts${s.pts}`
          )
          .join('\n')
    );
  });
  context.push(`Total matches played: ${results?.length || RESULTS.length}`);

  try {
    const result = await answerLeagueQuestion({
      question,
      leagueContext: context.join('\n\n'),
      leagueName: leagueName || 'the league',
    });
    return result;
  } catch (error) {
    console.error('AI question error:', error);
    throw new Error('Failed to answer question. Please try again.');
  }
}

export async function getPlayerInsightAction(
  playerName: string,
  divisions: Divisions,
  results?: any[],
  leagueName?: string
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('This feature is currently unavailable. Please try again later.');
  }

  // Build DataSources for prediction functions
  const ds: DataSources = {
    divisions,
    results: results || RESULTS,
    fixtures: [],
    players: {},
    rosters: {},
    players2526: {},
  };

  const stats2425 = getPlayerStats(playerName);
  const stats2526 = getPlayerStats2526(playerName);
  const teams = getPlayerTeams(playerName);

  if (!stats2425 && !stats2526) {
    throw new Error('No stats available for this player.');
  }

  // Build team context
  const teamContext = teams
    .map(t => {
      const standings = calcStandings(t.div as DivisionCode, ds);
      const pos = standings.findIndex(s => s.team === t.team) + 1;
      return `Plays for ${t.team} (${t.div}, position #${pos})`;
    })
    .join('. ');

  try {
    const result = await generatePlayerInsight({
      playerName,
      leagueName: leagueName || 'the league',
      stats2425: stats2425
        ? { rating: stats2425.rating, winPct: stats2425.winPct, played: stats2425.played }
        : null,
      stats2526: stats2526
        ? {
            totalPlayed: stats2526.total.p,
            totalWon: stats2526.total.w,
            totalPct: stats2526.total.pct,
            teams: stats2526.teams.map(t => ({
              team: t.team,
              div: t.div,
              played: t.p,
              won: t.w,
              pct: t.pct,
            })),
          }
        : null,
      teamContext,
    });

    return (
      result.scoutingReport +
      '\n\nForm: ' +
      result.formAssessment +
      '\n\nSeason Comparison: ' +
      result.seasonComparison +
      (result.strengths.length > 0
        ? '\n\nStrengths:\n' + result.strengths.map(s => '+ ' + s).join('\n')
        : '') +
      (result.weaknesses.length > 0
        ? '\n\nWeaknesses:\n' + result.weaknesses.map(w => '- ' + w).join('\n')
        : '')
    );
  } catch (error) {
    console.error('AI player insight error:', error);
    throw new Error('Failed to generate player insight. Please try again.');
  }
}

export async function generateTeamReportAction(input: TeamReportData): Promise<TeamReportOutput> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('This feature is currently unavailable. Please try again later.');
  }

  try {
    const result = await generateTeamReport(input);
    return result;
  } catch (error) {
    console.error('AI team report error:', error);
    throw new Error('Failed to generate team report. Please try again.');
  }
}
