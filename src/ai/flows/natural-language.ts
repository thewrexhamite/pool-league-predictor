import { ai } from '../genkit';
import { z } from 'zod';

const model = process.env.GEMINI_MODEL || 'googleai/gemini-2.0-flash';

export const answerLeagueQuestion = ai.defineFlow(
  {
    name: 'answerLeagueQuestion',
    inputSchema: z.object({
      question: z.string(),
      leagueContext: z.string(),
    }),
    outputSchema: z.object({
      answer: z.string(),
      referencedTeams: z.array(z.string()),
      referencedPlayers: z.array(z.string()),
      suggestedFollowUps: z.array(z.string()),
    }),
  },
  async (input) => {
    const prompt = `You are an expert analyst for the Wrexham & District Pool League (25/26 season).
Each match is 10 frames. Points: Home win = 2 pts, Away win = 3 pts, Draw = 1 pt each.
There are 4 divisions: SD1 (Sunday Div 1), SD2 (Sunday Div 2), WD1 (Wednesday Div 1), WD2 (Wednesday Div 2).
Top 2 teams get promoted, bottom 2 get relegated.

Here is the current league data:
${input.leagueContext}

User question: ${input.question}

Answer the question based on the league data. Be specific with numbers and stats where relevant.
Keep your answer concise but informative (2-4 sentences for simple questions, more for complex analysis).

Respond in JSON format:
{
  "answer": "Your detailed answer here",
  "referencedTeams": ["Team1", "Team2"],
  "referencedPlayers": ["Player1"],
  "suggestedFollowUps": ["Follow-up question 1?", "Follow-up question 2?", "Follow-up question 3?"]
}`;

    const response = await ai.generate({
      model,
      prompt,
      output: { format: 'json' },
    });

    return response.output;
  }
);
