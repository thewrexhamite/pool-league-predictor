import { ai } from '../genkit';
import { z } from 'zod';

const model = process.env.GEMINI_MODEL || 'googleai/gemini-2.0-flash';

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
    }),
    outputSchema: z.object({
      scoutingReport: z.string(),
      formAssessment: z.string(),
      seasonComparison: z.string(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
    }),
  },
  async (input) => {
    const s2425 = input.stats2425
      ? `24/25 Season: Rating ${input.stats2425.rating > 0 ? '+' : ''}${input.stats2425.rating.toFixed(2)}, Win% ${(input.stats2425.winPct * 100).toFixed(1)}%, ${input.stats2425.played} games`
      : '24/25 Season: No data available';

    const s2526 = input.stats2526
      ? `25/26 Season: ${input.stats2526.totalPct.toFixed(1)}% win rate, ${input.stats2526.totalWon}/${input.stats2526.totalPlayed} frames won\nTeams: ${input.stats2526.teams.map(t => `${t.team} (${t.div}): ${t.pct.toFixed(1)}% in ${t.played} games`).join(', ')}`
      : '25/26 Season: No data available';

    const prompt = `You are a pool league scout for the Wrexham & District Pool League.
Write a brief scouting report for this player.

Player: ${input.playerName}
${s2425}
${s2526}
${input.teamContext}

Provide a JSON response:
{
  "scoutingReport": "2-3 sentence overview of the player",
  "formAssessment": "1-2 sentences on current form",
  "seasonComparison": "1-2 sentences comparing 24/25 to 25/26 if both available, otherwise comment on available data",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1"]
}`;

    const response = await ai.generate({
      model,
      prompt,
      output: { format: 'json' },
    });

    return response.output;
  }
);
