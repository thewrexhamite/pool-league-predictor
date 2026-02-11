import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore } from 'firebase-admin/firestore';

interface MatchResult {
  date: string;
  home: string;
  away: string;
  home_score: number;
  away_score: number;
  division: string;
}

interface PredictionDoc {
  id: string;
  home: string;
  away: string;
  date: string;
  division: string;
  predictedWinner: 'home' | 'away' | 'draw';
  expectedHome: number;
  expectedAway: number;
  correct?: boolean;
  actualHomeScore?: number;
  actualAwayScore?: number;
  actualWinner?: string;
  userId?: string;
}

/**
 * When season data is updated (results written), resolve matching predictions.
 * Triggers on writes to leagues/{leagueId}/seasons/{seasonId}.
 */
export const resolvePredictions = onDocumentWritten(
  {
    document: 'leagues/{leagueId}/seasons/{seasonId}',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (event) => {
    const db = getFirestore();
    const after = event.data?.after?.data();
    const before = event.data?.before?.data();

    if (!after) return;

    const newResults = (after.results || []) as MatchResult[];
    const oldResults = (before?.results || []) as MatchResult[];

    // Find newly added results (results that weren't in the before snapshot)
    const oldResultSet = new Set(
      oldResults.map(r => `${r.date}|${r.home}|${r.away}`),
    );
    const newMatches = newResults.filter(
      r => !oldResultSet.has(`${r.date}|${r.home}|${r.away}`),
    );

    if (newMatches.length === 0) return;

    console.log(`Resolving predictions for ${newMatches.length} new results`);

    for (const result of newMatches) {
      const actualWinner: 'home' | 'away' | 'draw' =
        result.home_score > result.away_score ? 'home' :
        result.away_score > result.home_score ? 'away' : 'draw';

      // Find matching predictions
      const predsQuery = await db.collection('predictions')
        .where('home', '==', result.home)
        .where('away', '==', result.away)
        .where('date', '==', result.date)
        .get();

      if (predsQuery.empty) continue;

      const batch = db.batch();

      for (const predDoc of predsQuery.docs) {
        const pred = predDoc.data() as PredictionDoc;
        if (pred.correct !== undefined) continue; // already resolved

        const correct = pred.predictedWinner === actualWinner;

        batch.update(predDoc.ref, {
          actualHomeScore: result.home_score,
          actualAwayScore: result.away_score,
          actualWinner,
          correct,
        });
      }

      await batch.commit();
      console.log(`Resolved ${predsQuery.size} predictions for ${result.home} vs ${result.away}`);
    }
  },
);
