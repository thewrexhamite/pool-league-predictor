import { ai } from '../genkit';
import { z } from 'zod';

const model = process.env.GEMINI_MODEL || 'googleai/gemini-2.0-flash';

const matchAnalysisOutputSchema = z.object({
  preview: z.string(),
  tacticalInsights: z.array(z.string()),
  keyFactors: z.array(z.string()),
  predictedOutcome: z.string(),
});

export const analyzeMatch = ai.defineFlow(
  {
    name: 'analyzeMatch',
    inputSchema: z.object({
      homeTeam: z.string(),
      awayTeam: z.string(),
      division: z.string(),
      leagueName: z.string().optional(),
      homeStrength: z.number(),
      awayStrength: z.number(),
      pHomeWin: z.string(),
      pDraw: z.string(),
      pAwayWin: z.string(),
      expectedHome: z.string(),
      expectedAway: z.string(),
      homeStanding: z.object({
        team: z.string(),
        p: z.number(),
        w: z.number(),
        d: z.number(),
        l: z.number(),
        f: z.number(),
        a: z.number(),
        pts: z.number(),
        diff: z.number(),
      }),
      awayStanding: z.object({
        team: z.string(),
        p: z.number(),
        w: z.number(),
        d: z.number(),
        l: z.number(),
        f: z.number(),
        a: z.number(),
        pts: z.number(),
        diff: z.number(),
      }),
    }),
    outputSchema: matchAnalysisOutputSchema,
  },
  async (input) => {
    const prompt = `You are an expert pool league analyst for ${input.leagueName || 'the league'} (25/26 season).
Each match consists of 10 frames. Points system: Home win = 2 pts, Away win = 3 pts, Draw = 1 pt each.

Analyze this upcoming match and provide commentary:

Division: ${input.division}
Home: ${input.homeTeam} (Strength: ${input.homeStrength.toFixed(3)}, Standing: P${input.homeStanding.p} W${input.homeStanding.w} D${input.homeStanding.d} L${input.homeStanding.l}, Frames: ${input.homeStanding.f}-${input.homeStanding.a}, Pts: ${input.homeStanding.pts})
Away: ${input.awayTeam} (Strength: ${input.awayStrength.toFixed(3)}, Standing: P${input.awayStanding.p} W${input.awayStanding.w} D${input.awayStanding.d} L${input.awayStanding.l}, Frames: ${input.awayStanding.f}-${input.awayStanding.a}, Pts: ${input.awayStanding.pts})

Statistical Prediction: Home Win ${input.pHomeWin}%, Draw ${input.pDraw}%, Away Win ${input.pAwayWin}%
Expected Score: ${input.expectedHome} - ${input.expectedAway}

Provide your analysis in JSON format:
{
  "preview": "A 2-3 sentence match preview narrative",
  "tacticalInsights": ["insight1", "insight2", "insight3"],
  "keyFactors": ["factor1", "factor2"],
  "predictedOutcome": "A brief predicted outcome sentence"
}`;

    const response = await ai.generate({
      model,
      prompt,
      output: { schema: matchAnalysisOutputSchema },
    });

    if (!response.output) {
      throw new Error('AI did not return a valid response. Please try again.');
    }

    return response.output;
  }
);
