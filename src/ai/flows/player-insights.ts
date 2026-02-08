import { ai } from '../genkit';
import { z } from 'zod';

const model = process.env.GEMINI_MODEL || 'googleai/gemini-2.0-flash';

const playerInsightOutputSchema = z.object({
  scoutingReport: z.string(),
  formAssessment: z.string(),
  seasonComparison: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export const generatePlayerInsight = ai.defineFlow(
  {
    name: 'generatePlayerInsight',
    inputSchema: z.object({
      playerName: z.string(),
      stats2425: z
        .object({
          rating: z.number(),
          winPct: z.number(),
          played: z.number(),
        })
        .nullable(),
      stats2526: z
        .object({
          totalPlayed: z.number(),
          totalWon: z.number(),
          totalPct: z.number(),
          teams: z.array(
            z.object({
              team: z.string(),
              div: z.string(),
              played: z.number(),
              won: z.number(),
              pct: z.number(),
            })
          ),
        })
        .nullable(),
      teamContext: z.string(),
      leagueName: z.string().optional(),
      careerStats: z
        .object({
          totalSeasons: z.number(),
          careerGamesPlayed: z.number(),
          careerWins: z.number(),
          careerWinRate: z.number(),
          trend: z.object({
            peakWinRate: z.object({
              value: z.number(),
              seasonId: z.string(),
            }),
            peakRating: z
              .object({
                value: z.number(),
                seasonId: z.string(),
              })
              .nullable(),
            currentVsPeak: z.object({
              winRateDiff: z.number(),
              ratingDiff: z.number().nullable(),
            }),
          }),
          improvement: z
            .object({
              winRateChange: z.number(),
              ratingChange: z.number().nullable(),
              winRateChangePercent: z.number(),
              trend: z.enum(['improving', 'declining', 'stable']),
            })
            .nullable(),
          consistency: z
            .object({
              winRateStdDev: z.number(),
              consistency: z.enum(['high', 'medium', 'low']),
            })
            .nullable(),
        })
        .nullable()
        .optional(),
    }),
    outputSchema: playerInsightOutputSchema,
  },
  async (input) => {
    const s2425 = input.stats2425
      ? `24/25 Season: Rating ${input.stats2425.rating > 0 ? '+' : ''}${input.stats2425.rating.toFixed(2)}, Win% ${(input.stats2425.winPct * 100).toFixed(1)}%, ${input.stats2425.played} games`
      : '24/25 Season: No data available';

    const s2526 = input.stats2526
      ? `25/26 Season: ${input.stats2526.totalPct.toFixed(1)}% win rate, ${input.stats2526.totalWon}/${input.stats2526.totalPlayed} frames won\nTeams: ${input.stats2526.teams.map(t => `${t.team} (${t.div}): ${t.pct.toFixed(1)}% in ${t.played} games`).join(', ')}`
      : '25/26 Season: No data available';

    let careerContext = '';
    if (input.careerStats) {
      const cs = input.careerStats;
      careerContext = `\nCareer Statistics (${cs.totalSeasons} seasons):
- Career Win Rate: ${(cs.careerWinRate * 100).toFixed(1)}% (${cs.careerWins}/${cs.careerGamesPlayed} games)
- Peak Performance: ${(cs.trend.peakWinRate.value * 100).toFixed(1)}% win rate in season ${cs.trend.peakWinRate.seasonId}${cs.trend.peakRating ? `, rating ${cs.trend.peakRating.value > 0 ? '+' : ''}${cs.trend.peakRating.value.toFixed(2)} in season ${cs.trend.peakRating.seasonId}` : ''}
- Current vs Peak: ${cs.trend.currentVsPeak.winRateDiff > 0 ? '+' : ''}${cs.trend.currentVsPeak.winRateDiff.toFixed(1)} percentage points from peak win rate${cs.trend.currentVsPeak.ratingDiff !== null ? `, ${cs.trend.currentVsPeak.ratingDiff > 0 ? '+' : ''}${cs.trend.currentVsPeak.ratingDiff.toFixed(2)} from peak rating` : ''}`;

      if (cs.improvement) {
        careerContext += `\n- Season-to-Season Change: ${cs.improvement.trend} (${cs.improvement.winRateChange > 0 ? '+' : ''}${cs.improvement.winRateChange.toFixed(1)} percentage points, ${cs.improvement.winRateChangePercent > 0 ? '+' : ''}${cs.improvement.winRateChangePercent.toFixed(1)}% change)${cs.improvement.ratingChange !== null ? `, rating ${cs.improvement.ratingChange > 0 ? '+' : ''}${cs.improvement.ratingChange.toFixed(2)}` : ''}`;
      }

      if (cs.consistency) {
        careerContext += `\n- Consistency: ${cs.consistency.consistency} (std dev: ${cs.consistency.winRateStdDev.toFixed(1)} percentage points)`;
      }
    }

    const prompt = `You are a pool league scout for ${input.leagueName || 'the league'}.
Write a brief scouting report for this player.

Player: ${input.playerName}
${s2425}
${s2526}${careerContext}
${input.teamContext}

${input.careerStats ? 'Use the career statistics to provide context on the player\'s improvement trajectory, current form relative to their career peak, and consistency patterns over time. ' : ''}Provide a JSON response:
{
  "scoutingReport": "2-3 sentence overview of the player${input.careerStats ? ', including career context and development trajectory' : ''}",
  "formAssessment": "1-2 sentences on current form${input.careerStats ? ' relative to career performance' : ''}",
  "seasonComparison": "1-2 sentences comparing ${input.careerStats ? 'recent seasons and career trend' : '24/25 to 25/26 if both available, otherwise comment on available data'}",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1"]
}`;

    const response = await ai.generate({
      model,
      prompt,
      output: { schema: playerInsightOutputSchema },
    });

    if (!response.output) {
      throw new Error('AI did not return a valid response. Please try again.');
    }

    return response.output;
  }
);
