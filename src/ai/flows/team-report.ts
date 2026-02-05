import { ai } from '../genkit';
import { z } from 'zod';

const model = process.env.GEMINI_MODEL || 'googleai/gemini-2.0-flash';

export const generateTeamReport = ai.defineFlow(
  {
    name: 'generateTeamReport',
    inputSchema: z.object({
      teamName: z.string(),
      divisionName: z.string(),
      position: z.number(),
      totalTeams: z.number(),
      standing: z.object({
        p: z.number(),
        w: z.number(),
        d: z.number(),
        l: z.number(),
        f: z.number(),
        a: z.number(),
        pts: z.number(),
        diff: z.number(),
      }),
      form: z.array(z.enum(['W', 'L', 'D'])),
      recentResults: z.array(z.object({
        opponent: z.string(),
        teamScore: z.number(),
        oppScore: z.number(),
        result: z.enum(['W', 'L', 'D']),
        isHome: z.boolean(),
      })),
      homeAway: z.object({
        home: z.object({ p: z.number(), w: z.number(), d: z.number(), l: z.number(), winPct: z.number() }),
        away: z.object({ p: z.number(), w: z.number(), d: z.number(), l: z.number(), winPct: z.number() }),
      }),
      playerSummaries: z.array(z.object({
        name: z.string(),
        played: z.number(),
        winPct: z.number(),
        adjPct: z.number(),
        trend: z.enum(['hot', 'cold', 'steady']).nullable(),
        category: z.enum(['core', 'rotation', 'fringe']).nullable(),
      })),
      setPerformance: z.object({
        set1Pct: z.number(),
        set2Pct: z.number(),
        bias: z.number(),
      }).nullable(),
      bdStats: z.object({
        bdFRate: z.number(),
        bdARate: z.number(),
        netBD: z.number(),
        forfRate: z.number(),
      }),
      nextOpponent: z.string().nullable(),
      nextIsHome: z.boolean().nullable(),
      gapToLeader: z.number(),
      gapToSafety: z.number(),
    }),
    outputSchema: z.object({
      overallAssessment: z.string(),
      playerPerformances: z.string(),
      trends: z.string(),
      statsHighlights: z.string(),
      outlook: z.string(),
    }),
  },
  async (input) => {
    const formStr = input.form.length > 0 ? input.form.join('-') : 'No recent form';
    const recentStr = input.recentResults
      .map(r => `${r.result} ${r.teamScore}-${r.oppScore} vs ${r.opponent} (${r.isHome ? 'H' : 'A'})`)
      .join(', ');
    const playersStr = input.playerSummaries
      .map(p => `${p.name}: ${p.played}p, ${p.winPct.toFixed(0)}% win (adj ${p.adjPct.toFixed(0)}%), trend=${p.trend ?? 'n/a'}, role=${p.category ?? 'n/a'}`)
      .join('\n  ');

    const prompt = `You are an expert team analyst for the Wrexham & District Pool League (25/26 season).
Each match consists of 10 frames. Points: Home win = 2 pts, Away win = 3 pts, Draw = 1 pt each.

Provide a comprehensive team report for ${input.teamName} in ${input.divisionName}.

CURRENT POSITION: ${input.position}/${input.totalTeams} | ${input.standing.pts} pts
Record: P${input.standing.p} W${input.standing.w} D${input.standing.d} L${input.standing.l} | Frames: ${input.standing.f}-${input.standing.a} (diff ${input.standing.diff > 0 ? '+' : ''}${input.standing.diff})
Gap to leader: ${input.gapToLeader} pts | Gap to safety: ${input.gapToSafety} pts

FORM (last 5): ${formStr}
RECENT RESULTS: ${recentStr || 'None'}

HOME/AWAY SPLIT:
  Home: P${input.homeAway.home.p} W${input.homeAway.home.w} D${input.homeAway.home.d} L${input.homeAway.home.l} (${input.homeAway.home.winPct.toFixed(0)}% win)
  Away: P${input.homeAway.away.p} W${input.homeAway.away.w} D${input.homeAway.away.d} L${input.homeAway.away.l} (${input.homeAway.away.winPct.toFixed(0)}% win)

SQUAD:
  ${playersStr || 'No player data'}

SET PERFORMANCE: ${input.setPerformance ? `Set 1: ${input.setPerformance.set1Pct.toFixed(0)}%, Set 2: ${input.setPerformance.set2Pct.toFixed(0)}%, Bias: ${input.setPerformance.bias > 0 ? 'stronger in set 1' : 'stronger in set 2'} (${Math.abs(input.setPerformance.bias).toFixed(1)}pp)` : 'No data'}

BREAK & DISH: For ${input.bdStats.bdFRate.toFixed(2)}/game, Against ${input.bdStats.bdARate.toFixed(2)}/game, Net ${input.bdStats.netBD > 0 ? '+' : ''}${input.bdStats.netBD}, Forfeit rate: ${input.bdStats.forfRate.toFixed(2)}/game

NEXT MATCH: ${input.nextOpponent ? `vs ${input.nextOpponent} (${input.nextIsHome ? 'Home' : 'Away'})` : 'No upcoming fixture'}

Provide your analysis in JSON format with these five sections:
{
  "overallAssessment": "2-3 sentences summarising current position, momentum, and season trajectory",
  "playerPerformances": "Who's hot, who's cold, key contributors, and any standout performers or concerns",
  "trends": "Form trajectory, home/away bias, set performance patterns, and any notable shifts",
  "statsHighlights": "Break & dish rates, frame differential, forfeit rate, and any notable numbers worth highlighting",
  "outlook": "What to watch in upcoming matches, key challenges, and realistic expectations going forward"
}`;

    const response = await ai.generate({
      model,
      prompt,
      output: { format: 'json' },
    });

    return response.output;
  }
);
