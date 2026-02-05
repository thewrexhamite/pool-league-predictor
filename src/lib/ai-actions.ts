'use server';

import { analyzeMatch } from '@/ai/flows/match-analysis';
import { answerLeagueQuestion } from '@/ai/flows/natural-language';
import { generatePlayerInsight } from '@/ai/flows/player-insights';
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
} from '@/lib/predictions';
import { DIVISIONS, RESULTS } from '@/lib/data';
import type { DivisionCode } from '@/lib/types';

export async function analyzeMatchAction(homeTeam: string, awayTeam: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI features are not configured. Please set GEMINI_API_KEY.');
  }

  const div = getDiv(homeTeam);
  if (!div) throw new Error('Could not determine division for team.');

  const strengths = calcTeamStrength(div);
  const standings = calcStandings(div);
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
      division: DIVISIONS[div].name,
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

    return (
      result.preview +
      '\n\nKey Factors:\n' +
      result.keyFactors.map(f => '- ' + f).join('\n') +
      '\n\nTactical Insights:\n' +
      result.tacticalInsights.map(i => '- ' + i).join('\n') +
      '\n\n' +
      result.predictedOutcome
    );
  } catch (error) {
    console.error('AI match analysis error:', error);
    throw new Error('Failed to analyze match. Please try again.');
  }
}

export async function askQuestionAction(question: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI features are not configured. Please set GEMINI_API_KEY.');
  }

  if (!question || question.length < 3) {
    throw new Error('Please ask a more detailed question.');
  }

  // Build league context from current data
  const context: string[] = [];
  const divCodes: DivisionCode[] = ['SD1', 'SD2', 'WD1', 'WD2'];
  divCodes.forEach(div => {
    const standings = calcStandings(div);
    context.push(
      `${DIVISIONS[div].name} Standings:\n` +
        standings
          .map(
            (s, i) =>
              `  ${i + 1}. ${s.team} - P${s.p} W${s.w} D${s.d} L${s.l} F${s.f} A${s.a} Diff${s.diff > 0 ? '+' : ''}${s.diff} Pts${s.pts}`
          )
          .join('\n')
    );
  });
  context.push(`Total matches played: ${RESULTS.length}`);

  try {
    const result = await answerLeagueQuestion({
      question,
      leagueContext: context.join('\n\n'),
    });
    return result;
  } catch (error) {
    console.error('AI question error:', error);
    throw new Error('Failed to answer question. Please try again.');
  }
}

export async function getPlayerInsightAction(playerName: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('AI features are not configured. Please set GEMINI_API_KEY.');
  }

  const stats2425 = getPlayerStats(playerName);
  const stats2526 = getPlayerStats2526(playerName);
  const teams = getPlayerTeams(playerName);

  if (!stats2425 && !stats2526) {
    throw new Error('No stats available for this player.');
  }

  // Build team context
  const teamContext = teams
    .map(t => {
      const standings = calcStandings(t.div as DivisionCode);
      const pos = standings.findIndex(s => s.team === t.team) + 1;
      return `Plays for ${t.team} (${t.div}, position #${pos})`;
    })
    .join('. ');

  try {
    const result = await generatePlayerInsight({
      playerName,
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
